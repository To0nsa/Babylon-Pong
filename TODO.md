Force field FX:

- Pooling: Reuse 6–10 FX planes to avoid allocations in long rallies.
- Intensity by speed: Scale FX alpha/size by abs(ball.vz) at impact for extra juice.
- Hit normal flicker: Slightly tilt the segment toward the incoming velocity for a "pressure" feel.
- Pooling: move short-lived mesh/material pooling behind FXManager so individual effects stay tiny.
- Per-frame hook: if several effects need the same per-frame tick, centralize it in the manager.
- Config: accept a small FXConfig (colors, timings) to keep hard-coded numbers out of effects.
- Make the camera shake when the ball explodes

shared → can be imported by anyone, but must only import itself.
game → may import from shared only.
client → may import from shared only (never from game).
app → may import from client, game, and shared.
server → may import from game and shared (never from client).

# P0 — Determinism & Core-architecture (must keep our hard rules)

* **Non-deterministic seed helper exposed from `@shared`**
  `randomSeed()` mixes `Date.now()` and `Math.random()` — fine for local casual play, but **must never leak into online/tournament flows**. Keep it out of any server/room code and make online/tourney require a provided seed. Consider removing `randomSeed` from the public barrel export to avoid accidental use.&#x20;

* **Duplicate clamp logic living in two places**
  `clampZ` exists in `game/systems/utils.ts` and a local inline variant in physics earlier drafts. Ensure **single source** (`game/systems/utils.ts`) and remove any duplicates from physics code. Physics already imports the right helper — keep it that way and delete leftovers.&#x20;

* **Dead “interval ticker” in shared surface**
  `shared/utils/ticker.ts` uses `setInterval`. We standardized on `RafTicker` for client and a fixed-step loop for headless. If nothing imports `Ticker`, **delete it** from the public surface to avoid future misuse.&#x20;

# P1 — Performance & GC (avoid per-frame allocations / churn)

* **FX spawn allocates meshes/materials on every trigger**
  Both burst and force-field effects create and dispose Babylon meshes/materials per event (new disc/sphere + material each time). Pool 4–8 instances per effect, toggle `.isVisible` / reset transforms, and reuse materials (freeze where possible). This will remove allocation spikes on busy rallies.&#x20;

* **HUD layout work on scroll/resize could run hot**
  `syncOverlay()` is called on `resize` and `scroll`. That’s OK, but add a micro-throttle (e.g., rAF coalescing) to prevent layout thrash on continuous scroll in long pages (especially if embedded).&#x20;

* **Verbose logging in hot-ish path**
  `isMobile()` logs both `debug` and `info` on every call. Ensure it’s called once and cached, or gate logs behind a dev flag. (Also: module header comment is wrong — see below.)&#x20;

# P1 — Tooling / Build correctness (paper cuts that bite later)

* **Prettier Tailwind stylesheet path mismatch**
  `.prettier.json` points Tailwind plugin at `./src/client/ui/theme.css`, but the file is `tailwind.css`. Either rename the file to `theme.css` or update config to the actual path. The CSS file itself carries an outdated header comment mentioning `theme.css`. Fix both so sorting is deterministic.

* **Stale comments vs. real paths (maintenance hazard)**
  Several files carry old path headers, e.g. `events-to-fx.ts` (`// src/client/entry/eventsToFX.ts`) and `babylon-register.ts` (`// src/babylon.sidefx.ts`). Update headers to current locations to avoid onboarding mistakes.

* **Library entry vs. app entry**
  `vite.config.ts` builds a library from `src/client/entry/embed.ts` yet the app boots from `main.ts`/`host/dom-embed.ts`. Verify whether we ship an embeddable widget **and** a standalone app and keep both entries healthy; otherwise simplify to one canonical entry.

# P2 — Readability & Over-engineering trims

* **Overly chatty logger surface in `@shared`**
  The `Logger` with timestamps is fine, but keep the exported level low by default and ensure **no per-frame logs** anywhere (audit with a quick grep before release).&#x20;

* **Seat router & HUD mapping are good — keep surfaces small**
  These adapters are small and composable; just ensure they remain pure and don’t start importing Babylon or DOM. They’re clean now; keep it that way as we add online.&#x20;

* **Bounce visuals RNG**
  Visual bounces use their own `LcgRng` seeded from geometry — good. Add a tiny comment that this RNG is **visual-only** and **must not** influence gameplay to prevent future coupling.&#x20;

# P2 — Memory & lifecycle hygiene

* **Engine/Scene disposers are defensive but repetitive**
  You call a series of `try { dispose } catch {}` in two places (return disposer and `scene.onDispose`). Factor a single `disposeWorld()` body and call it from both to avoid drift.&#x20;

* **HUD ResizeObserver cleanup is correct — add nulling**
  After `ro.disconnect()`, set `ro = null` for clarity; same for any AbortController/observer handles to avoid accidental double usage.&#x20;

# P2 — UX/robustness

* **Error overlay is solid — add collapse for multiple errors**
  The `main.ts` overlay will stack if multiple errors fire. Add a guard so it replaces existing content instead of appending anew.&#x20;

# P3 — Consistency, naming, and docs

* **Barrel exports (“public API”)**
  Keep `@shared/index.ts` narrow: export only things needed by adapters and game. Consider removing `Ticker` and `randomSeed` from the barrel (see P0/P1).&#x20;

* **Comment accuracy & module headers**
  Update top-of-file comments to reflect real paths:

  * `client/ui/hud-binding.ts` (name vs. path)
  * `client/visuals/*` headers
  * `client/utils/platform.ts` header references `Logger.ts` path.

# P3 — Future-proofing for online/tournament

* **Seed plumbing for online/tourney**
  Local mode currently does `pickInitialServer(randomSeed())` during intro. For online/tournaments, **require** a `matchSeed` from the room/matchmaker and pass it into the app mode entry; never call `randomSeed()` there. Add a type to `createPongApp({ mode, canvas, setup })` later to force seed for online.&#x20;

* **Events → FX mapping stays render-only**
  Good now. When we introduce net code, ensure server sends a compact `FrameEvents` stream and the client persists its own FX-only state (no feedback into core).&#x20;

---

## Quick wins (do these first)

1. Remove `Ticker` from exports and/or codebase if unused.&#x20;
2. Fix Prettier Tailwind path (`theme.css` ↔ `tailwind.css`) and the header comment.
3. Pool meshes/materials in FX (burst + force-field).&#x20;
4. Update stale path comments (events-to-fx, babylon-register, hud-binding, platform).
5. Ensure `randomSeed()` is not reachable in online/tournament code paths; plan seed injection API.&#x20;

If you want, I can turn this into a small PR plan (commits ordered to keep diffs clean) and sketch the FX pool implementation (tiny manager, 8 slots, `isVisible` + timelines) next.
