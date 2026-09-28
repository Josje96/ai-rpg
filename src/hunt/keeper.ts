import type { ChatMessage, ModelClient } from "../ai/provider.js";
import { COUNTDOWN_LENGTH, parseMystery, type Mystery } from "./mystery.js";
import { GENERIC_ART } from "./mysteries/art.js";
import { SOURCE_CREDITS } from "./mysteries/credits.js";
import { playbook } from "./playbooks.js";
import { BASIC_MOVES, STATS, basicMove, describeRoll, harmStatus, type BasicMoveId, type MoveRoll, type Stat } from "./rules.js";
import { activeHunters, countdownAllowed, type GameState, type Hunter, type LogEntry } from "./state.js";

/**
 * The keeper (AI GM) proposes; the engine disposes. Every reply is a JSON object that is validated and clamped here
 * before it touches game state, so a confused model can't hand out 12 harm or roll its own dice.
 */

export type Effects = {
  harm: { hunter: Hunter; amount: number; reason: string }[];
  heal: { hunter: Hunter; amount: number }[];
  monsterHarm: number;
  clues: string[];
  countdown: boolean;
  weaknessDiscovered: boolean;
  monsterRevealed: boolean;
  outcome: "won" | null;
};

export const NO_EFFECTS: Effects = {
  harm: [], heal: [], monsterHarm: 0, clues: [], countdown: false, weaknessDiscovered: false, monsterRevealed: false, outcome: null,
};

export type Choice = { prompt: string; options: string[] };
export type KeeperReply = { narration: string; effects: Effects; warnings: string[]; choice: Choice | null };
/** What a Kick some ass hit landed on; the engine applies weapon harm to the monster itself. */
export type Target = "monster" | "minion" | "other";
export type Resolution = KeeperReply & { target: Target };
export type Adjudication = KeeperReply & { roll: { move: BasicMoveId; stat: Stat; why: string } | null };

const RECENT_ENTRIES = 16;

// ---------- prompts ----------

const CHOICE_SCHEMA = `"choice": null or {"prompt": "a choice for the acting hunter", "options": ["2-4 short options"]}`;

const EFFECTS_SCHEMA = `"effects": {
    "harm": [{"hunter": "<hunter id>", "amount": 1-4, "reason": "short"}],
    "heal": [{"hunter": "<hunter id>", "amount": 1-3}],
    "monsterHarm": 0-5,
    "clues": ["a clue from the secret list that the hunters just learned, paraphrased"],
    "countdown": false,
    "weaknessDiscovered": false,
    "monsterRevealed": false,
    "outcome": null
  }`;

function rulesText(): string {
  const moves = BASIC_MOVES.map((m) => `- ${m.id} (${m.name}, roll +${m.stat}): ${m.trigger} 10+: ${m.strong} 7-9: ${m.mixed}`).join("\n");
  return `Rules (Powered by the Apocalypse, monster-hunting action horror):
- When a hunter's action matches a move's trigger, it needs a roll: 2d6 + stat. 10+ strong hit, 7-9 mixed hit, 6- miss.
  The engine rolls the dice. You NEVER roll or invent dice results.
- On a miss, make a hard move: the monster acts, someone gets hurt, the situation worsens, an opportunity is lost.
  On a mixed hit, success with a cost, complication, or hard choice.
- If an action doesn't match a trigger, or isn't risky, don't ask for a roll: just narrate what happens.
- Harm: hunters have a 0-7 track; 4+ is unstable; beyond 7 they're out. Typical harm 1-3; 4 is brutal.
  Monster attacks and weapons list their harm. Don't hand out harm without a fictional cause.
- The monster can be hurt and driven off, but it can only be truly defeated through its weakness.
- Hunters have Luck, which the engine handles.
Basic moves:
${moves}`;
}

