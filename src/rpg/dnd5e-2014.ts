import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";
import type { RpgSystemAdapter } from "./adapter.js";

export const dnd5e2014Adapter = {
  id: "dnd5e-2014",
  name: "D&D 5e (2014)",
  description: "2014 core ability checks and skill rules (SRD 5.1-compatible).",
  fit: ["dungeon crawls", "high fantasy", "combat-heavy adventure"],
} satisfies RpgSystemAdapter;

export const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

export type Ability = (typeof ABILITIES)[number];

export const SKILL_ABILITIES = {
  acrobatics: "dexterity",
  animalHandling: "wisdom",
  arcana: "intelligence",
  athletics: "strength",
  deception: "charisma",
  history: "intelligence",
  insight: "wisdom",
  intimidation: "charisma",
  investigation: "intelligence",
  medicine: "wisdom",
  nature: "intelligence",
  perception: "wisdom",
  performance: "charisma",
  persuasion: "charisma",
  religion: "intelligence",
  sleightOfHand: "dexterity",
  stealth: "dexterity",
  survival: "wisdom",
} as const satisfies Record<string, Ability>;

export type Skill = keyof typeof SKILL_ABILITIES;

export type AbilityCheckInput = {
  ability: Ability;
  abilityScore: number;
  level: number;
  dc: number;
  proficient?: boolean;
  expertise?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
  bonus?: number;
};

export type SkillCheckInput = Omit<AbilityCheckInput, "ability"> & {
  skill: Skill;
};

export type AbilityCheckResult = {
  ability: Ability;
  rawD20s: number[];
  keptD20: number;
  abilityModifier: number;
  proficiencyBonus: number;
  appliedProficiency: number;
  bonus: number;
  total: number;
  dc: number;
  success: boolean;
};

export function abilityModifier(score: number): number {
  if (!Number.isInteger(score) || score < 1 || score > 30) {
    throw new RangeError("Ability score must be an integer between 1 and 30.");
  }
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonusForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1 || level > 20) {
    throw new RangeError("Character level must be an integer between 1 and 20.");
  }
  return 2 + Math.floor((level - 1) / 4);
}

export function skillAbility(skill: string): Ability {
  if (!Object.hasOwn(SKILL_ABILITIES, skill)) {
    throw new RangeError(`Unknown D&D 5e 2014 skill: ${skill}`);
  }
  return SKILL_ABILITIES[skill as Skill];
}

export function resolveAbilityCheck(
  input: AbilityCheckInput,
  random: RandomInt = randomInt,
): AbilityCheckResult {
  if (!ABILITIES.includes(input.ability)) {
    throw new RangeError(`Unknown ability: ${String(input.ability)}`);
  }
  if (!Number.isInteger(input.dc) || input.dc < 1) {
    throw new RangeError("DC must be a positive integer.");
  }
  const bonus = input.bonus ?? 0;
  if (!Number.isSafeInteger(bonus)) {
    throw new RangeError("Check bonus must be an integer.");
  }
  if (input.expertise && !input.proficient) {
    throw new RangeError("Expertise requires proficiency.");
  }

  const abilityMod = abilityModifier(input.abilityScore);
  const proficiencyBonus = proficiencyBonusForLevel(input.level);
  const appliedProficiency = input.proficient
    ? proficiencyBonus * (input.expertise ? 2 : 1)
    : 0;

  const hasAdvantage = input.advantage === true && input.disadvantage !== true;
  const hasDisadvantage = input.disadvantage === true && input.advantage !== true;
  const rollCount = hasAdvantage || hasDisadvantage ? 2 : 1;
  const rawD20s = Array.from({ length: rollCount }, () => random(1, 21));
  if (rawD20s.some((roll) => !Number.isInteger(roll) || roll < 1 || roll > 20)) {
    throw new RangeError("Random source returned a value outside the d20 range.");
  }

  const keptD20 = hasAdvantage
    ? Math.max(...rawD20s)
    : hasDisadvantage
      ? Math.min(...rawD20s)
      : rawD20s[0]!;
  const total = keptD20 + abilityMod + appliedProficiency + bonus;

  return {
    ability: input.ability,
    rawD20s,
    keptD20,
    abilityModifier: abilityMod,
    proficiencyBonus,
    appliedProficiency,
    bonus,
    total,
    dc: input.dc,
    success: total >= input.dc,
  };
}

export function resolveSkillCheck(
  input: SkillCheckInput,
  random: RandomInt = randomInt,
): AbilityCheckResult {
  return resolveAbilityCheck(
    { ...input, ability: skillAbility(input.skill) },
    random,
  );
}
