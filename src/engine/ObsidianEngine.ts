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

export class ObsidianEngine {
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
  private initResolve: (() => void) | null = null;

  constructor(onMessage: (msg: EngineMessage) => void) {
    this.onMessage = onMessage;
  }

  async init(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      this.initResolve = resolve;
      try {
        this.worker = new Worker('./stockfish-18-single.js');
        
        this.worker.onerror = (err) => {
          console.error("Worker error in ObsidianEngine:", err);
          this.worker = null;
          this.isReady = false;
          this.initPromise = null;
          resolve();
        };

        this.worker.onmessage = (e) => {
          const msg = e.data;
          
          if (typeof msg === 'string') {
            if (msg === 'uciok') {
              this.worker?.postMessage('isready');
            } else if (msg === 'readyok') {
              this.isReady = true;
              if (this.initResolve) {
                this.initResolve();
                this.initResolve = null;
              }
            } else if (msg.startsWith('info ')) {
              this.parseInfoLine(msg);
            } else if (msg.startsWith('bestmove')) {
              this.isSearching = false;
              
              // Si hay una búsqueda pendiente, la iniciamos inmediatamente y omitimos el bestmove actual
              if (this.pendingSearch) {
                this.executePendingSearch();
                return;
              }
              
              if (this.pendingEval) {
                this.executePendingEval();
                return;
              }

              const match = msg.match(/bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);
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
        // Máxima potencia: UCI_LimitStrength false, threads máximos, hash aumentado
        this.worker.postMessage('setoption name UCI_LimitStrength value false');
        this.worker.postMessage('setoption name Use NNUE value true');
        const threads = Math.min(navigator.hardwareConcurrency || 4, 8); // Max 8 threads para no saturar
        this.worker.postMessage(`setoption name Threads value ${threads}`);
        this.worker.postMessage('setoption name Hash value 512'); // 512MB para TT profunda
        this.worker.postMessage('setoption name MultiPV value 1');
        this.worker.postMessage('setoption name Contempt value 0'); // Neutral: no favor empates
        this.worker.postMessage('ucinewgame');
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

    // Solo limpiar si la profundidad aumenta significativamente (nueva búsqueda) 
    // o si recibimos el primer multipv de una nueva profundidad.
    if (multiIdx === 1) {
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

  private pendingSearch: { fen: string; searchDepth: number; times?: any; targetDelayMs: number } | null = null;
  private pendingEval: { fen: string; color: 'w' | 'b'; searchDepth: number } | null = null;
  private isSearching = false;

  private executePendingSearch() {
    if (!this.pendingSearch || !this.worker) return;
    const { fen, searchDepth, times, targetDelayMs } = this.pendingSearch;
    this.pendingSearch = null;
    this.isSearching = true;
    this.isThinkingForMove = true;
    
    this.worker.postMessage('position fen ' + fen);
    
    const actualDepth = Math.min(searchDepth, 25);
    if (targetDelayMs > 0) {
        this.worker.postMessage(`go depth ${actualDepth} movetime ${targetDelayMs}`);
    } else if (times) {
        this.worker.postMessage(`go depth ${actualDepth} wtime ${times.wtime} btime ${times.btime} winc ${times.winc} binc ${times.binc}`);
    } else {
        this.worker.postMessage(`go depth ${actualDepth}`);
    }
  }

  private executePendingEval() {
    if (!this.pendingEval || !this.worker) return;
    const { fen, color, searchDepth } = this.pendingEval;
    this.pendingEval = null;
    this.isSearching = true;
    this.currentVariations = {};
    this.currentTurnColor = color;
    this.worker.postMessage('position fen ' + fen);
    this.worker.postMessage('go depth ' + searchDepth);
  }

  /**
   * Comenzar a evaluar la posición (para el modo análisis)
   */
  evaluate(fen: string, color: 'w' | 'b', searchDepth: number = 15) {
    if (!this.worker) return;
    this.pendingSearch = null; // Cancelar búsqueda de movimiento si la hubiera
    this.pendingEval = { fen, color, searchDepth };
    
    if (this.isSearching) {
       this.stop(false);
    } else {
       this.executePendingEval();
    }
  }

  findBestMove(fen: string, color: 'w' | 'b', searchDepth: number = 10, times?: { wtime: number, btime: number, winc: number, binc: number }, delayMs: number = 500) {
    if (!this.worker) return;
    this.searchStartTime = performance.now();
    
    let targetDelayMs = delayMs;
    if (times) {
       const remaining = color === 'w' ? times.wtime : times.btime;
       const maxSafeDelay = Math.max(0, remaining / 20);
       targetDelayMs = Math.floor(Math.min(delayMs, maxSafeDelay));
    }
    this.targetDelayMs = targetDelayMs;
    
    this.currentVariations = {};
    this.currentTurnColor = color;
    
    this.pendingEval = null; // Cancelar evaluación si la hubiera
    this.pendingSearch = { fen, searchDepth, times, targetDelayMs };
    
    if (this.isSearching) {
       this.stop(false);
    } else {
       this.executePendingSearch();
    }
  }

  stop(clearPending = true) {
    this.isThinkingForMove = false;
    if (clearPending) {
       this.pendingSearch = null;
       this.pendingEval = null;
    }
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

  terminate() { this.quit(); }
}

