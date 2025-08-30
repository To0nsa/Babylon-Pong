// src/client/FX/Burst.ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { FXContext } from "./context";
import { incHide, easeOutQuad } from "./fxUtils";
// If you have FXColors, you can keep using it; otherwise pick colors here:
const DEFAULT_CORE = new Color3(1.0, 0.7, 0.2); // warm orange
const DEFAULT_RING = new Color3(1.2, 0.9, 0.5);
const DEFAULT_SPARK = new Color3(1.0, 0.8, 0.4);

export type BurstOptions = {
  /** Master knob: scales size, speed, debris count, and a bit of lifetime. Default 1. */
  scale?: number;
  /** Extra brightness punch without changing size. Default 1. */
  intensity?: number;
  /** Override spark count (after scale). If omitted, uses 10 * scale. */
  sparkCount?: number;
  /** Lifetimes in ms (pre-scale). */
  durations?: { flash?: number; ring?: number; spark?: number };
  /** Peak glow intensity target; default auto based on intensity. */
  glowPeak?: number;
  /** Color overrides. */
  colors?: { core?: Color3; ring?: Color3; spark?: Color3 };
  /** Multipliers for spark speed and gravity. */
  speedMul?: number;
  gravityMul?: number;
};

export function createGlowBurstFX(
  ctx: FXContext,
  ballMesh: AbstractMesh,
  ballRadius: number,
  options: BurstOptions = {},
) {
  const { scene, glow } = ctx;

  // -------- options / scaling --------
  const S = Math.max(0.25, options.scale ?? 1); // global scale
  const I = Math.max(0.2, options.intensity ?? 1); // brightness oomph

  const base = {
    flashMs: 260,
    ringMs: 360,
    sparkMs: 420,
    sparkCount: 10,
    sparkSpeed: 22,
    sparkGravity: -60,
    ringDiameter: 5.0,
    ringThickness: 0.05,
    sparkSize: 0.22,
  };

  const durations = {
    flash: (options.durations?.flash ?? base.flashMs) * (0.85 + 0.15 * S),
    ring: (options.durations?.ring ?? base.ringMs) * (0.85 + 0.15 * S),
    spark: (options.durations?.spark ?? base.sparkMs) * (0.9 + 0.25 * S),
  };

  const sparkCount = Math.max(
    2,
    Math.round((options.sparkCount ?? base.sparkCount) * S),
  );

  const sparkSpeed =
    ballRadius * (base.sparkSpeed * (options.speedMul ?? 1) * S);
  const sparkGravity =
    ballRadius * (base.sparkGravity * (options.gravityMul ?? 1) * S);

  const ringDiameter = ballRadius * (base.ringDiameter * S);
  const ringThickness = ballRadius * (base.ringThickness * S);
  const sparkSize = ballRadius * (base.sparkSize * Math.sqrt(S)); // gentle growth

  const colors = {
    core: options.colors?.core ?? DEFAULT_CORE.scale(I),
    ring: options.colors?.ring ?? DEFAULT_RING.scale(I * 1.2),
    spark: options.colors?.spark ?? DEFAULT_SPARK.scale(I),
  };

  const glowPeak = options.glowPeak ?? Math.max(glow.intensity, 1.5 + 0.4 * I);

  // -------- materials (once) --------
  const flashMat = (() => {
    const m = new StandardMaterial("fx-burst-flash", scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = colors.core.clone();
    m.alpha = 0.65;
    m.alphaMode = Constants.ALPHA_ADD;
    return m;
  })();
  const ringMat = (() => {
    const m = new StandardMaterial("fx-burst-ring", scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = colors.ring.clone();
    m.alpha = 0.35;
    m.alphaMode = Constants.ALPHA_ADD;
    return m;
  })();
  const sparkMat = (() => {
    const m = new StandardMaterial("fx-burst-spark", scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.specularColor = Color3.Black();
    m.emissiveColor = colors.spark.clone();
    m.alpha = 0.9;
    m.alphaMode = Constants.ALPHA_ADD;
    return m;
  })();

  function animateFlash(origin: Vector3) {
    const mesh = MeshBuilder.CreateSphere(
      "fx-flash",
      {
        diameter: ballRadius * 2 * S,
        segments: 12,
      },
      scene,
    );
    mesh.material = flashMat;
    mesh.isPickable = false;
    mesh.position.copyFrom(origin);
    mesh.scaling.set(1, 1, 1);

    const baseGlow = glow.intensity;
    const peakGlow = glowPeak;

    const t0 = performance.now();
    const sub = scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - t0) / durations.flash);
      const fade = easeOutQuad(1 - t);
      mesh.scaling.set(1 + 1.1 * t, 1 + 0.6 * t, 1 + 0.3 * t);
      flashMat.alpha = 0.65 * fade;
      glow.intensity =
        baseGlow + (peakGlow - baseGlow) * (1 - (1 - t) * (1 - t));
      if (t >= 1) {
        glow.intensity = baseGlow;
        scene.onBeforeRenderObservable.remove(sub);
        mesh.dispose();
      }
    });
  }

  function animateRing(origin: Vector3) {
    const torus = MeshBuilder.CreateTorus(
      "fx-ring",
      {
        diameter: ringDiameter,
        thickness: ringThickness,
        tessellation: 48,
      },
      scene,
    );
    torus.material = ringMat;
    torus.isPickable = false;
    torus.position.copyFrom(origin);
    torus.rotation.x = Math.PI / 2;
    torus.scaling.set(0.2, 0.2, 0.2);

    const t0 = performance.now();
    const sub = scene.onBeforeRenderObservable.add(() => {
      const t = Math.min(1, (performance.now() - t0) / durations.ring);
      const s = 0.2 + 2.8 * easeOutQuad(t);
      torus.scaling.set(s, (ringThickness / (ballRadius * 0.05)) * 0.05, s); // keep visually thin
      ringMat.alpha = 0.35 * (1 - t);
      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(sub);
        torus.dispose();
      }
    });
  }

  function animateSparks(origin: Vector3) {
    const t0 = performance.now();
    const sparks = Array.from({ length: sparkCount }, () => {
      const mesh = MeshBuilder.CreateSphere(
        "fx-spark",
        { diameter: sparkSize, segments: 6 },
        scene,
      );
      mesh.material = sparkMat;
      mesh.isPickable = false;
      mesh.position.copyFrom(origin);
      const ang = Math.random() * Math.PI * 2;
      const v = new Vector3(
        Math.cos(ang),
        0.35 + Math.random() * 0.25,
        Math.sin(ang),
      ).scale(sparkSpeed);
      return { mesh, v };
    });

    const sub = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      const age = performance.now() - t0;
      const life01 = Math.min(1, age / durations.spark);
      const fade = 1 - life01;

      for (const s of sparks) {
        s.v.y += sparkGravity * dt;
        s.mesh.position.addInPlace(s.v.scale(dt));
        const k = 0.25 + 0.75 * fade;
        s.mesh.scaling.set(k, k, k);
        sparkMat.alpha = 0.9 * fade;
      }
      if (life01 >= 1) {
        scene.onBeforeRenderObservable.remove(sub);
        for (const s of sparks) s.mesh.dispose();
      }
    });
  }

  function trigger(x: number, y: number, z: number) {
    incHide(ballMesh);
    const p = new Vector3(x, y, z);
    animateFlash(p);
    animateRing(p);
    animateSparks(p);
  }

  function dispose() {
    flashMat.dispose();
    ringMat.dispose();
    sparkMat.dispose();
  }

  return { trigger, dispose };
}
