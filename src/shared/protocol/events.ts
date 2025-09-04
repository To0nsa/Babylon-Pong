// src/shared/protocol/events.ts
import type { WallSide } from "@shared/domain/ids";

export type FrameEvents = {
  wallHit?: { side: WallSide; x: number; z: number };
  explode?: { x: number; z: number };
};
