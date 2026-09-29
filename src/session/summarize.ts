import type { ChatMessage, ModelClient } from "../ai/provider.js";
import { asObj, asStr } from "./parse.js";
import { formatEntry, type LogEntry } from "./types.js";

/**
 * Fold old log entries into the session's running recap. Shared by every system;
 * the genre line keeps the summary in the right voice.
 */
export async function summarizeLog(
  model: ModelClient,
  state: { summary: string; costUsd: number },
  entries: readonly LogEntry[],
  genre: string,
): Promise<string> {
  const { data, costUsd } = await model.completeJson({
    role: "player",
    maxTokens: 600,
    messages: [
      {
        role: "system",
        content: `You maintain a running recap of a tabletop ${genre} game. Keep names, places, clues found, injuries, promises, and open threads. Under 220 words. Reply {"summary": "..."}.`,
      },
      { role: "user", content: `Recap so far: ${state.summary || "(none)"}\n\nNew events:\n${entries.map(formatEntry).join("\n")}` },
    ],
  });
  state.costUsd += costUsd;
  return asStr(asObj(data).summary, 2500) || state.summary;
}
