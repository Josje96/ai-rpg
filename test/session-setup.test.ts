import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PARTY_SIZE, planSessionComposition } from "../src/session/party-planner.js";

const humans = [
  { id: "joe", displayName: "Joe" },
  { id: "julia", displayName: "Julia" },
];

test("AI GM keeps all humans as PCs and fills remaining slots with AI players", () => {
  const plan = planSessionComposition({ partySize: 4, humans, gmMode: "ai" });

  assert.equal(plan.gm.kind, "ai");
  assert.equal(plan.players.length, 4);
  assert.deepEqual(plan.players.map((player) => player.id), [
    "joe",
    "julia",
    "ai-player-1",
    "ai-player-2",
  ]);
});

test("human GM becomes the GM and the remaining seats become PCs", () => {
  const plan = planSessionComposition({ partySize: 3, humans, gmMode: "human" });

  assert.equal(plan.gm.id, "joe");
  assert.equal(plan.gm.role, "gm");
  assert.deepEqual(plan.players.map((player) => player.id), [
    "julia",
    "ai-player-1",
    "ai-player-2",
  ]);
});

test("random GM mode can assign a human GM and randomize which human gets it", () => {
  const draws = [0, 1];
  const plan = planSessionComposition(
    { partySize: 3, humans, gmMode: "random" },
    () => draws.shift() ?? 0,
  );

  assert.equal(plan.gm.id, "julia");
  assert.deepEqual(plan.players.map((player) => player.id), ["joe", "ai-player-1", "ai-player-2"]);
});

test("random mode chooses the only valid GM arrangement when humans fill every slot", () => {
  const manyHumans = Array.from({ length: MAX_PARTY_SIZE }, (_, index) => ({
    id: `h${index + 1}`,
    displayName: `Human ${index + 1}`,
  }));
  const plan = planSessionComposition(
    { partySize: MAX_PARTY_SIZE - 1, humans: manyHumans, gmMode: "random" },
    () => 1,
  );

  assert.equal(plan.gm.kind, "human");
  assert.equal(plan.players.length, MAX_PARTY_SIZE - 1);
});

test("rejects impossible party sizes, duplicate humans, and missing human GMs", () => {
  assert.throws(() => planSessionComposition({ partySize: 0, humans, gmMode: "ai" }), /between 1 and/);
  assert.throws(() => planSessionComposition({ partySize: MAX_PARTY_SIZE + 1, humans, gmMode: "ai" }), /between 1 and/);
  assert.throws(() => planSessionComposition({ partySize: 2, humans: [], gmMode: "human" }), /At least one human/);
  assert.throws(() => planSessionComposition({
    partySize: 1,
    humans: [{ id: "same", displayName: "One" }, { id: "same", displayName: "Two" }],
    gmMode: "ai",
  }), /unique/);
});
