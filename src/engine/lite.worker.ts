/**
 * lite.worker.ts — GM-Lite Worker
 * Toda la búsqueda minimax corre en este hilo separado para no bloquear
 * la UI ni los relojes del juego.
 */
import { Chess } from "chess.js";

// ---------------------------------------------------------------------------
// Tipos de mensajes (entrada → desde LiteEngine.ts)
// ---------------------------------------------------------------------------
type InMessage =
  | { type: "findBestMove"; fen: string; color: "w" | "b"; searchDepth: number; movetime?: number }
  | { type: "evaluate";     fen: string; color: "w" | "b"; depth: number }
  | { type: "stop" };

// ---------------------------------------------------------------------------
// Tablas de valores y posición
// ---------------------------------------------------------------------------
const PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000,
};

const PST: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

// ---------------------------------------------------------------------------
// Estado del worker
// ---------------------------------------------------------------------------
let isSearching = false;
let nodesSearched = 0;

// ---------------------------------------------------------------------------
// Evaluación estática (desde la perspectiva de las blancas)
// ---------------------------------------------------------------------------
function evaluatePosition(game: Chess): number {
  const board = game.board();
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const pv = PIECE_VALUES[piece.type] || 0;
      const pstIdx = piece.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
      const posv = PST[piece.type]?.[pstIdx] || 0;
      score += piece.color === "w" ? pv + posv : -(pv + posv);
    }
  }

  // Bono pequeño por movilidad
  score += (game.turn() === "w" ? 1 : -1) * game.moves().length * 2;
  return score;
}

// ---------------------------------------------------------------------------
// Minimax con poda alfa-beta
// ---------------------------------------------------------------------------
let searchTimeLimit = 0;
let searchStartTime = 0;

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
): number {
  // Permitir interrupción si se llamó stop()
  if (!isSearching) return 0;
  
  if (searchTimeLimit > 0 && performance.now() - searchStartTime > searchTimeLimit) {
      isSearching = false;
      return 0;
  }

  nodesSearched++;

  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return isMaximizing ? -99999 : 99999;
    if (game.isDraw()) return 0;
    return evaluatePosition(game);
  }

  const moves = game.moves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      if (!isSearching) break;
      game.move(m);
      const val = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      if (!isSearching) break;
      game.move(m);
      const val = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ---------------------------------------------------------------------------
// Mapeo de profundidad → parámetros de búsqueda internos
// ---------------------------------------------------------------------------
function getSearchParams(depth: number): {
  searchDepth: number;
  noise: number;
  blunderChance: number;
} {
  // profundidad 1  → ELO ~200  : búsqueda 1, mucho ruido
  // profundidad 5  → ELO ~500  : búsqueda 1, ruido medio
  // profundidad 10 → ELO ~800  : búsqueda 2, algo de ruido
  // profundidad 15 → ELO ~1000 : búsqueda 3, ruido ligero
  // profundidad 20 → ELO ~1100 : búsqueda 3, ruido mínimo
  // profundidad 25 → ELO ~1200 : búsqueda 4, ruido ínfimo
  if (depth <= 3)  return { searchDepth: 1, noise: 500, blunderChance: 0.35 };
  if (depth <= 6)  return { searchDepth: 1, noise: 300, blunderChance: 0.25 };
  if (depth <= 9)  return { searchDepth: 2, noise: 200, blunderChance: 0.15 };
  if (depth <= 12) return { searchDepth: 2, noise: 100, blunderChance: 0.08 };
  if (depth <= 16) return { searchDepth: 3, noise: 60,  blunderChance: 0.04 };
  if (depth <= 20) return { searchDepth: 3, noise: 30,  blunderChance: 0.02 };
  return             { searchDepth: 4, noise: 15,  blunderChance: 0.01 };
}

