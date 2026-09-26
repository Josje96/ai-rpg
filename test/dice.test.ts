import assert from "node:assert/strict";
import test from "node:test";
import { parseDiceNotation, rollDice } from "../src/domain/dice.js";

test("parses a dice expression with a positive modifier", () => {
  assert.deepEqual(parseDiceNotation("2d6+3"), {
    count: 2,
    sides: 6,
    modifier: 3,
  });
});

test("defaults an omitted dice count to one", () => {
  assert.deepEqual(parseDiceNotation("d20"), {
    count: 1,
    sides: 20,
    modifier: 0,
  });
});

test("rejects malformed notation and unreasonable dice counts", () => {
  assert.throws(() => parseDiceNotation("2d6+"), /Invalid dice notation/);
  assert.throws(() => parseDiceNotation("101d6"), /at most 100 dice/);
});

test("rolls through the injected random source and applies the modifier", () => {
  const values = [1, 6];
  const result = rollDice("2d6+3", (_min, _maxExclusive) => values.shift() ?? 0);

  assert.deepEqual(result, {
    notation: "2d6+3",
    rolls: [1, 6],
    modifier: 3,
    total: 10,
  });
});
