import React from "react";

interface Props {
  level: number;
  xp: number;
  avgAccuracy: number;
  language: string;
}

export default function ProgressCard({ level, xp, avgAccuracy, language }: Props) {
  const xpInLevel = xp % 500;
  const xpPct = (xpInLevel / 500) * 100;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
        {language === "es" ? "Progreso" : "Progress"}
      </h4>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{language === "es" ? "Nivel" : "Level"}</span>
          <span className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{level}</span>
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>XP {xpInLevel}/500</span>
            <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{Math.round(xpPct)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #7c5a8b, #ce93d8)", transition: "width 0.5s ease" }} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{language === "es" ? "Precisión media" : "Avg accuracy"}</span>
          <span className="text-sm font-bold font-mono" style={{ color: avgAccuracy >= 70 ? "#4caf50" : avgAccuracy >= 50 ? "#ff9800" : "#f44336" }}>
            {avgAccuracy > 0 ? `${avgAccuracy}%` : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{language === "es" ? "XP Total" : "Total XP"}</span>
          <span className="text-sm font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>{xp.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
