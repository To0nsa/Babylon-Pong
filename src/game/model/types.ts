// src/game/systems/types.ts
export type FrameEvents = {
  wallHit?: { side: "top" | "bottom"; x: number; z: number };
  explode?: { x: number; z: number };
};
