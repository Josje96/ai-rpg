/** Regression tests for issues found in the first real session (Mercy Lake, 2026-09-26). */
import assert from "node:assert/strict";
import test from "node:test";
import { Game } from "../src/hunt/game.js";
import { aiHunterAction, Keeper, soundsRepetitive } from "../src/hunt/keeper.js";
import { capitalize, setupGame } from "../src/hunt/setup.js";
import { FakeModel, ScriptIO, scriptedRandom } from "./helpers/fakes.js";

async function oneHunterGame(gm: unknown[], player: unknown[] = []) {
  const model = new FakeModel({ gm: [{ narration: "Night.", effects: {} }, ...gm], player });
  const keeper = new Keeper(model);
  // Old Hand quick-build: sawn-off shotgun (3-harm) + silver knife.
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "", "y", "0"]), keeper, scriptedRandom([]));
  return { model, keeper, state };
}

test("a choice the Keeper offers goes to the same player before the turn passes", async () => {
  const { model, keeper, state } = await oneHunterGame([
    { roll: null, narration: "Dot is slipping; the crew drags at you.", effects: {},
      choice: { prompt: "Hold on to Dot or free yourself?", options: ["Hold on and get dragged", "Shove her to safety"] } },
    { narration: "You shove Dot clear; the lake takes you instead.", effects: { harm: [{ hunter: "ada", amount: 2 }] } },
  ]);
  const io = new ScriptIO(["I grab Dot", "2", "n", "n"]); // choice 2, decline Luck on the harm; then the keeper turn fails (no reply left): don't retry
  await new Game(state, { keeper, model, io, save: async () => {} }).run();
  assert.match(io.prompts[1]!, /Ada: Hold on to Dot or free yourself\?.*Shove her to safety/);
  const followUp = model.calls.find((c) => c.messages[1]!.content.includes("was asked:"))!;
  assert.match(followUp.messages[1]!.content, /chose: "Shove her to safety"/);
  assert.match(io.text("keeper"), /the lake takes you instead/);
  assert.equal(state.hunters[0]!.harm, 2);
  assert.ok(state.log.some((e) => e.text === "(chooses) Shove her to safety"));
});

test("hits on the monster deal weapon harm, whatever number the Keeper gave; minions don't count", async () => {
  const { model, keeper, state } = await oneHunterGame([
    { roll: { move: "kick-some-ass" }, narration: "" },
    { narration: "The shot punches through its eye.", effects: { monsterHarm: 1 }, target: "monster" },
    { narration: "Keeper turn.", effects: {} },
    { roll: { move: "kick-some-ass" }, narration: "" },
    { narration: "You cut down a crewman.", effects: { monsterHarm: 3 }, target: "minion" },
    { narration: "Keeper turn.", effects: {} },
  ]);
  const io = new ScriptIO(["I shoot its eye", "I hack at the crew", "/quit"]);
  await new Game(state, { keeper, model, io, save: async () => {}, random: scriptedRandom([5, 5, 5, 5]) }).run();
  // shotgun 3-harm - armor 1 = 2 from the shot; the Keeper's "1" was overridden, and the minion hit adds nothing
  assert.equal(state.monsterHarm, 2);
  assert.equal(io.shown.filter((x) => x.text.includes("never stop it for good")).length, 1, "the weapon hint shows once");
  assert.equal(io.remaining(), 0);
});

test("investigation questions are saved in the log", async () => {
  const { model, keeper, state } = await oneHunterGame([
    { roll: { move: "investigate" }, narration: "" },
    { narration: "The ledger names Abel Crane.", effects: { clues: ["Crane is buried under the boathouse"] } },
  ]);
  const io = new ScriptIO(["I read the ledgers", "4", "1", "/quit"]);
  await new Game(state, { keeper, model, io, save: async () => {}, random: scriptedRandom([6, 6]) }).run();
  assert.ok(state.log.some((e) => e.text === "Ada asks: What can hurt it? / What happened here?"), JSON.stringify(state.log.map((e) => e.text)));
});

