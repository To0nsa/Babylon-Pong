// src/client/fx/config.ts
import { Color3 } from "@babylonjs/core/Maths/math";
import { FXColors } from "./colors";

/**
 * Central place for FX tuning—keeps hard-coded numbers out of effects.
 * Effects read only from FXConfig and trigger-time params (deterministic, render-only).
 */
export type FXConfig = {
  // Force-field (wall pulse)
  forceField: {
    lifeMs: number;
    baseRadiusMul: number;  // scales with ball radius
    peakAlpha: number;
    tiltDeg: number;        // slight normal tilt toward incoming velocity
    poolSize: number;       // how many discs/materials prewarmed
  };
  // Glow burst (ball explode)
  burst: {
    flashMs: number;
    ringMs: number;
    sparkMs: number;
    sparkCount: number;
    poolSize: number;       // how many burst-actors prewarmed (step 3)
  };
  // Shared colors
  colors: {
    core: Color3;
    ring: Color3;
    spark: Color3;
  };
  // Global intensity knobs (enable future photosensitive presets)
  intensity: {
    alphaMul: number; // global multiplier applied by effects
    sizeMul: number;  // global size multiplier
  };
};

export const DEFAULT_FX_CONFIG: FXConfig = {
  forceField: {
    lifeMs: 360,
    baseRadiusMul: 1.5,
    peakAlpha: 0.18,
    tiltDeg: 15.0,
    poolSize: 8,
  },
  burst: {
    flashMs: 312,
    ringMs: 432,
    sparkMs: 504,
    sparkCount: 6,
    poolSize: 6,
  },
  colors: {
    core: FXColors.core,                 // shared glow tint
    ring: FXColors.core.scale(1.2),
    spark: FXColors.core.scale(0.9),
  },
  intensity: {
    alphaMul: 1.0,
    sizeMul: 1.0,
  },
};
