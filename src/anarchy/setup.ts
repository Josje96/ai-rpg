import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { GameIO } from "../rpg/adapter.js";
import type { Gm } from "./keeper.js";
import { BUILT_IN_JOBS, CLOCK_LENGTH } from "./jobs.js";
import { ARCHETYPES, type Archetype, statLine } from "./archetypes.js";
import { STARTING_PLOT_POINTS, type Stats } from "./rules.js";
import { newRun, type RunState, type Runner } from "./state.js";

export const MAX_RUNNERS = 5;

const AI_NAMES: readonly { name: string; pronouns: string }[] = [
  { name: "Vex", pronouns: "she/her" }, { name: "Cutter", pronouns: "he/him" }, { name: "Noor", pronouns: "they/them" },
  { name: "Sable", pronouns: "she/her" }, { name: "Duke", pronouns: "he/him" }, { name: "Wisp", pronouns: "they/them" },
  { name: "Mercado", pronouns: "he/him" }, { name: "Halcyon", pronouns: "she/her" },
];
const AI_PERSONALITIES = [
  "laid-back professional who counts bullets out loud",
  "wired chatterbox who can't sit still",
  "quiet romantic who pretends this is all temporary",
  "grudge-keeper with a spreadsheet for every enemy",
  "wide-eyed newcomer with uncanny luck",
  "burned-out vet doing one last job, again",
];

function slug(name: string, taken: Set<string>): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "runner";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

function pick<T>(items: readonly T[], random: RandomInt): T {
  return items[random(0, items.length)]!;
}

function build(
  id: string, name: string, pronouns: string, book: Archetype, controller: Runner["controller"],
  statIndex: number, skillTags: string[], gearIndex: number,
): Runner {
  return {
    id, name, archetype: book.id, ...(pronouns ? { pronouns } : {}), controller,
    stats: { ...book.statOptions[statIndex]! },
    skills: [...skillTags],
    gear: [...book.gearOptions[gearIndex]!],
    condition: 10, plotPoints: STARTING_PLOT_POINTS,
  };
}

function quickPicks(book: Archetype, random: RandomInt) {
  const skills = [...book.skills];
  const first = skills.splice(random(0, skills.length), 1)[0]!;
  const second = skills.splice(random(0, skills.length), 1)[0]!;
  return { statIndex: random(0, book.statOptions.length), skillTags: [first, second], gearIndex: random(0, book.gearOptions.length) };
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

/** "agronaught" -> "Agronaught"; leaves names that already have capitals alone. */
export function capitalize(name: string): string {
  return name === name.toLowerCase() ? name.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()) : name;
}

async function chooseJob(io: GameIO, gm: Gm, costs: { costUsd: number }): Promise<RunState["job"]> {
  const options = [
    ...BUILT_IN_JOBS.map((j) => `${j.title}: ${j.pitch ?? ""}`),
    "Surprise me: the AI designs a brand-new run",
  ];
  const choice = await io.choose("Which job?", options);
  const builtIn = BUILT_IN_JOBS[choice];
  if (builtIn) return builtIn;
  const idea = (await io.ask("Any flavor in mind? (Enter to leave it to the GM)")).trim();
  if (idea === "/quit") throw new SetupCancelled();
  const stop = io.busy("The GM is designing a run (up to a minute)");
  try {
    return await gm.generateJob(costs, idea);
  } finally {
    stop();
  }
}

