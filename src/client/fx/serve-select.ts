// src/client/fx/serve-select.ts
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Constants } from "@babylonjs/core/Engines/constants";
import type { Color3 } from "@babylonjs/core/Maths/math";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { FXContext } from "./context";
import { easeOutQuad } from "./utils";
import type { TableEnd } from "@shared/domain/ids";
import { Colors } from "@client/scene/color";
import { SERVE_SELECT_TOTAL_MS } from "@shared/domain/timing";

type Side = "left" | "right";
const sideOf = (end: TableEnd): Side => (end === "east" ? "left" : "right");

export type ServeSelectOptions = {
  beatMs?: number; // default 120
  holdMs?: number; // default 1000
  alpha?: number;  // default 0.35
};

type Overlay = {
  mesh: AbstractMesh;
  mat: StandardMaterial;
};

type Unsub = () => void;

export function createServeSelectionFX(
  ctx: FXContext,
  tableTop: AbstractMesh,
  options: ServeSelectOptions = {},
  addTicker?: (fn: (dt: number) => boolean | void) => Unsub, // central ticker (preferred)
) {
  const { scene } = ctx;

  // --- Geometry: two thin overlays over each half (unchanged look/size) ---
  tableTop.computeWorldMatrix(true);
  const bb = tableTop.getBoundingInfo().boundingBox;
  const lengthX = bb.extendSizeWorld.x * 2; // total X
  const widthZ  = bb.extendSizeWorld.z * 2; // total Z
  const y = tableTop.position.y + 0.003;    // slight lift above top
  const halfX = lengthX / 2;

  const makeHalf = (name: string, sx: number, sz: number, px: number, tint: Color3): Overlay => {
    const mesh = MeshBuilder.CreateBox(name, { width: sx, depth: sz, height: 0.006 }, scene);
    mesh.position.copyFromFloats(px, y, 0);
    mesh.isPickable = false;
    mesh.parent = tableTop.parent;
    mesh.isVisible = false;

    const mat = new StandardMaterial(name + ":mat", scene);
    mat.disableLighting = true;
    mat.diffuseColor.set(0, 0, 0);
    mat.specularColor.set(0, 0, 0);
    mat.emissiveColor = tint.clone(); // keep original colors
    mat.alpha = 0.0;
    mat.alphaMode = Constants.ALPHA_ADD; // unchanged additive glow
    mat.backFaceCulling = false;
    mat.separateCullingPass = true;

    mesh.material = mat;
    return { mesh, mat };
  };

  const left  = makeHalf("serveFX-left",  halfX, widthZ, -halfX / 2, Colors.paddleLeft);
  const right = makeHalf("serveFX-right", halfX, widthZ, +halfX / 2, Colors.paddleRight);

  const beatMs   = Math.max(40,  options.beatMs ?? 120);
  const holdMs   = Math.max(0,   options.holdMs ?? 1000);
  const peakA    = Math.max(0, Math.min(1, options.alpha ?? 0.35));
  const flickerMs = Math.max(0, SERVE_SELECT_TOTAL_MS - holdMs);

  // ---------- Central ticker state (mirrors old onBeforeRender logic) ----------
  let unsub: Unsub | null = null;
  let running: null | {
    target: Side;
    startMs: number;
    beats: number;
    resolve: () => void;
  } = null;

  function stopTicker() {
    if (unsub) { unsub(); unsub = null; }
  }

  function setFinal(target: Side) {
    left.mesh.isVisible = right.mesh.isVisible = true;
    left.mat.alpha  = target === "left"  ? peakA : 0.0;
    right.mat.alpha = target === "right" ? peakA : 0.0;
  }

  function hideAll() {
    left.mesh.isVisible = right.mesh.isVisible = false;
    left.mat.alpha = right.mat.alpha = 0.0;
  }

  function startTickerIfNeeded() {
    if (unsub || !addTicker) return;
    unsub = addTicker(() => {
      if (!running) return false; // nothing active → remove ticker

      const tNow = performance.now();
      const t = tNow - running.startMs;

      if (t < flickerMs) {
        // identical beat math to old version
        const i = Math.min(running.beats - 1, Math.floor(t / beatMs));
        const onOppositeFirst = i % 2 === 0; // 0,2,4... = opposite; 1,3,5... = target
        const active: Side =
          onOppositeFirst
            ? (running.target === "left" ? "right" : "left")
            : running.target;

        const within = (t % beatMs) / beatMs;           // 0..1 inside the beat
        const pulse  = 1.0 - easeOutQuad(1 - within);   // quick rise, soft fade
        const a = peakA * pulse;

        left.mesh.isVisible = right.mesh.isVisible = true;
        left.mat.alpha  = active === "left"  ? a : 0.0;
        right.mat.alpha = active === "right" ? a : 0.0;

        return true;
      }

      if (t < flickerMs + holdMs) {
        // hold final side solid
        setFinal(running.target);
        return true;
      }

      // done → hide & resolve
      hideAll();
      const done = running;
      running = null;
      done.resolve();
      return false; // remove ticker
    });
  }

  async function trigger(targetEnd: TableEnd): Promise<void> {
    // compute even number of beats so we end on the target side during hold
    let beats = Math.max(2, Math.floor(flickerMs / beatMs));
    if (beats % 2 === 1) beats--;

    // if already running, cancel/resolve immediately and restart fresh
    if (running) {
      // Hide ASAP and stop ticker; the new trigger will start it again if needed
      hideAll();
      const prev = running;
      running = null;
      prev.resolve();
      stopTicker();
    }

    // Fallback path if central ticker isn't provided: use your original observable+timeout
    if (!addTicker) {
      await legacyTrigger(targetEnd);
      return;
    }

    // central ticker path
    await new Promise<void>((resolve) => {
      running = {
        target: sideOf(targetEnd),
        startMs: performance.now(),
        beats,
        resolve,
      };
      startTickerIfNeeded();
    });
  }

  // ------- Original per-trigger logic kept as a fallback (unchanged behavior) -------
  async function legacyTrigger(targetEnd: TableEnd): Promise<void> {
    const targetSide = sideOf(targetEnd);
    let beats = Math.max(2, Math.floor(flickerMs / beatMs));
    if (beats % 2 === 1) beats--;

    const start = performance.now();
    const sub = scene.onBeforeRenderObservable.add(() => {
      const t = performance.now() - start;

      if (t < flickerMs) {
        const i = Math.min(beats - 1, Math.floor(t / beatMs));
        const onOppositeFirst = i % 2 === 0;
        const active: Side = onOppositeFirst
          ? (targetSide === "left" ? "right" : "left")
          : targetSide;

        const within = (t % beatMs) / beatMs;
        const pulse = 1.0 - easeOutQuad(1 - within);
        const alpha = peakA * pulse;

        left.mesh.isVisible = right.mesh.isVisible = true;
        left.mat.alpha  = active === "left"  ? alpha : 0.0;
        right.mat.alpha = active === "right" ? alpha : 0.0;
        return;
      }

      scene.onBeforeRenderObservable.remove(sub);
      setFinal(targetSide);

      setTimeout(() => hideAll(), holdMs);
    });

    await new Promise<void>((r) => setTimeout(r, SERVE_SELECT_TOTAL_MS + 20));
  }

  function dispose() {
    stopTicker();
    hideAll();
    left.mesh.dispose(false, true);
    right.mesh.dispose(false, true);
    left.mat.dispose();
    right.mat.dispose();
  }

  return { trigger, dispose };
}
