import assert from "node:assert/strict";
import test from "node:test";
import { getScenario, listSettingModules } from "../src/settings/registry.js";

test("registers the SCP Foundation as a setting module", () => {
  const settings = listSettingModules();
  assert.deepEqual(settings.map((setting) => setting.id), ["scp-foundation"]);
});

test("exposes an original, system-neutral containment scenario", () => {
  const scenario = getScenario("scp-foundation", "quiet-annex-001");
  assert.ok(scenario);
  assert.equal(scenario.title, "Case 001: Quiet Annex");
  assert.ok(scenario.briefing.length > 0);
  assert.ok(scenario.objectives.length >= 2);
  assert.ok(scenario.procedures.length >= 2);
});

test("returns undefined for unknown settings and cases", () => {
  assert.equal(getScenario("unknown", "quiet-annex-001"), undefined);
  assert.equal(getScenario("scp-foundation", "missing"), undefined);
});
