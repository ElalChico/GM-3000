export type Variation = {
  id: number;
  score: number;
  mate?: number;
  depth: number;
  pv: string;
};

export type EngineStats = {
  nodes: number;
  nps: number;
  time: number;
};

export type EngineMessage = {
  type: 'evaluation';
  score: number; // Centipeones, siempre desde la perspectiva de las blancas
  mate?: number; // Mate en N, desde la perspectiva de las blancas
  depth: number;
  pv?: string; // Variación principal (mejor línea de movimientos)
  variations: Variation[];
  stats?: EngineStats;
} | {
  type: 'bestmove';
  move: string;
  ponder?: string;
};

export class StockfishEngineWhite {
  private worker: Worker | null = null;
  private onMessage: (msg: EngineMessage) => void;
  private isThinkingForMove = false;
  private currentTurnColor: 'w' | 'b' = 'w';
  private currentVariations: Record<number, Variation> = {};
  private lastEvalTime = 0;
  private searchStartTime = 0;
  private targetDelayMs = 0;
  private moveTimeout: NodeJS.Timeout | null = null;
  private startTimeout: NodeJS.Timeout | null = null;

  public isReady = false;
  public initPromise: Promise<void> | null = null;

  constructor(onMessage: (msg: EngineMessage) => void) {
    this.onMessage = onMessage;
  }