function keeperSystem(): string {
  return `You are the Keeper (game master) of a Monster Hunt horror game played at one table, on a phone screen.
${rulesText()}

How to keep:
- Be a fan of the hunters. Make the monster frightening and the world feel real; bystanders have lives.
- Keep narration tight: 40-120 words, vivid, present tense, second person to the acting hunter, naming hunters.
  Stay in the fiction: don't mention stats, rolls, or bonuses in narration; the engine shows those.
- Never reveal the secret truth or the weakness outright. Hunters learn it through clues, investigation, and moves.
  Put a clue in "clues" only when the hunters actually learn something NEW in the fiction; never repeat a known clue.
- Pace with the countdown. The engine allows at most ONE countdown step per round, and the final step (the monster
  winning) only on your keeper turn. Usually advance it on your keeper turn when time has passed; on a hunter's
  miss, prefer harm, danger, a bystander in trouble, or a lost opportunity over the clock.
- Set "weaknessDiscovered": true when the hunters have learned or clearly guessed how to stop the monster.
- Set "monsterRevealed": true the first time the monster itself is seen clearly (not just its signs, voice, or minions).
- Set "outcome": "won" only when the hunters actually use the weakness to stop the monster for good.
- Humans are playing some hunters. Never decide what a human's hunter says, thinks, or does; describe the world
  and ask what they do. Don't end on a question to a specific AI hunter; the engine handles turns.
- A hunter's declared action is what they attempt, even if it's reckless, cruel, or foolish. Never swap it for a
  different, wiser action; the dice decide how well it goes, not what they tried. Consequences follow in the fiction.
- Call hunters by their hunter names. Players may call each other by their own names; that's fine.
- When the acting hunter must choose (a mixed hit's hard choice, a strong hit's edge), don't ask in the narration:
  stop the narration at the moment of choice and put the options in "choice". The engine asks that player at once.
- Keep the mystery moving: hunters can only win with clues. On investigation and reading hits, answer with concrete
  facts that match clues from the secret list they don't have yet, and put those in "clues". Point them at places
  and people that hold more.
Reply with only a JSON object.`;
}

function hunterLine(h: Hunter): string {
  const book = playbook(h.playbook);
  const stats = STATS.map((s) => `${s} ${h.stats[s] >= 0 ? "+" : ""}${h.stats[s]}`).join(", ");
  const moves = (book?.moves ?? []).filter((m) => h.moves.includes(m.id)).map((m) => `${m.name}: ${m.text.replace(/\.$/, "")}`).join(" | ");
  const who = h.controller.kind === "human" ? `played by human ${h.controller.player}` : `AI-played (${h.controller.personality})`;
  const gear = h.gear.map((g) => `${g.name} (${g.harm}-harm ${g.tags.join("/")})`).join(", ");
  const pronouns = h.pronouns ? ` (${h.pronouns})` : "";
  return `- id "${h.id}": ${h.name}${pronouns}, ${book?.name ?? h.playbook}, ${who}. Stats: ${stats}. Moves: ${moves}. Gear: ${gear}. Harm ${h.harm}/7 (${harmStatus(h.harm)}), Luck ${h.luck}.`;
}

export function formatEntry(e: LogEntry): string {
  switch (e.kind) {
    case "keeper": return `KEEPER: ${e.text}`;
    case "hunter": return `${e.who ?? "Hunter"}: ${e.text}`;
    case "roll": return `ROLL ${e.who ?? ""}: ${e.text}`;
    case "system": return `[${e.text}]`;
  }
}

