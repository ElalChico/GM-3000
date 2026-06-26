import { useState } from "react";
import { UserProfile, getRankTitle } from "../types/profile";
import { estimateElo } from "../utils/eloEstimation";
import LevelBadge from "./LevelBadge";
import AchievementCard from "./AchievementCard";
import ProfileEditor from "./ProfileEditor";
import PerformanceCard from "./profile/PerformanceCard";
import ColorBreakdown from "./profile/ColorBreakdown";
import EngineBreakdown from "./profile/EngineBreakdown";
import StrengthWeaknesses from "./profile/StrengthWeaknesses";
import MoveRankingCard from "./profile/MoveRankingCard";
import ProgressCard from "./profile/ProgressCard";
import AdventureCard from "./profile/AdventureCard";
import TournamentCard from "./profile/TournamentCard";
import DetailCard from "./profile/DetailCard";
import { X, Pencil, Trophy, BarChart3, Trash2, User, Target, Zap, Swords, Book } from "lucide-react";

interface MatchStatsData {
  hh: { w: number; b: number; d: number; total: number };
  hm: { w: number; b: number; d: number; total: number };
  mh: { w: number; b: number; d: number; total: number };
  mm: { w: number; b: number; d: number; total: number };
}

interface TournamentGameLogEntry {
  white: string; black: string; whiteName: string; blackName: string;
  result: string; date: string; moveCount: number;
}

interface ProgressiveState {
  enabled: boolean; level: number; startElo: number; currentElo: number;
  gamesPerLevel: number; gamesPlayedAtLevel: number;
  gamesWonAtLevel: number; gamesLostAtLevel: number; gamesTiedAtLevel: number;
}

interface AdventureProgressData {
  playerElo: number;
  currentStage: number;
  wins: Record<string, number>;
  defeated: number[];
  humanBattles: number;
}

interface ProfileViewProps {
  profile: UserProfile;
  onUpdate: (fields: { name?: string; avatar?: string; bio?: string; photoUrl?: string; eloRating?: number; eloTitle?: string; eloManual?: boolean }) => void;
  onReset: () => void;
  language: string;
  onClose: () => void;
  matchStats: MatchStatsData;
  whitePlayer: string;
  blackPlayer: string;
  whiteEngineName: string;
  blackEngineName: string;
  boardOrientation: string;
  lanStatus: string;
  playerName: string;
  humanBattles: number;
  resetMatchStats: () => void;
  tournamentGameLog: TournamentGameLogEntry[];
  progressiveState: ProgressiveState | null;
  adventureProgress: AdventureProgressData | null;
  whiteAiDepth: number;
  whiteEngineType: string;
}

type Tab = "stats" | "achievements";

const sectionStyle = {
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: "16px",
};

