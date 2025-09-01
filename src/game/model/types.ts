// src/game/model/types.ts
import type { WallSide } from "../../shared/types";

export type FrameEvents = {
  wallHit?: { side: WallSide; x: number; z: number };
  explode?: { x: number; z: number };
};
