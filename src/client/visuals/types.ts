// src/client/visuals/types.ts
export type Sign = -1 | 1;

export type Segment = {
  startX: number;
  targetX: number;
  y0: number;
  y1: number;
  peakOffset: number;
  type: "arc" | "linear";
  side?: "left" | "right";
  aimFrac?: number;
};
