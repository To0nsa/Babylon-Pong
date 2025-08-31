// src/shared/utils/Ticker.ts
export type TickFn = (dtMs: number) => void;

export class Ticker {
  private timer: number | null = null;
  private last = 0;
  private hz: number;

  constructor(private cb: TickFn, hz = 60) {
    this.hz = Math.max(1, hz);
  }

  setHz(hz: number): void {
    const clamped = Math.max(1, hz);
    if (this.hz === clamped) return;
    this.hz = clamped;
    if (this.timer !== null) {
      // restart so the new cadence actually takes effect
      this.stop();
      this.start();
    }
  }

  start(): void {
    if (this.timer !== null) return;
    const intervalMs = Math.max(1, Math.round(1000 / this.hz));
    this.last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      const dt = now - this.last;
      this.last = now;
      this.cb(dt);
    }, intervalMs) as unknown as number;
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
