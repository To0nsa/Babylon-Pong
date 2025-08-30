// src/client/input/aggregate.ts
import type { InputIntent } from "../../game/input";
import { ZeroIntent } from "../../game/input";
import { attachKeyboard, readKeyboardAxes } from "./keyboard";
import { attachTouchZones, readTouchAxes } from "./touchZones";
import { blockInputFor, isInputBlocked } from "./core/block";

export { blockInputFor, isInputBlocked };

export type Detach = () => void;

/**
 * Public entry: attach both keyboard + touch. Returns a single detach.
 * Keep this name so existing imports continue to work.
 */
export function attachLocalInput(el: HTMLElement): Detach {
  const dk = attachKeyboard(el);
  const dt = attachTouchZones(el);
  return () => {
    dk();
    dt();
  };
}

/** Merge touch + keyboard into your headless InputIntent. */
export function readIntent(): InputIntent {
  if (isInputBlocked()) return ZeroIntent;

  const { leftAxisTouch, rightAxisTouch } = readTouchAxes();
  const { leftAxisKey, rightAxisKey } = readKeyboardAxes();

  const leftAxis = leftAxisTouch !== 0 ? leftAxisTouch : leftAxisKey;
  const rightAxis = rightAxisTouch !== 0 ? rightAxisTouch : rightAxisKey;

  return { leftAxis, rightAxis };
}