function secretDigest(m: Mystery, state: GameState): string {
  const clues = m.clues.map((c) => `- ${c}`).join("\n");
  const known = state.cluesFound.map((c) => `- ${c}`).join("\n") || "- (none yet)";
  const countdown = m.countdown.map((c, i) => `${i + 1}. ${i < state.countdown ? "(happened) " : i === state.countdown ? "(NEXT) " : ""}${c}`).join("\n");
  return `SECRET MYSTERY (keeper eyes only): ${m.title}
Truth: ${m.truth}
Monster: ${m.monster.name}, ${m.monster.kind}. Wants: ${m.monster.motivation}
Powers: ${m.monster.powers.join(" ")}
Weakness: ${m.monster.weakness}
Attacks: ${m.monster.attacks.map((a) => `${a.name} ${a.harm}-harm`).join(", ")}. Armor ${m.monster.armor}. Current harm ${state.monsterHarm}/${m.monster.harmCapacity}.
Minions: ${m.minions.map((x) => `${x.name} (${x.description}; ${x.harm}-harm)`).join("; ") || "none"}
Bystanders: ${m.bystanders.map((b) => `${b.name}: ${b.description}`).join(" | ")}
Locations: ${m.locations.map((l) => `${l.name}: ${l.description}`).join(" | ")}
Clues (secret list):
${clues}
Clues the hunters ALREADY HAVE (don't add these again, even reworded):
${known}
Countdown:
${countdown}
Weakness known to hunters: ${state.weaknessKnown ? "yes" : "no"}`;
}

export function recentLog(state: GameState, count = RECENT_ENTRIES): string {
  const start = Math.max(state.summarizedThrough, state.log.length - count);
  return state.log.slice(start).map(formatEntry).join("\n") || "(nothing yet)";
}

function context(state: GameState): string {
  return `${secretDigest(state.mystery, state)}

HUNTERS:
${state.hunters.map(hunterLine).join("\n")}

STORY SO FAR: ${state.summary || "(just started)"}

RECENT:
${recentLog(state)}`;
}

function keeperMessages(state: GameState, task: string): ChatMessage[] {
  return [
    { role: "system", content: keeperSystem() },
    { role: "user", content: `${context(state)}\n\nTASK: ${task}` },
  ];
}

// ---------- validation ----------

type Raw = Record<string, unknown>;
const asObj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const asStr = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const clamp = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : 0;

function findHunter(state: GameState, ref: unknown): Hunter | undefined {
  if (typeof ref !== "string") return undefined;
  const key = ref.trim().toLowerCase();
  return state.hunters.find((h) => h.id === key || h.name.toLowerCase() === key || h.name.toLowerCase().split(" ")[0] === key);
}

export function parseEffects(state: GameState, raw: unknown, opts: { maxMonsterHarm: number }): { effects: Effects; warnings: string[] } {
  const o = asObj(raw);
  const warnings: string[] = [];
  const harm: Effects["harm"] = [];
  for (const item of Array.isArray(o.harm) ? o.harm.slice(0, 6) : []) {
    const x = asObj(item);
    const hunter = findHunter(state, x.hunter);
    const amount = clamp(x.amount, 0, 4);
    if (!hunter) { warnings.push(`ignored harm to unknown hunter ${String(x.hunter)}`); continue; }
    if (harmStatus(hunter.harm) === "out" || amount === 0) continue;
    harm.push({ hunter, amount, reason: asStr(x.reason, 80) });
  }
  const healList: Effects["heal"] = [];
  for (const item of Array.isArray(o.heal) ? o.heal.slice(0, 6) : []) {
    const x = asObj(item);
    const hunter = findHunter(state, x.hunter);
    const amount = clamp(x.amount, 0, 3);
    if (hunter && amount > 0 && hunter.harm > 0) healList.push({ hunter, amount });
  }
  const requested = clamp(o.monsterHarm, 0, 5);
  const monsterHarm = Math.min(requested, opts.maxMonsterHarm);
  if (requested > monsterHarm) warnings.push(`capped monster harm ${requested} -> ${monsterHarm}`);
  const clues = (Array.isArray(o.clues) ? o.clues : []).map((c) => asStr(c, 300)).filter(Boolean).slice(0, 3);
  const weaknessDiscovered = o.weaknessDiscovered === true;
  let outcome: Effects["outcome"] = o.outcome === "won" ? "won" : null;
  if (outcome && !(state.weaknessKnown || weaknessDiscovered)) {
    warnings.push("ignored 'won': the hunters haven't found the weakness");
    outcome = null;
  }
  return {
    effects: { harm, heal: healList, monsterHarm, clues, countdown: o.countdown === true, weaknessDiscovered, monsterRevealed: o.monsterRevealed === true, outcome },
    warnings,
  };
}

