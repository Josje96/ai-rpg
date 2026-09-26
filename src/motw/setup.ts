import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { GameIO } from "./game.js";
import type { Keeper } from "./keeper.js";
import type { Mystery } from "./mystery.js";
import { BUILT_IN_MYSTERIES } from "./mysteries/index.js";
import { PLAYBOOKS, type Playbook } from "./playbooks.js";
import { MAX_LUCK, STATS, type Stats } from "./rules.js";
import { newGame, type GameState, type Hunter } from "./state.js";

export const MAX_HUNTERS = 5;

const AI_NAMES: readonly { name: string; pronouns: string }[] = [
  { name: "Rook", pronouns: "they/them" }, { name: "Juniper Vale", pronouns: "she/her" },
  { name: "Dez", pronouns: "he/him" }, { name: "Marisol Quint", pronouns: "she/her" },
  { name: "Abe Talbot", pronouns: "he/him" }, { name: "Wren", pronouns: "they/them" },
  { name: "Otis Crowe", pronouns: "he/him" }, { name: "Nadia Park", pronouns: "she/her" },
];
const AI_PERSONALITIES = [
  "dry humor, loyal to a fault, hates hospitals",
  "nervous talker who notices details everyone else misses",
  "calm and blunt; protective of the youngest person in the room",
  "thrill-seeker who treats every monster like a puzzle",
  "gentle, old-fashioned, carries too many snacks",
  "skeptical ex-cop who quietly believes more than she admits",
];

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
export const statLine = (stats: Stats) => STATS.map((s) => `${s} ${fmt(stats[s])}`).join(", ");

function slug(name: string, taken: Set<string>): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "hunter";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

function pick<T>(items: readonly T[], random: RandomInt): T {
  return items[random(0, items.length)]!;
}

function build(
  id: string, name: string, pronouns: string, book: Playbook, controller: Hunter["controller"],
  statIndex: number, moveIds: string[], gearIndex: number,
): Hunter {
  return {
    id, name, playbook: book.id, ...(pronouns ? { pronouns } : {}), controller,
    stats: { ...book.statOptions[statIndex]! },
    moves: moveIds,
    gear: book.gearOptions[gearIndex]!.map((g) => ({ ...g, tags: [...g.tags] })),
    harm: 0, luck: MAX_LUCK, xp: 0,
  };
}

function quickPicks(book: Playbook, random: RandomInt) {
  const moves = [...book.moves];
  const first = moves.splice(random(0, moves.length), 1)[0]!;
  const second = moves.splice(random(0, moves.length), 1)[0]!;
  return { statIndex: random(0, book.statOptions.length), moveIds: [first.id, second.id], gearIndex: random(0, book.gearOptions.length) };
}

async function askNumber(io: GameIO, prompt: string, min: number, max: number, fallback: number): Promise<number> {
  for (;;) {
    const raw = (await io.ask(`${prompt} [${fallback}]`)).trim();
    if (raw === "/quit") throw new SetupCancelled();
    if (!raw) return fallback;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= min && n <= max) return n;
    io.show("info", `Enter a number from ${min} to ${max}.`);
  }
}

export class SetupCancelled extends Error {}

async function chooseMystery(io: GameIO, keeper: Keeper, costs: { costUsd: number }): Promise<Mystery> {
  const options = [
    ...BUILT_IN_MYSTERIES.map((m) => `${m.title}: ${m.pitch ?? ""}${m.warnings?.length ? ` [${m.warnings.join(", ")}]` : ""}`),
    "Surprise me: the AI writes a brand-new mystery",
  ];
  const choice = await io.choose("Which mystery?", options);
  const builtIn = BUILT_IN_MYSTERIES[choice];
  if (builtIn) return builtIn;
  const idea = (await io.ask("Any theme or monster in mind? (Enter to leave it to the Keeper)")).trim();
  if (idea === "/quit") throw new SetupCancelled();
  const stop = io.busy("The Keeper is writing a mystery (up to a minute)");
  try {
    return await keeper.generateMystery(costs, idea);
  } finally {
    stop();
  }
}

