import { ECO } from "chess-openings";

export function getOpeningNameFromFen(fen: string): string | null {
  try {
    const eco = new ECO();
    const entry = eco.lookupSync(fen);
    return entry?.name || null;
  } catch (error) {
    console.warn("[getOpeningNameFromFen] Error:", error);
    return null;
  }
}
