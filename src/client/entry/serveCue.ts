import type { Phase } from "../../game/state";
import { decHide } from "../FX";
import type { ReturnTypeCreateBounces } from "./types"; // see note below
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";

type Entered = "left" | "right" | null;

export function detectEnteredServe(prev: Phase, next: Phase): Entered {
  const isServe = (p: Phase) => p === "serveLeft" || p === "serveRight";
  if (isServe(next) && !isServe(prev)) {
    return next === "serveLeft" ? "left" : "right";
  }
  return null;
}

/** Perform the render-side cues when we enter a serve phase. */
export function onEnteredServe(
  who: "left" | "right",
  deps: {
    ballMesh: AbstractMesh;
    Bounces: ReturnTypeCreateBounces;
    paddleAnim: { cue: (ms?: number) => number };
    blockInputFor: (ms: number) => void;
  },
) {
  const dir = who === "left" ? 1 : -1;
  decHide(deps.ballMesh);
  deps.Bounces.scheduleServe(dir);
  const blocked = deps.paddleAnim.cue(220);
  deps.blockInputFor(blocked);
}
