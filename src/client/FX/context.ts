// src/client/FX/context.ts
import type { Scene } from "@babylonjs/core/scene";
import { GlowLayer } from "@babylonjs/core/Layers/glowLayer";
import { ensureGlow } from "./fxUtils";

export type FXContext = { scene: Scene; glow: GlowLayer };
export function createFXContext(scene: Scene): FXContext {
  return { scene, glow: ensureGlow(scene) };
}
