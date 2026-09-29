import type { ModelClient } from "../ai/provider.js";
import type { RandomInt } from "../domain/dice.js";
import type { GameIO } from "../rpg/adapter.js";
import type { SessionHooks } from "../session/loop.js";
import { withBusy } from "../session/retry.js";
import type { TurnInput } from "../session/types.js";
import { ARCHETYPES, statLine } from "./archetypes.js";
import { aiRunnerAction, type Choice, type Gm, type GmReply } from "./keeper.js";
import { CLOCK_LENGTH } from "./jobs.js";
import {
  MAX_CONDITION, MAX_PLOT_POINTS, PLOT_DICE, STATS, WOUNDED_AT, bandFor, conditionStatus, describePool, rollPool,
} from "./rules.js";
import {
  applyDamage, advanceClock, clockAllowed, gainPlotPoint, healDamage, log, runnerById, spendPlotPoint,
  saveRun, type RunState, type Runner,
} from "./state.js";

export const HELP = [
  "Type what your runner does or says, in plain words. Commands:",
  "  /sheet [name]  your sheet (or another runner's)",
  "  /crew          everyone's condition and plot points",
  "  /clock         how hot the job has gotten",
  "  /recap         the story so far",
  "  /ask <q>       out-of-character question to the GM",
  "  /rules         how checks work",
  "  /pass          skip your turn",
  "  /save, /quit   save (the game also autosaves every turn), or save and stop",
].join("\n");

export function sheet(r: Runner): string {
  const book = ARCHETYPES.find((b) => b.id === r.archetype);
  return [
    `${r.name}${r.pronouns ? ` (${r.pronouns})` : ""}, ${book?.name ?? r.archetype}`,
    statLine(r.stats),
    `Condition ${r.condition}/${MAX_CONDITION} (${conditionStatus(r.condition)})  Plot points ${r.plotPoints}/${MAX_PLOT_POINTS}`,
    `Skills: ${r.skills.join(", ")}`,
    `Gear: ${r.gear.join(", ")}`,
  ].join("\n");
}

export function crewLine(r: Runner): string {
  const who = r.controller.kind === "human" ? r.controller.player : "AI";
  const status = conditionStatus(r.condition);
  return `${r.name} (${ARCHETYPES.find((b) => b.id === r.archetype)?.name ?? r.archetype}, ${who}): condition ${r.condition}/${MAX_CONDITION}${status !== "okay" ? ` ${status.toUpperCase()}` : ""}, plot points ${r.plotPoints}`;
}

export type AnarchyDeps = {
  gm: Gm;
  model: ModelClient;
  io: GameIO;
  random: RandomInt;
  debug: boolean;
  /** Where autosaves go; defaults to the shared save directory. */
  save?: (state: RunState) => Promise<unknown>;
};

