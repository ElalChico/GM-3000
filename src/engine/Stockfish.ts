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
  score: number; // Centipawns, always from white's perspective
  mate?: number; // Mate in N, from white's perspective
  depth: number;
  pv?: string; // Principal variation (best line of moves)
  variations: Variation[];
  stats?: EngineStats;
} | {
  type: 'bestmove';
  move: string;
  ponder?: string;
};

export class StockfishEngine {
  private worker: Worker | null = null;
  private onMessage: (msg: EngineMessage) => void;
  private isThinkingForMove = false;
  private currentTurnColor: 'w' | 'b' = 'w';
  private currentVariations: Record<number, Variation> = {};
  private lastEvalTime = 0;

  constructor(onMessage: (msg: EngineMessage) => void) {
    this.onMessage = onMessage;
  }

  async init() {
    if (this.worker) return;
    try {
      const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js');
      const text = await res.text();
      const blob = new Blob([text], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (e) => {
        const msg = e.data;
        
        if (typeof msg === 'string') {
          if (msg.startsWith('info depth')) {
            this.parseInfoLine(msg);
          } else if (msg.startsWith('bestmove')) {
            const match = msg.match(/bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);
            if (match) {
              if (this.isThinkingForMove) {
                this.onMessage({ type: 'bestmove', move: match[1], ponder: match[2] });
              }
            }
          }
        }
      };
      
      this.worker.postMessage('uci');
      // Set to higher value because user wants to see "all options explored"
      this.worker.postMessage('setoption name MultiPV value 10');
    } catch (err) {
      console.error("Failed to initialize Stockfish:", err);
    }
  }

  private parseInfoLine(msg: string) {
    const depthMatch = msg.match(/depth\s+(\d+)/);
    const cpMatch = msg.match(/score cp (-?\d+)/);
    const mateMatch = msg.match(/score mate (-?\d+)/);
    const pvMatch = msg.match(/ pv\s+(.*)$/);
    const multiMatch = msg.match(/multipv\s+(\d+)/);
    
    // Parse stats
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
    
    // Throttle UI updates to look alive but not block react. 50ms is very fluid.
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
   * Start evaluating the position (for analysis mode)
   */
  evaluate(fen: string, color: 'w' | 'b', searchDepth: number = 15) {
    if (!this.worker) return;
    this.currentVariations = {};
    this.currentTurnColor = color;
    this.isThinkingForMove = false;
    this.worker.postMessage('stop');
    this.worker.postMessage('position fen ' + fen);
    this.worker.postMessage('go depth ' + searchDepth);
  }

  /**
   * Calculate and return the best move
   */
  findBestMove(fen: string, color: 'w' | 'b', searchDepth: number = 10, times?: { wtime: number, btime: number, winc: number, binc: number }) {
    if (!this.worker) return;
    this.currentVariations = {};
    this.currentTurnColor = color;
    this.isThinkingForMove = true;
    this.worker.postMessage('stop');
    
    // Set Skill Level (0-20 array mapped from searchDepth 1-25)
    const mappedSkill = Math.min(20, Math.max(0, Math.floor((searchDepth / 25) * 20)));
    this.worker.postMessage(`setoption name Skill Level value ${mappedSkill}`);

    this.worker.postMessage('position fen ' + fen);
    
    if (times) {
        this.worker.postMessage(`go depth ${searchDepth} wtime ${times.wtime} btime ${times.btime} winc ${times.winc} binc ${times.binc}`);
    } else {
        this.worker.postMessage(`go depth ${searchDepth}`);
    }
  }

  stop() {
    this.worker?.postMessage('stop');
  }

  quit() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }
}
