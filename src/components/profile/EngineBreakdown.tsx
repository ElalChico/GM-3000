import React from "react";

interface Props {
  gamesByEngine: Record<string, number>;
  language: string;
}

const ENGINE_COLORS: Record<string, string> = {
  stockfish: "#4fc3f7",
  atlas: "#ff8a65",
  edd: "#ce93d8",
  nexus: "#ce93d8",
  obsidian: "#78909c",
  maia1: "#aed581",
  maia2: "#81c784",
  ailed: "#ffb74d",
};

export default function EngineBreakdown({ gamesByEngine, language }: Props) {
  const entries = Object.entries(gamesByEngine || {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
        {language === "es" ? "Por Motor" : "By Engine"}
      </h4>
      {entries.length === 0 ? (
        <p className="text-[10px] italic" style={{ color: "rgba(255,255,255,0.15)" }}>
          {language === "es" ? "Sin datos aún" : "No data yet"}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map(([engine, count]) => {
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = ENGINE_COLORS[engine.toLowerCase()] || "#9e9e9e";
            return (
              <div key={engine}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium capitalize" style={{ color }}>{engine}</span>
                  <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{count} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
