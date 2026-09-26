import { randomInt } from "node:crypto";

export type DiceExpression = {
  count: number;
  sides: number;
  modifier: number;
};

export type DiceResult = {
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
};

export type RandomInt = (min: number, maxExclusive: number) => number;

const MAX_DICE = 100;
const MAX_SIDES = 1_000;
const MAX_ABS_MODIFIER = 1_000_000;

export function parseDiceNotation(notation: string): DiceExpression {
  const match = /^(\d*)d(\d+)([+-]\d+)?$/i.exec(notation);
  if (!match) {
    throw new Error("Invalid dice notation. Try 2d6+3.");
  }

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_DICE) {
    throw new Error(`Dice count must be between 1 and at most ${MAX_DICE} dice.`);
  }
  if (!Number.isSafeInteger(sides) || sides < 1 || sides > MAX_SIDES) {
    throw new Error(`Die sides must be between 1 and ${MAX_SIDES}.`);
  }
  if (!Number.isSafeInteger(modifier) || Math.abs(modifier) > MAX_ABS_MODIFIER) {
    throw new Error(`Modifier must be between -${MAX_ABS_MODIFIER} and ${MAX_ABS_MODIFIER}.`);
  }

  return { count, sides, modifier };
}

export function rollDice(notation: string, random: RandomInt = randomInt): DiceResult {
  const expression = parseDiceNotation(notation);
  const rolls = Array.from({ length: expression.count }, () =>
    random(1, expression.sides + 1),
  );

  if (rolls.some((roll) => !Number.isInteger(roll) || roll < 1 || roll > expression.sides)) {
    throw new Error("Random source returned a value outside the die range.");
  }

  return {
    notation,
    rolls,
    modifier: expression.modifier,
    total: rolls.reduce((sum, roll) => sum + roll, expression.modifier),
  };
}
