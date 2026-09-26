import assert from "node:assert/strict";
import test from "node:test";
import { getModelConfig } from "../src/ai/model-config.js";

test("uses role-specific cost-conscious defaults", () => {
  assert.deepEqual(getModelConfig({}), {
    gm: "openai/gpt-6-luna",
    player: "qwen/qwen3.7-flash",
  });
});

test("allows the GM and player models to be overridden independently", () => {
  assert.deepEqual(getModelConfig({ GM_MODEL: "vendor/gm", MODEL: "vendor/shared" }), {
    gm: "vendor/gm",
    player: "vendor/shared",
  });
});
