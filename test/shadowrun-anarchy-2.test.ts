import assert from "node:assert/strict";
import test from "node:test";
import { rollAnarchyPool } from "../src/rpg/shadowrun-anarchy-2.js";

test("rolls a d6 pool and counts fives and sixes as hits", () => {
  const values = [1, 3, 5, 6];
  const result = rollAnarchyPool({ dicePool: 4 }, () => values.shift() ?? 1);

  assert.deepEqual(result, {
    dicePool: 4,
    dice: [1, 3, 5, 6],
    hitThreshold: 5,
    hits: 2,
  });
});

test("advantage counts fours as hits and disadvantage requires sixes", () => {
  const values = [4, 6, 4, 6];
  const next = () => values.shift() ?? 1;

  assert.equal(rollAnarchyPool({ dicePool: 2, advantage: true }, next).hits, 2);
  assert.equal(rollAnarchyPool({ dicePool: 2, disadvantage: true }, next).hits, 1);
});

test("advantage and disadvantage cancel", () => {
  const result = rollAnarchyPool({
    dicePool: 2,
    advantage: true,
    disadvantage: true,
  }, () => 4);

  assert.equal(result.hitThreshold, 5);
  assert.equal(result.hits, 0);
});

test("a zero-dice pool fails without rolling", () => {
  let randomCalls = 0;
  const result = rollAnarchyPool({ dicePool: 0 }, () => {
    randomCalls += 1;
    return 6;
  });

  assert.deepEqual(result.dice, []);
  assert.equal(result.hits, 0);
  assert.equal(randomCalls, 0);
});

test("rejects invalid pool sizes and invalid random die results", () => {
  assert.throws(() => rollAnarchyPool({ dicePool: -1 }), /between 0 and 100/);
  assert.throws(() => rollAnarchyPool({ dicePool: 1 }, () => 7), /outside the d6 range/);
});
