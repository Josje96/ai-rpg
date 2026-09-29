import type { RandomInt } from "../domain/dice.js";
import type { GameIO } from "../rpg/adapter.js";
import type { ModelClient } from "../ai/provider.js";

/** How a party member is driven: a human at the table, or the model playing a role. */
export type Controller = { kind: "human"; player: string } | { kind: "ai"; personality: string };

export type LogEntry = {
  kind: "keeper" | "hunter" | "roll" | "system";
  who?: string;
  text: string;
};

export function formatEntry(e: LogEntry): string {
  switch (e.kind) {
    case "keeper": return `KEEPER: ${e.text}`;
    case "hunter": return `${e.who ?? "Hunter"}: ${e.text}`;
    case "roll": return `ROLL ${e.who ?? ""}: ${e.text}`;
    case "system": return `[${e.text}]`;
  }
}

export const RECENT_ENTRIES = 16;

/** The last few log entries, for prompt context. */
export function recentLog(
  state: { log: LogEntry[]; summarizedThrough: number },
  count = RECENT_ENTRIES,
): string {
  const start = Math.max(state.summarizedThrough, state.log.length - count);
  return state.log.slice(start).map(formatEntry).join("\n") || "(nothing yet)";
}

export type TurnInput = { kind: "action"; text: string } | { kind: "pass" } | { kind: "quit" };

/** The state fields every session shares; each system adds its own payload. */
export type SessionBase = {
  round: number;
  /** Index into the party of whose turn is next this round. */
  turn: number;
  status: "active" | "won" | "lost";
  log: LogEntry[];
  /** Running recap of everything before log[summarizedThrough]. */
  summary: string;
  summarizedThrough: number;
  costUsd: number;
};

/** The parts of a party member the loop needs; systems attach their own data. */
export type SessionMember = { id: string; name: string; controller: Controller };

/** What a system's hooks get from the loop. */
export type SessionContext<S> = {
  io: GameIO;
  model: ModelClient;
  random: RandomInt;
  debug: boolean;
  save: (state: S) => Promise<unknown>;
};