export function parseChoice(raw: unknown): Choice | null {
  const o = asObj(raw);
  const prompt = asStr(o.prompt, 240);
  const options = (Array.isArray(o.options) ? o.options : []).map((x) => asStr(x, 140)).filter(Boolean).slice(0, 4);
  return prompt && options.length >= 2 ? { prompt, options } : null;
}

function parseReply(state: GameState, raw: unknown, maxMonsterHarm: number): KeeperReply {
  const o = asObj(raw);
  const narration = asStr(o.narration, 2000);
  const { effects, warnings } = parseEffects(state, o.effects, { maxMonsterHarm });
  if (!narration) warnings.push("empty narration");
  return {
    narration: narration || "The Keeper pauses, considering. (Try describing your action again.)",
    effects, warnings, choice: parseChoice(o.choice),
  };
}

/** The harm a hunter deals: their best weapon. */
export function weaponHarm(hunter: Hunter): number {
  return Math.max(1, ...hunter.gear.map((g) => g.harm));
}

/** Best weapon harm +1 (a strong hit's extra-harm edge): the most a hunter can deal in one exchange. */
export function maxHarmFor(hunter: Hunter | undefined): number {
  if (!hunter) return 0;
  return Math.max(1, ...hunter.gear.map((g) => g.harm)) + 1;
}

export function parseAdjudication(state: GameState, hunter: Hunter, raw: unknown): Adjudication {
  const o = asObj(raw);
  const r = o.roll === null || o.roll === undefined ? null : asObj(o.roll);
  let roll: Adjudication["roll"] = null;
  const warnings: string[] = [];
  if (r) {
    const move = basicMove(asStr(r.move, 40));
    if (move) {
      // The move decides the stat; signature moves may swap it later in the engine.
      roll = { move: move.id, stat: move.stat, why: asStr(r.why, 200) };
    } else {
      warnings.push(`unknown move ${String(r.move)}; no roll`);
    }
  }
  const reply = parseReply(state, o, roll ? 0 : maxHarmFor(hunter));
  if (roll) {
    reply.effects = { ...NO_EFFECTS }; // effects and choices come after the dice, in resolve()
    reply.choice = null;
  }
  return { ...reply, roll, warnings: [...warnings, ...reply.warnings] };
}

/**
 * Mystery design guidance, paraphrased from the Fate Horror Toolkit (monster design, CC BY 3.0) and the
 * Liminal Horror SRD (doom clock structure, CC BY 4.0). See SRD_ATTRIBUTION.md.
 */
const MYSTERY_DESIGN = `You design one-session monster-hunting mysteries for a Monster Hunt game, played by 2-5 hunters.
Setting: a specific small American town with texture (a diner, a local institution, a festival, a landmark).
Monster design:
- Give it a theme (what it symbolizes beyond being scary) and a purpose (why it does what it does). It is not mindless.
- It threatens what the hunters and townsfolk care about (a bystander they'll like, a place, the town's future), not only their bodies.
- Give it clear limitations and ONE findable weakness that stops it for good; ordinary weapons can only drive it off.
- Plan a staged reveal: clues show it in pieces (a sound, a mark, a photo, a partial sighting) before it's seen whole.
- It escalates: as the countdown advances it gets bolder, gains reach, or changes once the hunters think they understand it.
Structure:
- 6-8 clues that, together, reveal the truth and the weakness; at least two point at the weakness from different angles.
- A six-step countdown with these beats: Calm Before the Storm (the catalyst), Omens (the uncanny, deniable), The Plot
  Thickens (it gets worse, someone disappears), The Horror Exposed (the threat is undeniable), Nowhere to Hide (it comes for
  them and the people they care about), No Turning Back (the monster wins).
- Bystanders who want things and are in the way, including one the hunters will want to save.
Write original content only; don't copy published adventures. Reply with only JSON.`;