export function anarchyHooks(state: RunState, deps: AnarchyDeps): SessionHooks<RunState, Runner> {
  const { gm, model, io, random, debug } = deps;

  const warn = (warnings: string[]): void => {
    if (debug) for (const w of warnings) io.show("error", `(debug) ${w}`);
  };

  const applyEffects = async (reply: GmReply, gmTurn = false): Promise<void> => {
    warn(reply.warnings);
    io.show("keeper", reply.narration);
    log(state, { kind: "keeper", text: reply.narration });
    const lines: string[] = [];
    for (const { runner, amount, reason } of reply.effects.damage) {
      if (state.status !== "active") break;
      const wouldDrop = runner.condition - amount <= 0;
      const wantsOut = runner.controller.kind === "ai" ? wouldDrop && runner.plotPoints > 0
        : runner.plotPoints > 0 && await io.confirm(
            `${runner.name} is about to take ${amount} damage${reason ? ` (${reason})` : ""}. Spend a plot point to shrug it off? (${runner.plotPoints} left)`);
      if (wantsOut) {
        spendPlotPoint(state, runner, "to shrug off the damage");
        continue;
      }
      lines.push(applyDamage(state, runner, amount, reason));
      if (conditionStatus(runner.condition) === "out") io.show("system", `${runner.name} is out of the run.`);
    }
    for (const { runner, amount } of reply.effects.heal) lines.push(healDamage(state, runner, amount));
    if (reply.effects.twistRevealed && !state.twistRevealed) {
      state.twistRevealed = true;
      log(state, { kind: "system", text: "The twist is out." });
      lines.push("Now you know what this job really is.");
    }
    if (reply.effects.clock && state.status === "active") {
      if (clockAllowed(state, gmTurn)) {
        lines.push(advanceClock(state));
        if (CLOCK_LENGTH - state.clock === 1) lines.push("One step left. If the heat rises again, the job collapses. Move now.");
      } else warn(["clock advance ignored: pacing (once per round; final step only on the GM's turn)"]);
    }
    if (reply.effects.outcome === "won" && state.status === "active") {
      state.status = "won";
      log(state, { kind: "system", text: "The team completed the run." });
    }
    for (const line of lines) io.show("system", line);
  };

  const handleChoice = async (runner: Runner, choice: Choice | null): Promise<void> => {
    if (!choice || state.status !== "active" || conditionStatus(runner.condition) === "out") return;
    const index = runner.controller.kind === "human"
      ? await io.choose(`${runner.name}: ${choice.prompt}`, choice.options)
      : random(0, choice.options.length);
    const picked = choice.options[index]!;
    log(state, { kind: "hunter", who: runner.name, text: `(chooses) ${picked}` });
    io.show("hunter", `(chooses) ${picked}`, runner.name);
    const reply = await withBusy(io, "The GM narrates", () => gm.followUp(state, runner, choice, picked));
    await applyEffects(reply);
  };

  // ---------- turns ----------

  const humanTurn = async (runner: Runner): Promise<TurnInput> => {
    const player = runner.controller.kind === "human" ? runner.controller.player : "";
    for (;;) {
      const line = (await io.ask(`${player}, ${runner.name} (condition ${runner.condition}, plot points ${runner.plotPoints}): what do you do?`)).trim();
      if (!line) continue;
      if (!line.startsWith("/")) return { kind: "action", text: line.slice(0, 600) };
      const [command, ...rest] = line.slice(1).split(/\s+/);
      const arg = rest.join(" ");
      switch ((command ?? "").toLowerCase()) {
        case "quit": case "exit": return { kind: "quit" };
        case "pass": return { kind: "pass" };
        case "help": io.show("info", HELP); break;
        case "sheet": io.show("info", sheet(arg ? runnerById(state, arg) ?? runner : runner)); break;
        case "crew": io.show("info", state.runners.map(crewLine).join("\n")); break;
        case "clock": {
          const meter = state.job.clock.map((_, i) => (i < state.clock ? "#" : "-")).join("");
          io.show("info", `[${meter}] Heat step ${state.clock}/${CLOCK_LENGTH}: ${state.job.clock[state.clock] ?? "(final)"}`);
          break;
        }
        case "recap": io.show("info", state.summary || "Nothing to recap yet; it's all in the recent scroll."); break;
        case "rules": io.show("info", `Checks: d6 pool = stat + skill tags (max 2). 5+ is a hit. 3+ hits clean, 1-2 success at a cost, 0 a miss. Wounded at ${WOUNDED_AT} boxes or fewer: -1 die. Plot points (${runner.plotPoints} now): +${PLOT_DICE} dice on a roll, or shrug off damage.`); break;
        case "save": await saveRun(state); io.show("info", "Saved."); break;
        case "ask":
          if (!arg) { io.show("info", "Usage: /ask <question>"); break; }
          io.show("keeper", await withBusy(io, "The GM thinks", () => gm.answer(state, player, arg)));
          break;
        default: io.show("info", `Unknown command /${command}. Type /help.`);
      }
    }
  };

  const aiTurn = async (runner: Runner): Promise<TurnInput> => {
    const result = await withBusy(io, `${runner.name} is thinking`, () => aiRunnerAction(model, state, runner));
    state.costUsd += result.costUsd;
    const text = result.say ? `"${result.say}" ${result.act}` : result.act;
    return { kind: "action", text };
  };

  // ---------- resolving ----------

  const wantsPlotDice = async (runner: Runner): Promise<boolean> => {
    if (runner.controller.kind === "ai") return false;
    return io.confirm(`${runner.name}: spend a plot point for +${PLOT_DICE} dice? (${runner.plotPoints} left)`);
  };

  const resolveAction = async (runner: Runner, text: string): Promise<void> => {
    log(state, { kind: "hunter", who: runner.name, text });
    io.show("hunter", text, runner.name);

    const adj = await withBusy(io, "The GM considers", () => gm.adjudicate(state, runner, text));
    warn(adj.warnings);
    if (!adj.roll) {
      await applyEffects(adj);
      await handleChoice(runner, adj.choice);
      return;
    }
    if (adj.narration) {
      io.show("keeper", adj.narration);
      log(state, { kind: "keeper", text: adj.narration });
    }

    let plotBonus = 0;
    if (runner.plotPoints > 0 && (await wantsPlotDice(runner))) {
      spendPlotPoint(state, runner, `for +${PLOT_DICE} dice`);
      plotBonus = PLOT_DICE;
    }
    const wounded = conditionStatus(runner.condition) === "wounded" ? 1 : 0;
    if (wounded) io.show("system", `${runner.name} is wounded: -1 die.`);
    const roll = rollPool(
      { stat: adj.roll.stat, statValue: runner.stats[adj.roll.stat] ?? 0, skills: adj.roll.skills, bonusDice: plotBonus, penaltyDice: wounded },
      random,
    );
    io.show("roll", describePool(roll), runner.name);
    log(state, { kind: "roll", who: runner.name, text: describePool(roll) });

    // A miss earns a plot point: the best stories come from things going wrong.
    if (bandFor(roll.hits) === "failure") {
      io.show("system", `${runner.name} gains a plot point for the trouble.`);
      gainPlotPoint(state, runner, "for the trouble");
    }

    const reply = await withBusy(io, "The GM narrates", () => gm.resolve(state, runner, text, roll));
    await applyEffects(reply);
    await handleChoice(runner, reply.choice);
  };

  return {
    members: (s) => s.runners,
    active: (_s, runner) => conditionStatus(runner.condition) !== "out",
    open: async (s, ctx, resuming) => {
      if (!resuming) {
        ctx.io.show("heading", s.job.title);
        ctx.io.show("info", s.job.hook);
        const reply = await withBusy(ctx.io, "The GM sets the scene", () => gm.openScene(s));
        await applyEffects(reply);
      } else {
        ctx.io.show("heading", `${s.job.title}, round ${s.round}`);
        ctx.io.show("info", s.summary || "(Resuming.)");
        const last = [...s.log].reverse().find((e) => e.kind === "keeper");
        if (last) ctx.io.show("keeper", last.text);
      }
    },
    turn: async (_s, runner) => (runner.controller.kind === "human" ? humanTurn(runner) : aiTurn(runner)),
    resolve: async (_s, runner, text) => resolveAction(runner, text),
    betweenRounds: async (s, ctx) => {
      const reply = await withBusy(ctx.io, "The GM moves", () => gm.gmTurn(s));
      await applyEffects(reply, true);
    },
    finish: async (s, ctx) => {
      ctx.io.show("heading", s.status === "won" ? "The run is done." : "The job collapses.");
      ctx.io.show("info", `Heat step ${s.clock}/${s.job.clock.length}. Model cost this run: $${s.costUsd.toFixed(3)}.`);
    },
    save: (s) => (deps.save ? deps.save(s) : saveRun(s)),
    summarize: (s, entries) => gm.summarize(s, entries),
  };
}
