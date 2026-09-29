import type { ChatMessage, ModelClient } from "../ai/provider.js";
import { CLOCK_LENGTH } from "./jobs.js";
import { STATS, describePool, conditionStatus, type PoolRoll, type Stat } from "./rules.js";
import { activeRunners, clockAllowed, type Job, type RunState, type Runner } from "./state.js";
import { asObj, asStr, clamp, parseChoice, type Choice } from "../session/parse.js";

export type { Choice };
import { recentLog, type LogEntry } from "../session/types.js";
import { summarizeLog } from "../session/summarize.js";

/**
 * The GM (AI game master) proposes; the engine disposes. Every reply is a JSON object that is
 * validated and clamped here before it touches game state, so a confused model can't drop a
 * building on the team or roll its own dice.
 */

export type Effects = {
  damage: { runner: Runner; amount: number; reason: string }[];
  heal: { runner: Runner; amount: number }[];
  clock: boolean;
  twistRevealed: boolean;
  outcome: "won" | null;
};

export const NO_EFFECTS: Effects = {
  damage: [], heal: [], clock: false, twistRevealed: false, outcome: null,
};

export type GmReply = { narration: string; effects: Effects; warnings: string[]; choice: Choice | null };
export type Adjudication = GmReply & { roll: { stat: Stat; skills: string[]; why: string } | null };

const CHOICE_SCHEMA = `"choice": null or {"prompt": "a choice for the acting runner", "options": ["2-4 short options"]}`;

const EFFECTS_SCHEMA = `"effects": {
    "damage": [{"runner": "<runner id>", "amount": 1-4, "reason": "short"}],
    "heal": [{"runner": "<runner id>", "amount": 1-3}],
    "clock": false,
    "twistRevealed": false,
    "outcome": null
  }`;

function rulesText(): string {
  return `Rules (cyberpunk heists, d6 hit pools):
- When a runner's action is risky or contested, call for a skill check: d6 pool = the relevant stat +
  one die per applicable skill tag (max 2). 5+ on a die is a hit. The engine rolls. You NEVER roll or
  invent dice results. 3+ hits: clean success. 1-2 hits: success at a cost. 0 hits: failure, and the
  situation gets worse — security acts, someone gets hurt, a door closes.
- If the action isn't risky or contested, don't ask for a roll: just narrate what happens.
- Damage: runners have 10 condition boxes; at 3 or fewer they're wounded (-1 die); at 0 they're out.
  Typical damage 1-3. Don't deal damage without a fictional cause.
- Runners have plot points, which the engine handles: reward cleverness and good fiction with them
  in mind, but never grant plot points yourself.
- The job has a clock of ${CLOCK_LENGTH} steps that ends with the team burned. The engine enforces its pacing.
- The team can only win by completing the run's objective; set "outcome": "won" only when the
  objective is actually achieved and the team has a way out.`;
}

function gmSystem(): string {
  return `You are the GM (game master) of a cyberpunk run played at one table, on a phone screen. The tone is
neon noir: fast talk, hard consequences, corporate rot, and people trying to keep their souls.
${rulesText()}

How to GM:
- Keep narration tight: 40-120 words, vivid, present tense, second person to the acting runner, naming runners.
  Stay in the mechanics-free zone: don't mention pools, hits, or bonuses in narration; the engine shows those.
- Never decide what a runner says, thinks, or does; describe the world and ask what they do. Humans are
  playing some runners. Don't end on a question to a specific AI runner; the engine handles turns.
- A runner's declared action is what they attempt, even if it's reckless, cruel, or foolish. Never swap it
  for a different, wiser action; the dice decide how well it goes, not what they tried. Consequences follow.
- When the acting runner must choose (a cost, a route, who to betray), stop the narration at the moment of
  choice and put the options in "choice". The engine asks that player at once.
- Use the job's opposition with intent: security follows procedures until provoked, then escalates. The
  twist comes out when the fiction earns it; set "twistRevealed": true the first time it's plainly on the table.
- Pace with the clock. The engine allows at most ONE step per round and the final step (the job collapsing)
  only on your GM turn. Usually advance it when time has passed or the team made noise.
Reply with only a JSON object.`;
}

