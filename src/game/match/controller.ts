// src/game/match/controller.ts
import type { TableEnd } from "../../shared/types";
import type { GameState } from "../model";
import { createInitialState } from "../model";
import type { Ruleset } from "../rules";
import { sideOpposite } from "../rules";
import { serveFrom } from "../systems/flow";
import { PAUSE_BETWEEN_GAMES_MS, PAUSE_MATCH_OVER_MS } from "../constants";

export function createMatchController(
  bounds: GameState["bounds"],
  rules: Ruleset,
  initialServer: TableEnd = "east",
) {
  let game = addRulesToState(createInitialState(bounds, initialServer), rules);
  let currentGameIndex = 1;
  let gamesWon = { east: 0, west: 0 };
  let matchWinner: TableEnd | undefined;
  let endsFlippedThisGame = false;
  let midSwapDoneThisGame = false;
  let initialServerThisGame: TableEnd = initialServer;

  function addRulesToState(s: GameState, r: Ruleset): GameState {
    return {
      ...s,
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

  function snapshot() {
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

  /** Call AFTER physics/flow step each frame. */
  function afterPhysicsStep(next: GameState) {
    game = next;
    const events: {
      swapSidesNow?: true;
      gameOver?: { winner: TableEnd; gameIndex: number };
      matchOver?: { winner: TableEnd };
    } = {};

    // Deciding-game mid swap
    const deciding = currentGameIndex === rules.match.bestOf;
    if (
      deciding &&
      !midSwapDoneThisGame &&
      rules.match.decidingGameMidSwapAtPoints &&
      (game.points.east >= rules.match.decidingGameMidSwapAtPoints ||
        game.points.west >= rules.match.decidingGameMidSwapAtPoints)
    ) {
      midSwapDoneThisGame = true;
      events.swapSidesNow = true;
    }

    if (
      game.phase === "pauseBetweenGames" &&
      game.tPauseBtwGamesMs === undefined
    ) {
      game = { ...game, tPauseBtwGamesMs: PAUSE_BETWEEN_GAMES_MS };
    }

    // Transition out of pauseBetweenGames when timer hits 0
    if (
      game.phase === "pauseBetweenGames" &&
      (game.tPauseBtwGamesMs ?? 0) <= 0
    ) {
      currentGameIndex++;
      endsFlippedThisGame = false;
      midSwapDoneThisGame = false;

      if (rules.match.switchEndsEachGame) {
        endsFlippedThisGame = true;
        events.swapSidesNow = true;
      }

      const nextInitialServer = rules.match.alternateInitialServerEachGame
        ? sideOpposite(initialServerThisGame)
        : initialServerThisGame;
      initialServerThisGame = nextInitialServer;

      // Fresh game state + immediately arm the opening serve so the ball has velocity
      const fresh = addRulesToState(
        createInitialState(game.bounds, nextInitialServer),
        rules,
      );
      game = serveFrom(nextInitialServer, fresh);

      return { state: game, events };
    }

    // Reached gameOver this frame? Record & start the proper pause.
    if (game.phase === "gameOver" && game.gameWinner) {
      // Record game win once (we flip phase immediately below so it won't repeat)
      gamesWon[game.gameWinner]++;
      events.gameOver = {
        winner: game.gameWinner,
        gameIndex: currentGameIndex,
      };

      // Match decided?
      const need = Math.ceil(rules.match.bestOf / 2);
      if (gamesWon.east >= need || gamesWon.west >= need) {
        matchWinner = gamesWon.east > gamesWon.west ? "east" : "west";
        events.matchOver = { winner: matchWinner };
        // Enter a terminal victory pause
        game = {
          ...game,
          phase: "matchOver",
          tMatchOverMs: PAUSE_MATCH_OVER_MS,
        };
        return { state: game, events };
      }

      // Otherwise: enter between-games pause (flow/pause.ts will tick the timer)
      const ms = game.tPauseBtwGamesMs ?? PAUSE_BETWEEN_GAMES_MS;
      game = { ...game, phase: "pauseBetweenGames", tPauseBtwGamesMs: ms };
      return { state: game, events };
    }

    return { state: game, events };
  }

  return { getGame: () => game, getSnapshot: snapshot, afterPhysicsStep };
}
