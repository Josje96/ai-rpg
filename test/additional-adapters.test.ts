import assert from "node:assert/strict";
import test from "node:test";
import { rollFateCheck } from "../src/rpg/fate-condensed.js";
import { rollBladesAction } from "../src/rpg/blades-in-the-dark.js";
import { resolvePathfinderCheck } from "../src/rpg/pathfinder2-remaster.js";
import { resolveCairnSave } from "../src/rpg/cairn-2e.js";
import { resolveBrpSkillCheck } from "../src/rpg/basic-roleplaying.js";

test("Fate Condensed rolls four Fate dice and classifies shifts", () => {
  const values = [1, 3, 5, 6];
  const result = rollFateCheck({ skill: 3, opposition: 2 }, () => values.shift() ?? 3);

  assert.deepEqual(result.fateDice, [-1, 0, 1, 1]);
  assert.equal(result.total, 4);
  assert.equal(result.shifts, 2);
  assert.equal(result.outcome, "success");
});

test("Fate ties and three-shift successes have distinct outcomes", () => {
  assert.equal(rollFateCheck({ skill: 2, opposition: 2 }, () => 3).outcome, "tie");
  assert.equal(rollFateCheck({ skill: 5, opposition: 2 }, () => 3).outcome, "success-with-style");
});

test("Blades action rolls use the highest die, including criticals", () => {
  const values = [2, 6, 6];
  const result = rollBladesAction(3, () => values.shift() ?? 1);
  assert.equal(result.outcome, "critical");
  assert.equal(result.highest, 6);
});

test("Blades zero-die rolls take the lowest of two dice", () => {
  const values = [3, 5];
  const result = rollBladesAction(0, () => values.shift() ?? 1);
  assert.equal(result.highest, 3);
  assert.equal(result.outcome, "failure");
  assert.equal(result.usedZeroDiceRule, true);
});

test("Pathfinder 2e classifies checks by DC margin and natural die step", () => {
  assert.equal(resolvePathfinderCheck({ die: 20, modifier: 0, dc: 35 }).degree, "failure");
  assert.equal(resolvePathfinderCheck({ die: 1, modifier: 0, dc: 10 }).degree, "critical-failure");
  assert.equal(resolvePathfinderCheck({ die: 10, modifier: 0, dc: 10 }).degree, "success");
  assert.equal(resolvePathfinderCheck({ die: 12, modifier: 0, dc: 2 }).degree, "critical-success");
});

test("Cairn saves are roll-under with automatic 1 success and 20 failure", () => {
  assert.equal(resolveCairnSave({ die: 14, attribute: 14 }), "success");
  assert.equal(resolveCairnSave({ die: 1, attribute: 1 }), "success");
  assert.equal(resolveCairnSave({ die: 20, attribute: 20 }), "failure");
});

test("Basic Roleplaying skill checks classify percentile results", () => {
  assert.equal(resolveBrpSkillCheck({ roll: 4, skill: 70 }), "critical-success");
  assert.equal(resolveBrpSkillCheck({ roll: 14, skill: 70 }), "special-success");
  assert.equal(resolveBrpSkillCheck({ roll: 70, skill: 70 }), "success");
  assert.equal(resolveBrpSkillCheck({ roll: 71, skill: 70 }), "failure");
  assert.equal(resolveBrpSkillCheck({ roll: 100, skill: 70 }), "fumble");
});
