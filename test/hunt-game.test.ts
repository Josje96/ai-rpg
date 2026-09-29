import assert from "node:assert/strict";
import test from "node:test";
import { Game } from "../src/hunt/game.js";
import { Keeper } from "../src/hunt/keeper.js";
import { setupGame } from "../src/hunt/setup.js";
import type { GameState } from "../src/hunt/state.js";
import { FakeModel, ScriptIO, scriptedRandom } from "./helpers/fakes.js";

const noEffects = {};

test("a full hunt: setup, rolls, Luck, harm, clues, countdown, and a win", async () => {
  const model = new FakeModel({
    gm: [
      { narration: "Fog sits on Mercy Lake. Dot Hale waves you into the diner.", effects: noEffects },
      { roll: { move: "investigate", why: "research" }, narration: "Father Mendes unlocks the records room." },
      { narration: "The ledger names Abel Crane, buried without remains.", effects: { clues: ["Crane was buried under the boathouse"] } },
      { roll: null, narration: "Something cold closes on Theo's wrist.", effects: { harm: [{ hunter: "theo", amount: 2, reason: "cold grasp" }] } },
      { roll: null, narration: "The chain has been cut.", effects: { clues: ["The boathouse was broken into"] } },
      { narration: "Fog rolls in; phones die.", effects: { countdown: true } },
      { roll: null, narration: "It clicks for everyone.", effects: { weaknessDiscovered: true } },
      { roll: { move: "kick-some-ass" }, narration: "Theo charges." },
      { narration: "The water drags Theo under.", effects: { harm: [{ hunter: "Theo", amount: 3, reason: "drag under" }] } },
      { roll: { move: "protect" }, narration: "" },
      { narration: "Rook hauls Theo out while Mara breaks the lantern on the grave.", effects: { outcome: "won" } },
    ],
    player: [
      { say: "Stay close.", do: "I check the boathouse lock." },
      { say: "", do: "I pull Theo back from the water." },
    ],
  });
  const keeper = new Keeper(model);
  const io = new ScriptIO([
    // setup
    "1", "2", "Joe", "Sam",
    "2", "Mara", "she/her", "n", "1", "1", "2", "1", // Joe: Bookworm, built by hand
    "3", "Theo", "", "y",                            // Sam: Guardian, quick-built, no pronouns given
    "1",                                   // one AI hunter
    // round 1
    "I dig through the parish ledgers for the 1911 ferry", "n", "4",
    "/sheet", "I stand guard at the dock", "y",
    // round 2
    "I tell everyone: we break the lantern on his grave",
    "I kick the lantern out of its hand", "n", "n",
  ]);
  const state = await setupGame(io, keeper, scriptedRandom([]));
  assert.deepEqual(state.hunters.map((h) => [h.name, h.playbook, h.controller.kind]), [
    ["Mara", "bookworm", "human"], ["Theo", "guardian", "human"], ["Rook", "old-hand", "ai"],
  ]);
  assert.deepEqual(state.hunters[0]!.moves, ["cross-reference", "field-notes"]);

  let saves = 0;
  const game = new Game(state, { keeper, model, io, save: async () => { saves++; }, random: scriptedRandom([2, 3, 1, 1, 6, 6]) });
  assert.equal(await game.run(), true);

  assert.equal(state.status, "won");
  assert.equal(io.remaining(), 0, "every scripted answer was used");
  const [mara, theo, rook] = state.hunters;
  // Mara: 2+3 +2 sharp +1 Cross-reference = 8, a mixed hit: one question
  assert.match(io.text("roll"), /Investigate a mystery: 2d6 \[2, 3\] \+2 \+1 sharp = 8 \(mixed hit\) \[Cross-reference\]/);
  assert.match(model.calls[2]!.messages[1]!.content, /They asked: "What can hurt it\?"/);
  // Theo spent Luck on the first harm, took the second, and marked XP on his miss
  assert.equal(theo!.luck, 6);
  assert.equal(theo!.harm, 3);
  assert.equal(theo!.xp, 1);
  assert.equal(mara!.luck, 7);
  assert.equal(rook!.harm, 0);
  assert.deepEqual(state.cluesFound, ["Crane was buried under the boathouse", "The boathouse was broken into"]);
  assert.equal(state.countdown, 1);
  assert.ok(state.weaknessKnown);
  assert.ok(io.text("info").includes("Bookworm") || io.text("info").includes("Cross-reference"), "/sheet was shown");
  assert.ok(saves >= 7, "autosaves every turn");

  // AI hunters never see the keeper's secrets
  for (const call of model.calls.filter((c) => c.role === "player")) {
    const text = call.messages.map((m) => m.content).join("\n");
    assert.ok(!text.includes(state.mystery.monster.weakness), "weakness leaked to an AI player");
    assert.ok(!text.includes(state.mystery.truth), "truth leaked to an AI player");
  }
  // ...but the keeper always does, and rolls are never the keeper's call
  assert.ok(model.calls[1]!.messages[1]!.content.includes(state.mystery.monster.weakness));
});

