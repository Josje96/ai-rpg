import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { RpgSystemAdapter } from "../rpg/adapter.js";

/**
 * Monster Hunt: action-horror monster hunting on the Powered by the Apocalypse engine.
 * Mechanics only; all wording here is original — this project uses the open PbtA framework,
 * not any published game's text, so don't paste a published book's playbook or move text in.
 */
export const monsterHuntAdapter = {
  id: "monster-hunt",
  name: "Monster Hunt (PbtA)",
  description: "Action-horror monster hunting: 2d6 + stat moves, harm, Luck. Playable with an AI keeper.",
  fit: ["monster hunting", "small-town horror", "investigation", "action horror", "modern day"],
} satisfies RpgSystemAdapter;

export const STATS = ["charm", "cool", "sharp", "tough", "weird"] as const;
export type Stat = (typeof STATS)[number];
export type Stats = Record<Stat, number>;

export const MAX_HARM = 7; // an 8th point of harm takes a hunter out
export const UNSTABLE_AT = 4;
export const MAX_LUCK = 7;
export const XP_PER_IMPROVEMENT = 5;
export const MAX_STAT = 3;

export type BasicMoveId =
  | "act-under-pressure"
  | "help-out"
  | "investigate"
  | "kick-some-ass"
  | "manipulate"
  | "protect"
  | "read-situation"
  | "use-magic";

export type BasicMove = {
  id: BasicMoveId;
  name: string;
  stat: Stat;
  trigger: string;
  strong: string;
  mixed: string;
  /** Questions a hunter may ask on a hit (investigate / read a situation). */
  questions?: readonly string[];
  /** Questions answered on a 10+ / 7-9. */
  holds?: { strong: number; mixed: number };
};

export const BASIC_MOVES: readonly BasicMove[] = [
  {
    id: "act-under-pressure",
    name: "Act under pressure",
    stat: "cool",
    trigger: "Doing something risky, fast, or while scared: running, dodging, keeping nerve.",
    strong: "You pull it off.",
    mixed: "You do it, but hesitate, falter, or pay a cost; the keeper offers a hard choice.",
  },
  {
    id: "help-out",
    name: "Help out",
    stat: "cool",
    trigger: "Stepping in to help another hunter with what they're doing.",
    strong: "Your help gives them +1 on their roll.",
    mixed: "You give them +1, but you're exposed to the same danger or cost.",
  },
  {
    id: "investigate",
    name: "Investigate a mystery",
    stat: "sharp",
    trigger: "Searching, researching, questioning, or examining evidence to learn about the monster.",
    strong: "Ask two questions from the list; the keeper answers truthfully.",
    mixed: "Ask one question.",
    holds: { strong: 2, mixed: 1 },
    questions: [
      "What happened here?",
      "What sort of creature is it?",
      "What can it do?",
      "What can hurt it?",
      "Where did it go?",
      "What was it going to do?",
      "What is being concealed here?",
    ],
  },
  {
    id: "kick-some-ass",
    name: "Kick some ass",
    stat: "tough",
    trigger: "Fighting something in earnest.",
    strong: "You trade harm with it, and pick an edge: extra harm, suffer less, or force it where you want.",
    mixed: "You trade harm with it.",
  },
  {
    id: "manipulate",
    name: "Manipulate someone",
    stat: "charm",
    trigger: "Getting a person (not a monster) to do something with a reason or leverage.",
    strong: "They do it if your reason is good enough.",
    mixed: "They'll do it, but want something first or it comes with a complication.",
  },
  {
    id: "protect",
    name: "Protect someone",
    stat: "tough",
    trigger: "Putting yourself between danger and someone else.",
    strong: "You protect them and suffer little; you may also get an edge on the threat.",
    mixed: "You protect them, but take some or all of the harm yourself.",
  },
  {
    id: "read-situation",
    name: "Read a bad situation",
    stat: "sharp",
    trigger: "Sizing up a tense or dangerous scene.",
    strong: "Ask three questions; acting on an answer gives you +1.",
    mixed: "Ask one question; acting on it gives you +1.",
    holds: { strong: 3, mixed: 1 },
    questions: [
      "What's my best way in?",
      "What's my best way out?",
      "Are there any dangers we haven't noticed?",
      "What's the biggest threat?",
      "What's most vulnerable to me?",
      "What's the best way to protect the victims?",
    ],
  },
  {
    id: "use-magic",
    name: "Use magic",
    stat: "weird",
    trigger: "Casting a spell, using a ritual, or reaching for the supernatural.",
    strong: "The magic works.",
    mixed: "It works, but with a glitch: weaker, shorter, needs something extra, or draws attention.",
  },
];

export function basicMove(id: string): BasicMove | undefined {
  return BASIC_MOVES.find((move) => move.id === id);
}

export type Band = "strong" | "mixed" | "miss";

export type MoveRoll = {
  dice: [number, number];
  stat: Stat;
  statValue: number;
  bonus: number;
  total: number;
  band: Band;
  luckUsed: boolean;
};

export function bandFor(total: number): Band {
  return total >= 10 ? "strong" : total >= 7 ? "mixed" : "miss";
}

export function rollMove(
  input: { stat: Stat; statValue: number; bonus?: number },
  random: RandomInt = randomInt,
): MoveRoll {
  if (!STATS.includes(input.stat)) throw new RangeError(`Unknown stat: ${String(input.stat)}`);
  const bonus = input.bonus ?? 0;
  if (!Number.isInteger(bonus) || Math.abs(bonus) > 3) throw new RangeError("Bonus must be an integer from -3 to 3.");
  const dice: [number, number] = [random(1, 7), random(1, 7)];
  if (dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new RangeError("Random source returned a value outside the d6 range.");
  }
  const total = dice[0] + dice[1] + input.statValue + bonus;
  return { dice, stat: input.stat, statValue: input.statValue, bonus, total, band: bandFor(total), luckUsed: false };
}

/** Spending Luck turns any roll into a flat 12. */
export function applyLuckToRoll(roll: MoveRoll): MoveRoll {
  return { ...roll, total: 12, band: "strong", luckUsed: true };
}

export function describeRoll(roll: MoveRoll): string {
  if (roll.luckUsed) return "Luck spent: counts as 12 (strong hit)";
  const mods = [roll.statValue, roll.bonus].filter((n) => n !== 0).map((n) => (n > 0 ? `+${n}` : `${n}`));
  const label = { strong: "strong hit", mixed: "mixed hit", miss: "miss" }[roll.band];
  return `2d6 [${roll.dice.join(", ")}]${mods.length ? " " + mods.join(" ") : ""} ${roll.stat} = ${roll.total} (${label})`;
}

export function harmStatus(harm: number): "okay" | "unstable" | "out" {
  return harm > MAX_HARM ? "out" : harm >= UNSTABLE_AT ? "unstable" : "okay";
}
