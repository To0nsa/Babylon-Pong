import type { InputIntent } from "../../game/input";
import { ZeroIntent } from "../../game/input";

const keys = new Set<string>();

let blockedUntil = 0;
export function blockInputFor(ms: number) {
  blockedUntil = Math.max(blockedUntil, performance.now() + ms);
}

export function isInputBlocked(): boolean {
  return performance.now() < blockedUntil;
}

export function attachLocalKeys(el: HTMLElement) {
  const dn = (e: KeyboardEvent) => {
    keys.add(e.key);
  };
  const up = (e: KeyboardEvent) => {
    keys.delete(e.key);
  };
  el.addEventListener("keydown", dn);
  el.addEventListener("keyup", up);
  return () => {
    el.removeEventListener("keydown", dn);
    el.removeEventListener("keyup", up);
  };
}

export function readIntent(): InputIntent {
  if (isInputBlocked()) return ZeroIntent;

  // Map W/S for left, ↑/↓ for right; feel free to tweak
  const leftAxis = (keys.has("z") ? 1 : 0) + (keys.has("s") ? -1 : 0);
  const rightAxis =
    (keys.has("ArrowUp") ? 1 : 0) + (keys.has("ArrowDown") ? -1 : 0);

  const clamp = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
  return { leftAxis: clamp(leftAxis), rightAxis: clamp(rightAxis) };
}