test("quit saves mid-round; resuming continues on the same hunter", async () => {
  const model = new FakeModel({ gm: [{ narration: "The dock is quiet.", effects: {} }], player: [] });
  const keeper = new Keeper(model);
  const setupIo = new ScriptIO(["1", "1", "Joe", "1", "Ada", "she/her", "y", "0"]);
  const state = await setupGame(setupIo, keeper, scriptedRandom([]));
  let saved: GameState | undefined;
  const save = async (s: GameState) => { saved = structuredClone(s); };

  const first = new ScriptIO(["/quit"]);
  assert.equal(await new Game(state, { keeper, model, io: first, save }).run(), false);
  assert.equal(saved!.round, 1);
  assert.equal(saved!.turn, 0);

  const second = new ScriptIO(["/party", "/quit"]);
  await new Game(saved!, { keeper, model, io: second, save }).run();
  assert.match(second.text("heading"), /round 1/);
  assert.match(second.text("keeper"), /The dock is quiet/);
  assert.match(second.text("info"), /Ada \(The Old Hand, Joe\): harm 0\/7, Luck 7/);
  assert.equal(model.calls.length, 1, "resuming doesn't call the model again");
});

test("a model failure offers a retry instead of crashing the game", async () => {
  const model = new FakeModel({
    gm: [new Error("HTTP 503"), { narration: "Back on track.", effects: {} }],
    player: [],
  });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "she/her", "y", "0"]), keeper, scriptedRandom([]));
  const io = new ScriptIO(["y", "/quit"]);
  await new Game(state, { keeper, model, io, save: async () => {} }).run();
  assert.match(io.text("error"), /HTTP 503/);
  assert.match(io.text("keeper"), /Back on track/);
});

test("declining a retry saves and stops cleanly", async () => {
  const model = new FakeModel({ gm: [new Error("HTTP 503")], player: [] });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "she/her", "y", "0"]), keeper, scriptedRandom([]));
  let saves = 0;
  const io = new ScriptIO(["n"]);
  assert.equal(await new Game(state, { keeper, model, io, save: async () => { saves++; } }).run(), false);
  assert.equal(saves, 1);
  assert.match(io.text("info"), /Game saved/);
});

test("the opening scene can't start the countdown", async () => {
  const model = new FakeModel({ gm: [{ narration: "Dusk.", effects: { countdown: true } }], player: [] });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "she/her", "y", "0"]), keeper, scriptedRandom([]));
  await new Game(state, { keeper, model, io: new ScriptIO(["/quit"]), save: async () => {} }).run();
  assert.equal(state.countdown, 0);
});

