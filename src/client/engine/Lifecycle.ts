// client/engine/Lifecycle.ts
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Scene } from "@babylonjs/core/scene";

import { createRenderLoop } from "./RenderLoop";
import { Ticker } from "../../shared/utils";

type LifecycleOptions = {
  /** Logic callback; receives a fixed dt in milliseconds each step. */
  update?: (dtMs: number) => void;

  /** Visible tab logic Hz (default 60). */
  logicHz?: number;

  /** Hidden tab logic Hz (default 5). */
  hiddenLogicHz?: number;
};

export function createLifecycle(
  engine: Engine,
  scene: Scene,
  opts: LifecycleOptions = {},
) {
  // Tunables (can be changed at runtime via setRates)
  let visibleHz = Math.max(1, opts.logicHz ?? 60);
  let hiddenHz  = Math.max(1, opts.hiddenLogicHz ?? 5);

  // Active rate depends on visibility
  let currentHz = document.hidden ? hiddenHz : visibleHz;

  // Fixed-step accumulator (ms)
  let accMs = 0;
  const maxSubStepsPerTick = 8; // safety to avoid spiral of death

  const stepOnce = (dtFixedMs: number) => {
    opts.update?.(dtFixedMs);
  };

  const getStepMs = () => Math.round(1000 / currentHz);

  // Render loop: keep it separate; interpolation can be added via preRender if needed
  const render = createRenderLoop(engine, scene);

  // Ticker provides *wall time passed since last tick* (ms). We consume it in fixed steps.
  const ticker = new Ticker((dtWallMs) => {
    accMs += dtWallMs;

    const stepMs = getStepMs();
    let steps = 0;

    // Consume accumulator in fixed quanta
    while (accMs >= stepMs && steps < maxSubStepsPerTick) {
      stepOnce(stepMs);
      accMs -= stepMs;
      steps++;
    }

    // If we were clamped, avoid unbounded backlog
    if (steps === maxSubStepsPerTick) {
      // Snap: drop excess to keep sim responsive (prevents runaway on throttled tabs)
      accMs = Math.min(accMs, stepMs);
    }
  }, currentHz); // ticker cadence starts at currentHz

  // Visibility handling: pause render, retune logic cadence + step size
  const applyHidden = () => {
    currentHz = hiddenHz;
    ticker.setHz(currentHz);
    render.stop();
  };

  const applyVisible = () => {
    currentHz = visibleHz;
    ticker.setHz(currentHz);
    render.start();
    engine.resize(); // ensure backbuffer matches canvas after returning
  };

  const onVisibility = () => {
    if (document.hidden) applyHidden();
    else applyVisible();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // Boot
  ticker.start();
  render.start();
  onVisibility(); // in case we started hidden

  // Cleanup
  scene.onDisposeObservable.add(() => {
    document.removeEventListener("visibilitychange", onVisibility);
    ticker.stop();
    render.stop();
  });

  return {
    start() {
      ticker.start();
      render.start();
      onVisibility(); // ensure rates match current visibility
    },
    stop() {
      ticker.stop();
      render.stop();
    },
    /**
     * Retune logic rates at runtime (e.g., after online handshake to match server tick).
     * Re-applies current visibility so both ticker cadence and fixed step update together.
     */
    setRates({
      visibleHz: v,
      hiddenHz: h,
    }: { visibleHz?: number; hiddenHz?: number }) {
      if (v) visibleHz = Math.max(1, v);
      if (h) hiddenHz  = Math.max(1, h);
      // Clamp any carried accumulator so we don't overstep after a big rate change
      const stepMs = Math.round(1000 / (document.hidden ? hiddenHz : visibleHz));
      accMs = Math.min(accMs, stepMs);
      onVisibility();
    },
  };
}
