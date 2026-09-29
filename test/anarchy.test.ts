import assert from "node:assert/strict";
import test from "node:test";
import { bandFor, conditionStatus, describePool, rollPool, WOUNDED_AT } from "../src/anarchy/rules.js";
import { Gm, parseAdjudication, parseEffects } from "../src/anarchy/keeper.js";
import { advanceClock, clockAllowed, newRun, type Job, type RunState } from "../src/anarchy/state.js";
import { FakeModel, ScriptIO, scriptedRandom } from "./helpers/fakes.js";

const statRoll = (over: Partial<Parameters<typeof rollPool>[0]> = {}) =>
  rollPool({ stat: "wits", statValue: 2, skills: ["hacking"], ...over }, scriptedRandom([6, 6, 6, 6]));

test("pool rolls: stat + up to 2 skill tags, 5+ is a hit", () => {
  const roll = statRoll();
  assert.equal(roll.pool, 3); // wits 2 + 1 skill
  assert.equal(roll.hits, 3);
  assert.equal(bandFor(roll.hits), "clean");
  assert.match(describePool(roll), /3d6 \[6 6 6\].*3 hits/);
});

test("pool rolls clamp skills to two and never drop below one die", () => {
  const clamped = statRoll({ skills: ["a", "b", "c", "d"] });
  assert.equal(clamped.pool, 4);
  const floor = rollPool({ stat: "muscle", statValue: 0, skills: [], penaltyDice: 2 }, scriptedRandom([1]));
  assert.equal(floor.pool, 1);
  assert.equal(bandFor(floor.hits), "failure");
});

test("wounded runners roll one fewer die; condition status tracks the boxes", () => {
  assert.equal(conditionStatus(10), "okay");
  assert.equal(conditionStatus(WOUNDED_AT), "wounded");
  assert.equal(conditionStatus(0), "out");
  const roll = statRoll({ statValue: 4, penaltyDice: 1 });
  assert.equal(roll.pool, 4); // 4 + 1 skill - 1 wounded
});

const job: Job = {
  id: "test", title: "Test Job", hook: "h", truth: "t", objective: "o", johnson: "j",
  location: "l", opposition: "op", twist: "tw",
  clock: ["one", "two", "three", "four", "five", "six"],
};
const runner = (id: string, condition = 10, plotPoints = 2) => ({
  id, name: id, archetype: "infiltrator", controller: { kind: "human" as const, player: "P" },
  stats: { muscle: 2, reflex: 2, wits: 2, style: 2 }, skills: ["stealth"], gear: ["kit"],
  condition, plotPoints,
});

const stateWith = (over: Partial<RunState> = {}): RunState => ({
  ...newRun(job, [runner("vex"), runner("duke")]),
  ...over,
});

test("GM effects are validated: unknown runners ignored, amounts clamped", () => {
  const state = stateWith();
  const { effects, warnings } = parseEffects(state, {
    damage: [{ runner: "vex", amount: 9, reason: "fall" }, { runner: "ghost", amount: 2 }],
    heal: [{ runner: "vex", amount: 2 }],
    clock: true,
  });
  assert.deepEqual(effects.damage, [{ runner: state.runners[0], amount: 4, reason: "fall" }]);
  assert.equal(warnings.length, 1);
  assert.deepEqual(effects.heal, []); // nothing to heal at full condition
  assert.equal(effects.clock, true);
});

test("'won' is refused once the clock has run out", () => {
  const state = stateWith({ clock: 6, clockRound: 4 });
  const { effects, warnings } = parseEffects(state, { outcome: "won" });
  assert.equal(effects.outcome, null);
  assert.equal(warnings.length, 1);
});

test("the clock advances at most once every two rounds, and the last step only on the GM's turn", () => {
  const state = stateWith({ round: 1 });
  assert.equal(clockAllowed(state, true), true);
  advanceClock(state);
  assert.equal(clockAllowed(state, true), false); // same round
  state.round = 2;
  assert.equal(clockAllowed(state, true), false); // only two rounds later
  state.round = 3;
  assert.equal(clockAllowed(state, false), true);
  // final step refused off the GM turn
  state.clock = job.clock.length - 1;
  state.clockRound = 1;
  assert.equal(clockAllowed(state, false), false);
  assert.equal(clockAllowed(state, true), true);
});

test("adjudication only accepts checks on real stats", () => {
  const state = stateWith();
  const runner = state.runners[0]!;
  const withRoll = parseAdjudication(state, runner, { roll: { stat: "reflex", skills: ["stealth", "a", "b"], why: "sneak" } });
  assert.deepEqual(withRoll.roll, { stat: "reflex", skills: ["stealth", "a"], why: "sneak" });
  assert.deepEqual(withRoll.effects.damage, []);
  const badStat = parseAdjudication(state, runner, { roll: { stat: "charm" } });
  assert.equal(badStat.roll, null);
  assert.ok(badStat.warnings[0]!.includes("unknown stat"));
});

test("a full run: setup, a check, a GM turn, and a quit", async () => {
  const model = new FakeModel({
    gm: [
      { narration: "Rain hammers the freight dock. A guard drone hums overhead.", effects: {} },
      { roll: { stat: "wits", skills: ["stealth"], why: "casing the dock" }, narration: "Vex reads the patrol pattern." },
      { narration: "The patrol leaves a blind spot of ninety seconds.", effects: { clock: true } },
      { narration: "The drone drifts away. Duke lights a cigarette.", effects: {} },
    ],
    player: [],
  });
  const io = new ScriptIO([
    // setup: job 1, two humans named first, then each runner built (quick-build, no pronouns for Duke), no AI
    "1", "2", "Joe", "Sam",
    "2", "Vex", "she/her", "y", "1", "Duke", "", "y", "0",
    // round 1: Joe acts (no plot dice), Sam passes, then quits
    "I case the freight dock for blind spots", "n", "/pass", "/quit",
  ]);
  const state = await import("../src/anarchy/setup.js").then((m) => m.setupRun(io, new Gm(model), scriptedRandom([])));
  assert.deepEqual(state.runners.map((r) => [r.name, r.archetype, r.controller.kind]), [
    ["Vex", "infiltrator", "human"], ["Duke", "street-samurai", "human"],
  ]);
  assert.equal(state.job.id, "neon-drop");

  let saves = 0;
  const finished = await runLoop(state, model, io, () => { saves++; });
  assert.equal(finished, false); // quit, not finished
  assert.equal(state.status, "active");
  assert.equal(state.clock, 1);
  assert.match(io.text("roll"), /3d6 \[6 6 6\].*3 hits/);
  assert.ok(saves >= 3, "autosaves every turn");

  // The AI-player channel got nothing, and the GM never saw a roll it didn't get from the engine
  assert.equal(model.calls.filter((c) => c.role === "player").length, 0);
  assert.ok(model.calls[1]!.messages[1]!.content.includes("case the freight dock"));
});

/** The harness around anarchyHooks: an existing state and a counting save. */
async function runLoop(state: RunState, model: FakeModel, io: ScriptIO, onSave: () => void): Promise<boolean> {
  const { SessionLoop } = await import("../src/session/loop.js");
  const { anarchyHooks } = await import("../src/anarchy/session.js");
  const random = scriptedRandom([6, 6, 6, 6, 6, 6]);
  const loop = new SessionLoop(
    state,
    anarchyHooks(state, { gm: new Gm(model), model, io, random, debug: true, save: async () => { onSave(); } }),
    { io, model, random },
  );
  return loop.run();
}