// ---------------------------------------------------------------------------
// Búsqueda del mejor movimiento
// ---------------------------------------------------------------------------
function handleFindBestMove(fen: string, color: "w" | "b", searchDepth: number, movetime?: number) {
  isSearching = true;
  nodesSearched = 0;
  searchTimeLimit = movetime || 0;
  searchStartTime = performance.now();

  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return;

  const startTime = searchStartTime;
  const { searchDepth: sd, noise, blunderChance } = getSearchParams(searchDepth);
  const isMaximizing = color === "w";

  // Puntuar cada movimiento legal
  const scored = moves.map((move) => {
    if (!isSearching) return { move, rawScore: 0, noisyScore: 0 };
    game.move(move);
    const raw = minimax(game, sd - 1, -Infinity, Infinity, !isMaximizing);
    game.undo();
    const noisy = raw + (Math.random() * 2 - 1) * noise;
    return { move, rawScore: raw, noisyScore: noisy };
  });

  // Si se agotó el tiempo, asegurarse de tener al menos las puntuaciones por defecto
  // y permitir el flujo siguiente para emitir el movimiento guardado.

  // Ordenar mejor primero para el bando que mueve
  scored.sort((a, b) =>
    isMaximizing ? b.noisyScore - a.noisyScore : a.noisyScore - b.noisyScore,
  );

  // Error deliberado ocasional en niveles bajos
  let chosen = scored[0];
  if (Math.random() < blunderChance && scored.length > 2) {
    const half = Math.floor(scored.length / 2);
    chosen = scored[half + Math.floor(Math.random() * (scored.length - half))];
  }

  const elapsed = performance.now() - startTime;

  // Emitir evaluación
  self.postMessage({
    type: "evaluation",
    score: chosen.rawScore,
    depth: sd,
    pv: chosen.move.lan,
    variations: scored.slice(0, 5).map((s, i) => ({
      id: i + 1,
      score: s.rawScore,
      depth: sd,
      pv: s.move.lan,
    })),
    stats: {
      nodes: nodesSearched,
      nps: Math.floor(nodesSearched / ((elapsed || 1) / 1000)),
      time: Math.floor(elapsed),
    },
  });

  // Emitir el mejor movimiento
  if (!chosen && scored.length > 0) chosen = scored[0];
  if (!chosen) chosen = { move: moves[0], rawScore: 0, noisyScore: 0 };
  
  self.postMessage({ type: "bestmove", move: chosen.move.lan });

  isSearching = false;
}

// ---------------------------------------------------------------------------
// Evaluación estática de posición (para análisis en segundo plano)
// ---------------------------------------------------------------------------
function handleEvaluate(fen: string, _color: "w" | "b", depth: number) {
  const game = new Chess(fen);
  nodesSearched = 0;
  const startTime = performance.now();

  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return;

  const currentIsWhite = game.turn() === "w";
  const sd = Math.min(depth, 3);

  const scored = moves.map((move) => {
    game.move(move);
    const score = minimax(game, sd - 1, -Infinity, Infinity, !currentIsWhite);
    game.undo();
    return { move, score };
  });

  scored.sort((a, b) =>
    currentIsWhite ? b.score - a.score : a.score - b.score,
  );

  const elapsed = performance.now() - startTime;
  const bestScore = scored[0]?.score || 0;

  self.postMessage({
    type: "evaluation",
    score: bestScore,
    depth: sd,
    pv: scored[0]?.move.lan || "",
    variations: scored.slice(0, 5).map((s, i) => ({
      id: i + 1,
      score: s.score,
      depth: sd,
      pv: s.move.lan,
    })),
    stats: {
      nodes: nodesSearched,
      nps: Math.floor(nodesSearched / ((elapsed || 1) / 1000)),
      time: Math.floor(elapsed),
    },
  });
}

// ---------------------------------------------------------------------------
// Escuchar mensajes del hilo principal
// ---------------------------------------------------------------------------
self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;

  if (msg.type === "stop") {
    isSearching = false;
    return;
  }

  if (msg.type === "findBestMove") {
    handleFindBestMove(msg.fen, msg.color, msg.searchDepth, msg.movetime);
    return;
  }

  if (msg.type === "evaluate") {
    handleEvaluate(msg.fen, msg.color, msg.depth);
    return;
  }
};
