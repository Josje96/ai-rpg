import { randomInt } from "node:crypto";
import type { ModelClient } from "../ai/provider.js";
import type { RandomInt } from "../domain/dice.js";
import type { GameIO, PlayOptions } from "../rpg/adapter.js";
import { SessionLoop } from "../session/loop.js";
import { listSessionSaves } from "../session/saves.js";
import { Gm } from "./keeper.js";
import { anarchyHooks } from "./session.js";
import { SetupCancelled, setupRun } from "./setup.js";
import { loadRun, type RunState } from "./state.js";

/** Interactive new-run/continue menu, then the run itself. */
export async function playMenu(io: GameIO, model: ModelClient, options: PlayOptions = {}): Promise<number> {
  const gm = new Gm(model);
  const saves = (await listSessionSaves()).filter((s) => s.system === "shadowrun-anarchy-2" && s.status === "active");
  let state: RunState;

  io.show("heading", "Cyberpunk runs, with an AI GM");
  const menu = [
    ...(saves[0] ? [`Continue: ${saves[0].title} (${saves[0].members})`] : []),
    ...(saves.length > 1 ? ["Load another saved run"] : []),
    "Start a new run",
    "How to play",
    "Quit",
  ];
  for (;;) {
    const label = menu[await io.choose("What now?", menu)]!;
    if (label.startsWith("Continue")) { state = await loadRun(saves[0]!.id); break; }
    if (label.startsWith("Load")) {
      const i = await io.choose("Which run?", saves.map((s) => `${s.title}: ${s.members} (${s.updatedAt.slice(0, 16).replace("T", " ")})`));
      state = await loadRun(saves[i]!.id);
      break;
    }
    if (label.startsWith("Start")) {
      try {
        state = await setupRun(io, gm);
      } catch (error) {
        if (error instanceof SetupCancelled) return 0;
        throw error;
      }
      break;
    }
    if (label.startsWith("How")) {
      io.show("info", "Take turns on this device. On your turn, say what your runner does, like \"I convince the doorman I'm the health inspector\" or \"I jam the freight elevator lock\". The GM decides if that needs a check; the dice are rolled for you. d6 pool = stat + skill tags, 5+ is a hit. 3+ hits is clean, 1-2 is success at a cost, 0 means things go wrong (and earn you a plot point). Plot points add +2 dice or shrug off damage.");
      continue;
    }
    return 0;
  }

  const random: RandomInt = randomInt;
  const loop = new SessionLoop(
    state,
    anarchyHooks(state, { gm, model, io, random, debug: options.debug ?? false }),
    { io, model, random, debug: options.debug },
  );
  await loop.run();
  return 0;
}
