// src/client/entry/eventsToFX.ts
import type { FrameEvents } from "../../game";
import type { FXManager } from "../FX/manager";

export function applyFrameEvents(
  fx: FXManager,
  ev: FrameEvents,
  ballY: number,
) {
  if (ev.wallHit) {
    const { side, x } = ev.wallHit;
    fx.wallPulse(side, x, ballY);
  }
  if (ev.explode) {
    const { x, z } = ev.explode;
    fx.burstAt(x, ballY, z);
  }
}
