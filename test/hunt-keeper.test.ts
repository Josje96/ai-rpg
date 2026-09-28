import assert from "node:assert/strict";
import test from "node:test";
import { parseAdjudication, parseEffects } from "../src/hunt/keeper.js";
import { parseMystery } from "../src/hunt/mystery.js";
import { MERCY_LAKE } from "../src/hunt/mysteries/index.js";
import { advanceCountdown, applyHarm, hurtMonster, listSaves, loadGame, newGame, saveGame, type Hunter } from "../src/hunt/state.js";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function hunter(id: string, overrides: Partial<Hunter> = {}): Hunter {
  return {
    id, name: id[0]!.toUpperCase() + id.slice(1), playbook: "guardian", controller: { kind: "human", player: "P" },
    stats: { charm: 0, cool: 1, sharp: 0, tough: 2, weird: -1 }, moves: ["shield", "rally"],
    gear: [{ name: "fire axe", harm: 3, tags: ["hand"] }], harm: 0, luck: 7, xp: 0, ...overrides,
  };
}

const game = () => newGame(MERCY_LAKE, [hunter("mara"), hunter("rook", { controller: { kind: "ai", personality: "calm" } })]);

test("keeper effects are validated and clamped", () => {
  const state = game();
  const { effects, warnings } = parseEffects(state, {
    harm: [{ hunter: "Mara", amount: 12, reason: "claws" }, { hunter: "ghost", amount: 2 }, { hunter: "rook", amount: 0 }],
    monsterHarm: 5, clues: ["a clue", 7, ""], countdown: true, outcome: "won",
  }, { maxMonsterHarm: 4 });
  assert.equal(effects.harm.length, 1);
  assert.equal(effects.harm[0]!.amount, 4);
  assert.equal(effects.monsterHarm, 4);
  assert.deepEqual(effects.clues, ["a clue"]);
  assert.equal(effects.outcome, null, "can't win before finding the weakness");
  assert.ok(warnings.some((w) => w.includes("ghost")));
  assert.ok(warnings.some((w) => w.includes("won")));
});

test("winning is allowed once the weakness is found (same reply or earlier)", () => {
  const state = game();
  assert.equal(parseEffects(state, { weaknessDiscovered: true, outcome: "won" }, { maxMonsterHarm: 0 }).effects.outcome, "won");
});

test("adjudication: a roll request carries no effects; unknown moves don't roll", () => {
  const state = game();
  const mara = state.hunters[0]!;
  const a = parseAdjudication(state, mara, { roll: { move: "kick-some-ass", why: "attack" }, narration: "You lunge.", effects: { harm: [{ hunter: "mara", amount: 3 }] } });
  assert.deepEqual(a.roll, { move: "kick-some-ass", stat: "tough", why: "attack" });
  assert.equal(a.effects.harm.length, 0);
  const b = parseAdjudication(state, mara, { roll: { move: "fireball" }, narration: "Nothing happens." });
  assert.equal(b.roll, null);
  assert.ok(b.warnings[0]!.includes("fireball"));
});

test("monster armor, driving it off, countdown loss, and everyone down", () => {
  const state = game();
  assert.equal(hurtMonster(state, 3), "The Lantern Keeper takes 2 harm.");
  state.monsterHarm = 7;
  assert.match(hurtMonster(state, 3), /driven off/);
  assert.equal(state.monsterHarm, 0);
  for (let i = 0; i < 6; i++) advanceCountdown(state);
  assert.equal(state.status, "lost");

  const other = game();
  applyHarm(other, other.hunters[0]!, 8, "");
  assert.equal(other.status, "active");
  applyHarm(other, other.hunters[1]!, 8, "");
  assert.equal(other.status, "lost");
});

test("mystery validation catches missing pieces", () => {
  const bad = parseMystery({ title: "X", countdown: ["a"] }, "g");
  assert.ok("errors" in bad && bad.errors.includes("countdown must have 6 steps"));
  const good = parseMystery(JSON.parse(JSON.stringify(MERCY_LAKE)), "g2");
  assert.ok("mystery" in good && good.mystery.monster.attacks.length === 2);
});

test("saves round-trip and list newest first", async () => {
  const dir = await mkdtemp(join(tmpdir(), "hunt-"));
  const a = game();
  await saveGame(a, dir);
  await new Promise((r) => setTimeout(r, 5));
  const b = game();
  b.round = 3;
  await saveGame(b, dir);
  const saves = await listSaves(dir);
  assert.deepEqual(saves.map((s) => s.id), [b.id, a.id]);
  assert.equal((await loadGame(b.id, dir)).round, 3);
});
