import type { GameIO } from "../rpg/adapter.js";

/** The players chose to stop after a model failure; the game is saved. */
export class GameInterrupted extends Error {}

/**
 * Runs fn behind a busy indicator, retrying on model errors until the player gives up.
 * The engine rolls, clamps and saves; this is how it survives a flaky model.
 */
export async function withBusy<T>(io: GameIO, label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const stop = io.busy(label);
    try {
      return await fn();
    } catch (error) {
      stop();
      const message = error instanceof Error ? error.message : String(error);
      io.show("error", `The Keeper stumbled: ${message}`);
      if (!(await io.confirm("Try again?"))) throw new GameInterrupted(message);
      continue;
    } finally {
      stop();
    }
  }
}
