import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "../src/cli.js";

test("systems lists all built-in RPG adapters", () => {
  const output: string[] = [];
  const exitCode = runCli(["systems"], (line) => output.push(line));

  assert.equal(exitCode, 0);
  assert.deepEqual(output, [
    "Installed RPG systems:",
    "- D&D 5e (2014) [dnd5e-2014]",
    "- Shadowrun: Anarchy 2.0 [shadowrun-anarchy-2]",
    "- Fate Condensed [fate-condensed]",
    "- Blades in the Dark [blades-in-the-dark]",
    "- Pathfinder 2e Remaster [pathfinder2-remaster]",
    "- Cairn 2e [cairn-2e]",
    "- Basic Roleplaying [basic-roleplaying]",
  ]);
});

test("roll command prints the deterministic dice result", () => {
  const output: string[] = [];
  const exitCode = runCli(["roll", "d6+2"], (line) => output.push(line), () => 1);

  assert.equal(exitCode, 0);
  assert.deepEqual(output, ["d6+2: 3 (rolls: 1)"]);
});

test("Shadowrun command rolls a d6 pool with advantage", () => {
  const output: string[] = [];
  const values = [4, 5, 6, 3];
  const exitCode = runCli(
    ["shadowrun-roll", "4", "--advantage"],
    (line) => output.push(line),
    () => values.shift() ?? 1,
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(output, ["Pool 4 (hits on 4+): 3 hits (rolls: 4, 5, 6, 3)"]);
});

test("settings lists the SCP Foundation setting module", () => {
  const output: string[] = [];
  const exitCode = runCli(["settings"], (line) => output.push(line));

  assert.equal(exitCode, 0);
  assert.deepEqual(output, ["Available settings:", "- SCP Foundation [scp-foundation]"]);
});

test("scenario command prints the original SCP onboarding case", () => {
  const output: string[] = [];
  const exitCode = runCli(
    ["scenario", "scp-foundation", "quiet-annex-001"],
    (line) => output.push(line),
  );

  assert.equal(exitCode, 0);
  assert.match(output.join("\n"), /Case 001: Quiet Annex/);
  assert.match(output.join("\n"), /missing archivist/);
});

test("party-plan mixes human and AI players under an AI GM", () => {
  const output: string[] = [];
  const exitCode = runCli(["party-plan", "4", "2", "--gm", "ai"], (line) => output.push(line));

  assert.equal(exitCode, 0);
  assert.deepEqual(output, [
    "GM: AI GM [ai]",
    "Party (4 characters):",
    "- Human 1 [human]",
    "- Human 2 [human]",
    "- AI Player 1 [ai]",
    "- AI Player 2 [ai]",
  ]);
});

test("party-plan randomize can assign a human GM and fill remaining seats with AI", () => {
  const output: string[] = [];
  const draws = [0, 1];
  const exitCode = runCli(
    ["party-plan", "2", "2", "--randomize"],
    (line) => output.push(line),
    () => draws.shift() ?? 0,
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(output, [
    "GM: Human 2 [human]",
    "Party (2 characters):",
    "- Human 1 [human]",
    "- AI Player 1 [ai]",
  ]);
});

test("unknown commands print usage and return a failure exit code", () => {
  const output: string[] = [];
  const exitCode = runCli(["unknown"], (line) => output.push(line));

  assert.equal(exitCode, 1);
  assert.match(output[0] ?? "", /Usage:/);
});
