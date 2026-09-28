import type { ModelClient } from "../ai/provider.js";
import type { GameIO, PlayOptions } from "./adapter.js";
import { createDefaultRpgRegistry } from "./registry.js";

/**
 * Entry point for `play`: pick a system, then hand the whole session to it.
 * For now the pick is a menu; once a second system is playable this becomes the
 * setup-time matcher, matching what the players asked for against each adapter's `fit`.
 */
export async function playCommand(io: GameIO, model: ModelClient, options: PlayOptions = {}): Promise<number> {
  const playable = createDefaultRpgRegistry().listPlayable();
  if (!playable.length) {
    io.show("error", "No playable systems are registered yet.");
    return 1;
  }
  const system = playable.length === 1 ? playable[0]! : playable[await io.choose("Which game?", playable.map((s) => s.name))]!;
  return system.play(io, model, options);
}
