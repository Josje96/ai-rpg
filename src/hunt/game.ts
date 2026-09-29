import { randomInt } from "node:crypto";
import type { ModelClient } from "../ai/provider.js";
import type { RandomInt } from "../domain/dice.js";
import type { GameIO } from "../rpg/adapter.js";
import { SessionLoop, type SessionHooks } from "../session/loop.js";
import { withBusy } from "../session/retry.js";
import type { TurnInput } from "../session/types.js";
import { aiHunterAction, weaponHarm, type Choice, type Effects, type Keeper, type KeeperReply } from "./keeper.js";
import { COUNTDOWN_LENGTH } from "./mystery.js";
import { countdownMeter, GENERIC_ART, outOfActionArt } from "./mysteries/art.js";
import { effectiveRoll, playbook } from "./playbooks.js";
import {
  BASIC_MOVES, MAX_HARM, MAX_STAT, STATS, applyLuckToRoll, basicMove, describeRoll, harmStatus, rollMove,
  type BasicMoveId, type Stat,
} from "./rules.js";
import {
  advanceCountdown, countdownAllowed, applyHarm, heal, hunterById, hurtMonster, improveStat, log, markXp, recordClues,
  spendLuck, type GameState, type Hunter,
} from "./state.js";

export type { GameIO };

export type GameDeps = {
  keeper: Keeper;
  model: ModelClient;
  io: GameIO;
  save: (state: GameState) => Promise<unknown>;
  random?: RandomInt;
  debug?: boolean;
};

export const HELP = [
  "Type what your hunter does or says, in plain words. Commands:",
  "  /sheet [name]  your sheet (or another hunter's)",
  "  /party         everyone's harm and Luck",
  "  /clues         clues found so far",
  "  /clock         how close the monster is to winning",
  "  /recap         the story so far",
  "  /ask <q>       out-of-character question to the Keeper",
  "  /rules         the basic moves",
  "  /credits       attribution for this mystery's sources",
  "  /pass          skip your turn",
  "  /save, /quit   save (the game also autosaves every turn), or save and stop",
].join("\n");

export class Game {
  readonly #random: RandomInt;

  constructor(readonly state: GameState, private readonly deps: GameDeps) {
    this.#random = deps.random ?? randomInt;
  }

  /** Runs until the mystery ends or a player quits. Returns true if the game is over. */
  async run(): Promise<boolean> {
    const hooks: SessionHooks<GameState, Hunter> = {
      members: (state) => state.hunters,
      active: (_state, hunter) => harmStatus(hunter.harm) !== "out",
      open: async (_state, _ctx, resuming) => this.#open(resuming),
      turn: async (_state, hunter) =>
        hunter.controller.kind === "human" ? await this.#humanTurn(hunter) : await this.#aiTurn(hunter),
      resolve: async (_state, hunter, text) => this.#resolveAction(hunter, text),
      betweenRounds: async (state) => {
        const reply = await withBusy(this.deps.io, "The Keeper moves", () => this.deps.keeper.keeperTurn(state));
        await this.#applyReply(reply, true);
      },
      finish: async (state) => this.#finish(state),
      save: (state) => this.deps.save(state),
      summarize: (state, entries) => this.deps.keeper.summarize(state, entries),
    };
    return new SessionLoop(this.state, hooks, {
      io: this.deps.io,
      model: this.deps.model,
      random: this.deps.random,
      debug: this.deps.debug,
    }).run();
  }

  async #open(resuming: boolean): Promise<void> {
    const { state, deps } = this;
    if (!resuming) {
      deps.io.art(this.#art.title);
      deps.io.show("heading", state.mystery.title);
      if (state.mystery.credits?.length) deps.io.show("system", "Uses openly licensed material; type /credits for attribution.");
      deps.io.show("info", state.mystery.hook);
      const reply = await withBusy(deps.io, "The Keeper sets the scene", () => deps.keeper.openScene(state));
      await this.#applyReply(reply);
    } else {
      deps.io.show("heading", `${state.mystery.title}, round ${state.round}`);
      deps.io.show("info", state.summary || "(Resuming.)");
      const last = [...state.log].reverse().find((e) => e.kind === "keeper");
      if (last) deps.io.show("keeper", last.text);
    }
  }

  #finish(state: GameState): void {
    const { deps } = this;
    deps.io.art(state.status === "won" ? this.#art.won : this.#art.lost);
    deps.io.show("heading", state.status === "won" ? "The monster is stopped." : "The monster wins this week.");
    deps.io.show("info", `Clues found: ${state.cluesFound.length}/${state.mystery.clues.length}. Model cost this game: $${state.costUsd.toFixed(3)}.`);
  }