// ---------- calls ----------

export class Keeper {
  constructor(private readonly model: ModelClient) {}

  async #ask(state: GameState, task: string, maxTokens = 900): Promise<unknown> {
    const { data, costUsd } = await this.model.completeJson({ role: "gm", messages: keeperMessages(state, task), maxTokens });
    state.costUsd += costUsd;
    return data;
  }

  async openScene(state: GameState): Promise<KeeperReply> {
    const names = state.hunters.map((h) => h.name).join(", ");
    const raw = await this.#ask(state, `Open the game. The hunters (${names}) have just arrived in town, drawn by the hook. ` +
      `Set the first scene in 80-150 words: where they are, what they notice, one bystander who wants something. ` +
      `End by asking what they do. Reply: {"narration": "...", ${EFFECTS_SCHEMA}}`);
    const reply = parseReply(state, raw, 0);
    // The clock starts after the hunters get a chance to act.
    reply.effects = { ...reply.effects, countdown: false, outcome: null };
    reply.choice = null;
    return reply;
  }

  async adjudicate(state: GameState, hunter: Hunter, action: string): Promise<Adjudication> {
    const raw = await this.#ask(state, `${hunter.name} (id "${hunter.id}") does this: "${action}"
Decide whether this triggers a basic move.
- If it does: {"roll": {"move": "<move id>", "why": "short"}, "narration": "one short line setting up the roll, no outcome"}
- If it doesn't: {"roll": null, "narration": "what happens", ${EFFECTS_SCHEMA}, ${CHOICE_SCHEMA}}`);
    return parseAdjudication(state, hunter, raw);
  }

  async resolve(state: GameState, hunter: Hunter, action: string, move: BasicMoveId, roll: MoveRoll, questions: string[]): Promise<Resolution> {
    const m = basicMove(move)!;
    const asked = questions.length
      ? `\nThey asked: ${questions.map((q) => `"${q}"`).join(", ")}. Answer each with a concrete fact from the secret mystery, in the fiction, and add the matching clues.`
      : "";
    const fight = move === "kick-some-ass"
      ? `\nSay what the attack landed on in "target": "monster" (the monster itself), "minion", or "other". The engine applies ` +
        `${hunter.name}'s weapon harm to the monster on a hit, so leave monsterHarm at 0. On a strong hit, offer the edge ` +
        `(extra harm / take less harm / force it somewhere) as a "choice".`
      : "";
    const raw = await this.#ask(state, `${hunter.name} (id "${hunter.id}") tried: "${action}"
Move: ${m.name}. Result: ${describeRoll(roll)}. ${roll.band === "strong" ? m.strong : roll.band === "mixed" ? m.mixed : "Miss: make a hard move."}${asked}${fight}
Narrate the outcome of exactly what they tried, and apply its consequences.
Reply: {"narration": "...", ${EFFECTS_SCHEMA}, ${CHOICE_SCHEMA}${move === "kick-some-ass" ? ', "target": "monster" | "minion" | "other"' : ""}}`);
    const o = asObj(raw);
    const reply = parseReply(state, raw, move === "kick-some-ass" ? 0 : maxHarmFor(hunter));
    const target: Target = o.target === "monster" || o.target === "minion" ? o.target : "other";
    return { ...reply, target };
  }

  /** The acting hunter picked an option from a choice; narrate what follows. */
  async followUp(state: GameState, hunter: Hunter, choice: Choice, picked: string): Promise<KeeperReply> {
    const raw = await this.#ask(state, `${hunter.name} (id "${hunter.id}") was asked: "${choice.prompt}" and chose: "${picked}".
Narrate what follows from that choice in 30-80 words and apply its consequences. If they chose extra harm, set monsterHarm 1.
Reply: {"narration": "...", ${EFFECTS_SCHEMA}}`, 600);
    const reply = parseReply(state, raw, 1);
    reply.choice = null;
    return reply;
  }

  async keeperTurn(state: GameState): Promise<KeeperReply> {
    const since = state.round - (state.countdownRound ?? 0);
    const allowed = countdownAllowed(state, true);
    const next = state.mystery.countdown[state.countdown] ?? "(final)";
    const clock = !allowed
      ? "The countdown can't move this round (the engine allows one step every two rounds)."
      : state.countdown + 1 >= COUNTDOWN_LENGTH
        ? `The next countdown step is the LAST: "${next}". Only advance it if the hunters are not actively stopping the monster right now.`
        : `Next countdown step: "${next}". ${state.countdownRound === undefined ? "It hasn't moved yet" : `It last moved ${since} round(s) ago`}; advance it if time has passed or the threat has grown.`;
    const raw = await this.#ask(state, `Every hunter has acted this round. Take the keeper's turn: the monster, minions, or ` +
      `bystanders act; the world moves. ${clock} Then frame the situation for the next round, naming at least one concrete ` +
      `lead (a place or person) that holds a clue the hunters don't have yet, and ask what they do. 60-140 words. ` +
      `Reply: {"narration": "...", ${EFFECTS_SCHEMA}}`);
    const reply = parseReply(state, raw, 0);
    reply.choice = null;
    return reply;
  }

  async answer(state: GameState, asker: string, question: string): Promise<string> {
    const raw = await this.#ask(state, `Out of character, ${asker} asks the keeper: "${question}". Answer briefly (under 80 ` +
      `words) with what their hunters would reasonably know or a rules clarification. Don't reveal secrets. ` +
      `Reply: {"answer": "..."}`, 400);
    return asStr(asObj(raw).answer, 800) || "The Keeper shrugs: you'll have to find out.";
  }

  async summarize(state: GameState, entries: LogEntry[]): Promise<string> {
    const { data, costUsd } = await this.model.completeJson({
      role: "player",
      maxTokens: 600,
      messages: [
        { role: "system", content: "You maintain a running recap of a tabletop horror game. Keep names, places, clues found, injuries, promises, and open threads. Under 220 words. Reply {\"summary\": \"...\"}." },
        { role: "user", content: `Recap so far: ${state.summary || "(none)"}\n\nNew events:\n${entries.map(formatEntry).join("\n")}` },
      ],
    });
    state.costUsd += costUsd;
    return asStr(asObj(data).summary, 2500) || state.summary;
  }

  async generateMystery(state: Pick<GameState, "costUsd">, idea: string): Promise<Mystery> {
    const shape = `{"title": str, "hook": "what the hunters hear about (read aloud)", "truth": "keeper-only explanation",
"monster": {"name": str, "kind": str, "motivation": str, "powers": [str x3-4], "weakness": "the one way to stop it for good",
  "attacks": [{"name": str, "harm": 1-4, "tags": [str]}], "armor": 0-2, "harmCapacity": 6-10},
"minions": [{"name": str, "description": str, "harm": 0-3, "harmCapacity": 1-6}],
"bystanders": [{"name": str, "description": str} x3-5], "locations": [{"name": str, "description": str} x4-6],
"clues": [str x6-8, together they reveal the truth and the weakness], "countdown": [exactly ${COUNTDOWN_LENGTH} strs "Label: what happens", escalating to the monster winning]}`;
    let lastErrors: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, costUsd } = await this.model.completeJson({
        role: "gm",
        maxTokens: 2500,
        messages: [
          { role: "system", content: MYSTERY_DESIGN },
          { role: "user", content: `Design a mystery${idea ? ` inspired by: ${idea}` : ""}. Shape:\n${shape}${lastErrors.length ? `\nYour last attempt had problems: ${lastErrors.join("; ")}` : ""}` },
        ],
      });
      state.costUsd += costUsd;
      const parsed = parseMystery(data, `generated-${Date.now().toString(36)}`);
      if ("mystery" in parsed) return { ...parsed.mystery, art: GENERIC_ART, credits: SOURCE_CREDITS };
      lastErrors = parsed.errors;
    }
    throw new Error(`Couldn't build a usable mystery (${lastErrors.join("; ")}).`);
  }
}

