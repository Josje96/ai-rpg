import type { RpgSystemAdapter } from "./adapter.js";

export const cairn2Adapter = {
  id: "cairn-2e",
  name: "Cairn 2e",
  description: "Rules-light adventure with roll-under attribute saves.",
} satisfies RpgSystemAdapter;

export type CairnSaveResult = "success" | "failure";

export function resolveCairnSave(input: { die: number; attribute: number }): CairnSaveResult {
  if (!Number.isInteger(input.die) || input.die < 1 || input.die > 20) {
    throw new RangeError("Cairn save die must be an integer from 1 to 20.");
  }
  if (!Number.isInteger(input.attribute) || input.attribute < 0 || input.attribute > 20) {
    throw new RangeError("Cairn attribute must be an integer from 0 to 20.");
  }
  if (input.die === 1) return "success";
  if (input.die === 20) return "failure";
  return input.die <= input.attribute ? "success" : "failure";
}
