/**
 * Utilidades para exploración de aperturas usando la API de Lichess
 * https://explorer.lichess.org
 */

import { Chess } from "chess.js";
import { getOpeningNameFromFen } from "./openingRecognition";

export interface OpeningInfo {
  name: string;
  eco: string;
  stats: {
    whites: number;
    blacks: number;
    draws: number;
    total: number;
    whiteWinRate: string;
    drawRate: string;
    blackWinRate: string;
  };
  recentGames?: any[];
  nextMoves?: MoveStatistic[];
}

export interface MoveStatistic {
  move: string;
  san: string;
  uci: string;
  whites: number;
  blacks: number;
  draws: number;
  total: number;
  whiteWinRate: string;
  drawRate: string;
  blackWinRate: string;
  opening?: {
    eco: string;
    name: string;
  };
}

/**
 * Convierte movimientos en notación SAN a UCI
 */
export function convertSanToUci(sanMoves: string[]): string[] {
  const chess = new Chess();
  const uciMoves: string[] = [];

  for (const sanMove of sanMoves) {
    try {
      const move = chess.move(sanMove);
      if (move) {
        uciMoves.push(move.from + move.to);
      }
    } catch (e) {
      console.error(`Error converting SAN move: ${sanMove}`, e);
    }
  }

  return uciMoves;
}

/**
 * Detecta la apertura actual desde la API de Lichess Masters
 */