test("pacing: one countdown step every two rounds, a warning before the last, which only the keeper's turn can take", async () => {
  const advance = { roll: null, narration: "Time slips away.", effects: { countdown: true } };
  const quiet = { roll: null, narration: "...", effects: {} };
  const keeperAdvance = { narration: "Keeper.", effects: { countdown: true } };
  const rounds = 11;
  const model = new FakeModel({
    gm: [{ narration: "Night.", effects: {} }, ...Array.from({ length: rounds }, () => [advance, quiet, keeperAdvance]).flat()],
    player: [],
  });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "2", "A", "B", "1", "Ada", "", "y", "2", "Bo", "", "y", "0"]), keeper, scriptedRandom([]));
  const io = new ScriptIO(Array.from({ length: rounds * 2 }, () => "wait"));
  const steps: number[] = [];
  await new Game(state, { keeper, model, io, save: async (s) => { if (s.turn === 0) steps[s.round] = s.countdown; } }).run();
  // Both the hunter and the keeper ask every round. Steps land in rounds 1, 3, 5, 7, 9; in round 11 the hunter's
  // request for the final step is refused and the keeper's turn takes it.
  assert.deepEqual(steps.slice(2, 12), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(state.countdown, 6);
  assert.equal(state.status, "lost");
  assert.equal(state.round, 11);
  assert.match(io.text("system"), /One step left/);
});

test("pronouns reach the keeper and the sheet", async () => {
  const model = new FakeModel({ gm: [{ narration: "Hi.", effects: {} }], player: [] });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "she/her", "y", "0"]), keeper, scriptedRandom([]));
  const io = new ScriptIO(["/sheet", "/quit"]);
  await new Game(state, { keeper, model, io, save: async () => {} }).run();
  assert.match(model.calls[0]!.messages[1]!.content, /Ada \(she\/her\), The Old Hand/);
  assert.match(io.text("info"), /^Ada \(she\/her\), The Old Hand/m);
});

test("Help out gives the next hunter +1; reading a situation gives yourself +1", async () => {
  const model = new FakeModel({
    gm: [
      { narration: "Night.", effects: {} },
      { roll: { move: "help-out" }, narration: "" }, { narration: "You boost Bo.", effects: {} },
      { roll: { move: "kick-some-ass" }, narration: "" }, { narration: "Hit.", effects: {} },
      { narration: "Keeper.", effects: {} },
      { roll: { move: "read-situation" }, narration: "" }, { narration: "You see a way.", effects: {} },
      { narration: "Keeper again.", effects: {} },
      { roll: { move: "act-under-pressure" }, narration: "" }, { narration: "Close.", effects: {} },
    ],
    player: [],
  });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "A", "4", "Bo", "", "n", "1", "3", "1", "1", "0"]), keeper, scriptedRandom([]));
  // One human (Guardian "Bo") plus a second human-controlled hunter so help has a target.
  state.hunters.push({ ...structuredClone(state.hunters[0]!), id: "cy", name: "Cy", moves: [] });
  // Dice are all 4s: help 10 and kick 11 are strong (no Luck prompt); the read is 8 (Luck? n, one question); Cy passes.
  const io = new ScriptIO(["I help Cy", "I hit it", "I look around", "n", "1", "/pass", "I run", "/quit"]);
  await new Game(state, { keeper, model, io, save: async () => {}, random: scriptedRandom([4, 4, 4, 4, 4, 4, 4, 4]) }).run();
  const rolls = io.shown.filter((x) => x.kind === "roll").map((x) => x.text);
  assert.match(rolls[0]!, /Help out: .* \[Rally\]/);
  assert.match(rolls[1]!, /Kick some ass: .*\+1 .*\[Bo's help\]/, "Cy got Bo's +1");
  assert.match(rolls[3]!, /Act under pressure: .*\+1 .*\[acting on what you read\]/, "Bo used their own +1");
  assert.deepEqual(state.forward, []);
});

test("the keeper sees the clues the hunters already have", async () => {
  const model = new FakeModel({ gm: [{ narration: "Hi.", effects: {} }, { roll: null, narration: "ok", effects: {} }], player: [] });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "", "y", "0"]), keeper, scriptedRandom([]));
  state.cluesFound.push("The light is a lantern");
  await new Game(state, { keeper, model, io: new ScriptIO(["look", "/quit"]), save: async () => {} }).run();
  assert.match(model.calls[1]!.messages[1]!.content, /ALREADY HAVE[^\n]*\n- The light is a lantern/);
});

