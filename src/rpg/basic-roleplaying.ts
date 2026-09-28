import type { RpgSystemAdapter } from "./adapter.js";

export const basicRoleplayingAdapter = {
  id: "basic-roleplaying",
  name: "Basic Roleplaying",
  description: "Universal percentile skill-check engine.",
  fit: ["universal", "sandbox", "classic fantasy", "horror", "modern day"],
} satisfies RpgSystemAdapter;

export type BrpOutcome = "critical-success" | "special-success" | "success" | "failure" | "fumble";

export function resolveBrpSkillCheck(input: { roll: number; skill: number }): BrpOutcome {
  if (!Number.isInteger(input.roll) || input.roll < 1 || input.roll > 100) {
    throw new RangeError("BRP percentile roll must be an integer from 1 to 100.");
  }
  if (!Number.isInteger(input.skill) || input.skill < 0 || input.skill > 1_000) {
    throw new RangeError("BRP skill rating must be an integer from 0 to 1000.");
  }

  if (input.roll >= 99) return "fumble";
  if (input.skill > 0 && input.roll <= Math.ceil(input.skill / 20)) return "critical-success";
  if (input.skill > 0 && input.roll <= Math.ceil(input.skill / 5)) return "special-success";
  if (input.roll <= input.skill) return "success";
  return "failure";
}
