export interface EloEstimation {
  elo: number;
  title: string;
  color: string;
}

const ELO_TITLES = [
  { min: 0,   title: "Principiante",   color: "#7c6f5a" },
  { min: 800, title: "Club Local",     color: "#2d7d3d" },
  { min: 1200, title: "Club Avanzado", color: "#3d6b8b" },
  { min: 1600, title: "Regional",      color: "#8a6d1a" },
  { min: 2000, title: "Nacional",      color: "#8b2d2d" },
  { min: 2400, title: "Maestro FIDE",  color: "#7c5a8b" },
  { min: 2800, title: "Gran Maestro",  color: "#e0a040" },
];

// Escalera ELO de Maia 2: 8 niveles discretos controlables
export const MAIA2_ELO_LADDER = [400, 600, 800, 1000, 1200, 1500, 1800, 2100] as const;
export const MAIA2_ELO_MIN = 400;
export const MAIA2_ELO_MAX = 2100;
export const MAIA2_ELO_DEFAULT = 1200;

const MIN_DEPTH = 3;
const MAX_DEPTH = 25;
const DEPTH_SPAN = MAX_DEPTH - MIN_DEPTH;

// Ajusta un ELO arbitrario al nivel de la escalera más cercano
export function snapMaia2Elo(elo: number): number {
  let best: number = MAIA2_ELO_LADDER[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const value of MAIA2_ELO_LADDER) {
    const diff = Math.abs(value - elo);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = value;
    }
  }
  return best;
}

// Profundidad -> nivel ELO de Maia 2 (misma profundidad que maneja el motor)
export function maia2DepthToElo(depth: number): number {
  const clampedDepth = Math.max(MIN_DEPTH, Math.min(depth, MAX_DEPTH));
  const index = Math.round(((clampedDepth - MIN_DEPTH) / DEPTH_SPAN) * (MAIA2_ELO_LADDER.length - 1));
  return MAIA2_ELO_LADDER[Math.max(0, Math.min(index, MAIA2_ELO_LADDER.length - 1))];
}

// Nivel ELO de Maia 2 -> profundidad real del motor
export function maia2EloToDepth(elo: number): number {
  const snapped = snapMaia2Elo(elo);
  const index = MAIA2_ELO_LADDER.indexOf(snapped as typeof MAIA2_ELO_LADDER[number]);
  return Math.round(MIN_DEPTH + (index / (MAIA2_ELO_LADDER.length - 1)) * DEPTH_SPAN);
}

// Profundidad exacta de cada nivel de la escalera (para sliders discretos)
export function maia2LadderDepths(): number[] {
  return MAIA2_ELO_LADDER.map((_, index) =>
    Math.round(MIN_DEPTH + (index / (MAIA2_ELO_LADDER.length - 1)) * DEPTH_SPAN)
  );
}

function getEngineElo(depth: number, engineType: string): number {
  const clampedDepth = Math.max(MIN_DEPTH, Math.min(depth, MAX_DEPTH));
  if (["atlas", "edd", "obsidian", "ailed"].includes(engineType)) {
    return 800 + Math.round(((clampedDepth - MIN_DEPTH) / DEPTH_SPAN) * 1400);
  }
  if (engineType === "maia1") return 1100 + clampedDepth;
  if (engineType === "maia2") return maia2DepthToElo(clampedDepth);
  return 800 + clampedDepth * 116;
}

function getWinRateElo(winRate: number, totalGames: number): number {
  if (totalGames < 3) return 1200;
  const base = winRate * 2000 + 600;
  return Math.round(Math.max(600, Math.min(3000, base)));
}

function getTitle(elo: number): { title: string; color: string } {
  let result = ELO_TITLES[0];
  for (const t of ELO_TITLES) {
    if (elo >= t.min) result = t;
  }
  return { title: result.title, color: result.color };
}

export function estimateElo(
  matchStats: { hm: { w: number; b: number; d: number; total: number }; mh: { w: number; b: number; d: number; total: number } },
  depth: number,
  engineType: string
): EloEstimation {
  const humanWins = matchStats.hm.w + matchStats.mh.b;
  const humanLosses = matchStats.hm.b + matchStats.mh.w;
  const draws = matchStats.hm.d + matchStats.mh.d;
  const totalHumanGames = humanWins + humanLosses + draws;
  const winRate = totalHumanGames > 0 ? humanWins / totalHumanGames : 0.5;

  const engineElo = getEngineElo(depth, engineType);
  const performanceElo = getWinRateElo(winRate, totalHumanGames);

  const confidence = Math.min(totalHumanGames / 30, 1);
  const engineWeight = 0.4 + 0.2 * (1 - confidence);
  const perfWeight = 1 - engineWeight;

  const elo = Math.round(engineElo * engineWeight + performanceElo * perfWeight);
  const { title, color } = getTitle(elo);

  return { elo, title, color };
}