  // ---------- turns ----------

  async #humanTurn(hunter: Hunter): Promise<TurnInput> {
    const { io } = this.deps;
    const player = hunter.controller.kind === "human" ? hunter.controller.player : "";
    for (;;) {
      const line = (await io.ask(`${player}, ${hunter.name} (harm ${hunter.harm}, Luck ${hunter.luck}): what do you do?`)).trim();
      if (!line) continue;
      if (!line.startsWith("/")) return { kind: "action", text: line.slice(0, 600) };
      const [command, ...rest] = line.slice(1).split(/\s+/);
      const arg = rest.join(" ");
      switch ((command ?? "").toLowerCase()) {
        case "quit": case "exit": return { kind: "quit" };
        case "pass": return { kind: "pass" };
        case "help": io.show("info", HELP); break;
        case "sheet": io.show("info", sheet(arg ? hunterById(this.state, arg) ?? hunter : hunter)); break;
        case "party": io.show("info", this.state.hunters.map(partyLine).join("\n")); break;
        case "clock": io.show("info", `Clock ${countdownMeter(this.state.countdown, this.state.mystery.countdown)}`); break;
        case "clues": io.show("info", this.state.cluesFound.length ? this.state.cluesFound.map((c) => `- ${c}`).join("\n") : "No clues yet."); break;
        case "recap": io.show("info", this.state.summary || "Nothing to recap yet; it's all in the recent scroll."); break;
        case "credits": io.show("info", this.state.mystery.credits?.length ? this.state.mystery.credits.join("\n\n") : "This mystery is original to this project."); break;
        case "rules": io.show("info", BASIC_MOVES.map((m) => `${m.name} (+${m.stat}): ${m.trigger}`).join("\n")); break;
        case "save": await this.deps.save(this.state); io.show("info", "Saved."); break;
        case "ask":
          if (!arg) { io.show("info", "Usage: /ask <question>"); break; }
          io.show("keeper", await withBusy(this.deps.io, "The Keeper thinks", () => this.deps.keeper.answer(this.state, player, arg)));
          break;
        default: io.show("info", `Unknown command /${command}. Type /help.`);
      }
    }
  }

  async #aiTurn(hunter: Hunter): Promise<TurnInput> {
    const result = await withBusy(this.deps.io, `${hunter.name} is thinking`, () => aiHunterAction(this.deps.model, this.state, hunter));
    this.state.costUsd += result.costUsd;
    const text = result.say ? `"${result.say}" ${result.act}` : result.act;
    return { kind: "action", text };
  }

  // ---------- resolving ----------

  async #resolveAction(hunter: Hunter, text: string): Promise<void> {
    const { state, deps } = this;
    log(state, { kind: "hunter", who: hunter.name, text });
    deps.io.show("hunter", text, hunter.name);

    const adj = await withBusy(this.deps.io, "The Keeper considers", () => deps.keeper.adjudicate(state, hunter, text));
    this.#warn(adj.warnings);
    if (!adj.roll) {
      await this.#applyReply(adj);
      await this.#handleChoice(hunter, adj.choice);
      return;
    }
    if (adj.narration) {
      deps.io.show("keeper", adj.narration);
      log(state, { kind: "keeper", text: adj.narration });
    }

    const move = basicMove(adj.roll.move)!;
    const { stat, bonus: moveBonus, sources } = effectiveRoll(hunter, move.id, move.stat);
    const forward = this.#takeForward(hunter);
    if (forward) sources.push(forward.source);
    const bonus = Math.min(3, moveBonus + (forward ? 1 : 0));
    let roll = rollMove({ stat, statValue: hunter.stats[stat], bonus }, this.#random);
    const via = sources.length ? ` [${sources.join(", ")}]` : "";
    deps.io.show("roll", `${move.name}: ${describeRoll(roll)}${via}`, hunter.name);

    if (roll.band !== "strong" && hunter.luck > 0 && (await this.#wantsLuckForRoll(hunter, roll.band))) {
      spendLuck(state, hunter, "to turn the roll into a 12");
      roll = applyLuckToRoll(roll);
      deps.io.show("roll", describeRoll(roll), hunter.name);
    }
    log(state, { kind: "roll", who: hunter.name, text: `${move.name}: ${describeRoll(roll)}` });
    if (roll.band === "miss") {
      deps.io.show("system", `${hunter.name} marks experience.`);
      if (markXp(state, hunter)) await this.#improve(hunter);
    }

    if (roll.band !== "miss" && (move.id === "help-out" || move.id === "read-situation")) {
      const others = move.id === "help-out";
      (state.forward ??= []).push({ hunter: hunter.id, others, source: others ? `${hunter.name}'s help` : "acting on what you read" });
      deps.io.show("system", others ? `${hunter.name}'s help: the next roll by another hunter gets +1.` : `${hunter.name} gets +1 on their next roll when acting on the answers.`);
    }

    const questions = move.questions && move.holds && roll.band !== "miss"
      ? await this.#pickQuestions(hunter, move.questions, roll.band === "strong" ? move.holds.strong : move.holds.mixed)
      : [];
    if (questions.length) log(state, { kind: "system", text: `${hunter.name} asks: ${questions.join(" / ")}` });
    const reply = await withBusy(this.deps.io, "The Keeper narrates", () => deps.keeper.resolve(state, hunter, text, move.id as BasicMoveId, roll, questions));
    // Fights are the engine's job: a hit on the monster deals the hunter's weapon harm, whatever the Keeper remembered.
    if (move.id === "kick-some-ass" && roll.band !== "miss" && reply.target === "monster") {
      reply.effects = { ...reply.effects, monsterHarm: weaponHarm(hunter) };
    }
    await this.#applyReply(reply);
    await this.#handleChoice(hunter, reply.choice);
  }

  async #applyReply(reply: KeeperReply, keeperTurn = false): Promise<void> {
    const { state, deps } = this;
    this.#warn(reply.warnings);
    deps.io.show("keeper", reply.narration);
    log(state, { kind: "keeper", text: reply.narration });
    for (const line of await this.#applyEffects(reply.effects, keeperTurn)) deps.io.show("system", line);
  }

  async #applyEffects(effects: Effects, keeperTurn: boolean): Promise<string[]> {
    const { state } = this;
    const lines: string[] = [];
    for (const { hunter, amount, reason } of effects.harm) {
      if (state.status !== "active") break;
      if (hunter.luck > 0 && (await this.#wantsLuckForHarm(hunter, amount, reason))) {
        spendLuck(state, hunter, `to shrug off ${amount} harm`);
        lines.push(`${hunter.name} spends Luck and shrugs off the harm (${hunter.luck} Luck left).`);
        continue;
      }
      lines.push(applyHarm(state, hunter, amount, reason));
      if (harmStatus(hunter.harm) === "out") {
        this.#flush(lines);
        this.deps.io.art(outOfActionArt(hunter.name));
      }
    }
    for (const { hunter, amount } of effects.heal) lines.push(heal(state, hunter, amount));
    // You can't hit what you haven't seen, so a hit also counts as the reveal.
    if ((effects.monsterRevealed || effects.monsterHarm > 0) && !state.monsterSeen) {
      state.monsterSeen = true;
      this.#flush(lines);
      this.deps.io.art(this.#art.monster);
    }
    if (effects.monsterHarm > 0) {
      lines.push(hurtMonster(state, effects.monsterHarm));
      if (!state.weaponHintShown) {
        state.weaponHintShown = true;
        lines.push(`Weapons can hurt ${state.mystery.monster.name} and drive it off, but never stop it for good. For that you need its weakness: follow the clues.`);
      }
    }
    const found = recordClues(state, effects.clues);
    if (found.length) lines.push(...found.map((c) => `Clue: ${c}`));
    if (effects.weaknessDiscovered && !state.weaknessKnown) {
      state.weaknessKnown = true;
      log(state, { kind: "system", text: "The hunters know how to stop it." });
      this.#flush(lines);
      this.deps.io.art(this.#art.weakness);
      lines.push("You know how to stop it now.");
    }
    if (effects.countdown && state.status === "active") {
      if (countdownAllowed(state, keeperTurn)) {
        lines.push(advanceCountdown(state));
        lines.push(`Clock ${countdownMeter(state.countdown, state.mystery.countdown)}`);
        if (state.countdown === COUNTDOWN_LENGTH - 1) {
          lines.push("One step left. If the clock moves again, the monster wins. Stop it now.");
        }
      }
      else this.#warn(["countdown advance ignored: pacing (once per round; final step only on the keeper's turn)"]);
    }
    if (effects.outcome === "won" && state.status === "active") {
      state.status = "won";
      log(state, { kind: "system", text: "The hunters stopped the monster." });
    }
    return lines;
  }

  /** Use up the first +1 waiting for this hunter, if any. */
  #takeForward(hunter: Hunter): { source: string } | undefined {
    const list = this.state.forward ?? [];
    const index = list.findIndex((f) => (f.others ? f.hunter !== hunter.id : f.hunter === hunter.id));
    if (index < 0) return undefined;
    return list.splice(index, 1)[0];
  }

  get #art() {
    return this.state.mystery.art ?? GENERIC_ART;
  }

  /** Show pending effect lines now, so art appears in the right place between them. */
  #flush(lines: string[]): void {
    for (const line of lines.splice(0)) this.deps.io.show("system", line);
  }

  // ---------- choices ----------

  /** The Keeper offered the acting hunter a choice; that same player answers before the turn passes. */
  async #handleChoice(hunter: Hunter, choice: Choice | null): Promise<void> {
    const { state, deps } = this;
    if (!choice || state.status !== "active" || harmStatus(hunter.harm) === "out") return;
    const index = hunter.controller.kind === "human"
      ? await deps.io.choose(`${hunter.name}: ${choice.prompt}`, choice.options)
      : this.#random(0, choice.options.length);
    const picked = choice.options[index]!;
    log(state, { kind: "hunter", who: hunter.name, text: `(chooses) ${picked}` });
    deps.io.show("hunter", `(chooses) ${picked}`, hunter.name);
    const reply = await withBusy(this.deps.io, "The Keeper narrates", () => deps.keeper.followUp(state, hunter, choice, picked));
    await this.#applyReply(reply);
  }

  async #wantsLuckForRoll(hunter: Hunter, band: "mixed" | "miss"): Promise<boolean> {
    if (hunter.controller.kind === "ai") return band === "miss" && hunter.luck >= 5;
    return this.deps.io.confirm(`${hunter.name}: spend 1 Luck to make this a 12? (${hunter.luck} left)`);
  }

  async #wantsLuckForHarm(hunter: Hunter, amount: number, reason: string): Promise<boolean> {
    if (hunter.controller.kind === "ai") return hunter.harm + amount > MAX_HARM;
    return this.deps.io.confirm(`${hunter.name} is about to take ${amount} harm${reason ? ` (${reason})` : ""}, going to ${hunter.harm + amount}/${MAX_HARM}. Spend 1 Luck to avoid it? (${hunter.luck} left)`);
  }

  async #pickQuestions(hunter: Hunter, pool: readonly string[], count: number): Promise<string[]> {
    const picked: string[] = [];
    const remaining = [...pool];
    for (let i = 0; i < count && remaining.length; i++) {
      const index = hunter.controller.kind === "human"
        ? await this.deps.io.choose(`${hunter.name}, ask a question (${i + 1} of ${count}):`, remaining)
        : this.#random(0, remaining.length);
      picked.push(...remaining.splice(index, 1));
    }
    return picked;
  }

  async #improve(hunter: Hunter): Promise<void> {
    const options = STATS.filter((s) => hunter.stats[s] < MAX_STAT);
    if (!options.length) return;
    let stat: Stat;
    if (hunter.controller.kind === "human") {
      const labels = options.map((s) => `${s} (${fmt(hunter.stats[s])} -> ${fmt(hunter.stats[s] + 1)})`);
      stat = options[await this.deps.io.choose(`${hunter.name} earned an improvement! Raise which stat?`, labels)]!;
    } else {
      stat = [...options].sort((a, b) => hunter.stats[b] - hunter.stats[a])[0]!;
    }
    this.deps.io.show("system", improveStat(this.state, hunter, stat));
  }

  // ---------- plumbing ----------

  #warn(warnings: string[]): void {
    if (this.deps.debug) for (const w of warnings) this.deps.io.show("error", `(debug) ${w}`);
  }
}

const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function partyLine(h: Hunter): string {
  const who = h.controller.kind === "human" ? h.controller.player : "AI";
  const status = harmStatus(h.harm);
  return `${h.name} (${playbook(h.playbook)?.name ?? h.playbook}, ${who}): harm ${h.harm}/${MAX_HARM}${status !== "okay" ? ` ${status.toUpperCase()}` : ""}, Luck ${h.luck}, XP ${h.xp}`;
}

export function sheet(h: Hunter): string {
  const book = playbook(h.playbook);
  const moves = (book?.moves ?? []).filter((m) => h.moves.includes(m.id));
  return [
    `${h.name}${h.pronouns ? ` (${h.pronouns})` : ""}, ${book?.name ?? h.playbook}`,
    STATS.map((s) => `${s} ${fmt(h.stats[s])}`).join("  "),
    `Harm ${h.harm}/${MAX_HARM} (${harmStatus(h.harm)})  Luck ${h.luck}  XP ${h.xp}/5`,
    ...moves.map((m) => `* ${m.name}: ${m.text}`),
    `Gear: ${h.gear.map((g) => `${g.name} (${g.harm}-harm, ${g.tags.join(", ")})`).join("; ")}`,
  ].join("\n");
}

