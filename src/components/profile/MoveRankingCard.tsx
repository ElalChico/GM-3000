import React from "react";

interface Props {
  analysesGood: number;
  analysesBad: number;
  analysesExcellent: number;
  analysesCompleted: number;
  language: string;
}

export default function MoveRankingCard({ analysesGood, analysesBad, analysesExcellent, analysesCompleted, language }: Props) {
  const total = analysesCompleted || 1;
  const items = [
    { label: language === "es" ? "Excelentes" : "Excellent", value: analysesExcellent, color: "#4caf50" },
    { label: language === "es" ? "Buenas" : "Good", value: analysesGood, color: "#8bc34a" },
    { label: language === "es" ? "Imprecisas" : "Inaccurate", value: analysesBad, color: "#ff9800" },
  ];

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
        {language === "es" ? "Clasificación de Jugadas" : "Move Ranking"}
      </h4>
      <div className="space-y-3">
        {items.map((item) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-medium" style={{ color: item.color }}>{item.label}</span>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{item.value} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-3 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          {analysesCompleted} {language === "es" ? "análisis completados" : "analyses completed"}
        </span>
      </div>
    </div>
  );
}
