import React from "react";
import { Trophy } from "lucide-react";

interface Props {
  tournamentsEntered: number;
  tournamentsPodium: number;
  tournamentsBest: number;
  language: string;
}

export default function TournamentCard({ tournamentsEntered, tournamentsPodium, tournamentsBest, language }: Props) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-4 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.2)" }}>
        <Trophy className="w-3 h-3" />
        {language === "es" ? "Torneos" : "Tournaments"}
      </h4>
      <div className="space-y-3">
        {[
          { label: language === "es" ? "Participaciones" : "Entries", value: tournamentsEntered },
          { label: language === "es" ? "Podios" : "Podiums", value: tournamentsPodium },
          { label: language === "es" ? "Mejor posición" : "Best finish", value: tournamentsBest > 0 ? `#${tournamentsBest}` : "—" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
            <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