test("the keeper is told whether the clock has moved", async () => {
  const quiet = { roll: null, narration: "...", effects: {} };
  const model = new FakeModel({
    gm: [{ narration: "Night.", effects: {} }, quiet, { narration: "K1.", effects: {} }, quiet, { narration: "K2.", effects: {} }],
    player: [],
  });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "", "y", "0"]), keeper, scriptedRandom([]));
  await new Game(state, { keeper, model, io: new ScriptIO(["look", "look", "/quit"]), save: async () => {} }).run();
  const keeperTurns = model.calls.filter((c) => c.messages[1]!.content.includes("Every hunter has acted"));
  assert.match(keeperTurns[0]!.messages[1]!.content, /It hasn't moved yet/);
  assert.match(keeperTurns[1]!.messages[1]!.content, /It hasn't moved yet/);
});

test("key-moment art: monster reveal (once), weakness, clock meter, hunter out, and the ending", async () => {
  const { COUNTY_FAIR_ART, outOfActionArt } = await import("../src/hunt/mysteries/art.js");
  const model = new FakeModel({
    gm: [
      { narration: "The fair glows.", effects: {} },
      { roll: null, narration: "Something enormous on a hubcap throne.", effects: { monsterRevealed: true } },
      { roll: null, narration: "It bites.", effects: { harm: [{ hunter: "ada", amount: 4 }], monsterRevealed: true } },
      { narration: "The generators blow.", effects: { countdown: true } },
      { roll: null, narration: "Rufus's scrapbook: melt it.", effects: { weaknessDiscovered: true } },
      { roll: null, narration: "It bites again.", effects: { harm: [{ hunter: "ada", amount: 4 }] } },
      { roll: null, narration: "The token melts.", effects: { outcome: "won" } },
    ],
    player: [],
  });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["6", "1", "Joe", "1", "Ada", "", "y", "0"]), keeper, scriptedRandom([]));
  state.hunters.push({ ...structuredClone(state.hunters[0]!), id: "bo", name: "Bo" });
  // Round 1: Ada looks (reveal); Bo checks the clock, then acts (Ada takes 4, declines Luck); keeper turn moves the clock.
  // Round 2: Ada reads (weakness); Bo acts (Ada takes 4 more, declines Luck, goes out); keeper turn: the token melts.
  const io = new ScriptIO(["look", "/clock", "bite", "n", "read", "grab it", "n"]);
  await new Game(state, { keeper, model, io, save: async () => {} }).run();
  assert.deepEqual(io.arts, [
    COUNTY_FAIR_ART.title,
    COUNTY_FAIR_ART.monster,          // only once, though revealed twice
    COUNTY_FAIR_ART.weakness,
    outOfActionArt("Ada"),
    COUNTY_FAIR_ART.won,
  ]);
  assert.match(io.text("system"), /Clock █░░░░░ Calm Before the Storm/);
  assert.match(io.text("info"), /Clock ░░░░░░ not started/, "/clock before the clock moves");
  assert.equal(io.remaining(), 0);
  // the out-of-action card appears after the harm line that caused it
  const harmIndex = io.shown.findIndex((x) => x.text.includes("Ada takes 4 harm") && x.text.includes("OUT"));
  assert.equal(io.shown[harmIndex + 1]!.text, outOfActionArt("Ada").at(-1));
});

test("landing a hit on the monster counts as seeing it", async () => {
  const { MERCY_LAKE_ART } = await import("../src/hunt/mysteries/art.js");
  const model = new FakeModel({
    gm: [{ narration: "Dusk.", effects: {} }, { roll: null, narration: "You strike the lantern-bearer.", effects: { monsterHarm: 2 } }],
    player: [],
  });
  const keeper = new Keeper(model);
  const state = await setupGame(new ScriptIO(["1", "1", "Joe", "1", "Ada", "", "y", "0"]), keeper, scriptedRandom([]));
  const io = new ScriptIO(["I swing", "/quit"]);
  await new Game(state, { keeper, model, io, save: async () => {} }).run();
  assert.ok(io.arts.includes(MERCY_LAKE_ART.monster));
  assert.equal(state.monsterSeen, true);
});
