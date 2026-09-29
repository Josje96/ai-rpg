import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import { rollAnarchyPool } from "../rpg/shadowrun-anarchy-2.js";
import type { RpgSystemAdapter } from "../rpg/adapter.js";

/**
 * Shadowrun-style cyberpunk runs, narrative-first (Anarchy flavor).
 * Mechanics only; all wording here is original. Don't paste published Shadowrun text
 * into this repo: Shadowrun is a Catalyst Game Labs property, not openly licensed.
 */
export const anarchyAdapter = {
  id: "shadowrun-anarchy-2",
  name: "Shadowrun: Anarchy 2.0",
  description: "Cyberpunk runs: d6 hit pools, condition tracks, plot points. Playable with an AI GM.",
  fit: ["cyberpunk heists", "runs and shadow ops", "magic-plus-tech urban fantasy"],
} satisfies RpgSystemAdapter;

export const STATS = ["muscle", "reflex", "wits", "style"] as const;
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;

/** Physical condition boxes; at 0 left the runner is out of the run. */
export const MAX_CONDITION = 10;
/** Wounded: taking hits at 3 or fewer boxes left costs -1 die. */
export const WOUNDED_AT = 3;
export const MAX_PLOT_POINTS = 5;
export const STARTING_PLOT_POINTS = 2;
export const MAX_STAT = 5;

/** Hits on 5+; the engine rolls, the GM never does. */
export const HIT_THRESHOLD = 5;

export type PoolRoll = {
  dice: number[];
  stat: Stat;
  statValue: number;
  /** Skill tags and plot-point dice already included in the pool. */
  skills: string[];
  bonusDice: number;
  pool: number;
  hits: number;
};

/**
 * Roll a d6 pool: stat + one die per applicable skill tag (max 2) + bonus dice from plot points,
 * minus penalty dice (wounded runners lose one). The pool never drops below 1.
 */
export function rollPool(
  input: { stat: Stat; statValue: number; skills?: readonly string[]; bonusDice?: number; penaltyDice?: number },
  random: RandomInt = randomInt,
): PoolRoll {
  if (!STATS.includes(input.stat)) throw new RangeError(`Unknown stat: ${String(input.stat)}`);
  if (!Number.isInteger(input.statValue) || input.statValue < 0 || input.statValue > MAX_STAT) {
    throw new RangeError(`Stat value must be an integer from 0 to ${MAX_STAT}.`);
  }
  const skills = (input.skills ?? []).slice(0, 2);
  const bonusDice = input.bonusDice ?? 0;
  if (!Number.isInteger(bonusDice) || bonusDice < 0 || bonusDice > 6) {
    throw new RangeError("Bonus dice must be an integer from 0 to 6.");
  }
  const penaltyDice = input.penaltyDice ?? 0;
  if (!Number.isInteger(penaltyDice) || penaltyDice < 0 || penaltyDice > 2) {
    throw new RangeError("Penalty dice must be an integer from 0 to 2.");
  }
  const pool = Math.max(1, input.statValue + skills.length + bonusDice - penaltyDice);
  const result = rollAnarchyPool({ dicePool: pool }, random);
  return {
    dice: result.dice,
    stat: input.stat,
    statValue: input.statValue,
    skills: [...skills],
    bonusDice,
    pool,
    hits: result.hits,
  };
}

/** 0 hits: things go wrong. 1-2: success at a cost. 3+: clean success. */
export type PoolBand = "failure" | "cost" | "clean";

export function bandFor(hits: number): PoolBand {
  if (hits <= 0) return "failure";
  return hits <= 2 ? "cost" : "clean";
}

export function describePool(roll: PoolRoll): string {
  const extra = [
    roll.skills.length ? `skills: ${roll.skills.join(", ")}` : "",
    roll.bonusDice ? `+${roll.bonusDice} plot dice` : "",
  ].filter(Boolean).join(", ");
  const parts = [`${roll.pool}d6 [${roll.dice.join(" ")}]`];
  if (extra) parts.push(`(${extra})`);
  parts.push(`= ${roll.hits} hit${roll.hits === 1 ? "" : "s"}`);
  return parts.join(" ");
}

export function conditionStatus(condition: number): "okay" | "wounded" | "out" {
  if (condition <= 0) return "out";
  return condition <= WOUNDED_AT ? "wounded" : "okay";
}

/** Spending a plot point on a roll adds 2 dice. */
export const PLOT_DICE = 2;
