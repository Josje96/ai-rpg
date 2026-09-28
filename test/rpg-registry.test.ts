import assert from "node:assert/strict";
import test from "node:test";
import { isPlayable, type RpgSystemAdapter } from "../src/rpg/adapter.js";
import { createDefaultRpgRegistry, RpgSystemRegistry } from "../src/rpg/registry.js";

const sample = { id: "sample", name: "Sample", description: "Test system", fit: ["testing"] } satisfies RpgSystemAdapter;

test("registers and retrieves an RPG adapter", () => {
  const registry = new RpgSystemRegistry();

  registry.register(sample);

  assert.equal(registry.get("sample"), sample);
  assert.deepEqual(registry.list(), [sample]);
});

test("rejects duplicate system ids", () => {
  const registry = new RpgSystemRegistry();
  registry.register(sample);

  assert.throws(() => registry.register(sample), /already registered: sample/);
});

test("listPlayable returns only systems with a full session", () => {
  const registry = new RpgSystemRegistry();
  registry.register(sample);
  const playable = { ...sample, id: "playable", play: async () => 0 };
  registry.register(playable);

  assert.deepEqual(registry.listPlayable(), [playable]);
  assert.equal(isPlayable(sample), false);
});

test("the default registry exposes Monster Hunt as the first playable system", () => {
  const playable = createDefaultRpgRegistry().listPlayable();

  assert.deepEqual(playable.map((s) => s.id), ["monster-hunt"]);
  assert.ok(playable[0]!.fit.length > 0);
});