async function humanRunner(io: GameIO, player: string, available: Archetype[], ids: Set<string>, random: RandomInt): Promise<Runner> {
  io.show("heading", `${player}'s runner`);
  const book = available[await io.choose(`${player}, pick a role:`, available.map((b) => `${b.name}: ${b.pitch}`))]!;
  const name = (await io.ask(`${player}, name your runner (your street name, ${book.name.replace(/^The /, "the ")}):`)).trim().slice(0, 40);
  if (name === "/quit") throw new SetupCancelled();
  const runnerName = capitalize(name) || pick(AI_NAMES, random).name;
  const pronouns = (await io.ask(`Pronouns for ${runnerName}? (e.g. she/her, he/him, they/them; Enter to skip)`)).trim().slice(0, 20);
  if (pronouns === "/quit") throw new SetupCancelled();
  const controller = { kind: "human" as const, player };
  if (await io.confirm("Quick-build the rest (stats, skills, gear) at random?")) {
    const q = quickPicks(book, random);
    return build(slug(runnerName, ids), runnerName, pronouns, book, controller, q.statIndex, q.skillTags, q.gearIndex);
  }
  const statIndex = await io.choose("Stats:", book.statOptions.map(statLine));
  const first = await io.choose("Pick your first skill:", book.skills);
  const rest = book.skills.filter((_, i) => i !== first);
  const second = await io.choose("Pick a second:", rest);
  const gearIndex = await io.choose("Gear:", book.gearOptions.map((g) => g.join(" + ")));
  return build(slug(runnerName, ids), runnerName, pronouns, book, controller, statIndex, [book.skills[first]!, rest[second]!], gearIndex);
}

function aiRunner(available: Archetype[], usedNames: Set<string>, ids: Set<string>, random: RandomInt): Runner {
  const book = pick(available, random);
  const names = AI_NAMES.filter((n) => !usedNames.has(n.name));
  const chosen = names.length ? pick(names, random) : { name: `Runner ${usedNames.size + 1}`, pronouns: "they/them" };
  usedNames.add(chosen.name);
  const q = quickPicks(book, random);
  return build(slug(chosen.name, ids), chosen.name, chosen.pronouns, book, { kind: "ai", personality: pick(AI_PERSONALITIES, random) }, q.statIndex, q.skillTags, q.gearIndex);
}

/** Interactive new-run flow. Throws SetupCancelled if a player types /quit. */
export async function setupRun(io: GameIO, gm: Gm, random: RandomInt = randomInt): Promise<RunState> {
  io.show("heading", "New run");
  const costs = { costUsd: 0 };
  const job = await chooseJob(io, gm, costs);

  const humanCount = await askNumber(io, "How many people are playing on this device? (1-4)", 1, 4, 2);
  const players: string[] = [];
  for (let i = 1; i <= humanCount; i++) {
    const name = (await io.ask(`Player ${i}: what's YOUR name? (the real person; you'll name your runner next)`)).trim().slice(0, 30);
    if (name === "/quit") throw new SetupCancelled();
    players.push(capitalize(name) || `Player ${i}`);
  }

  const ids = new Set<string>();
  const runners: Runner[] = [];
  for (const player of players) {
    const available = ARCHETYPES.filter((b) => !runners.some((r) => r.archetype === b.id));
    runners.push(await humanRunner(io, player, available, ids, random));
  }

  const maxAi = MAX_RUNNERS - runners.length;
  const aiCount = await askNumber(io, `How many AI runners join the crew? (0-${maxAi})`, 0, maxAi, Math.min(maxAi, Math.max(1, 3 - humanCount)));
  const usedNames = new Set(runners.map((r) => r.name));
  for (let i = 0; i < aiCount; i++) {
    const available = ARCHETYPES.filter((b) => !runners.some((r) => r.archetype === b.id));
    runners.push(aiRunner(available, usedNames, ids, random));
  }

  io.show("heading", "The crew");
  for (const r of runners) {
    const book = ARCHETYPES.find((b) => b.id === r.archetype)!;
    const who = r.controller.kind === "human" ? r.controller.player : `AI: ${r.controller.personality}`;
    io.show("info", `${r.name}${r.pronouns ? ` (${r.pronouns})` : ""}, ${book.name} (${who}). ${statLine(r.stats as Stats)}. Plot points ${r.plotPoints}.`);
  }
  const state = newRun(job, runners);
  state.costUsd = costs.costUsd;
  return state;
}
