// src/client/fx/force-field.ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { FresnelParameters } from "@babylonjs/core/Materials/fresnelParameters";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { Constants } from "@babylonjs/core/Engines/constants";

import type { FXContext } from "./context";
import type { WallSide } from "@shared/domain/ids";
import { makePool } from "./pool";
import { easeOutQuad } from "./utils";
import type { FXConfig } from "./config";
import { DEFAULT_FX_CONFIG } from "./config";

type Unsub = () => void;

type Actor = {
  mesh: Mesh;
  mat: StandardMaterial;
};

type Pulse = {
  actor: Actor;
  ageMs: number;
  lifeMs: number;
  startScale: number;
  endScale: number;
  alphaPeak: number;
};

export function createForceFieldFX(
  ctx: FXContext,
  wallZNorth: number,
  wallZSouth: number,
  ballRadius: number,
  addTicker: (fn: (dt: number) => boolean | void) => Unsub,
  cfg: FXConfig = DEFAULT_FX_CONFIG,
) {
  const { scene } = ctx;
  const C = cfg.forceField;
  const globalAlpha = cfg.intensity.alphaMul;
  const baseRadius = ballRadius * (cfg.forceField.baseRadiusMul ?? 5.0);

  // ---------- pooled actors (mesh + its own material) ----------
  const pool = makePool<Actor>(
    () => {
      const mesh = MeshBuilder.CreateDisc(
        "ff-hex",
        {
          radius: baseRadius,
          tessellation: 6,
          sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
      );
      mesh.isPickable = false;
      mesh.visibility = 1;
      mesh.isVisible = false;
      mesh.renderingGroupId = 2;

      const mat = new StandardMaterial("ff-hex-core", scene);
      mat.disableLighting = true;
      mat.emissiveColor = cfg.colors.core.scale(0.4);
      mat.diffuseColor.set(0, 0, 0);
      mat.specularColor.set(0, 0, 0);
      mat.alpha = 0; // start hidden
      mat.backFaceCulling = false;
      mat.separateCullingPass = true;
      mat.forceDepthWrite = false;
      mat.zOffset = -1;

      const fres = new FresnelParameters();
      fres.isEnabled = true;
      fres.power = 2.0;
      fres.bias = 0.2;
      fres.leftColor = cfg.colors.core.scale(1.8);
      fres.rightColor = cfg.colors.core.scale(1.8);
      mat.emissiveFresnelParameters = fres;

      mesh.material = mat;
      return { mesh, mat };
    },
    // reset on release
    (a) => {
      a.mat.alpha = 0;
      a.mesh.isVisible = false;
      a.mesh.scaling.setAll(1);
    },
    // dispose on pool.clear()
    (a) => {
      a.mesh.dispose(false, true);
      a.mat.dispose();
    },
  );
  pool.warm(C.poolSize);

  // ---------- active pulses ----------
  const active: Pulse[] = [];
  let unsub: Unsub | null = null;

  function ensureTicker() {
    if (unsub) return;
    unsub = addTicker((dt) => {
      // Auto-stop when no active pulses, but ALSO clear our handle so we can re-arm later.
      if (active.length === 0) {
        unsub = null; // <- crucial: allow next trigger() to add a new ticker
        return false; // FXManager will remove this ticker this frame
      }

      const dtMs = dt * 1000;
      for (let i = active.length - 1; i >= 0; --i) {
        const p = active[i];
        p.ageMs += dtMs;

        const t01 = p.ageMs >= p.lifeMs ? 1 : p.ageMs / p.lifeMs;
        const s = p.startScale + (p.endScale - p.startScale) * easeOutQuad(t01);
        p.actor.mesh.scaling.set(s, s, 1);

        const fade = 1 - t01;
        p.actor.mat.alpha = p.alphaPeak * globalAlpha * (fade * fade);

        if (t01 >= 1) {
          active.splice(i, 1);
          pool.release(p.actor);
        }
      }
      return true;
    });
  }

  function spawn(side: WallSide, x: number, y: number, vzAbs: number) {
    let actor = pool.acquire();
    if (!actor) {
      // Pool exhausted: recycle oldest for determinism & stability.
      const oldest = active.shift();
      if (oldest) {
        pool.release(oldest.actor);
        actor = pool.acquire();
      }
    }
    if (!actor) return; // nothing available

    const z = side === "north" ? wallZNorth : wallZSouth;

    // Keep intensity (alpha) speed-scaled with a gentle saturation curve.
    const K = 10.0; // knee — tune to taste
    const norm = vzAbs / (vzAbs + K);
    const alphaPeak = C.peakAlpha * (0.7 + 0.6 * norm);

    // NEW: size is fixed (no speed coupling). Use baseRadiusMul in config to tune overall size.
    const startScale = 0.85; // compact initial pop
    const endScale = 1.2; // gentle expansion

    // Position & orientation
    actor.mesh.position.copyFromFloats(x, y, z);
    actor.mesh.lookAt(new Vector3(x, y, 0));

    // Slight tilt toward incoming velocity (pressure feel)
    const tiltRad = (C.tiltDeg * Math.PI) / 180;
    actor.mesh.rotation.x += (side === "north" ? +1 : -1) * tiltRad;

    actor.mesh.isVisible = true;

    active.push({
      actor,
      ageMs: 0,
      lifeMs: C.lifeMs,
      startScale,
      endScale,
      alphaPeak,
    });

    ensureTicker();
  }

  function trigger(side: WallSide, x: number, y: number, vzAbs: number) {
    spawn(side, x, y, Math.max(0, vzAbs || 0));
  }

  function dispose() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    active.length = 0;
    pool.clear();
  }

  return { trigger, dispose };
}
