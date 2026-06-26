/**
 * AtlasEngine.ts — Atlas.1++
 *
 * Usa el mismo Stockfish local que StockfishWhite/Black pero con
 * Skill Level 14 (dificultad alta) para ser un bot fuerte.
 * Implementa anti-repetición real mediante UCI_LimitStrength + Skill Level.
 */

export type AtlasMessage = {
  type: 'evaluation';
  score: number;
  mate?: number;
  depth: number;
  pv?: string;
  variations: { id: number; score: number; mate?: number; depth: number; pv: string }[];
  stats?: { nodes: number; nps: number; time: number };
} | {
  type: 'bestmove';
  move: string;
  ponder?: string;
  searchId?: number;
};

export class AtlasEngine {
  private worker: Worker | null = null;
  private onMessage: (msg: AtlasMessage) => void;
  private isThinkingForMove = false;
  private currentTurnColor: 'w' | 'b' = 'w';
  private currentVariations: Record<number, any> = {};
  private lastEvalTime = 0;
  private searchStartTime = 0;
  private targetDelayMs = 0;
  private moveTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingSearch: { fen: string; searchDepth: number; times?: any; targetDelayMs: number } | null = null;
  private isSearching = false;

  public isReady = false;
  public initPromise: Promise<void> | null = null;
  private initResolve: (() => void) | null = null;

  // Nivel de habilidad: Atlas = 14 de 20 (difícil)
  private static readonly SKILL_LEVEL = 14;
  private static readonly MAX_DEPTH = 18;

  constructor(onMessage: (msg: AtlasMessage) => void) {
    this.onMessage = onMessage;
  }

  async init(): Promise<void> {
    if (this.isReady) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      this.initResolve = resolve;
      try {
        this.worker = new Worker('./stockfish.js');

        this.worker.onerror = (err) => {
          console.error('[AtlasEngine] Worker error:', err);
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
              if (this.initResolve) { this.initResolve(); this.initResolve = null; }
            } else if (msg.startsWith('info ')) {
              this.parseInfoLine(msg);
            } else if (msg.startsWith('bestmove')) {
              this.isSearching = false;
              if (this.pendingSearch) { this.executePendingSearch(); return; }
              const match = msg.match(/bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);
              if (match && this.isThinkingForMove) {
                this.isThinkingForMove = false;
                const elapsed = performance.now() - this.searchStartTime;
                const waitTime = Math.max(0, this.targetDelayMs - elapsed);
                this.moveTimeout = setTimeout(() => {
                  this.onMessage({ type: 'bestmove', move: match[1], ponder: match[2] });
                }, waitTime);
              }
            }
          }
        };

        this.worker.postMessage('uci');
        this.worker.postMessage('setoption name UCI_LimitStrength value true');
        this.worker.postMessage(`setoption name Skill Level value ${AtlasEngine.SKILL_LEVEL}`);
        this.worker.postMessage('setoption name Threads value 2');
        this.worker.postMessage('setoption name Hash value 128');
        this.worker.postMessage('setoption name MultiPV value 1');
        // Contempt positivo: Atlas lucha por la victoria y evita bucles de tablas
        this.worker.postMessage('setoption name Contempt value 20');
        this.worker.postMessage('ucinewgame');
      } catch (err) {
        console.error('[AtlasEngine] Init failed:', err);
        resolve();
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
    const nodesMatch = msg.match(/nodes\s+(\d+)/);
    const npsMatch = msg.match(/nps\s+(\d+)/);
    const timeMatch = msg.match(/time\s+(\d+)/);
    if (!depthMatch || (!cpMatch && !mateMatch) || !pvMatch) return;
    const depth = parseInt(depthMatch[1], 10);
    const multiplier = this.currentTurnColor === 'w' ? 1 : -1;
    const multiIdx = multiMatch ? parseInt(multiMatch[1], 10) : 1;
    const stats = { nodes: nodesMatch ? parseInt(nodesMatch[1], 10) : 0, nps: npsMatch ? parseInt(npsMatch[1], 10) : 0, time: timeMatch ? parseInt(timeMatch[1], 10) : 0 };
    let scoreCp = 0, mateIn: number | undefined = undefined;
    if (cpMatch) { scoreCp = parseInt(cpMatch[1], 10) * multiplier; }
    else if (mateMatch) { mateIn = parseInt(mateMatch[1], 10) * multiplier; scoreCp = mateIn > 0 ? 10000 : -10000; }
    if (multiIdx === 1) this.currentVariations = {};
    this.currentVariations[multiIdx] = { id: multiIdx, score: scoreCp, mate: mateIn, depth, pv: pvMatch[1] };
    const now = performance.now();
    if (now - this.lastEvalTime > 50) {
      this.lastEvalTime = now;
      this.onMessage({ type: 'evaluation', score: scoreCp, mate: mateIn, depth, pv: pvMatch[1], variations: Object.values(this.currentVariations), stats });
    }
  }

  private executePendingSearch() {
    if (!this.pendingSearch || !this.worker) return;
    const { fen, searchDepth, times, targetDelayMs } = this.pendingSearch;
    this.pendingSearch = null;
    this.isSearching = true;
    this.isThinkingForMove = true;
    this.worker.postMessage('position fen ' + fen);
    const actualDepth = Math.min(searchDepth, AtlasEngine.MAX_DEPTH);
    if (targetDelayMs > 0) {
      this.worker.postMessage(`go depth ${actualDepth} movetime ${targetDelayMs}`);
    } else if (times) {
      this.worker.postMessage(`go depth ${actualDepth} wtime ${times.wtime} btime ${times.btime} winc ${times.winc} binc ${times.binc}`);
    } else {
      this.worker.postMessage(`go depth ${actualDepth}`);
    }
  }

  findBestMove(fen: string, color: 'w' | 'b', searchDepth: number = 12, times?: { wtime: number; btime: number; winc: number; binc: number }, delayMs: number = 500) {
    if (!this.worker) return;
    this.searchStartTime = performance.now();
    let targetDelayMs = delayMs;
    if (times) { const remaining = color === 'w' ? times.wtime : times.btime; targetDelayMs = Math.floor(Math.min(delayMs, Math.max(0, remaining / 20))); }
    this.targetDelayMs = targetDelayMs;
    this.currentVariations = {};
    this.currentTurnColor = color;
    this.pendingSearch = { fen, searchDepth, times, targetDelayMs };
    if (this.isSearching) { this.stop(false); } else { this.executePendingSearch(); }
  }

  evaluate(fen: string, color: 'w' | 'b', searchDepth: number = 8) {
    if (!this.worker) return;
    this.currentVariations = {};
    this.currentTurnColor = color;
    this.worker.postMessage('stop');
    this.worker.postMessage('position fen ' + fen);
    this.worker.postMessage('go depth ' + Math.min(searchDepth, 12));
  }

  stop(clearPending = true) {
    this.isThinkingForMove = false;
    if (clearPending) this.pendingSearch = null;
    if (this.moveTimeout) { clearTimeout(this.moveTimeout); this.moveTimeout = null; }
    this.worker?.postMessage('stop');
  }

  quit() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }

  terminate() { this.quit(); }
}