/**
 * LiteEngine.ts — GM-Lite (wrapper del hilo principal)
 *
 * Esta clase es un proxy ligero: toda la búsqueda minimax ocurre en
 * lite.worker.ts (un Web Worker separado) para que el hilo principal
 * permanezca libre → drag-and-drop fluido, relojes funcionando, sin
 * "piezas fantasma".
 *
 * La interfaz pública es idéntica a StockfishEngineWhite/Black para
 * que App.tsx pueda intercambiar motores sin cambios.
 */

export type LiteEngineMessage =
  | {
      type: "evaluation";
      score: number;
      mate?: number;
      depth: number;
      pv?: string;
      variations: {
        id: number;
        score: number;
        mate?: number;
        depth: number;
        pv: string;
      }[];
      stats?: { nodes: number; nps: number; time: number };
    }
  | {
      type: "bestmove";
      move: string;
      ponder?: string;
    };

export class LiteEngine {
  private worker: Worker | null = null;
  private onMessage: (msg: LiteEngineMessage) => void;
  private searchStartTime = 0;
  private targetDelayMs = 0;
  private moveTimeout: NodeJS.Timeout | null = null;
  public isThinkingForMove = false;

  public isReady = false;
  public initPromise: Promise<void> | null = null;

  constructor(onMessage: (msg: LiteEngineMessage) => void) {
    this.onMessage = onMessage;
  }

  /**
   * Inicializar el Web Worker. Debe llamarse una vez antes de usar el motor.
   */
  async init(): Promise<void> {
    if (this.worker) {
       this.isReady = true;
       return Promise.resolve();
    }

    // Vite empaqueta lite.worker.ts con sus dependencias (chess.js) automáticamente
    this.worker = new Worker(
      new URL("./lite.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = (e: MessageEvent<LiteEngineMessage>) => {
      const msg = e.data;
      if (msg.type === "bestmove") {
        if (this.isThinkingForMove) {
          this.isThinkingForMove = false;
          const elapsed = performance.now() - this.searchStartTime;
          const waitTime = Math.max(0, this.targetDelayMs - elapsed);
          this.moveTimeout = setTimeout(() => {
            this.onMessage(msg);
          }, waitTime);
        }
      } else {
        this.onMessage(msg);
      }
    };

    this.worker.onerror = (err) => {
      console.error("[LiteEngine] Error en el worker:", err);
    };

    this.isReady = true;
    return Promise.resolve();
  }

  /**
   * Calcular y devolver el mejor movimiento (para el turno de la IA).
   * La firma es compatible con StockfishEngineWhite/Black.
   */
  findBestMove(
    fen: string,
    color: "w" | "b",
    searchDepth: number = 10,
    times?: { wtime: number; btime: number; winc: number; binc: number },
    delayMs: number = 500
  ) {
    if (!this.worker) return;
    this.stop(); // Stop any previous search and clear timeouts
    this.searchStartTime = performance.now();
    this.isThinkingForMove = true;
    
    if (times) {
       const remaining = color === 'w' ? times.wtime : times.btime;
       const maxSafeDelay = Math.max(0, remaining / 20);
       this.targetDelayMs = Math.floor(Math.min(delayMs, maxSafeDelay));
    } else {
       this.targetDelayMs = delayMs;
    }
    // Detener cualquier búsqueda anterior antes de comenzar una nueva
    this.worker.postMessage({ type: "stop" });
    this.worker.postMessage({ type: "findBestMove", fen, color, searchDepth, movetime: this.targetDelayMs });
  }

  evaluate(fen: string, color: "w" | "b", depth: number = 3) {
    if (!this.worker) return;
    this.worker.postMessage({ type: "stop" });
    this.worker.postMessage({ type: "evaluate", fen, color, depth });
  }

  stop() {
    this.isThinkingForMove = false;
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
      this.moveTimeout = null;
    }
    this.worker?.postMessage({ type: "stop" });
  }

  /**
   * Terminar el worker permanentemente (libera recursos).
   */
  quit() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
  }

  /** Alias para compatibilidad con la interfaz StockfishEngine */
  terminate() {
    this.quit();
  }
}
