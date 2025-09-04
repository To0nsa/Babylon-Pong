# TODO list

- make sure the game logic continues running when tab is open.
- wrap logs behind a debug flag
- push selected logs into in-game HUD
- use of requestAnimationFrame for logic instead of setInterval
- use Tailwind for hudOverlayooling: Reuse 6–10 FX planes to avoid allocations in long rallies.

Force field FX:

- Pooling: Reuse 6–10 FX planes to avoid allocations in long rallies.
- Intensity by speed: Scale FX alpha/size by abs(ball.vz) at impact for extra juice.
- Hit normal flicker: Slightly tilt the segment toward the incoming velocity for a "pressure" feel.
- Pooling: move short-lived mesh/material pooling behind FXManager so individual effects stay tiny.
- Per-frame hook: if several effects need the same per-frame tick, centralize it in the manager.
- Config: accept a small FXConfig (colors, timings) to keep hard-coded numbers out of effects.
- Make the camera shake when the ball explodes

- fallback to default if invalid localStorage
