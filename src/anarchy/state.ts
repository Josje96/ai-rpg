import { randomUUID } from "node:crypto";
import { loadSession, saveSession, savesDir } from "../session/saves.js";
import type { Controller, SessionBase } from "../session/types.js";
import { MAX_CONDITION, MAX_PLOT_POINTS, conditionStatus, type Stat } from "./rules.js";

export { savesDir };

export type Runner = {
  id: string;
  name: string;
  /** Street name flavor, e.g. "Decker for hire"; shown on the sheet. */
  archetype: string;
  pronouns?: string;
  controller: Controller;
  stats: Record<Stat, number>;
  /** Freeform skill tags; each gives +1 die when it applies, max 2 per roll. */
  skills: string[];
  gear: string[];
  /** Physical condition boxes left. */
  condition: number;
  plotPoints: number;
};

export type Job = {
  id: string;
  title: string;
  /** One line for the job menu. */
  pitch?: string;
  /** Read aloud when the team takes the job. */
  hook: string;
  /** GM-only: what's really going on. */
  truth: string;
  /** What "done" means for the team. */
  objective: string;
  /** Who's paying, and what they're like. */
  johnson: string;
  /** Where the run happens. */
  location: string;
  /** Security and opposition, GM-only detail. */
  opposition: string;
  /** The complication the GM is holding in reserve. */
  twist: string;
  /** Six escalating steps; the last one is the job collapsing. */
  clock: readonly string[];
};

export type RunState = SessionBase & {
  version: 1;
  system: "shadowrun-anarchy-2";
  id: string;
  createdAt: string;
  updatedAt: string;
  job: Job;
  runners: Runner[];
  /** How many clock steps have happened (0..6). */
  clock: number;
  /** Round in which the clock last advanced; it may advance at most once per round. */
  clockRound?: number;
  /** Whether the twist has come out yet. */
  twistRevealed?: boolean;
};

export function newRun(job: Job, runners: Runner[]): RunState {
  const now = new Date().toISOString();
  return {
    version: 1, system: "shadowrun-anarchy-2", id: randomUUID().slice(0, 8), createdAt: now, updatedAt: now,
    job, runners, clock: 0, log: [], summary: "", summarizedThrough: 0, round: 0, turn: 0, status: "active", costUsd: 0,
  };
}

export function runnerById(state: RunState, id: string): Runner | undefined {
  const key = id.trim().toLowerCase();
  return state.runners.find((r) => r.id === key || r.name.toLowerCase() === key || r.name.toLowerCase().split(" ")[0] === key);
}

export const activeRunners = (state: RunState) => state.runners.filter((r) => conditionStatus(r.condition) !== "out");

export function log(state: RunState, entry: RunState["log"][number]): void {
  state.log.push(entry);
}

// ---------- effects ----------

export function applyDamage(state: RunState, runner: Runner, amount: number, reason: string): string {
  runner.condition = Math.max(0, runner.condition - amount);
  const status = conditionStatus(runner.condition);
  const tail = status === "out" ? "and is OUT of the run" : status === "wounded" ? "and is wounded (-1 die)" : "";
  const line = `${runner.name} takes ${amount} damage${reason ? ` (${reason})` : ""}: ${runner.condition}/${MAX_CONDITION} boxes left${tail ? ", " + tail : ""}.`;
  log(state, { kind: "system", text: line });
  if (!activeRunners(state).length) {
    state.status = "lost";
    log(state, { kind: "system", text: "The whole team is down. The job goes to somebody else — or to the morgue." });
  }
  return line;
}

export function healDamage(state: RunState, runner: Runner, amount: number): string {
  runner.condition = Math.min(MAX_CONDITION, runner.condition + amount);
  const line = `${runner.name} patches up ${amount} damage: ${runner.condition}/${MAX_CONDITION} boxes left.`;
  log(state, { kind: "system", text: line });
  return line;
}

export function spendPlotPoint(state: RunState, runner: Runner, why: string): boolean {
  if (runner.plotPoints <= 0) return false;
  runner.plotPoints -= 1;
  log(state, { kind: "system", text: `${runner.name} spends a plot point ${why} (${runner.plotPoints} left).` });
  return true;
}

export function gainPlotPoint(state: RunState, runner: Runner, why: string): void {
  if (runner.plotPoints >= MAX_PLOT_POINTS) return;
  runner.plotPoints += 1;
  log(state, { kind: "system", text: `${runner.name} gains a plot point ${why} (${runner.plotPoints} total).` });
}

/**
 * Pacing rule enforced by the engine, not the model: at most one clock step every two rounds,
 * and the final step (the job collapsing) only on the GM's own turn.
 */
export const ROUNDS_PER_STEP = 2;

export function clockAllowed(state: RunState, gmTurn: boolean): boolean {
  if (state.clockRound !== undefined && state.round - state.clockRound < ROUNDS_PER_STEP) return false;
  if (state.clock + 1 >= state.job.clock.length && !gmTurn) return false;
  return true;
}

export function advanceClock(state: RunState): string {
  state.clockRound = state.round;
  state.clock = Math.min(state.job.clock.length, state.clock + 1);
  const step = state.job.clock[state.clock - 1] ?? "";
  const label = step.split(":")[0] ?? "";
  const line = `The heat rises: ${label}.`;
  log(state, { kind: "system", text: line });
  if (state.clock >= state.job.clock.length) {
    state.status = "lost";
    log(state, { kind: "system", text: "The job has collapsed. Johnson is gone, security is everywhere, and the team is burned." });
  }
  return line;
}

// ---------- saves ----------

export async function saveRun(state: RunState, dir = savesDir()): Promise<string> {
  return saveSession(state, dir);
}

export async function loadRun(id: string, dir = savesDir()): Promise<RunState> {
  return loadSession<RunState>(id, "shadowrun-anarchy-2", dir);
}
