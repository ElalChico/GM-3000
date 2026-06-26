export interface UserProfile {
  name: string;
  bio: string;
  photoUrl: string;
  xp: number;
  level: number;
  stats: UserStats;
  achievements: Achievement[];
  profileViews: number;
  lastActive: string;
  eloRating: number;
  eloTitle: string;
  eloManual: boolean;
}

export interface UserStats {
  hh: { w: number; b: number; d: number; total: number };
  hm: { w: number; b: number; d: number; total: number };
  mh: { w: number; b: number; d: number; total: number };
  mm: { w: number; b: number; d: number; total: number };
  tournamentWins: number;
  tournamentGames: number;
  puzzlesSolved: number;
  analysisComplete: number;
  winRate: number;
  favoriteEngines: string[];
  gamesByEngine: Record<string, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
  xpReward: number;
}

export interface AvatarOption {
  id: string;
  imageUrl: string;
  unlocked?: boolean;
}

export const AVATARS: AvatarOption[] = [
  { id: 'default', imageUrl: '/assets/avatars/default.png' },
  { id: 'chess_master', imageUrl: '/assets/avatars/chess_master.png', unlocked: true },
  { id: 'grandmaster', imageUrl: '/assets/avatars/grandmaster.png' },
  { id: 'legend', imageUrl: '/assets/avatars/legend.png' },
];

export const RANK_TITLES = [
  { level: 1, title: 'Iniciado', color: '#7c6f5a' },
  { level: 10, title: 'Aprendiz', color: '#2d7d3d' },
  { level: 25, title: 'Experto', color: '#8a6d1a' },
  { level: 50, title: 'Maestro', color: '#8b2d2d' },
  { level: 75, title: 'Gran Maestro', color: '#7c5a8b' },
  { level: 100, title: 'Supremo', color: '#e0a040' },
];

export const XP_PER_ACTION = {
  gameWin: 50,
  gameDraw: 25,
  gameLoss: 10,
  analysisComplete: 30,
  puzzleSolved: 100,
  tournamentWin: 200,
  tournamentPlay: 50,
};

export function levelFromXp(xp: number): number {
  let level = 1;
  for (const rank of RANK_TITLES) {
    if (xp >= rank.level) level = rank.level;
  }
  return level;
}

export function getRankTitle(xp: number): { level: number; title: string; color: string } {
  let rank = RANK_TITLES[0];
  for (const r of RANK_TITLES) {
    if (xp >= r.level) rank = r;
  }
  return rank;
}

export const DEFAULT_STATS: UserStats = {
  hh: { w: 0, b: 0, d: 0, total: 0 },
  hm: { w: 0, b: 0, d: 0, total: 0 },
  mh: { w: 0, b: 0, d: 0, total: 0 },
  mm: { w: 0, b: 0, d: 0, total: 0 },
  tournamentWins: 0,
  tournamentGames: 0,
  puzzlesSolved: 0,
  analysisComplete: 0,
  winRate: 0,
  favoriteEngines: [],
  gamesByEngine: {},
};