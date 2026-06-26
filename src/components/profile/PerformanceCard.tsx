import React from "react";

interface Props {
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  language: string;
}

export default function PerformanceCard({ gamesWon, gamesLost, gamesDrawn, language }: Props) {
  const total = gamesWon + gamesLost + gamesDrawn;
  const winPct = total > 0 ? Math.round((gamesWon / total) * 100) : 0;
  const lossPct = total > 0 ? Math.round((gamesLost / total) * 100) : 0;
  const drawPct = total > 0 ? 100 - winPct - lossPct : 0;

  const radius = 54;
  const stroke = 10;
  const circ = 2 * Math.PI * radius;
  const winLen = (winPct / 100) * circ;
  const drawLen = (drawPct / 100) * circ;
  const lossLen = (lossPct / 100) * circ;

  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={stroke} />
            {total > 0 && (
              <>
                <circle cx="65" cy="65" r={radius} fill="none" stroke="#2d7d3d" strokeWidth={stroke}
                  strokeDasharray={`${winLen} ${circ - winLen}`} strokeDashoffset={circ / 4}
                  strokeLinecap="round" style={{ transition: "all 0.6s ease" }} />
                <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke}
                  strokeDasharray={`${drawLen} ${circ - drawLen}`} strokeDashoffset={circ / 4 - winLen}
                  strokeLinecap="round" style={{ transition: "all 0.6s ease" }} />
                <circle cx="65" cy="65" r={radius} fill="none" stroke="#8b2d2d" strokeWidth={stroke}
                  strokeDasharray={`${lossLen} ${circ - lossLen}`} strokeDashoffset={circ / 4 - winLen - drawLen}
                  strokeLinecap="round" style={{ transition: "all 0.6s ease" }} />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{total}</span>
            <span className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.25)" }}>
              {language === "es" ? "partidas" : "games"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-3">
          {[
            { label: language === "es" ? "Victorias" : "Wins", value: gamesWon, pct: winPct, color: "#2d7d3d" },
            { label: language === "es" ? "Derrotas" : "Losses", value: gamesLost, pct: lossPct, color: "#8b2d2d" },
            { label: language === "es" ? "Tablas" : "Draws", value: gamesDrawn, pct: drawPct, color: "rgba(255,255,255,0.25)" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold" style={{ color: item.color }}>{item.label}</span>
                <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{item.value} ({item.pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color, transition: "width 0.5s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
