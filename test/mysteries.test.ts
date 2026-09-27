import assert from "node:assert/strict";
import test from "node:test";
import { Game } from "../src/motw/game.js";
import { Keeper } from "../src/motw/keeper.js";
import { parseMystery } from "../src/motw/mystery.js";
import { BUILT_IN_MYSTERIES } from "../src/motw/mysteries/index.js";
import { FATE_HORROR_TOOLKIT_CREDIT, LIMINAL_HORROR_CREDIT } from "../src/motw/mysteries/credits.js";
import { setupGame } from "../src/motw/setup.js";
import { FakeModel, ScriptIO, scriptedRandom } from "./helpers/fakes.js";

test("every built-in mystery passes the same validation as generated ones, unchanged", () => {
  const ids = new Set<string>();
  for (const m of BUILT_IN_MYSTERIES) {
    assert.ok(!ids.has(m.id), `duplicate id ${m.id}`);
    ids.add(m.id);
    const parsed = parseMystery(JSON.parse(JSON.stringify(m)), m.id);
    assert.ok("mystery" in parsed, `${m.id}: ${"errors" in parsed ? parsed.errors.join("; ") : ""}`);
    // validation clamps/truncates; nothing in a hand-written mystery should need it
    const { pitch, warnings, credits, art, ...rest } = m;
    assert.deepEqual(parsed.mystery, JSON.parse(JSON.stringify(rest)), `${m.id} was altered by validation`);
    assert.ok(pitch && warnings?.length, `${m.id} needs a pitch and warnings`);
    assert.equal(m.countdown.length, 6);
    assert.ok(m.clues.length >= 8, `${m.id} has ${m.clues.length} clues`);
    void credits;
    void art;
  }
});

test("mysteries built on Liminal Horror carry both attributions", () => {
  const credited = BUILT_IN_MYSTERIES.filter((m) => m.id !== "mercy-lake");
  assert.equal(credited.length, 5);
  for (const m of credited) {
    assert.ok(m.credits?.includes(LIMINAL_HORROR_CREDIT), m.id);
    assert.ok(m.credits?.includes(FATE_HORROR_TOOLKIT_CREDIT), m.id);
  }
  assert.match(LIMINAL_HORROR_CREDIT, /CC BY 4\.0/);
  assert.match(FATE_HORROR_TOOLKIT_CREDIT, /Creative Commons Attribution 3\.0/);
});

test("the menu shows pitches and warnings, and /credits shows attribution in game", async () => {
  const model = new FakeModel({ gm: [{ narration: "Dusk at the mall.", effects: {} }], player: [] });
  const keeper = new Keeper(model);
  const io = new ScriptIO(["2", "1", "Joe", "1", "Ada", "", "y", "0", "/credits", "/quit"]);
  const state = await setupGame(io, keeper, scriptedRandom([]));
  assert.equal(state.mystery.id, "mannequin-season");
  assert.match(io.prompts[0]!, /Mannequin Season: A dying mall.*\[body horror, skinning, people going missing\]/);
  assert.match(io.prompts[0]!, /Surprise me/);
  await new Game(state, { keeper, model, io, save: async () => {} }).run();
  assert.match(io.text("system"), /type \/credits/);
  assert.match(io.text("info"), /Goblin Archives LLC/);
});

test("AI-written mysteries get design guidance and credits", async () => {
  const generated = JSON.parse(JSON.stringify(BUILT_IN_MYSTERIES[1]));
  delete generated.credits;
  const model = new FakeModel({ gm: [generated], player: [] });
  const mystery = await new Keeper(model).generateMystery({ costUsd: 0 }, "a haunted lighthouse");
  assert.deepEqual(mystery.credits, [LIMINAL_HORROR_CREDIT, FATE_HORROR_TOOLKIT_CREDIT]);
  const system = model.calls[0]!.messages[0]!.content;
  assert.match(system, /staged reveal/);
  assert.match(system, /Nowhere to Hide/);
  assert.match(model.calls[0]!.messages[1]!.content, /haunted lighthouse/);
});

test("every mystery has all five pieces of phone-sized, plain-ASCII art", async () => {
  const { GENERIC_ART, outOfActionArt } = await import("../src/motw/mysteries/art.js");
  const sets = [...BUILT_IN_MYSTERIES.map((m) => [m.id, m.art] as const), ["generated", GENERIC_ART] as const];
  for (const [id, art] of sets) {
    assert.ok(art, `${id} has no art`);
    for (const key of ["title", "monster", "weakness", "won", "lost"] as const) {
      assert.ok(art[key].trim(), `${id}.${key} is empty`);
      for (const line of art[key].split("\n")) {
        assert.ok(line.length <= 40, `${id}.${key}: line too wide (${line.length}): ${line}`);
        assert.match(line, /^[\x20-\x7e]*$/, `${id}.${key}: non-ASCII character in: ${line}`);
      }
    }
  }
  for (const name of ["Al", "Marisol Quint", "Bartholomew Featherstonehaugh"]) {
    const card = outOfActionArt(name);
    assert.ok(card.split("\n").every((l) => l.length <= 40), name);
    assert.equal(new Set(card.split("\n").filter((l) => l.includes("|")).map((l) => l.lastIndexOf("|"))).size, 1, `${name}: tombstone edge is ragged`);
  }
});

test("title art comes right before the title when a hunt starts", async () => {
  const model = new FakeModel({ gm: [{ narration: "Lights.", effects: {} }], player: [] });
  const keeper = new Keeper(model);
  const io = new ScriptIO(["6", "1", "Joe", "1", "Ada", "", "y", "0", "/quit"]);
  await new Game(await setupGame(io, keeper, scriptedRandom([])), { keeper, model, io, save: async () => {} }).run();
  const first = io.shown.findIndex((x) => x.kind === "art");
  assert.match(io.shown[first]!.text, /PIKE COUNTY FAIR/);
  assert.equal(io.shown[first + 1]!.kind, "heading");
});
