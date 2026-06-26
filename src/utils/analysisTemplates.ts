import { Chess } from "chess.js";

export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder"
  | "book";

// Textos base para la clasificación pura
const CLASSIFICATION_TEXTS: Record<MoveClassification, string[]> = {
  brilliant: [
    "¡Brillante! Esta combinación no es fácil de ver.",
    "¡Sacrificio excepcional! Has visto más allá del material.",
    "¡Excelente! Has sacrificado material para un ataque decisivo.",
    "¡Magistral! Una jugada que requiere gran visión táctica.",
    "¡Espectacular! Has encontrado la clave de la posición.",
  ],
  great: [
    "¡Excelente decisión! Has encontrado la mejor continuación.",
    "Muy bien calculado. Esta jugada es clave en esta posición.",
    "¡Precisión quirúrgica! Has elegido el camino correcto.",
    "Excelente. Has mantenido la ventaja con una jugada precisa.",
    "¡Muy fuerte! Esta jugada crea problemas serios a tu oponente.",
  ],
  best: [
    "La mejor jugada. Has mantenido la precisión.",
    "Correcto. Esta es la continuación más fuerte.",
    "Bien jugado. Has elegido la opción más sólida.",
    "Preciso. Has seguido el plan correcto.",
    "Excelente. Has encontrado la jugada del motor.",
  ],
  excellent: [
    "¡Excelente movimiento! Una opción muy sólida.",
    "Gran visión. Has presionado al rival con eficacia.",
    "Jugada sobresaliente. Has captado los matices ocultos.",
    "Has mejorado significativamente tu posición. ¡Bravo!",
  ],
  good: [
    "Buena jugada. La posición se mantiene equilibrada.",
    "Sólido. Has desarrollado tus piezas correctamente.",
    "Bien. Has seguido los principios de la posición.",
    "Correcto. Una jugada que mejora tu posición.",
    "Adecuado. Has mantenido la estabilidad posicional.",
  ],
  book: [
    "Excelente desarrollo. Has controlado el centro.",
    "Bien. Has enrocado temprano y desarrollado tus piezas.",
    "Correcto. Sigues los principios de apertura clásicos.",
    "Muy bien. Has creado una estructura de peones sólida.",
  ],
  inaccuracy: [
    "Podrías haber sido más preciso. Hay una jugada ligeramente mejor.",
    "No es el mejor movimiento, pero la posición sigue siendo jugable.",
    "Pequeña imprecisión. Considera desarrollar otra pieza antes.",
    "Hay una opción un poco mejor, pero esto es aceptable.",
    "No es óptimo, pero no compromete tu posición gravemente.",
  ],
  mistake: [
    "Error. Has perdido una ventaja importante.",
    "No es bueno. Esta jugada debilita tu posición significativamente.",
    "Has cometido un error. Tu oponente ahora tiene mejores posibilidades.",
    "Mala decisión. Has perdido el control de la posición.",
    "Error táctico. Deberías haber calculado mejor las consecuencias.",
  ],
  blunder: [
    "¡Error grave! Has perdido material crucial o permitido una gran ventaja.",
    "¡Desastre! Esta jugada compromete la partida.",
    "¡Metedura de pata! Has dejado una pieza sin defensa o tu rey expuesto.",
    "Grave error. Has pasado de ganar a sufrir.",
    "¡Terrible! Has permitido una combinación fuerte.",
    "Error catastrófico. La posición está ahora muy difícil.",
  ],
};

