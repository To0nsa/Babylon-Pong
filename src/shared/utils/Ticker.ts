// src/shared/utils/Ticker.ts
export type TickFn = (dtMs: number) => void;

export class Ticker {
  private timer: number | null = null;
  private last = 0;
  private hz = 60;
  private cb: TickFn;

  constructor(cb: TickFn, hz = 60) {
    this.cb = cb;
    this.setHz(hz);
  }

  setHz(hz: number) {
    this.hz = Math.max(1, hz);
    if (this.timer !== null) this.start(); // restart with new rate
  }

  start() {
    if (this.timer !== null) return;
    const intervalMs = Math.round(1000 / this.hz);
    this.last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const dt = now - this.last;
      this.last = now;
      this.cb(dt);
    }, intervalMs) as unknown as number;
  }

  stop() {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
