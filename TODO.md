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

- ViewSnapshot type

- to run the headless server directly under Node ESM, consider either building first (tsc/tsup) or switching the script to an ESM-friendly runner (e.g., tsx)—the current -r ts-node/register hook can be finicky under "type": "module"

- add protocol_v
- future package extraction

shared → can be imported by anyone, but must only import itself.
game → may import from shared only.
client → may import from shared only (never from game).
app → may import from client, game, and shared.
server → may import from game and shared (never from client).
