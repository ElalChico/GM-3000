import React from "react";

interface LevelBadgeProps {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  size?: "sm" | "lg";
}

export default function LevelBadge({ level, xpInLevel, xpToNext, size = "lg" }: LevelBadgeProps) {
  const pct = xpToNext > 0 ? Math.min((xpInLevel / xpToNext) * 100, 100) : 0;
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <div className="flex items-center gap-2">
      <span className={`${textSize} font-bold`} style={{ color: "rgba(255,255,255,0.7)" }}>Nvl. {level}</span>
      <div className="flex-1 bg-white/5 rounded-full overflow-hidden" style={{ minWidth: 60 }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #3d6b8b, #5a8faf)" }} />
      </div>
      <span className={`${textSize} font-mono`} style={{ color: "rgba(255,255,255,0.3)" }}>{xpInLevel}/{xpToNext} XP</span>
    </div>
  );
}
