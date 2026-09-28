import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { RpgSystemAdapter } from "./adapter.js";

export const fateCondensedAdapter = {
  id: "fate-condensed",
  name: "Fate Condensed",
  description: "Genre-flexible narrative system using 4dF plus skill ratings.",
  fit: ["genre-flexible", "pulp adventure", "narrative-first play", "any setting"],
} satisfies RpgSystemAdapter;

export type FateOutcome = "failure" | "tie" | "success" | "success-with-style";

export type FateCheckResult = {
  fateDice: (-1 | 0 | 1)[];
  skill: number;
  bonus: number;
  total: number;
  opposition: number;
  shifts: number;
  outcome: FateOutcome;
};

export function rollFateCheck(
  input: { skill: number; opposition: number; bonus?: number },
  random: RandomInt = randomInt,
): FateCheckResult {
  const bonus = input.bonus ?? 0;
  if (!Number.isInteger(input.skill) || !Number.isInteger(input.opposition) || !Number.isInteger(bonus)) {
    throw new RangeError("Fate skill, opposition, and bonus must be integers.");
  }

  const fateDice = Array.from({ length: 4 }, () => {
    const die = random(1, 7);
    if (!Number.isInteger(die) || die < 1 || die > 6) {
      throw new RangeError("Random source returned a value outside the d6 range.");
    }
    return die <= 2 ? -1 : die <= 4 ? 0 : 1;
  });
  const total = input.skill + fateDice.reduce<number>((sum, die) => sum + die, 0) + bonus;
  const shifts = total - input.opposition;
  const outcome: FateOutcome = shifts < 0
    ? "failure"
    : shifts === 0
      ? "tie"
      : shifts < 3
        ? "success"
        : "success-with-style";

  return { fateDice, skill: input.skill, bonus, total, opposition: input.opposition, shifts, outcome };
}
