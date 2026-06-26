import type { ExportResult } from "../types/export";

export async function exportPGN(
  moveHistory: string[],
  whiteName: string,
  blackName: string,
  finalFen: string
): Promise<ExportResult> {
  try {
    const pgnContent = generatePGNContent(moveHistory, whiteName, blackName, finalFen);

    if (typeof window !== "undefined" && (window as any).electronAPI?.exportData) {
      return await (window as any).electronAPI.exportData({
        type: "pgn",
        content: pgnContent,
        filename: `${whiteName}_vs_${blackName}_${new Date().toISOString().slice(0, 10)}.pgn`,
      });
    }

    const blob = new Blob([pgnContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${whiteName}_vs_${blackName}_${new Date().toISOString().slice(0, 10)}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    return { saved: true };
  } catch (e) {
    return { saved: false, error: String(e) };
  }
}

/**
 * Download AI analysis as text file
 */
export async function exportAnalysis(
  general: string,
  technical: string,
  perMove: Record<number, string>,
  whiteName: string,
  blackName: string
): Promise<ExportResult> {
  const content = formatAnalysisText(general, technical, perMove, whiteName, blackName);

  if (typeof window !== "undefined" && (window as any).electronAPI?.exportData) {
    return await (window as any).electronAPI.exportData({
      type: "txt",
      content,
      filename: `analisis_${whiteName}_vs_${blackName}_${new Date().toISOString().slice(0, 10)}.txt`,
    });
  }

  // Browser fallback - create blob and download
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analisis_${whiteName}_vs_${blackName}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return { saved: true };
}

/**
 * Download voice audio as MP3
 */
export async function exportVoice(
  chunks: string[],
  whiteName: string,
  blackName: string
): Promise<ExportResult> {
  try {
    // Import edge-tts service
    const { generateTtsCombined } = await import("./tts");
    const audioBlob = await generateTtsCombined(chunks);

    if (!audioBlob) {
      return { saved: false, error: "No se pudo generar el audio. Verifica que edge-tts esté disponible." };
    }

    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    if (typeof window !== "undefined" && (window as any).electronAPI?.exportData) {
      // Convert to base64 for IPC
      const base64 = btoa(String.fromCharCode(...uint8Array));
      return await (window as any).electronAPI.exportData({
        type: "mp3",
        content: base64,
        filename: `voz_${whiteName}_vs_${blackName}_${new Date().toISOString().slice(0, 10)}.mp3`,
      });
    }

    // Browser fallback
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voz_${whiteName}_vs_${blackName}_${new Date().toISOString().slice(0, 10)}.mp3`;
    a.click();
    URL.revokeObjectURL(url);
    return { saved: true };
  } catch (e) {
    return { saved: false, error: String(e) };
  }
}

/**
 * Download all as a combined archive (PGN + Analysis)
 */
export async function exportCombined(
  moveHistory: string[],
  whiteName: string,
  blackName: string,
  finalFen: string,
  general: string,
  technical: string,
  perMove: Record<number, string>
): Promise<ExportResult> {
  // For now, download each file individually
  // In the future, could create a ZIP archive
  const results: ExportResult[] = [];

  const pgnResult = await exportPGN(moveHistory, whiteName, blackName, finalFen);
  results.push(pgnResult);

  const analysisResult = await exportAnalysis(general, technical, perMove, whiteName, blackName);
  results.push(analysisResult);

  const allSaved = results.every((r) => r.saved);
  const errors = results.filter((r) => r.error).map((r) => r.error);

  return {
    saved: allSaved,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

// --- Helper functions ---

function generatePGNContent(
  moveHistory: string[],
  whiteName: string,
  blackName: string,
  finalFen: string
): string {
  let pgn = "";
  pgn += `[Event "GM-3000 Partida"]\n`;
  pgn += `[Site "GM-3000"]\n`;
  pgn += `[Date "${new Date().toISOString().slice(0, 10)}"]\n`;
  pgn += `[Round "1"]\n`;
  pgn += `[White "${whiteName}"]\n`;
  pgn += `[Black "${blackName}"]\n`;
  pgn += `[Result "*"]\n\n`;

  for (let i = 0; i < moveHistory.length; i++) {
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) pgn += `${moveNum}. `;
    pgn += `${moveHistory[i]} `;
  }
  pgn += "*\n";

  if (finalFen && finalFen !== "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1") {
    pgn += `\n[FEN "${finalFen}"]\n`;
  }

  return pgn;
}

function formatAnalysisText(
  general: string,
  technical: string,
  perMove: Record<number, string>,
  whiteName: string,
  blackName: string
): string {
  let text = "";
  text += "=== ANÁLISIS GM-3000 ===\n";
  text += `Fecha: ${new Date().toLocaleString("es-ES")}\n`;
  text += `Blancas: ${whiteName}\n`;
  text += `Negras: ${blackName}\n\n`;

  text += "=== ANÁLISIS GENERAL ===\n\n";
  text += general + "\n\n";

  text += "=== ANÁLISIS TÉCNICO ===\n\n";
  text += technical + "\n\n";

  text += "=== ANÁLISIS POR JUGADA ===\n\n";
  const moveNums = Object.keys(perMove)
    .map(Number)
    .sort((a, b) => a - b);

  for (const num of moveNums) {
    const moveNum = Math.floor(num / 2) + 1;
    const color = num % 2 === 0 ? " blancas" : " negras";
    text += `Jugada ${moveNum}${color}: ${perMove[num]}\n`;
  }

  return text;
}
