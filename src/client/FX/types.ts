// src/client/FX/types.ts
export type Effect<T = void> = {
  trigger: (args: T extends void ? never : T) => void;
  dispose?: () => void;
};
