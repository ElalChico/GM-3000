import React from "react";

interface Props {
  gamesAsWhite: number;
  gamesAsBlack: number;
  winsAsWhite: number;
  winsAsBlack: number;
  language: string;
}

export default function ColorBreakdown({ gamesAsWhite, gamesAsBlack, winsAsWhite, winsAsBlack, language }: Props) {
  const wPct = gamesAsWhite > 0 ? Math.round((winsAsWhite / gamesAsWhite) * 100) : 0;
  const bPct = gamesAsBlack > 0 ? Math.round((winsAsBlack / gamesAsBlack) * 100) : 0;

  return (
    <div className="rounded-2xl p-5 h-full" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>
        {language === "es" ? "Por Color" : "By Color"}
      </h4>
      <div className="space-y-4">
        {[
          { label: language === "es" ? "Blancas" : "White", games: gamesAsWhite, wins: winsAsWhite, pct: wPct, dotColor: "#e8e0d0" },
          { label: language === "es" ? "Negras" : "Black", games: gamesAsBlack, wins: winsAsBlack, pct: bPct, dotColor: "#3a3a3a" },
        ].map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: item.dotColor, border: "1px solid rgba(255,255,255,0.1)" }} />
                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                {item.wins}/{item.games} ({item.pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: "linear-gradient(90deg, #2d7d3d80, #2d7d3d)", transition: "width 0.5s ease" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
