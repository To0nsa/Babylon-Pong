// src/client/scene/Color.ts
import { Color3 } from "@babylonjs/core/Maths/math.color";

/**
 * Centralized palette for scene objects.
 * Tuned for a space / neon theme.
 */
export const Colors = {
  // Ball
  ball: new Color3(1.0, 0.4, 0.0), // bright orange

  // Paddles
  paddleLeft: new Color3(1.0, 0.2, 0.6), // magenta / pink neon
  paddleRight: new Color3(0.4, 1.0, 0.5), // lime green neon

  // Table
  tableTop: new Color3(0.05, 0.1, 0.25), // deep navy blue
  tableBorder: new Color3(0.3, 0.7, 1.0), // cyan edges
  tableDepth: new Color3(1.0, 1.0, 1.0)   // cool slate (slight blue)
};
