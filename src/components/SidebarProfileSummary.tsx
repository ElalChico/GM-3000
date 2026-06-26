import { User, Trophy, Target, Gamepad2, Flame, Crosshair, Swords } from "lucide-react";
import LevelBadge from "./LevelBadge";
import { UserProfile, getRankTitle } from "../types/profile";

interface MatchStatsData {
  hh: { w: number; b: number; d: number; total: number };
  hm: { w: number; b: number; d: number; total: number };
  mh: { w: number; b: number; d: number; total: number };
  mm: { w: number; b: number; d: number; total: number };
}

interface Props {
  profile: UserProfile;
  language: "es" | "en";
  fallbackName?: string;
  matchStats?: MatchStatsData;
  onClick?: () => void;
}

const ELO_TITLES: { min: number; title: string; color: string }[] = [
  { min: 0, title: "Principiante", color: "#7c6f5a" },
  { min: 800, title: "Club Local", color: "#2d7d3d" },
  { min: 1200, title: "Club Avanzado", color: "#3d6b8b" },
  { min: 1600, title: "Regional", color: "#8a6d1a" },
  { min: 2000, title: "Nacional", color: "#8b2d2d" },
  { min: 2400, title: "Maestro FIDE", color: "#7c5a8b" },
  { min: 2800, title: "Gran Maestro", color: "#e0a040" },
];

function getEloTitle(elo: number): { title: string; color: string } {
  let r = ELO_TITLES[0];
  for (const t of ELO_TITLES) { if (elo >= t.min) r = t; }
  return { title: r.title, color: r.color };
}

export default function SidebarProfileSummary({ profile, language, fallbackName, matchStats, onClick }: Props) {
  const rank = getRankTitle(profile.level);

  let totalW = 0, totalD = 0, totalB = 0;
  let winsAsWhite = 0, winsAsBlack = 0;
  const matchups = ["hh", "hm", "mh", "mm"] as const;
  if (matchStats) {
    for (const key of matchups) {
      totalW += matchStats[key].w;
      totalD += matchStats[key].d;
      totalB += matchStats[key].b;
    }
    winsAsWhite = matchStats.hh.w + matchStats.hm.w + matchStats.mh.w + matchStats.mm.w;
    winsAsBlack = matchStats.hh.b + matchStats.hm.b + matchStats.mh.b + matchStats.mm.b;
  }
  const totalAll = totalW + totalD + totalB;
  const winPct = totalAll > 0 ? Math.round((totalW / totalAll) * 100) : 0;

  const unlocked = profile.achievements?.filter(a => a.unlockedAt !== null).length ?? 0;
  const totalAchievements = profile.achievements?.length ?? 0;

  const maxStreak = profile.stats?.maxWinStreak ?? 0;
  const eloTitle = profile.eloRating > 0 ? getEloTitle(profile.eloRating) : null;
  const bestColor = winsAsWhite > winsAsBlack ? "white" : winsAsBlack > winsAsWhite ? "black" : "equal";

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl mb-4 overflow-hidden cursor-pointer transition-all text-left group"
      style={{
        background: "rgba(255,255,255,0.018)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="p-4 flex flex-col items-center gap-3">

        {/* Avatar - bigger */}
        <div className="relative">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt="avatar"
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: `2px solid ${rank.color}40` }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.03)", border: `2px solid ${rank.color}30` }}
            >
              <User className="w-8 h-8" style={{ color: "rgba(255,255,255,0.15)" }} />
            </div>
          )}
          {/* Online dot */}
          <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2" style={{ borderColor: "rgba(10,11,14,0.9)" }} />
        </div>

        <div className="w-full text-center">
          {/* Name - full, no truncate */}
          <h3 className="text-sm font-bold break-words leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
            {profile.name || fallbackName || (language === "es" ? "Sin nombre" : "Unnamed")}
          </h3>

          {/* Level badge + rank */}
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <LevelBadge level={profile.level} xpInLevel={profile.xp % 500} xpToNext={500} size="sm" />
            <span className="text-[10px] font-semibold" style={{ color: rank.color }}>{rank.title}</span>
          </div>

          {/* ELO rank badge */}
          {eloTitle && (
            <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full" style={{ background: `${eloTitle.color}12`, border: `1px solid ${eloTitle.color}25` }}>
              <Crosshair className="w-2.5 h-2.5" style={{ color: eloTitle.color }} />
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: eloTitle.color }}>{eloTitle.title}</span>
            </div>
          )}

          {/* Stats row 1: Games, Winrate, Achievements */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Gamepad2 className="w-3 h-3" />
              <span className="text-[10px] font-medium">{totalAll}</span>
            </div>
            {totalAll > 0 && (
              <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Target className="w-3 h-3" />
                <span className="text-[10px] font-medium">{winPct}%</span>
              </div>
            )}
            <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Trophy className="w-3 h-3" />
              <span className="text-[10px] font-medium">{unlocked}/{totalAchievements}</span>
            </div>
          </div>

          {/* Stats row 2: Streak, Best color */}
          <div className="flex items-center justify-center gap-3 mt-1.5">
            {maxStreak > 0 && (
              <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Flame className="w-3 h-3" style={{ color: "#e0a040" }} />
                <span className="text-[10px] font-medium">{maxStreak}</span>
              </div>
            )}
            {totalAll > 0 && (
              <div className="flex items-center gap-1" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Swords className="w-3 h-3" />
                <span className="text-[10px] font-medium">
                  {bestColor === "white" ? (language === "es" ? "Blancas" : "White") : bestColor === "black" ? (language === "es" ? "Negras" : "Black") : "—"}
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </button>
  );
}