function runnerLine(r: Runner): string {
  const stats = STATS.map((s) => `${s} ${r.stats[s] ?? 0}`).join(", ");
  const who = r.controller.kind === "human" ? `played by human ${r.controller.player}` : `AI-played (${r.controller.personality})`;
  return `- id "${r.id}": ${r.name}${r.pronouns ? ` (${r.pronouns})` : ""}, ${r.archetype}, ${who}. Stats: ${stats}. Skills: ${r.skills.join(", ")}. Gear: ${r.gear.join(", ")}. Condition ${r.condition}/10 (${conditionStatus(r.condition)}), plot points ${r.plotPoints}.`;
}

function jobDigest(job: Job, state: RunState): string {
  const clock = job.clock.map((c, i) => `${i + 1}. ${i < state.clock ? "(happened) " : i === state.clock ? "(NEXT) " : ""}${c}`).join("\n");
  return `SECRET JOB BRIEF (GM eyes only): ${job.title}
Truth: ${job.truth}
Objective: ${job.objective}
Johnson: ${job.johnson}
Location: ${job.location}
Opposition: ${job.opposition}
Twist: ${job.twist}${state.twistRevealed ? " (ALREADY REVEALED)" : " (hidden)"}
Clock:
${clock}
Heat so far: step ${state.clock}/${job.clock.length}`;
}

function context(state: RunState): string {
  return `${jobDigest(state.job, state)}

RUNNERS:
${state.runners.map(runnerLine).join("\n")}

STORY SO FAR: ${state.summary || "(just started)"}

RECENT:
${recentLog(state)}`;
}

function gmMessages(state: RunState, task: string): ChatMessage[] {
  return [
    { role: "system", content: gmSystem() },
    { role: "user", content: `${context(state)}\n\nTASK: ${task}` },
  ];
}

// ---------- validation ----------

function findRunner(state: RunState, ref: unknown): Runner | undefined {
  if (typeof ref !== "string") return undefined;
  const key = ref.trim().toLowerCase();
  return state.runners.find((r) => r.id === key || r.name.toLowerCase() === key || r.name.toLowerCase().split(" ")[0] === key);
}

export function parseEffects(state: RunState, raw: unknown): { effects: Effects; warnings: string[] } {
  const o = asObj(raw);
  const warnings: string[] = [];
  const damage: Effects["damage"] = [];
  for (const item of Array.isArray(o.damage) ? o.damage.slice(0, 6) : []) {
    const x = asObj(item);
    const runner = findRunner(state, x.runner);
    const amount = clamp(x.amount, 0, 4);
    if (!runner) { warnings.push(`ignored damage to unknown runner ${String(x.runner)}`); continue; }
    if (conditionStatus(runner.condition) === "out" || amount === 0) continue;
    damage.push({ runner, amount, reason: asStr(x.reason, 80) });
  }
  const heal: Effects["heal"] = [];
  for (const item of Array.isArray(o.heal) ? o.heal.slice(0, 6) : []) {
    const x = asObj(item);
    const runner = findRunner(state, x.runner);
    const amount = clamp(x.amount, 0, 3);
    if (runner && amount > 0 && runner.condition < 10) heal.push({ runner, amount });
  }
  const twistRevealed = o.twistRevealed === true;
  let outcome: Effects["outcome"] = o.outcome === "won" ? "won" : null;
  if (outcome && state.clock >= state.job.clock.length) {
    warnings.push("ignored 'won': the clock has run out");
    outcome = null;
  }
  return {
    effects: { damage, heal, clock: o.clock === true, twistRevealed, outcome },
    warnings,
  };
}

function parseReply(state: RunState, raw: unknown): GmReply {
  const o = asObj(raw);
  const narration = asStr(o.narration, 2000);
  const { effects, warnings } = parseEffects(state, o.effects);
  if (!narration) warnings.push("empty narration");
  return {
    narration: narration || "The GM pauses, considering. (Try describing your action again.)",
    effects, warnings, choice: parseChoice(o.choice),
  };
}

