// src/client/input/aggregate.ts
import type { InputIntent } from "../../game/input/input";
import { ZeroIntent } from "../../game/input/input";
import { attachKeyboard, readKeyboardAxes } from "./keyboard";
import { attachTouchZones, readTouchAxes } from "./touchZones";
import { blockInputFor, isInputBlocked } from "./block";

export { blockInputFor, isInputBlocked };

export type Detach = () => void;

let controlsMirrored = false;
export function setControlsMirrored(v: boolean) {
  controlsMirrored = v;
}
export function toggleControlsMirrored() {
  controlsMirrored = !controlsMirrored;
}

/** Public entry: attach both keyboard + touch. */
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

  // When sides are swapped, swap which paddle each player controls.
  return controlsMirrored
    ? { leftAxis: rightAxis, rightAxis: leftAxis }
    : { leftAxis, rightAxis };
}
