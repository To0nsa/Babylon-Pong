// src/game/systems/utils.ts
import type { GameState } from "../state";

export function clampZ(s: GameState, z: number): number {
  const max = s.bounds.halfWidthZ - s.bounds.margin - s.bounds.ballRadius;
  return Math.max(-max, Math.min(max, z));
}

export function isServePhase(p: GameState["phase"]): boolean {
  return p === "serveLeft" || p === "serveRight";
}

export function isFreezePhase(p: GameState["phase"]): p is "pointFreeze" {
  return p === "pointFreeze";
}
