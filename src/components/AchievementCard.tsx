import React from "react";
import { Achievement } from "../types/profile";
import { Trophy, Crown, Medal, Star, Gamepad2, Dumbbell, Brain, Bot, Users, Scale, Eye, Flag, Award, Target, Crosshair } from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Trophy, Crown, Medal, Star, Gamepad2, Dumbbell, Brain, Bot, Users, Scale, Eye, Flag, Award, Target, Crosshair,
};

interface AchievementCardProps {
  achievement: Achievement;
  language: string;
}

export default function AchievementCard({ achievement, language }: AchievementCardProps) {
  const { name, description, icon, unlockedAt, progress, target, xpReward } = achievement;
  const unlocked = unlockedAt !== null;
  const pct = target > 0 ? Math.min((progress / target) * 100, 100) : 0;

  const catColors: Record<string, string> = {
    game: "#3d6b8b",
    analysis: "#7c5a8b",
    tournament: "#8a6d1a",
    puzzle: "#2d7d3d",
    social: "#8b4a5a",
    dedication: "#5a6b7c",
  };

  const color = catColors[achievement.category] || "#5a5a5a";

  return (
    <div
      className="relative rounded-xl p-3 transition-all duration-200"
      style={{
        background: unlocked ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.01)",
        border: `1px solid ${unlocked ? `${color}30` : "rgba(255,255,255,0.03)"}`,
        opacity: unlocked ? 1 : 0.5,
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ color: unlocked ? color : "rgba(255,255,255,0.15)", filter: unlocked ? "none" : "grayscale(1) opacity(0.4)" }}>
          {(() => { const Icon = ICON_MAP[icon]; return Icon ? <Icon className="w-6 h-6" /> : <span className="text-2xl">{icon}</span>; })()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: unlocked ? color : "rgba(255,255,255,0.2)" }}>
              {name}
            </h4>
            {unlocked && (
              <span className="text-[8px] px-1.5 py-0.5 rounded font-medium" style={{ color, background: `${color}15` }}>
                +{xpReward} XP
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: unlocked ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.12)" }}>
            {description}
          </p>
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                {progress}/{target}
              </span>
              <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                {Math.round(pct)}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: unlocked ? color : "rgba(255,255,255,0.1)" }}
              />
            </div>
          </div>
        </div>
        {unlocked && (
          <div className="absolute top-2 right-2">
            <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
              {new Date(unlockedAt).toLocaleDateString(language === "es" ? "es" : "en")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