async function humanHunter(io: GameIO, player: string, available: Playbook[], ids: Set<string>, random: RandomInt): Promise<Hunter> {
  io.show("heading", `${player}'s hunter`);
  const book = available[await io.choose(`${player}, pick a hunter type:`, available.map((b) => `${b.name}: ${b.pitch}`))]!;
  const name = (await io.ask(`What's your ${book.name.replace(/^The /, "").toLowerCase()} called?`)).trim().slice(0, 40);
  if (name === "/quit") throw new SetupCancelled();
  const hunterName = name || pick(AI_NAMES, random).name;
  const pronouns = (await io.ask(`Pronouns for ${hunterName}? (e.g. she/her, he/him, they/them; Enter to skip)`)).trim().slice(0, 20);
  if (pronouns === "/quit") throw new SetupCancelled();
  const controller = { kind: "human" as const, player };
  if (await io.confirm("Quick-build the rest (stats, moves, gear) at random?")) {
    const q = quickPicks(book, random);
    return build(slug(hunterName, ids), hunterName, pronouns, book, controller, q.statIndex, q.moveIds, q.gearIndex);
  }
  const statIndex = await io.choose("Stats:", book.statOptions.map(statLine));
  const first = await io.choose("Pick your first special move:", book.moves.map((m) => `${m.name}: ${m.text}`));
  const rest = book.moves.filter((_, i) => i !== first);
  const second = await io.choose("Pick a second:", rest.map((m) => `${m.name}: ${m.text}`));
  const gearIndex = await io.choose("Gear:", book.gearOptions.map((g) => g.map((w) => `${w.name} (${w.harm}-harm)`).join(" + ")));
  return build(slug(hunterName, ids), hunterName, pronouns, book, controller, statIndex, [book.moves[first]!.id, rest[second]!.id], gearIndex);
}

function aiHunter(available: Playbook[], usedNames: Set<string>, ids: Set<string>, random: RandomInt): Hunter {
  const book = pick(available, random);
  const names = AI_NAMES.filter((n) => !usedNames.has(n.name));
  const chosen = names.length ? pick(names, random) : { name: `Hunter ${usedNames.size + 1}`, pronouns: "they/them" };
  usedNames.add(chosen.name);
  const q = quickPicks(book, random);
  return build(slug(chosen.name, ids), chosen.name, chosen.pronouns, book, { kind: "ai", personality: pick(AI_PERSONALITIES, random) }, q.statIndex, q.moveIds, q.gearIndex);
}

/** Interactive new-game flow. Throws SetupCancelled if a player types /quit. */
export async function setupGame(io: GameIO, keeper: Keeper, random: RandomInt = randomInt): Promise<GameState> {
  io.show("heading", "New hunt");
  const costs = { costUsd: 0 };
  const mystery = await chooseMystery(io, keeper, costs);

  const humanCount = await askNumber(io, "How many people are playing on this device? (1-4)", 1, 4, 2);
  const players: string[] = [];
  for (let i = 1; i <= humanCount; i++) {
    const name = (await io.ask(`Player ${i}, your name?`)).trim().slice(0, 30);
    if (name === "/quit") throw new SetupCancelled();
    players.push(name || `Player ${i}`);
  }

  const ids = new Set<string>();
  const hunters: Hunter[] = [];
  for (const player of players) {
    const available = PLAYBOOKS.filter((b) => !hunters.some((h) => h.playbook === b.id));
    hunters.push(await humanHunter(io, player, available, ids, random));
  }

  const maxAi = MAX_HUNTERS - hunters.length;
  const aiCount = await askNumber(io, `How many AI hunters join the team? (0-${maxAi})`, 0, maxAi, Math.min(maxAi, Math.max(1, 3 - humanCount)));
  const usedNames = new Set(hunters.map((h) => h.name));
  for (let i = 0; i < aiCount; i++) {
    const available = PLAYBOOKS.filter((b) => !hunters.some((h) => h.playbook === b.id));
    hunters.push(aiHunter(available, usedNames, ids, random));
  }

  io.show("heading", "The team");
  for (const h of hunters) {
    const book = PLAYBOOKS.find((b) => b.id === h.playbook)!;
    const who = h.controller.kind === "human" ? h.controller.player : `AI: ${h.controller.personality}`;
    io.show("info", `${h.name}${h.pronouns ? ` (${h.pronouns})` : ""}, ${book.name} (${who}). ${statLine(h.stats)}`);
  }
  const state = newGame(mystery, hunters);
  state.costUsd = costs.costUsd;
  return state;
}
