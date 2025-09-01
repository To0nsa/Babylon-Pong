// src/game/systems/utils.ts
import type { GameState } from "../model/state";

export function clampZ(s: GameState, z: number): number {
  const max = s.bounds.halfWidthZ - s.bounds.ballRadius;
  return Math.max(-max, Math.min(max, z));
}

export function isServePhase(p: GameState["phase"]): boolean {
  return p === "serveEast" || p === "serveWest";
}

export function isPauseBtwPoints(p: GameState["phase"]): p is "pauseBtwPoints" {
  return p === "pauseBtwPoints";
}

export function isRallyPhase(p: GameState["phase"]): p is "rally" {
  return p === "rally";
}
