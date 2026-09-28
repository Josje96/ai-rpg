import type { RpgSystemAdapter } from "./adapter.js";

export const pathfinder2RemasterAdapter = {
  id: "pathfinder2-remaster",
  name: "Pathfinder 2e Remaster",
  description: "d20 checks with four degrees of success and natural die adjustments.",
  fit: ["tactical fantasy", "structured encounters", "character-build-focused play"],
} satisfies RpgSystemAdapter;

export type PathfinderDegree = "critical-failure" | "failure" | "success" | "critical-success";

const degrees: PathfinderDegree[] = [
  "critical-failure",
  "failure",
  "success",
  "critical-success",
];

export function resolvePathfinderCheck(input: {
  die: number;
  modifier: number;
  dc: number;
}): { total: number; degree: PathfinderDegree } {
  if (!Number.isInteger(input.die) || input.die < 1 || input.die > 20) {
    throw new RangeError("Pathfinder check die must be an integer from 1 to 20.");
  }
  if (!Number.isInteger(input.modifier) || !Number.isInteger(input.dc)) {
    throw new RangeError("Pathfinder modifier and DC must be integers.");
  }

  const total = input.die + input.modifier;
  let degreeIndex = total >= input.dc + 10
    ? 3
    : total >= input.dc
      ? 2
      : total <= input.dc - 10
        ? 0
        : 1;

  if (input.die === 20) degreeIndex = Math.min(3, degreeIndex + 1);
  if (input.die === 1) degreeIndex = Math.max(0, degreeIndex - 1);

  return { total, degree: degrees[degreeIndex]! };
}
