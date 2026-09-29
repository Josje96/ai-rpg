import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { COUNTDOWN_LENGTH, type Mystery } from "./mystery.js";
import type { Weapon } from "./playbooks.js";
import { MAX_HARM, MAX_LUCK, MAX_STAT, STATS, XP_PER_IMPROVEMENT, harmStatus, type Stat, type Stats } from "./rules.js";
import type { Controller, LogEntry, SessionBase } from "../session/types.js";

export type { Controller, LogEntry } from "../session/types.js";

export type Hunter = {
  id: string;
  name: string;
  playbook: string;
  /** e.g. "she/her"; given to the keeper so it doesn't guess from names. */
  pronouns?: string;
  controller: Controller;
  stats: Stats;
  moves: string[];
  gear: Weapon[];
  harm: number;
  luck: number;
  xp: number;
};

export type GameState = SessionBase & {
  version: 1;
  /** Which system adapter owns this save; older saves predate the field and default to monster-hunt. */
  system: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  mystery: Mystery;
  hunters: Hunter[];
  /** How many countdown steps have happened (0..6). */
  countdown: number;
  /** Round in which the countdown last advanced; it may advance at most once per round. */
  countdownRound?: number;
  monsterHarm: number;
  /** Whether the monster has been seen clearly yet (its reveal art shows once). */
  monsterSeen?: boolean;
  /** Whether players have been told weapons can only drive the monster off. */
  weaponHintShown?: boolean;
  weaknessKnown: boolean;
  cluesFound: string[];
  /**
   * +1s waiting for a future roll: from Help out (the next roll by someone else) or from acting on
   * Read a bad situation answers (the same hunter's next roll).
   */
  forward?: { hunter: string; others: boolean; source: string }[];
};

export function newGame(mystery: Mystery, hunters: Hunter[]): GameState {
  const now = new Date().toISOString();
  return {
    version: 1, system: "monster-hunt", id: randomUUID().slice(0, 8), createdAt: now, updatedAt: now, mystery, hunters,
    countdown: 0, monsterHarm: 0, weaknessKnown: false, cluesFound: [], log: [], summary: "",
    summarizedThrough: 0, round: 0, turn: 0, status: "active", costUsd: 0,
  };
}

export function hunterById(state: GameState, id: string): Hunter | undefined {
  const key = id.trim().toLowerCase();
  return state.hunters.find((h) => h.id === key || h.name.toLowerCase() === key || h.name.toLowerCase().split(" ")[0] === key);
}

export const activeHunters = (state: GameState) => state.hunters.filter((h) => harmStatus(h.harm) !== "out");

export function log(state: GameState, entry: LogEntry): void {
  state.log.push(entry);
}

// ---------- effects ----------

export function applyHarm(state: GameState, hunter: Hunter, amount: number, reason: string): string {
  hunter.harm = Math.min(MAX_HARM + 1, hunter.harm + amount);
  const status = harmStatus(hunter.harm);
  const tail = status === "out" ? "and is OUT of action" : status === "unstable" ? "and is unstable (it'll get worse untreated)" : "";
  const line = `${hunter.name} takes ${amount} harm${reason ? ` (${reason})` : ""}: now ${Math.min(hunter.harm, MAX_HARM + 1)}/${MAX_HARM}${tail ? ", " + tail : ""}.`;
  log(state, { kind: "system", text: line });
  if (!activeHunters(state).length) {
    state.status = "lost";
    log(state, { kind: "system", text: "Every hunter is down. The monster wins this week." });
  }
  return line;
}

export function heal(state: GameState, hunter: Hunter, amount: number): string {
  hunter.harm = Math.max(0, hunter.harm - amount);
  const line = `${hunter.name} recovers ${amount} harm: now ${hunter.harm}/${MAX_HARM}.`;
  log(state, { kind: "system", text: line });
  return line;
}

export function spendLuck(state: GameState, hunter: Hunter, why: string): boolean {
  if (hunter.luck <= 0) return false;
  hunter.luck -= 1;
  log(state, { kind: "system", text: `${hunter.name} spends Luck ${why} (${hunter.luck} left).` });
  return true;
}

