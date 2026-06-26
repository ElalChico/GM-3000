/**
 * AssistStockfish.ts
 *
 * Motor Stockfish independiente y dedicado exclusivamente al modo de asistencia.
 * No comparte estado, instancia ni hilo con ningun otro motor de la aplicacion.
 *
 * Uso:
 *   const assist = new AssistStockfish((move) => executeMove(move));
 *   await assist.init();
 *   assist.requestBestMove(fen, color, depth);
 *   assist.stop(); // Cancela busqueda en curso
 *   assist.destroy(); // Libera el worker al desmontar
 */

export type AssistCallback = (move: string) => void;

export class AssistStockfish {
  private worker: Worker | null = null;
  private onMove: AssistCallback;
  private isSearching = false;
  private bestMovePromise: Promise<void> | null = null;
  private bestMovePromiseResolve: (() => void) | null = null;
  private bestMoveTimeout: ReturnType<typeof window.setTimeout> | null = null;

  public isReady = false;
  public initPromise: Promise<void> | null = null;

  constructor(onMove: AssistCallback) {
    this.onMove = onMove;
  }

  // --------------------------------------------------------------------------
  // Inicializacion
  // --------------------------------------------------------------------------

  async init(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve) => {
      try {
        this.worker = new Worker("./stockfish.js");

        this.worker.onerror = (err) => {
          console.error("[AssistStockfish] Error en worker:", err);
          this.worker = null;
          this.isReady = false;
          this.initPromise = null;
          resolve();
        };

        this.worker.onmessage = (e) => {
          const msg: string = e.data;
          if (typeof msg !== "string") return;

//           console.log("[AssistStockfish] Mensaje recibido:", msg.substring(0, 50));

          if (msg === "uciok") {
            // Asistencia: usar más threads pero limitar hash (es modo análisis, no crítico para tiempo)
            const threads = Math.min(navigator.hardwareConcurrency || 4, 6);
            this.worker?.postMessage(`setoption name Threads value ${threads}`);
            this.worker?.postMessage("setoption name Hash value 256"); // 256MB para análisis de asistencia
            this.worker?.postMessage("setoption name UCI_LimitStrength value false");
            this.worker?.postMessage("isready");
          } else if (msg === "readyok") {
            this.isReady = true;
//            console.log("[AssistStockfish] Motor listo");
            resolve();
          } else if (msg.startsWith("bestmove") && this.isSearching) {
//            console.log("[AssistStockfish] Bestmove recibido:", msg);
            this.isSearching = false;
            const parts = msg.split(" ");
            const bestMove = parts[1];
//            console.log("[AssistStockfish] Mejor movimiento extraído:", bestMove);
            if (bestMove && bestMove !== "(none)") {
  //            console.log("[AssistStockfish] Ejecutando callback con movimiento:", bestMove);
              this.onMove(bestMove);
            } else {
              console.warn("[AssistStockfish] Movimiento inválido o none:", bestMove);
            }
            this.resolveBestMovePromise();
          }
        };

        this.worker.postMessage("uci");
      } catch (err) {
        console.error("[AssistStockfish] No se pudo crear el worker:", err);
        resolve();
      }
    });

    return this.initPromise;
  }

  // --------------------------------------------------------------------------
  // Busqueda
  // --------------------------------------------------------------------------

  /**
   * Solicita el mejor movimiento para la posicion dada.
   * Automaticamente cancela cualquier busqueda en curso antes de iniciar.
   * @param fen   Posicion actual en formato FEN
   * @param color Turno del jugador que recibe asistencia ('w' | 'b')
   * @param depth Profundidad de busqueda (1-15, default: 12)
   */
  private resolveBestMovePromise(): void {
    if (this.bestMoveTimeout !== null) {
      clearTimeout(this.bestMoveTimeout);
      this.bestMoveTimeout = null;
    }
    if (this.bestMovePromiseResolve) {
      this.bestMovePromiseResolve();
      this.bestMovePromiseResolve = null;
      this.bestMovePromise = null;
    }
  }

  async requestBestMove(fen: string, color: "w" | "b", depth = 8): Promise<void> {
    if (!this.isReady) {
      await this.init();
    }

    if (!this.isReady || !this.worker) {
      console.warn("[AssistStockfish] Motor no disponible");
      return;
    }

    this.stop();

    this.isSearching = true;
    this.worker.postMessage("ucinewgame");
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${Math.min(Math.max(depth, 1), 15)}`);

    this.bestMovePromise = new Promise<void>((resolve) => {
      this.bestMovePromiseResolve = resolve;
      // Timeout más agresivo: 5 segundos en lugar de 12
      this.bestMoveTimeout = window.setTimeout(() => {
        console.warn("[AssistStockfish] Timeout alcanzado, deteniendo búsqueda");
        if (this.isSearching && this.worker) {
          this.worker.postMessage("stop");
          this.isSearching = false;
        }
        this.resolveBestMovePromise();
      }, 5000);
    });

    return this.bestMovePromise;
  }

  // --------------------------------------------------------------------------
  // Control
  // --------------------------------------------------------------------------

  /** Detiene la busqueda en curso sin destruir el worker */
  stop(): void {
    if (this.isSearching && this.worker) {
      this.worker.postMessage("stop");
      this.isSearching = false;
    }
    this.resolveBestMovePromise();
  }

  /** Libera el worker de forma segura. Llamar al desmontar el componente. */
  destroy(): void {
    this.stop();
    if (this.worker) {
      this.worker.postMessage("quit");
      this.worker.terminate();
      this.worker = null;
    }
    this.isReady = false;
    this.initPromise = null;
  }
}

// ---------------------------------------------------------------------------
// Singleton de sesion — una sola instancia compartida durante la vida de la app
// Se crea una unica vez y se reutiliza en cada solicitud de asistencia.
// ---------------------------------------------------------------------------

let _assistInstance: AssistStockfish | null = null;

export function getAssistEngine(onMove: AssistCallback): AssistStockfish {
  if (!_assistInstance) {
    _assistInstance = new AssistStockfish(onMove);
  } else {
    // Actualizar el callback sin destruir el worker
    (_assistInstance as any).onMove = onMove;
  }
  return _assistInstance;
}

export function destroyAssistEngine(): void {
  if (_assistInstance) {
    _assistInstance.destroy();
    _assistInstance = null;
  }
}
