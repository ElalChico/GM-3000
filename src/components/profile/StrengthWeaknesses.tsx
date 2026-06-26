import React from "react";

interface Props {
  analysesGood: number;
  analysesBad: number;
  analysesExcellent: number;
  analysesCompleted: number;
  gamesAsWhite: number;
  winsAsWhite: number;
  gamesAsBlack: number;
  winsAsBlack: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  puzzlesSolved: number;
  puzzlesFailed: number;
  language: string;
}

export default function StrengthWeaknesses({
  analysesGood, analysesBad, analysesExcellent, analysesCompleted,
  gamesAsWhite, winsAsWhite, gamesAsBlack, winsAsBlack,
  gamesWon, gamesLost, gamesDrawn, puzzlesSolved, puzzlesFailed,
  language,
}: Props) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const total = gamesWon + gamesLost + gamesDrawn;
  const winRate = total > 0 ? (gamesWon / total) * 100 : 0;
  const wPct = gamesAsWhite > 0 ? (winsAsWhite / gamesAsWhite) * 100 : 0;
  const bPct = gamesAsBlack > 0 ? (winsAsBlack / gamesAsBlack) * 100 : 0;
  const goodRatio = analysesCompleted > 0 ? ((analysesGood + analysesExcellent) / analysesCompleted) * 100 : 0;
  const puzzleRate = (puzzlesSolved + puzzlesFailed) > 0 ? (puzzlesSolved / (puzzlesSolved + puzzlesFailed)) * 100 : 0;

  if (winRate >= 55) strengths.push(language === "es" ? "Tasa de victoria alta" : "High win rate");
  if (winRate < 40 && total > 5) weaknesses.push(language === "es" ? "Tasa de victoria baja" : "Low win rate");
  if (wPct > bPct + 15) { strengths.push(language === "es" ? "Fuerte con blancas" : "Strong as white"); weaknesses.push(language === "es" ? "Débil con negras" : "Weak as black"); }
  if (bPct > wPct + 15) { strengths.push(language === "es" ? "Fuerte con negras" : "Strong as black"); weaknesses.push(language === "es" ? "Débil con blancas" : "Weak as white"); }
  if (goodRatio >= 70) strengths.push(language === "es" ? "Precisión analítica excelente" : "Excellent analytical accuracy");
  if (goodRatio < 40 && analysesCompleted > 3) weaknesses.push(language === "es" ? "Análisis imprecisos frecuentes" : "Frequent inaccurate analyses");
  if (puzzleRate >= 75) strengths.push(language === "es" ? "Buen resolutor de puzzles" : "Good puzzle solver");
  if (puzzleRate < 40 && (puzzlesSolved + puzzlesFailed) > 3) weaknesses.push(language === "es" ? "Dificultad con puzzles" : "Difficulty with puzzles");

  if (strengths.length === 0) strengths.push(language === "es" ? "Juega más para descubrir fortalezas" : "Play more to discover strengths");
  if (weaknesses.length === 0) weaknesses.push(language === "es" ? "Sin debilidades detectadas" : "No weaknesses detected");

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
        {language === "es" ? "Fortalezas y Debilidades" : "Strengths & Weaknesses"}
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#2d7d3d" }}>
            {language === "es" ? "Fortalezas" : "Strengths"}
          </span>
          {strengths.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span style={{ color: "#2d7d3d" }}>▸</span> {s}
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: "#8b2d2d" }}>
            {language === "es" ? "Debilidades" : "Weaknesses"}
          </span>
          {weaknesses.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              <span style={{ color: "#8b2d2d" }}>▸</span> {w}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