/** Marks experience; returns true when the hunter has earned an improvement. */
export function markXp(state: GameState, hunter: Hunter): boolean {
  hunter.xp += 1;
  if (hunter.xp < XP_PER_IMPROVEMENT) return false;
  hunter.xp = 0;
  return true;
}

export function improveStat(state: GameState, hunter: Hunter, stat: Stat): string {
  if (!STATS.includes(stat) || hunter.stats[stat] >= MAX_STAT) throw new RangeError(`Can't raise ${stat}.`);
  hunter.stats[stat] += 1;
  const line = `${hunter.name} improves: ${stat} is now ${hunter.stats[stat] > 0 ? "+" : ""}${hunter.stats[stat]}.`;
  log(state, { kind: "system", text: line });
  return line;
}

export function hurtMonster(state: GameState, amount: number): string {
  const { monster } = state.mystery;
  const dealt = Math.max(0, amount - monster.armor);
  state.monsterHarm += dealt;
  if (state.monsterHarm >= monster.harmCapacity) {
    state.monsterHarm = 0;
    const line = `${monster.name} is driven off, but it can't be destroyed this way. It will be back.`;
    log(state, { kind: "system", text: line });
    return line;
  }
  const line = dealt ? `${monster.name} takes ${dealt} harm.` : `${monster.name} shrugs it off.`;
  log(state, { kind: "system", text: line });
  return line;
}

/**
 * Pacing rule enforced by the engine, not the model: at most one countdown step every two rounds, and the final
 * step (the monster winning) only on the keeper's own turn, never straight off one missed roll.
 */
/** Minimum rounds between countdown steps: six steps then take 11+ rounds, about an hour at the table. */
export const ROUNDS_PER_STEP = 2;

export function countdownAllowed(state: GameState, keeperTurn: boolean): boolean {
  if (state.countdownRound !== undefined && state.round - state.countdownRound < ROUNDS_PER_STEP) return false;
  if (state.countdown + 1 >= COUNTDOWN_LENGTH && !keeperTurn) return false;
  return true;
}

export function advanceCountdown(state: GameState): string {
  state.countdownRound = state.round;
  state.countdown = Math.min(COUNTDOWN_LENGTH, state.countdown + 1);
  const step = state.mystery.countdown[state.countdown - 1] ?? "";
  const label = step.split(":")[0] ?? "";
  const line = `The clock advances: ${label}.`;
  log(state, { kind: "system", text: line });
  if (state.countdown >= COUNTDOWN_LENGTH) {
    state.status = "lost";
    log(state, { kind: "system", text: "The countdown has run out. The monster's plan is complete." });
  }
  return line;
}

export function recordClues(state: GameState, clues: readonly string[]): string[] {
  const added = clues.filter((c) => !state.cluesFound.some((known) => known.toLowerCase() === c.toLowerCase()));
  state.cluesFound.push(...added);
  for (const clue of added) log(state, { kind: "system", text: `Clue noted: ${clue}` });
  return added;
}

// ---------- saves ----------

import { listSessionSaves, loadSession, saveSession, savesDir } from "../session/saves.js";
export { savesDir };

export async function saveGame(state: GameState, dir = savesDir()): Promise<string> {
  return saveSession(state, dir);
}

export async function loadGame(id: string, dir = savesDir()): Promise<GameState> {
  const state = await loadSession<GameState>(id, "monster-hunt", dir);
  if (state.version !== 1) throw new Error(`Unsupported save version ${String(state.version)}`);
  return state;
}

export type SaveSummary = { id: string; system: string; title: string; hunters: string; updatedAt: string; status: GameState["status"] };

export async function listSaves(dir = savesDir()): Promise<SaveSummary[]> {
  const out = await listSessionSaves(dir);
  return out.map((s) => ({ id: s.id, system: s.system, title: s.title, hunters: s.members, updatedAt: s.updatedAt, status: s.status as GameState["status"] }));
}

export const startingLuck = MAX_LUCK;
