import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { matchSystem, playCommand } from "../src/rpg/play.js";
import { createDefaultRpgRegistry } from "../src/rpg/registry.js";
import { FakeModel, ScriptIO } from "./helpers/fakes.js";

const playable = createDefaultRpgRegistry().listPlayable();

test("the matcher routes a brief to the right system's id", async () => {
  const model = new FakeModel({ gm: [], player: [{ system: "monster-hunt" }] });
  const match = await matchSystem(model, "hunt a monster in a small town", playable);
  assert.equal(match?.id, "monster-hunt");

  const heistModel = new FakeModel({ gm: [], player: [{ system: "shadowrun-anarchy-2" }] });
  const heist = await matchSystem(heistModel, "a cyberpunk heist with a crew", playable);
  assert.equal(heist?.id, "shadowrun-anarchy-2");
});

test("the matcher refuses bad ids instead of guessing", async () => {
  for (const bad of [{ system: null }, { system: "dnd5e-2014" }, { system: "<junk>" }, "garbage", {}]) {
    const model = new FakeModel({ gm: [], player: [bad] });
    assert.equal(await matchSystem(model, "anything", playable), null);
  }
});

test("playCommand: no brief goes straight to the menu, Quit exits cleanly", async () => {
  process.env.TABLETOP_AI_SAVES = await mkdtemp(join(tmpdir(), "ttai-menu-")); // no real saves leaking in
  const model = new FakeModel({ gm: [], player: [] });
  const io = new ScriptIO(["", "2", "3"]); // no brief; Monster Hunt from the menu; Quit from its menu
  assert.equal(await playCommand(io, model), 0);
  assert.equal(model.calls.length, 0);
});

test("playCommand: a matched brief routes into the chosen system", async () => {
  process.env.TABLETOP_AI_SAVES = await mkdtemp(join(tmpdir(), "ttai-match-"));
  const model = new FakeModel({ gm: [], player: [{ system: "monster-hunt" }] });
  // brief; confirm the match; then the hunt menu (no saves): Start / How / Quit -> Quit
  const io = new ScriptIO(["hunt a monster in a small town", "y", "3"]);
  assert.equal(await playCommand(io, model), 0);
  assert.ok(io.text("info").includes("Monster Hunt"));
  assert.ok(io.text("heading").includes("Monster Hunt"));
});

test("playCommand: a rejected match falls back to the menu", async () => {
  process.env.TABLETOP_AI_SAVES = await mkdtemp(join(tmpdir(), "ttai-match-"));
  const model = new FakeModel({ gm: [], player: [{ system: "shadowrun-anarchy-2" }] });
  // brief; reject the match; Monster Hunt from the menu; Quit from its menu
  const io = new ScriptIO(["a cyberpunk heist", "n", "2", "3"]);
  assert.equal(await playCommand(io, model), 0);
  assert.ok(io.text("info").includes("pick from the menu") === false);
  assert.ok(io.shown.some((s) => s.text.includes("Sounds like") || s.text.includes("sounds like")));
});