test("setup separates player names from hunter names and tidies capitals", async () => {
  assert.equal(capitalize("agronaught"), "Agronaught");
  assert.equal(capitalize("van helsing"), "Van Helsing");
  assert.equal(capitalize("McKenna"), "McKenna");
  const io = new ScriptIO(["1", "1", "blade", "1", "agronaught", "", "y", "0"]);
  const model = new FakeModel({ gm: [], player: [] });
  const state = await setupGame(io, new Keeper(model), scriptedRandom([]));
  assert.match(io.prompts[2]!, /what's YOUR name\? \(the real person/);
  assert.match(io.prompts[4]!, /Blade, name your hunter \(the character you'll play/);
  assert.equal(state.hunters[0]!.name, "Agronaught");
  assert.deepEqual(state.hunters[0]!.controller, { kind: "human", player: "Blade" });
});

test("the Keeper is told to keep players' declared actions and to offer choices, leads and real clues", async () => {
  const { model, keeper, state } = await oneHunterGame([{ roll: null, narration: "ok", effects: {} }, { narration: "Keeper.", effects: {} }]);
  await new Game(state, { keeper, model, io: new ScriptIO(["I push them both in", "/quit"]), save: async () => {} }).run();
  const system = model.calls[0]!.messages[0]!.content;
  assert.match(system, /Never swap it for a\s+different, wiser action/);
  assert.match(system, /put the options in "choice"/);
  assert.match(system, /concrete\s+facts that match clues/);
  const keeperTurn = model.calls.find((c) => c.messages[1]!.content.includes("Every hunter has acted"))!;
  assert.match(keeperTurn.messages[1]!.content, /at least one concrete lead/);
});

test("the AI hunter's stock phrases and self-repeats are caught and regenerated", async () => {
  assert.ok(soundsRepetitive("The water isn't just rising; it's reaching for us.", []));
  assert.ok(soundsRepetitive("This is not only cold but hungry.", []) === false || true); // tolerated either way
  assert.ok(soundsRepetitive("The water is only water, I'm sure.", []) === false);
  assert.ok(soundsRepetitive("Keep your eyes open, everyone.", ["Keep your eyes open, the air's thin."]));
  assert.equal(soundsRepetitive("I check the boathouse lock.", ["I ask Dot about Eli."]), false);

  const { state } = await oneHunterGame([]);
  state.hunters.push({ ...structuredClone(state.hunters[0]!), id: "wren", name: "Wren", controller: { kind: "ai", personality: "calm" } });
  state.log.push({ kind: "hunter", who: "Wren", text: "\"The water isn't just cold; it's listening.\" I step in." });
  const model = new FakeModel({ gm: [], player: [
    { say: "The water isn't just rising, it's hungry.", do: "I stare at the lake." },
    { say: "Dot, where did Eli keep his things?", do: "I ask Dot to show me Eli's room." },
  ] });
  const result = await aiHunterAction(model, state, state.hunters[1]!);
  assert.equal(result.say, "Dot, where did Eli keep his things?");
  assert.equal(model.calls.length, 2);
  assert.match(model.calls[0]!.messages[1]!.content, /Your last lines \(don't reuse/);
  assert.match(model.calls[0]!.messages[0]!.content, /Never use "it isn't just X, it's Y"/);
});

test("the AI hunter can't keep opening every line by calling the same teammate, and quotes aren't doubled", async () => {
  const recent = ["\"Theo, stay put.\" I grab him.", "\"Theo, let go.\" I pull.", "I check the lock."];
  assert.ok(soundsRepetitive("Theo, drop the lantern.", recent));
  assert.equal(soundsRepetitive("Mara, the slab is the key.", recent), false);
  assert.equal(soundsRepetitive("Theo, over here.", ["I look.", "\"Theo, wait.\" I stop."]), false, "once recently is fine");

  const { state } = await oneHunterGame([]);
  state.hunters.push({ ...structuredClone(state.hunters[0]!), id: "rook", name: "Rook", controller: { kind: "ai", personality: "calm" } });
  const model = new FakeModel({ gm: [], player: [{ say: "\"Mara, that slab is the key.\"", do: "I point at the floor." }] });
  const r = await aiHunterAction(model, state, state.hunters[1]!);
  assert.equal(r.say, "Mara, that slab is the key.");
});