// ---------- AI hunters ----------

/** Tics the player model falls into: "it isn't just X, it's Y" and friends. */
const TIC = /\b(?:is(?:n'?t| not)|was(?:n'?t| not)|are(?:n'?t| not)) (?:just|only|merely)\b|\bnot (?:just|only|merely) [^.;,]+[;,] (?:it'?s|but)\b/i;

function firstWords(text: string, n = 4): string {
  return text.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

/** "Theo, get down." -> "theo" : who a line opens by addressing, if anyone. */
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

/** Models sometimes wrap dialogue in its own quotes; the game adds them. */
const unquote = (text: string) => text.replace(/^["'\u201c\u201d\s]+|["'\u201c\u201d\s]+$/g, "");

export async function aiHunterAction(model: ModelClient, state: GameState, hunter: Hunter): Promise<{ say: string; act: string; costUsd: number }> {
  const book = playbook(hunter.playbook);
  const personality = hunter.controller.kind === "ai" ? hunter.controller.personality : "";
  const party = activeHunters(state).map((h) => `${h.name}${h.pronouns ? `, ${h.pronouns}` : ""} (${playbook(h.playbook)?.name ?? h.playbook}, harm ${h.harm}/7)`).join(", ");
  const mine = state.log.filter((e) => e.kind === "hunter" && e.who === hunter.name).slice(-4).map((e) => e.text);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You play ${hunter.name}${hunter.pronouns ? ` (${hunter.pronouns})` : ""}, ${book?.name ?? "a hunter"} (${book?.pitch ?? ""}), in a monster-hunting horror game. ` +
        `Personality: ${personality}. You are a player, not the game master: say what ${hunter.name} does and says right now, ` +
        `first person. Keep it short: "say" is only the words spoken aloud (one line, or empty); "do" is one sentence of action. ` +
        `Don't decide outcomes or invent facts about the monster. Support the human players; ` +
        `don't hog the spotlight, and don't repeat what someone just did. Strongest stats: ` +
        `${STATS.filter((s) => hunter.stats[s] >= 1).join(", ") || "none"}.
Style: talk like a real person under pressure, plain and specific. Never use "it isn't just X, it's Y" or "not only X but Y". ` +
        `Don't describe the atmosphere; the Keeper does that. Vary what you do: follow up leads, question people, research, ` +
        `protect someone, act on clues, not the same move every turn. Don't keep opening by addressing the same person, ` +
        `and don't spend every turn looking after one teammate; the humans can look after themselves. Reply as JSON: {"say": "spoken words or empty", "do": "your action"}.`,
    },
    {
      role: "user",
      content: `The hook: ${state.mystery.hook}\nClues found: ${state.cluesFound.join(" | ") || "none"}\nParty: ${party}\n` +
        `Story so far: ${state.summary || "(just started)"}\nRecent:\n${recentLog(state, 10)}\n` +
        (mine.length ? `Your last lines (don't reuse their wording or ideas):\n${mine.map((m) => `- ${m}`).join("\n")}\n` : "") +
        `\nWhat does ${hunter.name} do?`,
    },
  ];
  let cost = 0;
  let result = { say: "", act: "" };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, costUsd } = await model.completeJson({ role: "player", maxTokens: 300, messages });
    cost += costUsd;
    const o = asObj(data);
    result = { say: unquote(asStr(o.say, 300)), act: asStr(o.do, 400) || "I keep watch and wait for an opening." };
    if (!soundsRepetitive(`${result.say} ${result.act}`, mine)) break;
    messages.push(
      { role: "assistant", content: JSON.stringify({ say: result.say, do: result.act }) },
      { role: "user", content: "That repeats a stock phrase or your earlier lines. Say something different, plainly, with no 'isn't just / not only' construction." },
    );
  }
  return { ...result, costUsd: cost };
}
