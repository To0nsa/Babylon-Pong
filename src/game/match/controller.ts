// src/game/match/controller.ts
import type { GameState, Side } from "../model";
import { createInitialState } from "../model";
import type { Ruleset } from "../rules";
import { sideOpposite } from "../rules";

export type MatchSnapshot = {
  bestOf: number;
  currentGameIndex: number; // 1-based
  gamesWon: { left: number; right: number };
  matchWinner?: Side;
  endsFlippedThisGame: boolean; // did we flip ends at game start
  midSwapDoneThisGame: boolean; // did we flip ends at 5 in deciding
  initialServerThisGame: Side; // who started this game serving
};

export type MatchEvents = {
  swapSidesNow?: true; // trigger player-end swap (render/input can react)
  gameOver?: { winner: Side; gameIndex: number };
  matchOver?: { winner: Side };
};

export function createMatchController(
  bounds: GameState["bounds"],
  rules: Ruleset,
  initialServer: Side = "left",
) {
  let game = addRulesToState(createInitialState(bounds), rules, initialServer);
  let currentGameIndex = 1;
  let gamesWon = { left: 0, right: 0 };
  let matchWinner: Side | undefined;
  let endsFlippedThisGame = false;
  let midSwapDoneThisGame = false;
  let initialServerThisGame: Side = initialServer;

  function addRulesToState(s: GameState, r: Ruleset, server: Side): GameState {
    return {
      ...s,
      server,
      serviceTurnsLeft: r.game.servesPerTurn,
      params: {
        ...s.params,
        targetScore: r.game.targetScore,
        winBy: r.game.winBy,
        servesPerTurn: r.game.servesPerTurn,
        deuceServesPerTurn: r.game.deuceServesPerTurn,
        deuceAt: r.game.deuceAt!, // resolved
      } as any,
    };
  }

  function snapshot(): MatchSnapshot {
    return {
      bestOf: rules.match.bestOf,
      currentGameIndex,
      gamesWon,
      matchWinner,
      endsFlippedThisGame,
      midSwapDoneThisGame,
      initialServerThisGame,
    };
  }

  /** Call this every frame AFTER your physics step updated `game`. */
  function afterPhysicsStep(next: GameState): {
    state: GameState;
    events: MatchEvents;
  } {
    game = next;
    const events: MatchEvents = {};

    // In deciding game, swap ends when first hits threshold (once)
    const deciding = currentGameIndex === rules.match.bestOf;
    if (
      deciding &&
      !midSwapDoneThisGame &&
      rules.match.decidingGameMidSwapAtPoints &&
      (game.scores.left >= rules.match.decidingGameMidSwapAtPoints ||
        game.scores.right >= rules.match.decidingGameMidSwapAtPoints)
    ) {
      midSwapDoneThisGame = true;
      events.swapSidesNow = true;
    }

    if (game.phase === "gameOver" && game.winner) {
      // Record game win
      gamesWon[game.winner]++;

      events.gameOver = { winner: game.winner, gameIndex: currentGameIndex };

      const need = Math.ceil(rules.match.bestOf / 2);
      if (gamesWon.left >= need || gamesWon.right >= need) {
        matchWinner = gamesWon.left > gamesWon.right ? "left" : "right";
        events.matchOver = { winner: matchWinner };
        return { state: game, events };
      }

      // Next game setup
      currentGameIndex++;
      endsFlippedThisGame = false;
      midSwapDoneThisGame = false;

      // Flip ends at new game start?
      if (rules.match.switchEndsEachGame) {
        endsFlippedThisGame = true;
        events.swapSidesNow = true;
      }

      // Alternate initial server across games if requested
      const nextInitialServer = rules.match.alternateInitialServerEachGame
        ? sideOpposite(initialServerThisGame)
        : initialServerThisGame;
      initialServerThisGame = nextInitialServer;

      // Fresh game state (scores reset, serving reset) but same bounds/physics params
      game = addRulesToState(
        createInitialState(game.bounds),
        rules,
        nextInitialServer,
      );
    }

    return { state: game, events };
  }

  return {
    getGame: () => game,
    getSnapshot: snapshot,
    afterPhysicsStep,
  };
}
