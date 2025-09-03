// src/client/FX/manager.ts
import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { WallSide } from "../../shared/types";
import type { TableEnd } from "../../shared/types";

import { createFXContext, type FXContext } from "./context";
import { createForceFieldFX } from "./ForceField";
import { createGlowBurstFX } from "./Burst";
import { createServeSelectionFX } from "./ServeSelect";

export type FXManagerOptions = {
  wallZNorth: number;
  wallZSouth: number;
  ballMesh: AbstractMesh;
  ballRadius: number;
  tableTop: AbstractMesh;
};

/**
 * Centralizes FX construction, shared resources, and triggers.
 * Keeps `embed.ts` small and declarative.
 */
export class FXManager {
  readonly ctx: FXContext;

  // Concrete effect instances
  private forceField: ReturnType<typeof createForceFieldFX>;
  private burst: ReturnType<typeof createGlowBurstFX>;
  private serveSelect: ReturnType<typeof createServeSelectionFX>;

  constructor(scene: Scene, opts: FXManagerOptions) {
    this.ctx = createFXContext(scene);

    this.forceField = createForceFieldFX(
      this.ctx,
      opts.wallZNorth,
      opts.wallZSouth,
      opts.ballRadius,
    );

    this.burst = createGlowBurstFX(this.ctx, opts.ballMesh, opts.ballRadius, {
      scale: 0.6,
      intensity: 1.0,
      durations: { flash: 312, ring: 432, spark: 504 },
      sparkCount: 6,
    });

    this.serveSelect = createServeSelectionFX(this.ctx, opts.tableTop);
  }

  /** Show a wall pulse (“force field”) on top/bottom at (x,y). */
  wallPulse(side: WallSide, x: number, y: number) {
    this.forceField.trigger(side, x, y);
  }

  /** Emit a glow burst at world coordinates. */
  burstAt(x: number, y: number, z: number) {
    this.burst.trigger(x, y, z);
  }

  /** Convenience for vector positions. */
  burstAtV3(p: Vector3) {
    this.burst.trigger(p.x, p.y, p.z);
  }

  async serveSelection(end: TableEnd, ms = 2000): Promise<void> {
    await this.serveSelect.trigger(end, ms);
  }

  /**
   * Optional: attach to your headless/game event bus.
   * Provide a tiny adapter so render logic subscribes here, not in embed.ts.
   */
  /*   attachTo(bus: {
    onWallHit?: (cb: (side: Side, x: number, y: number) => void) => void;
    onBallExplode?: (cb: (x: number, y: number, z: number) => void) => void;
  }) {
    bus.onWallHit?.((side, x, y) => this.wallPulse(side, x, y));
    bus.onBallExplode?.((x, y, z) => this.burstAt(x, y, z));
  } */

  /** Dispose all owned effects/resources (idempotent). */
  dispose() {
    this.forceField?.dispose?.();
    this.burst?.dispose?.();
    this.serveSelect?.dispose?.();
    // add per-frame hooks or pools, clean up here too
  }
}
