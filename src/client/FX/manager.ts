// src/client/FX/manager.ts
import type { Scene } from "@babylonjs/core/scene";
import type { Vector3 } from "@babylonjs/core/Maths/math";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { WallSide, TableEnd } from "../../shared/types";

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

export class FXManager {
  readonly ctx: FXContext;
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

    // Serve select now mirrors how Burst handles options: constructor-time.
    this.serveSelect = createServeSelectionFX(this.ctx, opts.tableTop, {
      beatMs: 120,
      holdMs: 1000,
      alpha: 0.35,
    });
  }

  wallPulse(side: WallSide, x: number, y: number) {
    this.forceField.trigger(side, x, y);
  }

  burstAt(x: number, y: number, z: number) {
    this.burst.trigger(x, y, z);
  }

  burstAtV3(p: Vector3) {
    this.burst.trigger(p.x, p.y, p.z);
  }

  // Duration is a constant; no param.
  async serveSelection(end: TableEnd): Promise<void> {
    await this.serveSelect.trigger(end);
  }

  dispose() {
    this.forceField?.dispose?.();
    this.burst?.dispose?.();
    this.serveSelect?.dispose?.();
  }
}

// Optional: export the constant through this module too, if convenient:
// export { SERVE_SELECT_TOTAL_MS } from "./ServeSelect";
