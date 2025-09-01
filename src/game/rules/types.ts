// src/game/rules/types.ts
export type Side = "left" | "right";

export type GameRules = {
  targetScore: number; // 11
  winBy: number; // 2
  servesPerTurn: number; // 2 (pre-deuce)
  deuceServesPerTurn: number; // 1 (from deuce)
  deuceAt?: number; // default: targetScore - 1
};

export type MatchRules = {
  bestOf: 3 | 5 | 7;
  switchEndsEachGame: boolean; // true
  decidingGameMidSwapAtPoints?: number; // 5 (table tennis)
  alternateInitialServerEachGame: boolean; // true
};

export type Ruleset = {
  game: GameRules;
  match: MatchRules;
};

export const sideOpposite = (s: Side): Side =>
  s === "left" ? "right" : "left";
