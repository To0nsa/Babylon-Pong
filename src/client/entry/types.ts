// src/types.ts
export interface PongInstance {
  start(): void;
  destroy(): void;
}

export type ReturnTypeCreateBounces = {
  scheduleServe: (dir: -1 | 1) => void;
  update: (x: number, vx: number) => number;
  clear: () => void;
};
