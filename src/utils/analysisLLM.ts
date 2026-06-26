import { MoveClassification } from "./analysisTemplates";

export interface MoveExplanationOptions {
  fenBefore: string;
  fenAfter: string;
  bestMove?: string | null;
  userMove?: string | null;
  classification: MoveClassification;
  openingName?: string;
}

const CLASSIFICATION_EXPLANATIONS: Record<MoveClassification, string[]> = {
  brilliant: [
    "Esta jugada es muy fuerte y suele aparecer en posiciones tácticas decisivas.",
    "Has encontrado una continuación brillante que presiona al rival y mantiene la iniciativa.",
    "Excelente. Esta jugada explota claramente las debilidades del oponente."
  ],
  great: [
    "Muy buena jugada. Has mantenido la ventaja de forma segura.",
    "Has elegido una continuación muy sólida y con gran precisión.",
    "Fuerte. Esta jugada mejora la coordinación de tus piezas."
  ],
  best: [
    "La mejor jugada en esta posición. Has seguido lo que recomienda el motor.",
    "Correcto. Esta es la continuación más precisa en el tablero.",
    "Bien jugado. Has elegido la opción más fuerte disponible."
  ],
  good: [
    "Buena jugada. La posición sigue siendo equilibrada y sin riesgos graves.",
    "Has mantenido la estabilidad. Esta opción es práctica y segura.",
    "Una jugada sólida que respeta los principios posicionales."
  ],
  book: [
    "Sigues la teoría de apertura y estás en una línea conocida.",
    "Buen desarrollo. Esta jugada corresponde a una apertura clásica.",
    "Estás dentro de la teoría y la partida evoluciona en forma sólida."
  ],
  inaccuracy: [
    "Hay una continuación ligeramente mejor, pero la partida sigue siendo jugable.",
    "Imprecisión. Deberías buscar una jugada más activa o de desarrollo.",
    "No es el peor movimiento, pero existe una alternativa más precisa."
  ],
  mistake: [
    "Error. Has perdido parte de la ventaja y el rival gana actividad.",
    "Esta jugada debilita tu posición y puede dar iniciativa al adversario.",
    "Has cometido un error importante. Necesitas defenderte con cuidado." 
  ],
  blunder: [
    "¡Error grave! Has perdido material o permitido una combinación decisiva.",
    "Esta jugada compromete seriamente tu posición y suele ser fatal.",
    "Terrible error. El rival ahora tiene una ventaja decisiva."
  ]
};

function getRandomElement(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildMoveComparison(bestMove?: string | null, userMove?: string | null): string {
  if (!bestMove || !userMove) return "";
  if (bestMove === userMove) {
    return `Has jugado la mejor continuación disponible (${bestMove}). `;
  }
  return `El motor recomienda ${bestMove} en lugar de ${userMove}. `;
}

function buildOpeningPhrase(openingName?: string): string {
  if (!openingName) return "";
  return `Apertura reconocida: ${openingName}. `;
}

export async function generateSpanishMoveExplanation(options: MoveExplanationOptions): Promise<string> {
  const openingPhrase = buildOpeningPhrase(options.openingName);
  const moveComparison = buildMoveComparison(options.bestMove, options.userMove);
  const classificationText = getRandomElement(CLASSIFICATION_EXPLANATIONS[options.classification] || ["La posición requiere atención, pero el plan es válido."]);

  const remoteUrl = import.meta.env.VITE_LLM_API_URL as string | undefined;
  const apiKey = import.meta.env.VITE_LLM_API_KEY as string | undefined;

  if (remoteUrl) {
    try {
      const response = await fetch(remoteUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          inputs: `${openingPhrase}${moveComparison}${classificationText}`,
          parameters: { max_new_tokens: 120, temperature: 0.6 },
        }),
      });

      if (response.ok) {
        const body = await response.json();
        if (typeof body === "string") {
          return body.trim();
        }
        if (body.generated_text) {
          return String(body.generated_text).trim();
        }
        if (body?.data?.[0]?.generated_text) {
          return String(body.data[0].generated_text).trim();
        }
      }
    } catch (error) {
      // Silently degradar a la explicación local.
    }
  }

  return `${openingPhrase}${moveComparison}${classificationText}`.trim();
}