function getRandomElement(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function classifyMove(
  deltaCp: number,
  currentEval: number,
  isCapture: boolean = false,
  isSacrifice: boolean = false,
): MoveClassification {
  // deltaCp > 0 significa que mejoró la posición respecto a lo esperado.
  // deltaCp < 0 significa que empeoró la posición respecto a lo esperado.

  if (deltaCp <= -100) return "blunder";
  if (deltaCp <= -50) return "mistake";
  if (deltaCp <= -25) return "inaccuracy";
  if (
    deltaCp >= -10 &&
    deltaCp <= 0 &&
    isCapture === false &&
    isSacrifice === false
  )
    return "best";

  // Brillante: Sacrificio de material pero evaluación mejora o se mantiene bien (+/- pequeña pérdida permitida)
  if (isSacrifice && deltaCp >= -50 && currentEval > 100) return "brilliant";

  // Excelente: Mantiene ventaja compleja o es la única jugada buena (delta cercano a 0 pero en posiciones agudas)
  if (deltaCp >= -10 && Math.abs(currentEval) > 150) return "great";

  if (deltaCp > 0) return "best";

  // -10 a -25cp
  return "good";
}

export function generateMasterComment(
  fenBefore: string,
  fenAfter: string,
  moveObj: any,
  moveIndex: number,
  evalBefore: number,
  evalAfter: number,
): { comment: string; classification: MoveClassification } {
  const isWhite = moveIndex % 2 === 0;

  // Calcular delta desde la perspectiva del jugador que mueve
  // Si juegan blancas, evalAfter > evalBefore es bueno (delta positivo).
  // Si juegan negras, evalAfter < evalBefore es bueno (delta positivo).
  const delta = isWhite ? evalAfter - evalBefore : evalBefore - evalAfter;

  // Analizar la jugada usando Chess.js para ver si es captura o movimiento de piezas
  let isCapture = false;
  let isCheck = false;
  let pieceMoved = "p";
  try {
    const cb = new Chess(fenBefore);
    const p = cb.get(moveObj.from as any);
    if (p) pieceMoved = p.type;
    const move = cb.move(moveObj);
    if (move) {
      isCapture = move.captured != null;
      isCheck = cb.inCheck();
    }
  } catch (e) {}

  // Aproximar si hubo sacrificio (evaluación buena pero material entregado no recuperado inmediatamente)
  // Esto requeriría árbol táctico real, lo aproximamos por ahora.
  const isSacrifice =
    !isCapture && delta > -50 && delta < 0 && Math.abs(evalAfter) > 200;

  // Fase del juego
  const fullMoves = Math.floor(moveIndex / 2) + 1;
  let phase = "opening";
  if (fullMoves > 10) phase = "middlegame";
  if (fullMoves > 40) phase = "endgame";

  // Libro de aperturas (muy simplificado)
  if (phase === "opening" && moveIndex < 10 && delta > -15) {
    return {
      comment: getRandomElement(CLASSIFICATION_TEXTS["book"]),
      classification: "book",
    };
  }

  const classification = classifyMove(delta, evalAfter, isCapture, isSacrifice);
  let baseComment = getRandomElement(CLASSIFICATION_TEXTS[classification]);

  // Añadir comentarios de fase o evaluación
  let extraComment = "";

  // Caída brusca
  if (delta <= -200) {
    extraComment = getRandomElement([
      "¡Tu evaluación ha caído 2 peones en una jugada!",
      "Has pasado de una buena posición a perder el control en un movimiento.",
      "Error grave. La evaluación se ha desplomado.",
    ]);
  } else if (delta >= 150 && evalBefore <= 0 && evalAfter > 50) {
    // Recuperación
    extraComment = getRandomElement([
      "¡Excelente recuperación! Has vuelto a la partida.",
      "Has encontrado la jugada que salvaba la posición.",
      "Gran defensa. Has estabilizado la posición.",
    ]);
  } else if (classification === "great" || classification === "brilliant") {
    if (phase === "endgame")
      extraComment =
        "Técnica impecable. Has convertido la ventaja con precisión en este final.";
    else if (phase === "middlegame")
      extraComment = "Excelente coordinación de piezas. Tienen gran actividad.";
  }

  // Unir ambos
  const finalComment = extraComment
    ? `${baseComment} ${extraComment}`
    : baseComment;

  return { comment: finalComment, classification };
}
