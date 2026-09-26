#!/usr/bin/env node
import { randomInt } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rollDice, type RandomInt } from "./domain/dice.js";
import { createDefaultRpgRegistry } from "./rpg/registry.js";
import { rollAnarchyPool } from "./rpg/shadowrun-anarchy-2.js";
import { getScenario, getSettingModule, listSettingModules } from "./settings/registry.js";
import { MAX_PARTY_SIZE, planSessionComposition } from "./session/party-planner.js";

export type WriteLine = (line: string) => void;

const usage = [
  "Usage:",
  "  tabletop-ai play                    Play Monster of the Week with an AI Keeper",
  "  tabletop-ai systems                 List installed RPG adapters",
  "  tabletop-ai roll <dice-notation>    Roll dice, e.g. 2d6+3",
  "  tabletop-ai shadowrun-roll <pool> [--advantage|--disadvantage]",
  "  tabletop-ai settings                 List setting modules",
  "  tabletop-ai scenario <setting> <id>  Show a system-neutral case brief",
  "  tabletop-ai party-plan <slots> <humans> --gm <human|ai|random>",
  "  tabletop-ai party-plan <slots> <humans> --randomize",
].join("\n");

export function runCli(
  args: string[],
  write: WriteLine = console.log,
  random: RandomInt = randomInt,
): number {
  const [command, ...rest] = args;

  if (command === "systems") {
    const systems = createDefaultRpgRegistry().list();
    write("Installed RPG systems:");
    for (const system of systems) {
      write(`- ${system.name} [${system.id}]`);
    }
    return 0;
  }

  if (command === "roll") {
    const notation = rest[0];
    if (!notation) {
      write("Usage: tabletop-ai roll <dice-notation>");
      return 1;
    }

    try {
      const result = rollDice(notation, random);
      write(`${result.notation}: ${result.total} (rolls: ${result.rolls.join(", ")})`);
      return 0;
    } catch (error) {
      write(error instanceof Error ? error.message : "Dice roll failed.");
      return 1;
    }
  }

  if (command === "shadowrun-roll") {
    const poolText = rest[0];
    const flags = rest.slice(1);
    if (!poolText || flags.some((flag) => flag !== "--advantage" && flag !== "--disadvantage")) {
      write("Usage: tabletop-ai shadowrun-roll <pool> [--advantage|--disadvantage]");
      return 1;
    }

    try {
      const result = rollAnarchyPool({
        dicePool: Number(poolText),
        advantage: flags.includes("--advantage"),
        disadvantage: flags.includes("--disadvantage"),
      }, random);
      write(`Pool ${result.dicePool} (hits on ${result.hitThreshold}+): ${result.hits} hits (rolls: ${result.dice.join(", ")})`);
      return 0;
    } catch (error) {
      write(error instanceof Error ? error.message : "Shadowrun roll failed.");
      return 1;
    }
  }

  if (command === "party-plan") {
    const [partySizeText, humanCountText, gmFlag, gmModeText] = rest;
    const partySize = Number(partySizeText);
    const humanCount = Number(humanCountText);
    const gmMode = gmFlag === "--randomize"
      ? "random"
      : gmFlag === "--gm" && (gmModeText === "human" || gmModeText === "ai" || gmModeText === "random")
        ? gmModeText
        : undefined;

    if (!Number.isInteger(partySize) || !Number.isInteger(humanCount) || humanCount < 0 || humanCount > MAX_PARTY_SIZE + 1 || !gmMode) {
      write("Usage: tabletop-ai party-plan <slots> <human-count> --gm <human|ai|random> (or --randomize)");
      return 1;
    }

    try {
      const humans = Array.from({ length: humanCount }, (_, index) => ({
        id: `human-${index + 1}`,
        displayName: `Human ${index + 1}`,
      }));
      const plan = planSessionComposition({ partySize, humans, gmMode }, random);
      write(`GM: ${plan.gm.displayName} [${plan.gm.kind}]`);
      write(`Party (${plan.partySize} characters):`);
      for (const player of plan.players) {
        write(`- ${player.displayName} [${player.kind}]`);
      }
      return 0;
    } catch (error) {
      write(error instanceof Error ? error.message : "Party setup failed.");
      return 1;
    }
  }

  if (command === "settings") {
    write("Available settings:");
    for (const setting of listSettingModules()) {
      write(`- ${setting.name} [${setting.id}]`);
    }
    return 0;
  }

  if (command === "scenario") {
    const [settingId, scenarioId] = rest;
    if (!settingId || !scenarioId) {
      write("Usage: tabletop-ai scenario <setting> <scenario-id>");
      return 1;
    }
    const setting = getSettingModule(settingId);
    const scenario = getScenario(settingId, scenarioId);
    if (!setting || !scenario) {
      write(`Unknown setting or scenario: ${settingId}/${scenarioId}`);
      return 1;
    }

    write(`${setting.name} — ${scenario.title}`);
    write(`Briefing: ${scenario.briefing}`);
    write("Objectives:");
    for (const objective of scenario.objectives) write(`- ${objective}`);
    write("Procedures:");
    for (const procedure of scenario.procedures) write(`- ${procedure}`);
    write("Clues:");
    for (const clue of scenario.clues) write(`- ${clue}`);
    write("Complications:");
    for (const complication of scenario.complications) write(`- ${complication}`);
    return 0;
  }

  if (command === "--help" || command === "-h" || command === undefined) {
    write(usage);
    return 0;
  }

  write(usage);
  return 1;
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(resolve(invokedPath)).href) {
  const args = process.argv.slice(2);
  if (args[0] === "play") {
    const { runPlay } = await import("./motw/play.js");
    process.exitCode = await runPlay();
  } else {
    process.exitCode = runCli(args);
  }
}
