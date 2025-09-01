// Core domain & state
export type { Paddle, Ball, Phase, GameState } from "./model/state";
export { createInitialState } from "./model/state";

// Public headless API
export { bootAsRally } from "./lifecycle/boot";

// Input intent contract
export type { InputIntent } from "./input/input";
export { ZeroIntent } from "./input/input";

// Systems — high level tick and common steps
export { stepBallAndCollisions } from "./systems/flow/phaseManager";
export { stepPaddles } from "./systems/control/paddle";
export type { FrameEvents } from "./model/types";

// Rules & match controller
export { tableTennisRules } from "./rules/presets";
export type { Ruleset } from "./rules/types";
export { createMatchController } from "./match/controller";

// Constants
export { PAUSE_BETWEEN_POINTS_MS, EPS } from "./constants/constants";
