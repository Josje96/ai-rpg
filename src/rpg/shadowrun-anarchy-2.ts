import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { RpgSystemAdapter } from "./adapter.js";

export const shadowrunAnarchy2Adapter = {
  id: "shadowrun-anarchy-2",
  name: "Shadowrun: Anarchy 2.0",
  description: "Narrative-first Shadowrun adapter; initial d6 hit-pool mechanics.",
} satisfies RpgSystemAdapter;

export type AnarchyPoolInput = {
  dicePool: number;
  advantage?: boolean;
  disadvantage?: boolean;
};

export type AnarchyPoolResult = {
  dicePool: number;
  dice: number[];
  hitThreshold: 4 | 5 | 6;
  hits: number;
};

const MAX_DICE_POOL = 100;

/** Resolve the published d6 hit pool, with advantage/disadvantage thresholds. */
export function rollAnarchyPool(
  input: AnarchyPoolInput,
  random: RandomInt = randomInt,
): AnarchyPoolResult {
  if (!Number.isInteger(input.dicePool) || input.dicePool < 0 || input.dicePool > MAX_DICE_POOL) {
    throw new RangeError(`Dice pool must be an integer between 0 and ${MAX_DICE_POOL}.`);
  }

  const advantageOnly = input.advantage === true && input.disadvantage !== true;
  const disadvantageOnly = input.disadvantage === true && input.advantage !== true;
  const hitThreshold: AnarchyPoolResult["hitThreshold"] = advantageOnly
    ? 4
    : disadvantageOnly
      ? 6
      : 5;
  const dice = Array.from({ length: input.dicePool }, () => random(1, 7));

  if (dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new RangeError("Random source returned a value outside the d6 range.");
  }

  return {
    dicePool: input.dicePool,
    dice,
    hitThreshold,
    hits: dice.filter((die) => die >= hitThreshold).length,
  };
}
