import { randomInt } from "node:crypto";
import type { RandomInt } from "../domain/dice.js";

export const MAX_PARTY_SIZE = 6;

export type GMMode = "human" | "ai" | "random";

export type HumanParticipant = {
  id: string;
  displayName: string;
};

export type SessionActor = {
  id: string;
  displayName: string;
  kind: "human" | "ai";
  role: "gm" | "player";
};

export type SessionComposition = {
  partySize: number;
  gm: SessionActor;
  players: SessionActor[];
};

export type SessionCompositionInput = {
  partySize: number;
  humans: readonly HumanParticipant[];
  gmMode: GMMode;
};

export function planSessionComposition(
  input: SessionCompositionInput,
  random: RandomInt = randomInt,
): SessionComposition {
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > MAX_PARTY_SIZE) {
    throw new RangeError(`Party size must be an integer between 1 and ${MAX_PARTY_SIZE}.`);
  }
  if (new Set(input.humans.map((human) => human.id)).size !== input.humans.length) {
    throw new RangeError("Human participant IDs must be unique.");
  }
  if (input.humans.some((human) => human.id.trim() === "" || human.displayName.trim() === "")) {
    throw new RangeError("Human participants need a non-empty ID and display name.");
  }
  if (input.gmMode === "human" && input.humans.length === 0) {
    throw new RangeError("At least one human participant is required for a human GM.");
  }
  if (input.gmMode !== "human" && input.gmMode !== "ai" && input.gmMode !== "random") {
    throw new RangeError("GM mode must be human, ai, or random.");
  }

  let humanGmIndex: number | undefined;
  if (input.gmMode === "human") {
    humanGmIndex = 0;
  } else if (input.gmMode === "random" && input.humans.length > 0) {
    const onlyHumanGmIsValid = input.humans.length > input.partySize;
    const chooseHumanGm = onlyHumanGmIsValid || random(0, 2) === 0;
    if (chooseHumanGm) humanGmIndex = random(0, input.humans.length);
  }

  const remainingHumans = input.humans.filter((_, index) => index !== humanGmIndex);
  if (remainingHumans.length > input.partySize) {
    throw new RangeError("There are more human players than party seats after assigning the GM.");
  }

  const gm = humanGmIndex === undefined
    ? { id: "ai-gm", displayName: "AI GM", kind: "ai" as const, role: "gm" as const }
    : {
        ...input.humans[humanGmIndex]!,
        kind: "human" as const,
        role: "gm" as const,
      };

  const players: SessionActor[] = remainingHumans.map((human) => ({
    ...human,
    kind: "human",
    role: "player",
  }));
  while (players.length < input.partySize) {
    const number = players.filter((player) => player.kind === "ai").length + 1;
    players.push({
      id: `ai-player-${number}`,
      displayName: `AI Player ${number}`,
      kind: "ai",
      role: "player",
    });
  }

  return { partySize: input.partySize, gm, players };
}