export async function detectOpeningFromLichess(
  sanMovesArray: string[]
): Promise<OpeningInfo | null> {
  // Intentar primero detección local por ECO (rápido, sin red)
  const chess = new Chess();
  for (const san of sanMovesArray) {
    try {
      const result = chess.move(san);
      if (!result) break;
    } catch { break; }
  }
  const fen = chess.fen();
  const localName = getOpeningNameFromFen(fen);
  if (!localName) {
    console.debug(`[Opening] No local ECO match for FEN: ${fen}`);
  }

  try {
    const uciMoves = convertSanToUci(sanMovesArray);
    if (uciMoves.length === 0) {
      return localName ? { name: localName, eco: "—", stats: { whites: 0, blacks: 0, draws: 0, total: 0, whiteWinRate: "0%", drawRate: "0%", blackWinRate: "0%" } } : null;
    }

    const params = new URLSearchParams({
      play: uciMoves.join(","),
    });

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const lichessToken = typeof window !== "undefined" ? localStorage.getItem("chess_lichessToken") : null;
    if (lichessToken) {
      headers["Authorization"] = `Bearer ${lichessToken}`;
    }

    const response = await fetch(
      `https://explorer.lichess.org/masters?${params}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.opening) {
      return localName ? { name: localName, eco: "—", stats: { whites: 0, blacks: 0, draws: 0, total: 0, whiteWinRate: "0%", drawRate: "0%", blackWinRate: "0%" } } : null;
    }

    const apiName = data.opening.name || localName || "Apertura desconocida";

    const stats = {
      whites: data.white || 0,
      blacks: data.black || 0,
      draws: data.draws || 0,
      total: (data.white || 0) + (data.black || 0) + (data.draws || 0),
      whiteWinRate: "0%",
      drawRate: "0%",
      blackWinRate: "0%",
    };

    if (stats.total > 0) {
      stats.whiteWinRate = ((stats.whites / stats.total) * 100).toFixed(1) + "%";
      stats.drawRate = ((stats.draws / stats.total) * 100).toFixed(1) + "%";
      stats.blackWinRate = ((stats.blacks / stats.total) * 100).toFixed(1) + "%";
    }

    const nextMoves: MoveStatistic[] = (data.moves || [])
      .slice(0, 10)
      .map((move: any) => ({
        move: move.san || "",
        san: move.san || "",
        uci: move.uci || "",
        whites: move.white || 0,
        blacks: move.black || 0,
        draws: move.draws || 0,
        total: (move.white || 0) + (move.black || 0) + (move.draws || 0),
        whiteWinRate:
          (move.white || 0) + (move.black || 0) + (move.draws || 0) > 0
            ? (
                ((move.white || 0) /
                  ((move.white || 0) +
                    (move.black || 0) +
                    (move.draws || 0))) *
                100
              ).toFixed(1) + "%"
            : "0%",
        drawRate:
          (move.white || 0) + (move.black || 0) + (move.draws || 0) > 0
            ? (
                ((move.draws || 0) /
                  ((move.white || 0) +
                    (move.black || 0) +
                    (move.draws || 0))) *
                100
              ).toFixed(1) + "%"
            : "0%",
        blackWinRate:
          (move.white || 0) + (move.black || 0) + (move.draws || 0) > 0
            ? (
                ((move.black || 0) /
                  ((move.white || 0) +
                    (move.black || 0) +
                    (move.draws || 0))) *
                100
              ).toFixed(1) + "%"
            : "0%",
        opening: move.opening ? { eco: move.opening.eco, name: move.opening.name } : undefined,
      }));

    return {
      name: apiName,
      eco: data.opening.eco || "—",
      stats,
      nextMoves,
    };
  } catch (error) {
    console.error("[OpeningExplorer] Error detecting opening:", error);
    // Fallback: devolver datos locales si existen
    if (localName) {
      return { name: localName, eco: "—", stats: { whites: 0, blacks: 0, draws: 0, total: 0, whiteWinRate: "0%", drawRate: "0%", blackWinRate: "0%" } };
    }
    return null;
  }
}

/**
 * Comentarios pedagógicos por fase del juego en español latino
 */
export const pedagogicalComments: Record<string, string[]> = {
  opening: [
    "💡 En la apertura, el objetivo es controlar el centro y desarrollar las piezas de forma armónica.",
    "♖ Recuerda respetar los principios fundamentales: controla el centro, desarrolla tus piezas y enroca temprano.",
    "🎯 Esta es una apertura sólida que ha sido jugada por campeones mundiales.",
    "📚 En esta línea, la idea estratégica es establecer presión sobre el centro.",
    "⚔️ Aquí se busca romper la simetría y obtener una ventaja de desarrollo.",
  ],
  middlegame: [
    "🎭 En el medio juego, busca activar tus piezas y crear debilidades en el campo enemigo.",
    "💪 Es momento de ejecutar tu plan estratégico con movimientos tácticos precisos.",
    "🔥 Considera los sacrificios posicionales para obtener compensación dinámica.",
    "🧠 Analiza los cambios de piezas - ¿te favorecen o perjudican en esta posición?",
    "⚡ Crea amenazas múltiples para que el contrario no pueda defenderlas todas.",
  ],
  endgame: [
    "👑 En el final, la actividad de las piezas es primordial. Centraliza tu rey.",
    "🏁 Los peones pasados son la medida de todas las cosas en el final.",
    "🎲 Busca promocionar tus peones o controlar los del enemigo.",
    "🛡️ La defensa pasiva es insuficiente en el final. Toma la iniciativa.",
    "🎪 Calcula con precisión - en el final, cada tiempo cuenta.",
  ],
  positional: [
    "📍 Esta es una decisión posicional importante. Considera la estructura de peones a largo plazo.",
    "🌳 Mejora la posición de tus piezas de forma gradual y constante.",
    "🔗 Identifica los puntos débiles en la posición de tu contrario.",
    "🎯 Juega contra el plan del oponente mientras ejecutas el tuyo.",
  ],
  tactical: [
    "💥 ¡Oportunidad táctica! Busca combinaciones y temas de táctica como clavadas, bifurcaciones y rayos X.",
    "🎪 Revisa si hay sacrificios posibles que te lleven a un ataque ganador.",
    "⚡ Cuidado con las amenazas del contrario - no olvides calcular variantes defensivas.",
  ],
};

/**
 * Genera un comentario pedagógico basado en la fase del juego
 */
export function generatePedagogicalComment(moveNumber: number, isOpeningPhase: boolean, isTactical = false): string {
  const comments = isTactical
    ? pedagogicalComments.tactical
    : isOpeningPhase
      ? pedagogicalComments.opening
      : moveNumber < 20
        ? pedagogicalComments.middlegame
        : pedagogicalComments.endgame;

  return comments[Math.floor(Math.random() * comments.length)];
}

/**
 * Traduce nombres de aperturas comunes al español latino
 */
export function translateOpeningName(englishName: string): string {
  const translations: Record<string, string> = {
    // Italianas
    "Italian Game": "Juego Italiano",
    "Italian Game: Classical Variation": "Juego Italiano: Variante Clásica",
    "Italian Game: Two Knights Defense": "Juego Italiano: Defensa de los Dos Caballos",
    "Italian Game: Giuoco Piano": "Juego Italiano: Giuoco Piano",

    // Españolas
    "Ruy Lopez": "Apertura Española",
    "Ruy Lopez: Open": "Española: Variante Abierta",
    "Ruy Lopez: Closed": "Española: Variante Cerrada",
    "Ruy Lopez: Berlin Defense": "Española: Defensa Berlín",
    "Ruy Lopez: Morphy Defense": "Española: Defensa Morphy",

    // Francesas
    "French Defense": "Defensa Francesa",
    "French Defense: Winawer": "Defensa Francesa: Variante Winawer",
    "French Defense: Classical": "Defensa Francesa: Clásica",
    "French Defense: Tarrasch": "Defensa Francesa: Variante Tarrasch",

    // Sicilianas
    "Sicilian Defense": "Defensa Siciliana",
    "Sicilian Defense: Najdorf": "Defensa Siciliana: Variante Najdorf",
    "Sicilian Defense: Dragon": "Defensa Siciliana: Variante del Dragón",
    "Sicilian Defense: Closed": "Defensa Siciliana: Sistema Cerrado",
    "Sicilian Defense: Open": "Defensa Siciliana: Variante Abierta",
    "Sicilian Defense: Accelerated Dragon": "Defensa Siciliana: Dragón Acelerado",
    "Sicilian Defense: Main Line": "Defensa Siciliana: Línea Principal",

    // Indias
    "Indian Defense": "Defensa India",
    "King's Indian Defense": "Defensa India del Rey",
    "King's Indian Defense: Main Line": "Defensa India del Rey: Línea Principal",
    "Queen's Indian Defense": "Defensa India de Dama",

    // Gambito de Dama
    "Queen's Gambit": "Gambito de Dama",
    "Queen's Gambit Accepted": "Gambito de Dama Aceptado",
    "Queen's Gambit Declined": "Gambito de Dama Rechazado",
    "Queen's Gambit Declined: Meran": "Gambito de Dama Rechazado: Meran",
    "Queen's Gambit Declined: Semi-Slav": "Gambito de Dama Rechazado: Semieslava",

    // Otras
    "Caro-Kann Defense": "Defensa Caro-Kann",
    "Scandinavian Defense": "Defensa Escandinava",
    "Alekhine's Defense": "Defensa Alekhine",
    "Pirc Defense": "Defensa Pirc",
    "English Opening": "Apertura Inglesa",
    "Reti Opening": "Apertura Reti",
    "Bird's Opening": "Apertura Bird",
    "Zukertort Opening": "Apertura Zukertort",
    "London System": "Sistema Londres",
    "Catalan Opening": "Apertura Catalana",
    "Catalan Opening: Open": "Apertura Catalana: Variante Abierta",
    "Catalan Opening: Closed": "Apertura Catalana: Variante Cerrada",
  };

  return translations[englishName] || englishName;
}
