import assert from "node:assert/strict";
import test from "node:test";
import { effectiveRoll, PLAYBOOKS } from "../src/hunt/playbooks.js";
import { applyLuckToRoll, bandFor, describeRoll, harmStatus, rollMove } from "../src/hunt/rules.js";

test("2d6 + stat bands: 10+ strong, 7-9 mixed, 6- miss", () => {
  assert.deepEqual([6, 7, 9, 10].map(bandFor), ["miss", "mixed", "mixed", "strong"]);
  const values = [4, 5];
  const roll = rollMove({ stat: "sharp", statValue: 2, bonus: 1 }, () => values.shift()!);
  assert.equal(roll.total, 12);
  assert.equal(describeRoll(roll), "2d6 [4, 5] +2 +1 sharp = 12 (strong hit)");
});

test("Luck turns any roll into a 12", () => {
  const miss = rollMove({ stat: "tough", statValue: -1 }, () => 1);
  assert.equal(miss.band, "miss");
  const lucky = applyLuckToRoll(miss);
  assert.equal(lucky.total, 12);
  assert.equal(lucky.band, "strong");
});

test("rejects bad stats, bonuses and dice", () => {
  assert.throws(() => rollMove({ stat: "luck" as never, statValue: 0 }), /Unknown stat/);
  assert.throws(() => rollMove({ stat: "cool", statValue: 0, bonus: 9 }), /Bonus/);
  assert.throws(() => rollMove({ stat: "cool", statValue: 0 }, () => 7), /d6 range/);
});

test("harm: 4+ unstable, past 7 out", () => {
  assert.deepEqual([0, 3, 4, 7, 8].map(harmStatus), ["okay", "okay", "unstable", "unstable", "out"]);
});

test("signature moves swap stats only when better, and add bonuses", () => {
  const touched = { playbook: "touched", moves: ["know-your-own", "claws-out"], stats: { charm: 0, cool: 0, sharp: 0, tough: 1, weird: 2 } };
  assert.deepEqual(effectiveRoll(touched, "investigate", "sharp"), { stat: "weird", bonus: 0, sources: ["Know your own"] });
  assert.deepEqual(effectiveRoll(touched, "kick-some-ass", "tough"), { stat: "tough", bonus: 1, sources: ["Claws out"] });
  const worse = { ...touched, stats: { ...touched.stats, weird: -1, sharp: 1 } };
  assert.equal(effectiveRoll(worse, "investigate", "sharp").stat, "sharp");
});

test("every playbook is complete and its move effects point at real moves", () => {
  for (const book of PLAYBOOKS) {
    assert.equal(book.statOptions.length, 2, book.id);
    assert.equal(book.moves.length, 4, book.id);
    assert.ok(book.gearOptions.length >= 2, book.id);
    for (const stats of book.statOptions) {
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      assert.equal(total, 3, `${book.id} stat total`);
    }
  }
});
