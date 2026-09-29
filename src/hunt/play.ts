import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { OpenRouterClient } from "../ai/openrouter.js";
import { ModelError, type ModelClient } from "../ai/provider.js";
import { playCommand } from "../rpg/play.js";
import { Game, HELP, type GameIO } from "./game.js";
import { Keeper } from "./keeper.js";
import { SetupCancelled, setupGame } from "./setup.js";
import { listSaves, loadGame, saveGame, type GameState } from "./state.js";
import { TerminalIO } from "../session/terminal.js";

/** Loads the project's .env (works from src/ via bun and from dist/ after a build). */
export function loadProjectEnv(): void {
  const path = fileURLToPath(new URL("../../.env", import.meta.url));
  if (!existsSync(path)) return;
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path);
    return;
  }
  // Fallback for runtimes without process.loadEnvFile (e.g. Bun): a minimal
  // KEY=VALUE parser that never overwrites variables already in the environment.
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export async function playMenu(io: GameIO, model: ModelClient, options: { debug?: boolean } = {}): Promise<number> {
  const keeper = new Keeper(model);
  const saves = (await listSaves()).filter((s) => s.status === "active" && s.system === "monster-hunt");
  let state: GameState | undefined;

  io.show("heading", "Monster Hunt, with an AI Keeper");
  const menu = [
    ...(saves[0] ? [`Continue: ${saves[0].title} (${saves[0].hunters})`] : []),
    ...(saves.length > 1 ? ["Load another saved hunt"] : []),
    "Start a new hunt",
    "How to play",
    "Quit",
  ];
  for (;;) {
    const label = menu[await io.choose("What now?", menu)]!;
    if (label.startsWith("Continue")) { state = await loadGame(saves[0]!.id); break; }
    if (label.startsWith("Load")) {
      const i = await io.choose("Which hunt?", saves.map((s) => `${s.title}: ${s.hunters} (${s.updatedAt.slice(0, 16).replace("T", " ")})`));
      state = await loadGame(saves[i]!.id);
      break;
    }
    if (label.startsWith("Start")) {
      try {
        state = await setupGame(io, keeper);
      } catch (error) {
        if (error instanceof SetupCancelled) return 0;
        throw error;
      }
      break;
    }
    if (label.startsWith("How")) {
      io.show("info", "Take turns on this device. On your turn, say what your hunter does, like \"I show the sheriff my badge and ask about the drownings\" or \"I swing the axe at it\". The Keeper decides if that needs a roll; the dice are rolled for you. 10+ is a strong hit, 7-9 a hit with a cost, 6 or less a miss (you learn from it: +1 XP). Luck (7 per hunter) can turn any roll into a 12 or cancel harm, and you'll be asked when it matters. Find the monster's weakness through clues, then use it.");
      io.show("info", HELP);
      continue;
    }
    return 0;
  }

  const game = new Game(state, { keeper, model, io, save: saveGame, debug: options.debug ?? false });
  await game.run();
  return 0;
}

export async function runPlay(): Promise<number> {
  loadProjectEnv();
  const io = new TerminalIO();
  try {
    return await playCommand(io, OpenRouterClient.fromEnv(), { debug: process.env.DEBUG === "1" });
  } catch (error) {
    io.show("error", error instanceof ModelError ? error.message : `Something broke: ${error instanceof Error ? error.stack : String(error)}`);
    return 1;
  } finally {
    io.close();
  }
}