export function parseAdjudication(state: RunState, runner: Runner, raw: unknown): Adjudication {
  const o = asObj(raw);
  const r = o.roll === null || o.roll === undefined ? null : asObj(o.roll);
  let roll: Adjudication["roll"] = null;
  const warnings: string[] = [];
  if (r) {
    const stat = asStr(r.stat, 20).toLowerCase();
    if (STATS.includes(stat as Stat)) {
      const skills = (Array.isArray(r.skills) ? r.skills : []).map((s) => asStr(s, 40)).filter(Boolean).slice(0, 2);
      roll = { stat: stat as Stat, skills, why: asStr(r.why, 200) };
    } else {
      warnings.push(`unknown stat ${String(r.stat)}; no roll`);
    }
  }
  const reply = parseReply(state, o);
  if (roll) {
    reply.effects = { ...NO_EFFECTS }; // consequences come after the dice, in resolve()
    reply.choice = null;
  }
  return { ...reply, roll, warnings: [...warnings, ...reply.warnings] };
}

// ---------- calls ----------

export class Gm {
  constructor(private readonly model: ModelClient) {}

  async #ask(state: RunState, task: string, maxTokens = 900): Promise<unknown> {
    const { data, costUsd } = await this.model.completeJson({ role: "gm", messages: gmMessages(state, task), maxTokens });
    state.costUsd += costUsd;
    return data;
  }

  async openScene(state: RunState): Promise<GmReply> {
    const names = state.runners.map((r) => r.name).join(", ");
    const raw = await this.#ask(state, `Open the run. The team (${names}) has just taken the job from the hook. ` +
      `Set the first scene in 80-150 words: where they are, who they're meeting, one concrete detail that smells wrong. ` +
      `End by asking what they do. Reply: {"narration": "...", ${EFFECTS_SCHEMA}}`);
    const reply = parseReply(state, raw);
    reply.effects = { ...reply.effects, clock: false, outcome: null };
    reply.choice = null;
    return reply;
  }

  async adjudicate(state: RunState, runner: Runner, action: string): Promise<Adjudication> {
    const raw = await this.#ask(state, `${runner.name} (id "${runner.id}") does this: "${action}"
Decide whether this needs a skill check.
- If it does: {"roll": {"stat": "<muscle|reflex|wits|style>", "skills": ["applicable skill tags, max 2"], "why": "short"}, "narration": "one short line setting up the check, no outcome"}
- If it doesn't: {"roll": null, "narration": "what happens", ${EFFECTS_SCHEMA}, ${CHOICE_SCHEMA}}`);
    return parseAdjudication(state, runner, raw);
  }

  async resolve(state: RunState, runner: Runner, action: string, roll: PoolRoll): Promise<GmReply> {
    const band = roll.hits <= 0 ? "Miss: make the situation worse; security acts, something breaks, or a door closes." :
      roll.hits <= 2 ? "Partial: they get what they tried for, but at a cost — offer the cost as a choice." :
        "Clean: they get what they tried for, and it looks good.";
    const raw = await this.#ask(state, `${runner.name} (id "${runner.id}") tried: "${action}"
Check: ${describePool(roll)}. Result: ${band}
Narrate the outcome of exactly what they tried, and apply its consequences.
Reply: {"narration": "...", ${EFFECTS_SCHEMA}${roll.hits > 0 && roll.hits <= 2 ? `, ${CHOICE_SCHEMA}` : ""}}`);
    return parseReply(state, raw);
  }

  async followUp(state: RunState, runner: Runner, choice: Choice, picked: string): Promise<GmReply> {
    const raw = await this.#ask(state, `${runner.name} (id "${runner.id}") was asked: "${choice.prompt}" and chose: "${picked}".
Narrate what follows from that choice in 30-80 words and apply its consequences.
Reply: {"narration": "...", ${EFFECTS_SCHEMA}}`, 600);
    const reply = parseReply(state, raw);
    reply.choice = null;
    return reply;
  }

  async gmTurn(state: RunState): Promise<GmReply> {
    const allowed = clockAllowed(state, true);
    const next = state.job.clock[state.clock] ?? "(final)";
    const clock = !allowed
      ? "The clock can't move this round (the engine allows one step every two rounds)."
      : state.clock + 1 >= CLOCK_LENGTH
        ? `The next clock step is the LAST: "${next}". Only advance it if the team is not actively closing the job out right now.`
        : `Next clock step: "${next}". ${state.clockRound === undefined ? "It hasn't moved yet" : `It last moved ${state.round - state.clockRound} round(s) ago`}; advance it if time has passed or the team made noise.`;
    const raw = await this.#ask(state, `Every runner has acted this round. Take the GM's turn: the opposition, the world, ` +
      `the job itself moves. ${clock} Then frame the situation for the next round, naming at least one concrete opening ` +
      `(a person, a door, a weakness) and ask what they do. 60-140 words. Reply: {"narration": "...", ${EFFECTS_SCHEMA}}`);
    const reply = parseReply(state, raw);
    reply.choice = null;
    return reply;
  }

  async answer(state: RunState, asker: string, question: string): Promise<string> {
    const raw = await this.#ask(state, `Out of character, ${asker} asks the GM: "${question}". Answer briefly (under 80 ` +
      `words) with what their runner would reasonably know or a rules clarification. Don't reveal secrets. ` +
      `Reply: {"answer": "..."}`, 400);
    return asStr(asObj(raw).answer, 800) || "The GM shrugs: you'll have to find out.";
  }

  async summarize(state: RunState, entries: readonly LogEntry[]): Promise<string> {
    return summarizeLog(this.model, state, entries, "cyberpunk heist");
  }

  async generateJob(state: Pick<RunState, "costUsd">, idea: string): Promise<Job> {
    const shape = `{"title": str, "hook": "the offer the team hears (read aloud)", "truth": "GM-only explanation",
"objective": "what done means", "johnson": "who's paying and what they're like", "location": str,
"opposition": "security and opposition, GM-only", "twist": "the hidden complication",
"clock": [exactly ${CLOCK_LENGTH} strs "Label: what happens", escalating to the job collapsing]}`;
    let lastErrors: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, costUsd } = await this.model.completeJson({
        role: "gm",
        maxTokens: 1500,
        messages: [
          { role: "system", content: `You design one-session cyberpunk jobs for a shadowrun-style game, played by 2-5 runners.
Setting: a specific place in a near-future sprawl (a district, an arcology, a station) with texture.
- The job sounds simple and isn't. Opposition follows procedures, then escalates.
- One hidden twist that recontextualizes the job. One findable way through that isn't brute force.
- A ${CLOCK_LENGTH}-step clock of things getting worse, ending with the team burned.
Write original content only; don't copy published adventures. Reply with only JSON.` },
          { role: "user", content: `Design a job${idea ? ` inspired by: ${idea}` : ""}. Shape:\n${shape}${lastErrors.length ? `\nYour last attempt had problems: ${lastErrors.join("; ")}` : ""}` },
        ],
      });
      state.costUsd += costUsd;
      const job = this.#parseJob(data);
      if (job) return job;
      lastErrors = ["invalid job shape"];
    }
    throw new Error(`Couldn't build a usable job (${lastErrors.join("; ")}).`);
  }

  #parseJob(data: unknown): Job | null {
    const o = asObj(data);
    const clock = (Array.isArray(o.clock) ? o.clock : []).map((c) => asStr(c, 400)).filter(Boolean).slice(0, CLOCK_LENGTH);
    if (clock.length !== CLOCK_LENGTH) return null;
    const need = (v: unknown, max: number): string | null => { const s = asStr(v, max); return s || null; };
    const title = need(o.title, 100); const hook = need(o.hook, 1200); const truth = need(o.truth, 2000);
    const objective = need(o.objective, 400); const johnson = need(o.johnson, 400);
    const location = need(o.location, 600); const opposition = need(o.opposition, 800); const twist = need(o.twist, 600);
    if (!title || !hook || !truth || !objective || !johnson || !location || !opposition || !twist) return null;
    return {
      id: `generated-${Date.now().toString(36)}`,
      title, hook, truth, objective, johnson, location, opposition, twist, clock,
    };
  }
}

