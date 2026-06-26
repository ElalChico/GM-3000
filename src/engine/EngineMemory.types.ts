export interface EnhancedLearnEntry {
  winWeight: number;
  errorWeight: number;
  positionalWeight: number;
  visits: number;
  lastSeen: number;
  avgDelta: number;
}

export type KnowledgeCategory =
  | "tactics"
  | "positional"
  | "opening"
  | "middlegame"
  | "endgame"
  | "defense";

export type LearningEventType =
  | "td_update"
  | "strategy_reinforcement"
  | "contrasting_correction";

export interface LearningLogEntry {
  timestamp: string;
  type: LearningEventType;
  category: KnowledgeCategory;
  position: string;
  move: string;
  delta: number;
  confidence: number;
  description: string;
}

export interface KnowledgeCluster {
  id: string;
  label: string;
  category: KnowledgeCategory;
  avgBonus: number;
  visits: number;
  confidence: number;
  examples: Array<{ fen: string; move: string }>;
  evolution: number[];
  lastUpdated: string;
}

export interface ObservableMemorySnapshot {
  version: number;
  engine: string;
  metadata: {
    lastUpdated: string;
    sessionId: string;
    stats: {
      gamesPlayed: number;
      movesLearned: number;
      avgConfidence: number;
      explorationRate: number;
      knowledgeGrowth: number;
    };
  };
  knowledge: {
    tacticalPatterns: KnowledgeCluster[];
    positionalPrinciples: KnowledgeCluster[];
    defensiveStrategies: KnowledgeCluster[];
    openingLines: KnowledgeCluster[];
  };
  recentInsights: LearningLogEntry[];
  learnMap: Array<[string, EnhancedLearnEntry]>;
  patterns: MovePattern[];
}

export interface MovePattern {
  fen: string;
  move: string;
  result: "win" | "loss" | "draw" | "error";
  score: number;
  depth: number;
  timestamp: number;
  visits: number;
}