export default function ProfileView({
  profile, onUpdate, onReset, language, onClose,
  matchStats, whitePlayer, blackPlayer, whiteEngineName, blackEngineName,
  boardOrientation, lanStatus, playerName, humanBattles, resetMatchStats,
  tournamentGameLog, progressiveState, adventureProgress,
  whiteAiDepth, whiteEngineType,
}: ProfileViewProps) {
  const [tab, setTab] = useState<Tab>("stats");
  const [showEditor, setShowEditor] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showMatchStatsResetConfirm, setShowMatchStatsResetConfirm] = useState(false);
  const [showEloEditor, setShowEloEditor] = useState(false);
  const [manualElo, setManualElo] = useState(profile.eloRating || 1200);

  const rank = getRankTitle(profile.level);
  const eloEst = profile.eloRating > 0
    ? { elo: profile.eloRating, title: profile.eloTitle, color: (() => { const t = [{min:0,color:"#7c6f5a"},{min:800,color:"#2d7d3d"},{min:1200,color:"#3d6b8b"},{min:1600,color:"#8a6d1a"},{min:2000,color:"#8b2d2d"},{min:2400,color:"#7c5a8b"},{min:2800,color:"#e0a040"}]; let r=t[0]; for(const x of t){if(profile.eloRating>=x.min) r=x;} return r.color; })() }
    : estimateElo(matchStats, whiteAiDepth, whiteEngineType);

  const getWhiteLabel = () => {
    if (whitePlayer === "ai") return whiteEngineName || "IA";
    if (lanStatus === "connected") return playerName || "Tu";
    return boardOrientation === "white" ? playerName || "Humano" : "Oponente";
  };
  const getBlackLabel = () => {
    if (blackPlayer === "ai") return blackEngineName || "IA";
    if (lanStatus === "connected") return playerName || "Tu";
    return boardOrientation === "black" ? playerName || "Humano" : "Oponente";
  };

  let currentMatchup: "hh" | "hm" | "mh" | "mm" = "hh";
  if (whitePlayer === "human" && blackPlayer === "ai") currentMatchup = "hm";
  else if (whitePlayer === "ai" && blackPlayer === "human") currentMatchup = "mh";
  else if (whitePlayer === "ai" && blackPlayer === "ai") currentMatchup = "mm";
  const stats = matchStats[currentMatchup];

  const allMatchups = ["hm", "mh", "hh", "mm"] as const;
  let totalW = 0, totalD = 0, totalB = 0;
  for (const key of allMatchups) {
    totalW += matchStats[key].w;
    totalD += matchStats[key].d;
    totalB += matchStats[key].b;
  }
  const totalAll = totalW + totalD + totalB;
  const winPct = totalAll > 0 ? Math.round((totalW / totalAll) * 100) : 0;

  const unlockedCount = profile.achievements.filter((a) => a.unlockedAt !== null).length;
  const totalCount = profile.achievements.length;

  const s = profile.stats;

  return (
    <div className="fixed inset-0 z-[9998] flex flex-col" style={{ background: "linear-gradient(135deg, #0a0b0e 0%, #0d1117 40%, #0a0b0e 100%)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" style={{ border: "2px solid rgba(255,255,255,0.08)" }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.06)" }}>
              <User className="w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
            </div>
          )}
          <div>
            <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{profile.name}</span>
            <span className="text-[10px] ml-2 font-medium" style={{ color: rank.color }}>{rank.title}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

          {/* Hero: Profile header + Quick stats */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(139,45,45,0.15), rgba(10,11,14,0.95))", border: "1px solid rgba(180,50,50,0.15)" }}>
            {/* Decorative top accent */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${rank.color}, transparent)` }} />

            <div className="p-8">
              <div className="flex items-start gap-8">
                {/* Avatar with glowing ring */}
                <button onClick={() => setShowEditor(true)} className="relative group shrink-0">
                  {/* Outer glow ring */}
                  <div className="absolute -inset-1.5 rounded-full opacity-40 group-hover:opacity-70 transition-opacity duration-500" style={{ background: `linear-gradient(135deg, ${rank.color}, rgba(139,45,45,0.6), ${rank.color})` }} />
                  {/* Inner border */}
                  <div className="absolute -inset-0.5 rounded-full" style={{ background: "#0a0b0e" }} />
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt="" className="relative w-40 h-40 rounded-full object-cover" style={{ border: `3px solid ${rank.color}` }} />
                  ) : (
                    <div className="relative w-40 h-40 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: `3px solid ${rank.color}` }}>
                      <User className="w-16 h-16" style={{ color: "rgba(255,255,255,0.12)" }} />
                    </div>
                  )}
                  {/* Hover edit overlay */}
                  <div className="absolute inset-0 rounded-full flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100" style={{ background: "rgba(0,0,0,0.6)" }}>
                    <Pencil className="w-5 h-5" style={{ color: "rgba(255,255,255,0.8)" }} />
                  </div>
                </button>

                {/* Name, rank, bio, XP */}
                <div className="flex-1 min-w-0 pt-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {/* Name - decorated */}
                      <h2 className="text-3xl font-black tracking-wide" style={{ color: "rgba(255,255,255,0.95)", textShadow: `0 0 30px ${rank.color}30` }}>
                        {profile.name}
                      </h2>
                      {/* Rank badge */}
                      <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full" style={{ background: `${rank.color}15`, border: `1px solid ${rank.color}30` }}>
                        <Trophy className="w-3 h-3" style={{ color: rank.color }} />
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: rank.color }}>{rank.title}</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
                        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>Nv. {profile.level}</span>
                      </div>

                      {/* ELO Rank badge */}
                      <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full cursor-pointer transition-all hover:opacity-80"
                        style={{ background: `${eloEst.color}15`, border: `1px solid ${eloEst.color}30` }}
                        onClick={() => setShowEloEditor(true)}
                        title={language === "es" ? "Clic para editar" : "Click to edit"}>
                        <Target className="w-3 h-3" style={{ color: eloEst.color }} />
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: eloEst.color }}>{eloEst.title}</span>
                        {profile.eloManual && <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>(manual)</span>}
                      </div>

                      {/* Bio */}
                      {profile.bio && (
                        <p className="text-xs mt-3 leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.3)" }}>{profile.bio}</p>
                      )}
                    </div>

                    {/* Hero stat chips */}
                    <div className="flex gap-2 shrink-0">
                      {[
                        { value: totalAll, label: language === "es" ? "Partidas" : "Games", icon: <Zap className="w-3.5 h-3.5" /> },
                        { value: `${winPct}%`, label: language === "es" ? "Victoria" : "Win rate", icon: <Target className="w-3.5 h-3.5" /> },
                        { value: `Nvl. ${profile.level}`, label: language === "es" ? "Nivel" : "Level", icon: <Trophy className="w-3.5 h-3.5" /> },
                        { value: s.maxWinStreak, label: language === "es" ? "Racha" : "Streak", icon: <Swords className="w-3.5 h-3.5" /> },
                      ].map((item) => (
                        <div key={item.label} className="px-3 py-2 rounded-xl text-center" style={{ background: "rgba(139,45,45,0.08)", border: "1px solid rgba(180,50,50,0.12)", minWidth: "72px" }}>
                          <div className="flex justify-center mb-1" style={{ color: "rgba(255,255,255,0.2)" }}>{item.icon}</div>
                          <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{item.value}</div>
                          <div className="text-[8px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* XP bar */}
                  <div className="flex items-center gap-4 mt-5">
                    <LevelBadge level={profile.level} xpInLevel={profile.xp % 500} xpToNext={500} size="sm" />
                    <div className="flex-1 max-w-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>XP {profile.xp}</span>
                        <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{500 - (profile.xp % 500)} XP para siguiente nivel</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(139,45,45,0.08)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((profile.xp % 500) / 500) * 100}%`, background: `linear-gradient(90deg, ${rank.color}80, ${rank.color})` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(139,45,45,0.06)" }}>
            <button onClick={() => setTab("stats")}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200"
              style={{
                background: tab === "stats" ? "rgba(180,50,50,0.2)" : "transparent",
                color: tab === "stats" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
              }}>
              <BarChart3 className="w-3.5 h-3.5" />
              {language === "es" ? "Estadisticas" : "Stats"}
            </button>
            <button onClick={() => setTab("achievements")}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200"
              style={{
                background: tab === "achievements" ? "rgba(180,50,50,0.2)" : "transparent",
                color: tab === "achievements" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)",
              }}>
              <Trophy className="w-3.5 h-3.5" />
              {language === "es" ? "Logros" : "Achievements"}
            </button>
          </div>

          {tab === "stats" && (
            <div className="space-y-6">

              {/* Section: Rendimiento */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                  {language === "es" ? "Rendimiento" : "Performance"}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-3">
                    <PerformanceCard gamesWon={s.gamesWon} gamesLost={s.gamesLost} gamesDrawn={s.gamesDrawn} language={language} />
                  </div>
                  <div className="lg:col-span-2">
                    <ColorBreakdown
                      gamesAsWhite={s.gamesAsWhite} gamesAsBlack={s.gamesAsBlack}
                      winsAsWhite={s.winsAsWhite} winsAsBlack={s.winsAsBlack}
                      language={language}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Analisis */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                  {language === "es" ? "Analisis" : "Analysis"}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <EngineBreakdown gamesByEngine={s.gamesByEngine} language={language} />
                  <MoveRankingCard
                    analysesGood={s.analysesGood} analysesBad={s.analysesBad}
                    analysesExcellent={s.analysesExcellent} analysesCompleted={s.analysesCompleted}
                    language={language}
                  />
                </div>
                <StrengthWeaknesses
                  analysesGood={s.analysesGood} analysesBad={s.analysesBad}
                  analysesExcellent={s.analysesExcellent} analysesCompleted={s.analysesCompleted}
                  gamesAsWhite={s.gamesAsWhite} winsAsWhite={s.winsAsWhite}
                  gamesAsBlack={s.gamesAsBlack} winsAsBlack={s.winsAsBlack}
                  gamesWon={s.gamesWon} gamesLost={s.gamesLost} gamesDrawn={s.gamesDrawn}
                  puzzlesSolved={s.puzzlesSolved} puzzlesFailed={s.puzzlesFailed}
                  language={language}
                />
              </div>

              {/* Section: Progreso y Actividad */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                  {language === "es" ? "Progreso y Actividad" : "Progress & Activity"}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <ProgressCard level={profile.level} xp={profile.xp} avgAccuracy={s.avgAccuracy} language={language} />
                  <TournamentCard
                    tournamentsEntered={s.tournamentsEntered}
                    tournamentsPodium={s.tournamentsPodium}
                    tournamentsBest={s.tournamentsBest}
                    language={language}
                  />
                  <DetailCard
                    analysesCompleted={s.analysesCompleted}
                    analysesExcellent={s.analysesExcellent}
                    analysesGood={s.analysesGood}
                    analysesBad={s.analysesBad}
                    avgAccuracy={s.avgAccuracy}
                    puzzlesSolved={s.puzzlesSolved}
                    puzzlesFailed={s.puzzlesFailed}
                    totalPlayTimeMs={s.totalPlayTimeMs}
                    daysConsecutive={s.daysConsecutive}
                    language={language}
                  />
                </div>
              </div>

              {/* Section: Aventura y Duelo */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest px-1" style={{ color: "rgba(255,255,255,0.18)" }}>
                  {language === "es" ? "Aventura y Duelo" : "Adventure & Match"}
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Crónicas de los Mortales */}
                  <div className="p-5 rounded-2xl space-y-3" style={{ background: "linear-gradient(135deg, rgba(180,120,30,0.12), rgba(10,11,14,0.9))", border: "1px solid rgba(180,120,30,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <Book className="w-3 h-3" style={{ color: "#c08030" }} />
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {language === "es" ? "Crónicas de los Mortales" : "Chronicles of the Mortal"}
                      </h4>
                    </div>
                    <div className="flex flex-col items-center bg-black/30 p-4 rounded-xl" style={{ border: "1px solid rgba(180,120,30,0.2)" }}>
                      <span className="text-amber-400 font-bold text-2xl">
                        {adventureProgress?.humanBattles ?? 0}
                        <span className="text-sm text-amber-600 font-normal"> / 3000</span>
                      </span>
                      <span className="text-amber-200/50 text-[9px] mt-2 text-center italic">
                        Batallas ganadas por el humano ⚡registradas en el Códice
                      </span>
                    </div>
                  </div>

                  {/* Estadisticas del Duelo */}
                  <div className="p-5 rounded-2xl space-y-4" style={{ background: "linear-gradient(135deg, rgba(139,45,45,0.12), rgba(10,11,14,0.9))", border: "1px solid rgba(180,50,50,0.15)" }}>
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                        <BarChart3 className="w-3 h-3" />
                        {language === "es" ? "Estadisticas del Duelo" : "Match Stats"}
                      </h4>
                      <button onClick={() => setShowMatchStatsResetConfirm(true)} className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "rgba(255,255,255,0.15)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#9e4444"; e.currentTarget.style.background = "rgba(158,68,68,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.15)"; e.currentTarget.style.background = "transparent"; }}
                        title={language === "es" ? "Reiniciar" : "Reset"}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center text-center">
                      <div className="flex-1" style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="text-xl font-semibold" style={{ color: "#2d7d3d" }}>{stats.w}</div>
                        <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{language === "es" ? "Blancas" : "White"}</div>
                        <div className="text-[8px] truncate px-1" style={{ color: "rgba(255,255,255,0.12)" }}>{getWhiteLabel()}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xl font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>{stats.d}</div>
                        <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{language === "es" ? "Tablas" : "Draw"}</div>
                      </div>
                      <div className="flex-1" style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="text-xl font-semibold" style={{ color: "#8b2d2d" }}>{stats.b}</div>
                        <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{language === "es" ? "Negras" : "Black"}</div>
                        <div className="text-[8px] truncate px-1" style={{ color: "rgba(255,255,255,0.12)" }}>{getBlackLabel()}</div>
                      </div>
                    </div>

                    <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex gap-4 text-[11px]">
                        <span style={{ color: "#2d7d3d" }}>{totalW} {language === "es" ? "victorias" : "wins"}</span>
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>{totalD} {language === "es" ? "tablas" : "draws"}</span>
                        <span style={{ color: "#8b2d2d" }}>{totalB} {language === "es" ? "derrotas" : "losses"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-3">
                <button onClick={() => setShowEditor(true)}
                  className="flex-1 py-3 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all duration-200"
                  style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                >
                  {language === "es" ? "Editar perfil" : "Edit profile"}
                </button>
                <button onClick={() => setShowResetConfirm(true)}
                  className="flex-1 py-3 rounded-xl text-[10px] font-semibold uppercase tracking-wider transition-all duration-200"
                  style={{ background: "rgba(158,68,68,0.06)", color: "rgba(158,68,68,0.5)", border: "1px solid rgba(158,68,68,0.08)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(158,68,68,0.1)"; e.currentTarget.style.color = "rgba(158,68,68,0.7)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(158,68,68,0.06)"; e.currentTarget.style.color = "rgba(158,68,68,0.5)"; }}
                >
                  {language === "es" ? "Reiniciar perfil" : "Reset profile"}
                </button>
              </div>
            </div>
          )}

          {tab === "achievements" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {profile.achievements.map((a) => (
                <AchievementCard key={a.id} achievement={a} language={language} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor modal */}
      {showEditor && (
        <ProfileEditor
          initialName={profile.name}
          initialBio={profile.bio}
          initialPhotoUrl={profile.photoUrl}
          onSave={onUpdate}
          onClose={() => setShowEditor(false)}
          language={language}
        />
      )}

      {/* ELO editor modal */}
      {showEloEditor && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="p-6 w-[380px] rounded-2xl shadow-2xl" style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h4 className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.8)" }}>
              {language === "es" ? "Rango de habilidad" : "Skill rank"}
            </h4>
            <p className="text-[10px] mb-4" style={{ color: "rgba(255,255,255,0.25)" }}>
              {language === "es" ? "Edita manualmente o deja que el sistema calcule automáticamente." : "Edit manually or let the system calculate automatically."}
            </p>

            <div className="space-y-3 mb-5">
              <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {language === "es" ? "Seleccionar rango" : "Select rank"}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { elo: 600, title: "Principiante" },
                    { elo: 1000, title: "Club Local" },
                    { elo: 1400, title: "Club Avanzado" },
                    { elo: 1800, title: "Regional" },
                    { elo: 2200, title: "Nacional" },
                    { elo: 2600, title: "Maestro FIDE" },
                    { elo: 3000, title: "Gran Maestro" },
                  ].map((opt) => (
                    <button key={opt.elo} onClick={() => setManualElo(opt.elo)}
                      className="px-3 py-2 rounded-lg text-[10px] font-semibold text-left transition-all"
                      style={{
                        background: manualElo === opt.elo ? "rgba(139,45,45,0.2)" : "rgba(255,255,255,0.02)",
                        border: manualElo === opt.elo ? "1px solid rgba(180,50,50,0.3)" : "1px solid rgba(255,255,255,0.04)",
                        color: manualElo === opt.elo ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
                      }}>
                      {opt.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { onUpdate({ eloManual: false }); setShowEloEditor(false); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                {language === "es" ? "Automático" : "Auto"}
              </button>
              <button onClick={() => {
                const titles: Record<number, string> = { 600: "Principiante", 1000: "Club Local", 1400: "Club Avanzado", 1800: "Regional", 2200: "Nacional", 2600: "Maestro FIDE", 3000: "Gran Maestro" };
                onUpdate({ eloRating: manualElo, eloTitle: titles[manualElo] || "Club Avanzado", eloManual: true });
                setShowEloEditor(false);
              }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ background: "rgba(139,45,45,0.15)", color: "rgba(139,45,45,0.8)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,45,45,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,45,45,0.15)"; }}>
                {language === "es" ? "Guardar" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirm */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="p-6 w-[360px] rounded-2xl shadow-2xl" style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: "rgba(158,68,68,0.8)" }}>
              {language === "es" ? "Reiniciar perfil" : "Reset profile"}
            </h4>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
              {language === "es" ? "Se perderan todas las estadisticas, logros y XP. Esta accion no se puede deshacer." : "All stats, achievements and XP will be lost. This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button onClick={() => { onReset(); setShowResetConfirm(false); onClose(); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ background: "rgba(158,68,68,0.15)", color: "rgba(158,68,68,0.8)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(158,68,68,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(158,68,68,0.15)"; }}
              >
                {language === "es" ? "Reiniciar" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match stats reset confirm */}
      {showMatchStatsResetConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="p-6 w-[360px] rounded-2xl shadow-2xl" style={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)" }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: "rgba(158,68,68,0.8)" }}>
              {language === "es" ? "Reiniciar estadísticas del duelo" : "Reset match stats"}
            </h4>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
              {language === "es" ? "Se borrarán solo las estadísticas del duelo actual (victorias, derrotas y tablas por color). El perfil, logros y progreso no se verán afectados." : "Only current match stats (wins, losses and draws by color) will be deleted. Profile, achievements and progress will not be affected."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowMatchStatsResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button onClick={() => { resetMatchStats(); setShowMatchStatsResetConfirm(false); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
                style={{ background: "rgba(158,68,68,0.15)", color: "rgba(158,68,68,0.8)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(158,68,68,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(158,68,68,0.15)"; }}
              >
                {language === "es" ? "Reiniciar" : "Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
