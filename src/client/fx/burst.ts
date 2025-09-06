// src/client/fx/burst.ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { Constants } from "@babylonjs/core/Engines/constants";

import type { FXContext } from "./context";
import type { FXConfig } from "./config";
import { DEFAULT_FX_CONFIG } from "./config";
import { makePool } from "./pool";
import { easeOutQuad, incHide } from "./utils";
import { clamp01 } from "@shared/utils/math";
import { getBallTint } from "./colors";

type Unsub = () => void;

type Spark = { mesh: Mesh; v: Vector3 };
type Actor = {
  flash: Mesh;
  ring: Mesh;
  sparks: Spark[];
  mats: {
    flash: StandardMaterial;
    ring: StandardMaterial;
    spark: StandardMaterial;
  };
  ringYScale: number;
};

type Burst = {
  actor: Actor;
  ageMs: number;
  lifeFlash: number;
  lifeRing: number;
  lifeSpark: number;
};

export function createGlowBurstFX(
  ctx: FXContext,
  ballMesh: AbstractMesh,
  ballRadius: number,
  addTicker: (fn: (dt: number) => boolean | void) => Unsub,
  cfg: FXConfig = DEFAULT_FX_CONFIG,
) {
  const { scene } = ctx;

  // Global knobs (kept close to prior look)
  const S = 0.6 * (cfg.intensity.sizeMul ?? 1);     // master size dial
  const I = 1.0 * (cfg.intensity.alphaMul ?? 1);    // master alpha dial

  const base = {
    sparkCount: Math.max(2, cfg.burst.sparkCount | 0),
    flashMs: Math.max(60, cfg.burst.flashMs | 0),
    ringMs: Math.max(60, cfg.burst.ringMs | 0),
    sparkMs: Math.max(60, cfg.burst.sparkMs | 0),

    sparkSpeed: 22,
    sparkGravity: -60,
    ringDiameter: 5.0,
    ringThickness: 0.05,
    sparkSize: 0.22,
  };

  const sparkSpeed   = ballRadius * base.sparkSpeed * S;
  const sparkGravity = ballRadius * base.sparkGravity * S;
  const ringDiameter = ballRadius * base.ringDiameter * S;
  const ringThickness = ballRadius * base.ringThickness * S;
  const sparkSize    = ballRadius * base.sparkSize * Math.sqrt(S);
  const flashDiameter = ballRadius * 2 * S;

  // ---------- pooled actors (composite) ----------
  const pool = makePool<Actor>(
    () => {
      // Materials are PER-ACTOR (so alphas/brightness don’t clash across bursts)
      const makeMat = (name: string, intensity: number) => {
        const m = new StandardMaterial(name, scene);
        m.disableLighting = true;
        m.diffuseColor.set(0, 0, 0);
        m.specularColor.set(0, 0, 0);
        // default color will be overridden per-trigger from the ball tint
        m.emissiveColor.set(1, 1, 1);
        m.alpha = 0;
        m.alphaMode = Constants.ALPHA_ADD;
        m.backFaceCulling = false;
        m.separateCullingPass = true;
        return m;
      };

      const flashMat = makeMat("fx-burst-flash", 1.0 * I);
      const ringMat  = makeMat("fx-burst-ring", 1.2 * I);
      const sparkMat = makeMat("fx-burst-spark", 1.0 * I);

      // Flash (sphere)
      const flash = MeshBuilder.CreateSphere(
        "fx-burst:flash",
        { diameter: flashDiameter, segments: 12 },
        scene,
      );
      flash.material = flashMat;
      flash.isPickable = false;
      flash.isVisible = false;

      // Ring (torus)
      const ring = MeshBuilder.CreateTorus(
        "fx-burst:ring",
        { diameter: ringDiameter, thickness: ringThickness, tessellation: 48 },
        scene,
      );
      ring.material = ringMat;
      ring.isPickable = false;
      ring.isVisible = false;
      ring.rotation.x = Math.PI / 2;
      // keep visually thin as it grows — constant Y scale proxy
      const ringYScale = (ringThickness / (ballRadius * 0.05)) * 0.05;

      // Sparks (pre-created)
      const sparks: Spark[] = Array.from({ length: base.sparkCount }, () => {
        const m = MeshBuilder.CreateSphere(
          "fx-burst:spark",
          { diameter: sparkSize, segments: 6 },
          scene,
        );
        m.material = sparkMat;
        m.isPickable = false;
        m.isVisible = false;
        return { mesh: m, v: new Vector3() };
      });

      return { flash, ring, sparks, mats: { flash: flashMat, ring: ringMat, spark: sparkMat }, ringYScale };
    },
    // reset (on release)
    (a) => {
      a.flash.isVisible = false; a.ring.isVisible = false;
      a.mats.flash.alpha = 0; a.mats.ring.alpha = 0; a.mats.spark.alpha = 0;
      a.flash.scaling.set(1, 1, 1);
      a.ring.scaling.set(0.2, a.ringYScale, 0.2);
      for (const s of a.sparks) {
        s.mesh.isVisible = false;
        s.mesh.scaling.set(1, 1, 1);
        s.v.setAll(0);
      }
    },
    // dispose
    (a) => {
      a.flash.dispose(false, true);
      a.ring.dispose(false, true);
      for (const s of a.sparks) s.mesh.dispose(false, true);
      a.mats.flash.dispose();
      a.mats.ring.dispose();
      a.mats.spark.dispose();
    },
  );
  pool.warm(cfg.burst.poolSize);

  // ---------- active list + central ticker ----------
  const active: Burst[] = [];
  let unsub: Unsub | null = null;

  function ensureTicker() {
    if (unsub) return;
    unsub = addTicker((dt) => {
      if (active.length === 0) {
        unsub = null;
        return false;
      }
      const dtMs = dt * 1000;

      for (let i = active.length - 1; i >= 0; --i) {
        const b = active[i];
        b.ageMs += dtMs;

        // Timelines
        const tF = clamp01(b.ageMs / b.lifeFlash);
        const tR = clamp01(b.ageMs / b.lifeRing);
        const tS = clamp01(b.ageMs / b.lifeSpark);

        // Flash: quick pop + fade
        {
          const fade = easeOutQuad(1 - tF);
          const sX = 1 + 1.1 * tF, sY = 1 + 0.6 * tF, sZ = 1 + 0.3 * tF;
          b.actor.flash.scaling.set(sX, sY, sZ);
          b.actor.mats.flash.alpha = 0.65 * fade;
        }

        // Ring: expand, keep visually thin
        {
          const s = 0.2 + 2.8 * easeOutQuad(tR);
          b.actor.ring.scaling.set(s, b.actor.ringYScale, s);
          b.actor.mats.ring.alpha = 0.35 * (1 - tR);
        }

        // Sparks: ballistic fade
        {
          const dtSec = dt;
          const fade = 1 - tS;
          for (const s of b.actor.sparks) {
            s.v.y += sparkGravity * dtSec;
            const dx = s.v.x * dtSec, dy = s.v.y * dtSec, dz = s.v.z * dtSec;
            s.mesh.position.addInPlaceFromFloats(dx, dy, dz);
            const k = 0.25 + 0.75 * fade;
            s.mesh.scaling.set(k, k, k);
          }
          b.actor.mats.spark.alpha = 0.9 * fade;
        }

        // Done?
        if (tF >= 1 && tR >= 1 && tS >= 1) {
          active.splice(i, 1);
          pool.release(b.actor);
        }
      }
      return true;
    });
  }

  function spawn(x: number, y: number, z: number) {
    let actor = pool.acquire();
    if (!actor) {
      const oldest = active.shift();
      if (oldest) {
        pool.release(oldest.actor);
        actor = pool.acquire();
      }
    }
    if (!actor) return;

    // === Per-trigger tint: read from current ball material ===
    const tint = getBallTint(ballMesh);
    actor.mats.flash.emissiveColor.copyFrom(tint).scaleInPlace(1.0 * I);
    actor.mats.ring.emissiveColor.copyFrom(tint).scaleInPlace(1.2 * I);
    actor.mats.spark.emissiveColor.copyFrom(tint).scaleInPlace(1.0 * I);

    // Position & (re)arm meshes
    actor.flash.position.set(x, y, z);
    actor.ring.position.set(x, y, z);
    actor.flash.isVisible = true;
    actor.ring.isVisible = true;
    actor.mats.flash.alpha = 0;
    actor.mats.ring.alpha = 0;
    actor.flash.scaling.set(1, 1, 1);
    actor.ring.scaling.set(0.2, actor.ringYScale, 0.2);

    // Sparks: random radial spread
    for (const s of actor.sparks) {
      s.mesh.position.set(x, y, z);
      s.mesh.isVisible = true;
      const ang = Math.random() * Math.PI * 2;
      s.v.set(
        Math.cos(ang) * sparkSpeed,
        (0.35 + Math.random() * 0.25) * sparkSpeed,
        Math.sin(ang) * sparkSpeed,
      );
    }

    active.push({
      actor,
      ageMs: 0,
      lifeFlash: base.flashMs,
      lifeRing: base.ringMs,
      lifeSpark: base.sparkMs,
    });

    ensureTicker();
  }

  function trigger(x: number, y: number, z: number) {
    incHide(ballMesh);
    spawn(x, y, z);
  }

  function dispose() {
    if (unsub) { unsub(); unsub = null; }
    active.length = 0;
    pool.clear();
  }

  return { trigger, dispose };
}