  async init(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        this.worker = new Worker('./stockfish.js');
        
        this.worker.onerror = (err) => {
          console.error("Worker error in StockfishWhite:", err);
          resolve(); // Resolve to avoid hanging the entire game startup
        };

        this.worker.onmessage = (e) => {
          const msg = e.data;
          
          if (typeof msg === 'string') {
            if (msg === 'uciok') {
              this.worker?.postMessage('isready');
            } else if (msg === 'readyok') {
              this.isReady = true;
              resolve();
            } else if (msg.startsWith('info ')) {
              this.parseInfoLine(msg);
            } else if (msg.startsWith('bestmove')) {
              const match = msg.match(/bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);
              console.log(`[WhiteWorker] Received bestmove: ${msg}. isThinking: ${this.isThinkingForMove}, match: ${!!match}`);
              if (match) {
                if (this.isThinkingForMove) {
                  this.isThinkingForMove = false;
                  const elapsed = performance.now() - this.searchStartTime;
                  const waitTime = Math.max(0, this.targetDelayMs - elapsed);
                  this.moveTimeout = setTimeout(() => {
                    this.onMessage({ type: 'bestmove', move: match[1], ponder: match[2] });
                  }, waitTime);
                }
              }
            }
          }
        };
        
        this.worker.postMessage('uci');
        // Set options for better speed and deeper search if the environment supports it
        this.worker.postMessage('setoption name Threads value 4');
        this.worker.postMessage('setoption name Hash value 128');
        // Ajustado a un valor más alto porque el usuario quiere ver "todas las opciones exploradas"
        this.worker.postMessage('setoption name MultiPV value 10');
      } catch (err) {
        console.error("Failed to initialize Stockfish:", err);
        resolve(); // resolve anyway to avoid hanging
      }
    });

    return this.initPromise;
  }

  private parseInfoLine(msg: string) {
    const depthMatch = msg.match(/depth\s+(\d+)/);
    const cpMatch = msg.match(/score cp (-?\d+)/);
    const mateMatch = msg.match(/score mate (-?\d+)/);
    const pvMatch = msg.match(/ pv\s+(.*)$/);
    const multiMatch = msg.match(/multipv\s+(\d+)/);
    
    // Analizar estadísticas
    const nodesMatch = msg.match(/nodes\s+(\d+)/);
    const npsMatch = msg.match(/nps\s+(\d+)/);
    const timeMatch = msg.match(/time\s+(\d+)/);

    if (!depthMatch || (!cpMatch && !mateMatch) || !pvMatch) return;
    
    const depth = parseInt(depthMatch[1], 10);
    const multiplier = this.currentTurnColor === 'w' ? 1 : -1;
    const multiIdx = multiMatch ? parseInt(multiMatch[1], 10) : 1;
    
    const stats: EngineStats = {
      nodes: nodesMatch ? parseInt(nodesMatch[1], 10) : 0,
      nps: npsMatch ? parseInt(npsMatch[1], 10) : 0,
      time: timeMatch ? parseInt(timeMatch[1], 10) : 0,
    };
    
    let scoreCp = 0;
    let mateIn: number | undefined = undefined;

    if (cpMatch) {
      scoreCp = parseInt(cpMatch[1], 10) * multiplier;
    } else if (mateMatch) {
      mateIn = parseInt(mateMatch[1], 10) * multiplier;
      scoreCp = mateIn > 0 ? 10000 : -10000;
    }

    if (depth === 1 && multiIdx === 1) {
        this.currentVariations = {};
    }

    this.currentVariations[multiIdx] = {
      id: multiIdx,
      score: scoreCp,
      mate: mateIn,
      depth,
      pv: pvMatch[1]
    };
    
    // Limitar las actualizaciones de la interfaz para que parezca viva pero no bloquee React. 50ms es muy fluido.
    const now = performance.now();
    if (now - this.lastEvalTime > 50) {
      this.lastEvalTime = now;
      this.onMessage({ 
        type: 'evaluation', 
        score: scoreCp, 
        mate: mateIn, 
        depth, 
        pv: pvMatch[1],
        variations: Object.values(this.currentVariations),
        stats
      });
    }
  }

  /**
   * Comenzar a evaluar la posición (para el modo análisis)
   */
  evaluate(fen: string, color: 'w' | 'b', searchDepth: number = 15) {
    if (!this.worker) return;
    this.stop();
    this.currentVariations = {};
    this.currentTurnColor = color;
    this.worker.postMessage('setoption name MultiPV value 10');
    this.worker.postMessage('position fen ' + fen);
    this.worker.postMessage('go depth ' + searchDepth);
  }

  /**
   * Calcular y devolver el mejor movimiento
   */
  findBestMove(fen: string, color: 'w' | 'b', searchDepth: number = 10, times?: { wtime: number, btime: number, winc: number, binc: number }, delayMs: number = 500) {
    if (!this.worker) return;
    this.stop();
    this.searchStartTime = performance.now();
    
    // Scale artificial delay down if clock is running low
    if (times) {
       const remaining = color === 'w' ? times.wtime : times.btime;
       const maxSafeDelay = Math.max(0, remaining / 20); // Cap delay to 5% of remaining time
       this.targetDelayMs = Math.floor(Math.min(delayMs, maxSafeDelay));
    } else {
       this.targetDelayMs = delayMs;
    }
    
    this.currentVariations = {};
    this.currentTurnColor = color;
    
    // We set a flag to know we expect a move. To avoid getting the stray bestmove from 
    // the 'stop' command (if the engine was evaluating), we briefly wait before sending 'go'
    // and setting the flag.
    this.startTimeout = setTimeout(() => {
      if (!this.worker) return;
      this.isThinkingForMove = true;
      
      // Establecer Nivel de Habilidad (mapeado de searchDepth 1-25 a un rango 0-20)
      const mappedSkill = Math.min(20, Math.max(0, Math.floor((searchDepth / 25) * 20)));
      this.worker.postMessage(`setoption name Skill Level value ${mappedSkill}`);
      this.worker.postMessage('setoption name MultiPV value 4'); // Reduced from 10 to prevent hanging at high depth

      this.worker.postMessage('position fen ' + fen);
      // Limit search depth to prevent freezing at high ELOs, and respect movement delay via movetime
      const actualDepth = Math.min(searchDepth, 25);
      
      if (this.targetDelayMs > 0) {
          this.worker.postMessage(`go depth ${actualDepth} movetime ${this.targetDelayMs}`);
      } else if (times) {
          this.worker.postMessage(`go depth ${actualDepth} wtime ${times.wtime} btime ${times.btime} winc ${times.winc} binc ${times.binc}`);
      } else {
          this.worker.postMessage(`go depth ${actualDepth}`);
      }
    }, 20);
  }

  stop() {
    this.isThinkingForMove = false;
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
    if (this.startTimeout) {
      clearTimeout(this.startTimeout);
      this.startTimeout = null;
    }
    this.worker?.postMessage('stop');
  }

  quit() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