// ---------- AI runners ----------

/** Tics the player model falls into: "it isn't just X, it's Y" and friends. */
const TIC = /\b(?:is(?:n'?t| not)|was(?:n'?t| not)|are(?:n'?t| not)) (?:just|only|merely)\b|\bnot (?:just|only|merely) [^.;,]+[;,] (?:it'?s|but)\b/i;

function firstWords(text: string, n = 4): string {
  return text.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

function addressee(line: string): string | null {
  const m = /^\W*([A-Z][\w'-]*(?: [A-Z][\w'-]*)?),/.exec(line.trim());
  return m ? m[1]!.toLowerCase() : null;
}

/** Repeats a stock phrase, opens like one of its own recent lines, or keeps opening by calling the same person. */
export function soundsRepetitive(line: string, recent: readonly string[]): boolean {
  if (TIC.test(line)) return true;
  const opening = firstWords(line);
  if (opening.split(" ").length >= 3 && recent.some((r) => firstWords(r) === opening)) return true;
  const who = addressee(line);
  return who !== null && recent.slice(-3).filter((r) => addressee(r) === who).length >= 2;
}

export async function aiRunnerAction(model: ModelClient, state: RunState, runner: Runner): Promise<{ say: string; act: string; costUsd: number }> {
  const personality = runner.controller.kind === "ai" ? runner.controller.personality : "";
  const team = activeRunners(state).map((r) => `${r.name}${r.pronouns ? `, ${r.pronouns}` : ""} (${r.archetype}, condition ${r.condition}/10)`).join(", ");
  const mine = state.log.filter((e) => e.kind === "hunter" && e.who === runner.name).slice(-4).map((e) => e.text);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You play ${runner.name}${runner.pronouns ? ` (${runner.pronouns})` : ""}, ${runner.archetype}, in a cyberpunk heist game. ` +
        `Personality: ${personality}. You are a player, not the game master: say what ${runner.name} does and says right now, ` +
        `first person. Keep it short: "say" is only the words spoken aloud (one line, or empty); "do" is one sentence of action. ` +
        `Don't decide outcomes or invent facts about security or the job. Support the human players; ` +
        `don't hog the spotlight, and don't repeat what someone just did. Strongest stats: ` +
        `${STATS.filter((s) => (runner.stats[s] ?? 0) >= 3).join(", ") || "none"}. Skills: ${runner.skills.join(", ")}. Gear: ${runner.gear.join(", ")}.
Style: talk like a real person under pressure, plain and specific. Never use "it isn't just X, it's Y" or "not only X but Y". ` +
        `Don't describe the atmosphere; the GM does that. Vary what you do: case the place, work contacts, run tech, ` +
        `cover someone, act on the objective, not the same move every turn. Don't keep opening by addressing the same person. ` +
        `Reply as JSON: {"say": "spoken words or empty", "do": "your action"}.`,
    },
    {
      role: "user",
      content: `The job: ${state.job.hook}\nObjective: ${state.job.objective}\nTeam: ${team}\n` +
        `Story so far: ${state.summary || "(just started)"}\nRecent:\n${recentLog(state, 10)}\n` +
        (mine.length ? `Your last lines (don't reuse their wording or ideas):\n${mine.map((m) => `- ${m}`).join("\n")}\n` : "") +
        `\nWhat does ${runner.name} do?`,
    },
  ];
  let cost = 0;
  let result = { say: "", act: "" };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, costUsd } = await model.completeJson({ role: "player", maxTokens: 300, messages });
    cost += costUsd;
    const o = asObj(data);
    result = { say: asStr(o.say, 300).replace(/^["'\u201c\u201d\s]+|["'\u201c\u201d\s]+$/g, ""), act: asStr(o.do, 400) || "I watch the exits and wait for an opening." };
    if (!soundsRepetitive(`${result.say} ${result.act}`, mine)) break;
    messages.push(
      { role: "assistant", content: JSON.stringify({ say: result.say, do: result.act }) },
      { role: "user", content: "That repeats a stock phrase or your earlier lines. Say something different, plainly, with no 'isn't just / not only' construction." },
    );
  }
  return { ...result, costUsd: cost };
}
