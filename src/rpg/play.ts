import type { ModelClient } from "../ai/provider.js";
import type { GameIO, PlayOptions, PlayableRpgSystem } from "./adapter.js";
import { createDefaultRpgRegistry } from "./registry.js";
import { asObj, asStr } from "../session/parse.js";

/**
 * Entry point for `play`: find the right system for what the players want, then hand the
 * whole session to it. A short brief ("a cyberpunk heist") is matched against each adapter's
 * `fit` by the model; Enter, or a match the players reject, falls back to the menu.
 */
export async function playCommand(io: GameIO, model: ModelClient, options: PlayOptions = {}): Promise<number> {
  const playable = createDefaultRpgRegistry().listPlayable();
  if (!playable.length) {
    io.show("error", "No playable systems are registered yet.");
    return 1;
  }
  if (playable.length === 1) return playable[0]!.play(io, model, options);

  const brief = (await io.ask(
    "What kind of game do you feel like? (e.g. \"a cyberpunk heist\", \"hunt a monster in a small town\"; Enter for the menu)",
  )).trim();
  if (brief && brief !== "/quit") {
    let match: PlayableRpgSystem | null = null;
    try {
      match = await matchSystem(model, brief, playable);
    } catch (error) {
      io.show("error", `Couldn't ask the shelf (picking from the menu): ${error instanceof Error ? error.message : String(error)}`);
    }
    if (match) {
      io.show("info", `${brief}\n-> sounds like ${match.name}: ${match.description}`);
      if (await io.confirm(`Play ${match.name}?`)) return match.play(io, model, options);
    } else {
      io.show("info", "Nothing on the shelf fits that well; pick from the menu.");
    }
  }
  const system = playable[await io.choose("Which game?", playable.map((s) => s.name))]!;
  return system.play(io, model, options);
}

/** The setup-time matcher: what the players asked for, matched against each adapter's `fit`. */
export async function matchSystem(
  model: ModelClient,
  brief: string,
  systems: readonly PlayableRpgSystem[],
): Promise<PlayableRpgSystem | null> {
  const list = systems.map((s) => `- "${s.id}": ${s.description} Good for: ${s.fit.join(", ")}`).join("\n");
  const { data } = await model.completeJson({
    role: "player",
    maxTokens: 100,
    messages: [
      { role: "system", content: "You match what a tabletop group wants to play to the right game system. Reply with only JSON." },
      {
        role: "user",
        content: `Available systems:\n${list}\n\nThe players ask for: "${brief}".\nWhich system fits best? Reply {"system": "<id>"} for the best fit, or {"system": null} if nothing fits well.`,
      },
    ],
  });
  const id = asStr(asObj(data).system, 40).toLowerCase();
  return systems.find((s) => s.id === id) ?? null;
}
