import { Achievement } from "../types/profile";

interface MatchStatsData {
  hh: { w: number; b: number; d: number; total: number };
  hm: { w: number; b: number; d: number; total: number };
  mh: { w: number; b: number; d: number; total: number };
  mm: { w: number; b: number; d: number; total: number };
}

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  target: number;
  xpReward: number;
  getProgress: (data: DerivedStats) => number;
}

interface DerivedStats {
  totalW: number;
  totalD: number;
  totalB: number;
  totalAll: number;
  hmW: number;
  hmB: number;
  mhW: number;
  mhB: number;
  hhTotal: number;
  hmTotal: number;
  mmTotal: number;
  tournamentGames: number;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: "first_win", name: "Primera Victoria", description: "Gana tu primera partida", icon: "Trophy", category: "game", target: 1, xpReward: 25,
    getProgress: (s) => s.totalW },
  { id: "wins_10", name: "Victorioso", description: "Gana 10 partidas", icon: "Crown", category: "game", target: 10, xpReward: 50,
    getProgress: (s) => s.totalW },
  { id: "wins_50", name: "Campe\u00F3n", description: "Gana 50 partidas", icon: "Medal", category: "game", target: 50, xpReward: 150,
    getProgress: (s) => s.totalW },
  { id: "wins_100", name: "Leyenda", description: "Gana 100 partidas", icon: "Star", category: "game", target: 100, xpReward: 300,
    getProgress: (s) => s.totalW },
  { id: "games_10", name: "Activo", description: "Juega 10 partidas", icon: "Gamepad2", category: "game", target: 10, xpReward: 20,
    getProgress: (s) => s.totalAll },
  { id: "games_50", name: "Habitual", description: "Juega 50 partidas", icon: "Dumbbell", category: "game", target: 50, xpReward: 80,
    getProgress: (s) => s.totalAll },
  { id: "games_200", name: "Adicto al ajedrez", description: "Juega 200 partidas", icon: "Brain", category: "game", target: 200, xpReward: 200,
    getProgress: (s) => s.totalAll },
  { id: "vs_ai_10", name: "Enfrenta a la M\u00E1quina", description: "Juega 10 partidas contra IA", icon: "Bot", category: "game", target: 10, xpReward: 30,
    getProgress: (s) => s.hmTotal },
  { id: "vs_human_10", name: "Rival Humano", description: "Juega 10 partidas contra otro humano", icon: "Users", category: "game", target: 10, xpReward: 30,
    getProgress: (s) => s.hhTotal },
  { id: "draws_5", name: "Diplom\u00E1tico", description: "Obt\u00E9n 5 tablas", icon: "Scale", category: "game", target: 5, xpReward: 40,
    getProgress: (s) => s.totalD },
  { id: "wins_as_white_10", name: "Especialista Blancas", description: "Gana 10 partidas con blancas", icon: "Crown", category: "game", target: 10, xpReward: 50,
    getProgress: (s) => s.hmW + s.mhW },
  { id: "wins_as_black_10", name: "Especialista Negras", description: "Gana 10 partidas con negras", icon: "Crown", category: "game", target: 10, xpReward: 50,
    getProgress: (s) => s.hmB + s.mhB },
  { id: "vs_mm_10", name: "Espectador IA", description: "Observa 10 partidas IA vs IA", icon: "Eye", category: "game", target: 10, xpReward: 30,
    getProgress: (s) => s.mmTotal },
  { id: "tournament_1", name: "Competidor", description: "Participa en un torneo", icon: "Flag", category: "tournament", target: 1, xpReward: 40,
    getProgress: (s) => s.tournamentGames },
  { id: "tournament_10", name: "Veterano de Torneos", description: "Juega 10 partidas de torneo", icon: "Award", category: "tournament", target: 10, xpReward: 100,
    getProgress: (s) => s.tournamentGames },
  { id: "win_rate_60", name: "Precisi\u00F3n", description: "Mant\u00E9n 60% de victorias (m\u00EDnimo 20 partidas)", icon: "Target", category: "game", target: 60, xpReward: 100,
    getProgress: (s) => s.totalAll >= 20 ? Math.round((s.totalW / s.totalAll) * 100) : 0 },
  { id: "win_rate_80", name: "Maestr\u00EDa", description: "Mant\u00E9n 80% de victorias (m\u00EDnimo 50 partidas)", icon: "Crosshair", category: "game", target: 80, xpReward: 250,
    getProgress: (s) => s.totalAll >= 50 ? Math.round((s.totalW / s.totalAll) * 100) : 0 },
];

function derive(matchStats: MatchStatsData, tournamentGames: number): DerivedStats {
  let totalW = 0, totalD = 0, totalB = 0;
  for (const key of ["hh", "hm", "mh", "mm"] as const) {
    totalW += matchStats[key].w;
    totalD += matchStats[key].d;
    totalB += matchStats[key].b;
  }
  return {
    totalW, totalD, totalB,
    totalAll: totalW + totalD + totalB,
    hmW: matchStats.hm.w, hmB: matchStats.hm.b,
    mhW: matchStats.mh.w, mhB: matchStats.mh.b,
    hhTotal: matchStats.hh.total,
    hmTotal: matchStats.hm.total,
    mmTotal: matchStats.mm.total,
    tournamentGames,
  };
}

export function computeAchievements(matchStats: MatchStatsData, tournamentGames: number): Achievement[] {
  const data = derive(matchStats, tournamentGames);
  return ACHIEVEMENT_DEFS.map((def) => {
    const progress = def.getProgress(data);
    const unlocked = progress >= def.target;
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      category: def.category,
      unlockedAt: unlocked ? new Date().toISOString() : null,
      progress: Math.min(progress, def.target),
      target: def.target,
      xpReward: def.xpReward,
    };
  });
}

export function mergeAchievements(fresh: Achievement[], existing: Achievement[]): Achievement[] {
  const prevMap = new Map(existing.map(a => [a.id, a]));
  return fresh.map(a => {
    const prev = prevMap.get(a.id);
    if (prev?.unlockedAt) {
      return { ...a, unlockedAt: prev.unlockedAt };
    }
    return a;
  });
}
