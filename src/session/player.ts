import type { ChatMessage, ModelClient } from "../ai/provider.js";
import { asObj, asStr, unquote } from "./parse.js";

/** One AI player's turn: words spoken aloud, a sentence of action, and what it cost. */
export type AiTurn = { say: string; act: string; costUsd: number };

/** Tics the player model falls into: "it isn't just X, it's Y" and friends. */
const TIC = /\b(?:is(?:n'?t| not)|was(?:n'?t| not)|are(?:n'?t| not)) (?:just|only|merely)\b|\bnot (?:just|only|merely) [^.;,]+[;,] (?:it'?s|but)\b/i;

function firstWords(text: string, n = 4): string {
  return text.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter(Boolean).slice(0, n).join(" ");
}

/** "Theo, get down." -> "theo" : who a line opens by addressing, if anyone. */
function addressee(line: string): string | null {
  const m = /^\W*([A-Z][\w'-]*(?: [A-Z][\w'-]*)?),/.exec(line.trim());
  return m ? m[1]!.toLowerCase() : null;
}

/** Repeats a stock phrase, opens like one of its own recent lines, or keeps opening by calling the same person. */
export function soundsRepetitive(line: string, recent: readonly string[]): boolean {
  if (TIC.test(line)) return true;
  const opening = firstWords(line);
  if (opening.split(" ").length >= 3 && recent.some((r) => firstWords(r) === opening)) return true;
  const who = addressee(line);
  return who !== null && recent.slice(-3).filter((r) => addressee(r) === who).length >= 2;
}

export type AiPlayerRequest = {
  /** The fully built prompt; the shared loop only appends rejection feedback. */
  messages: ChatMessage[];
  /** The player's own recent lines, so repeats are caught. */
  recentLines: readonly string[];
  /** Shown once when the model repeats itself. */
  rejectMessage: string;
  /** Used when the model returns nothing to do. */
  defaultAct: string;
};

/**
 * Runs one AI player's turn, with a second attempt (plus a nudge) when the reply repeats
 * a stock phrase or echoes its own recent lines. Every system's AI players share this.
 */
export async function aiPlayerAction(model: ModelClient, request: AiPlayerRequest): Promise<AiTurn> {
  const messages: ChatMessage[] = [...request.messages];
  let cost = 0;
  let result = { say: "", act: "" };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, costUsd } = await model.completeJson({ role: "player", maxTokens: 300, messages });
    cost += costUsd;
    const o = asObj(data);
    result = { say: unquote(asStr(o.say, 300)), act: asStr(o.do, 400) || request.defaultAct };
    if (!soundsRepetitive(`${result.say} ${result.act}`, request.recentLines)) break;
    messages.push(
      { role: "assistant", content: JSON.stringify({ say: result.say, do: result.act }) },
      { role: "user", content: request.rejectMessage },
    );
  }
  return { ...result, costUsd: cost };
}
