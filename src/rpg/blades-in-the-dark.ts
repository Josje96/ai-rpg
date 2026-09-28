import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { RpgSystemAdapter } from "./adapter.js";

export const bladesInTheDarkAdapter = {
  id: "blades-in-the-dark",
  name: "Blades in the Dark",
  description: "Crew-based heists with action, downtime, and consequence-driven rolls.",
  fit: ["heists", "criminal crews", "industrial fantasy", "score-and-downtime play"],
} satisfies RpgSystemAdapter;

export type BladesOutcome = "failure" | "partial" | "success" | "critical";

export type BladesRollResult = {
  dicePool: number;
  dice: number[];
  highest: number;
  outcome: BladesOutcome;
  usedZeroDiceRule: boolean;
};

export function rollBladesAction(dicePool: number, random: RandomInt = randomInt): BladesRollResult {
  if (!Number.isInteger(dicePool) || dicePool > 100) {
    throw new RangeError("Blades dice pool must be an integer no greater than 100.");
  }

  const usedZeroDiceRule = dicePool <= 0;
  const count = usedZeroDiceRule ? 2 : dicePool;
  const dice = Array.from({ length: count }, () => random(1, 7));
  if (dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new RangeError("Random source returned a value outside the d6 range.");
  }
  const highest = usedZeroDiceRule ? Math.min(...dice) : Math.max(...dice);
  const sixes = dice.filter((die) => die === 6).length;
  const outcome: BladesOutcome = !usedZeroDiceRule && sixes >= 2
    ? "critical"
    : highest === 6
      ? "success"
      : highest >= 4
        ? "partial"
        : "failure";

  return { dicePool, dice, highest, outcome, usedZeroDiceRule };
}
