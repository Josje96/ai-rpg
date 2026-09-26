import assert from "node:assert/strict";
import test from "node:test";
import { RpgSystemRegistry } from "../src/rpg/registry.js";

test("registers and retrieves an RPG adapter", () => {
  const registry = new RpgSystemRegistry();
  const adapter = { id: "sample", name: "Sample", description: "Test system" };

  registry.register(adapter);

  assert.equal(registry.get("sample"), adapter);
  assert.deepEqual(registry.list(), [adapter]);
});

test("rejects duplicate system ids", () => {
  const registry = new RpgSystemRegistry();
  const adapter = { id: "sample", name: "Sample", description: "Test system" };
  registry.register(adapter);

  assert.throws(() => registry.register(adapter), /already registered: sample/);
});
