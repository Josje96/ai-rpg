import type { RoleModelConfig } from "./model-config.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type JsonCompletion = {
  data: unknown;
  costUsd: number;
};

/** Provider-neutral contract: ask a role's model for one JSON object. Callers validate the shape. */
export interface ModelClient {
  completeJson(input: {
    role: keyof RoleModelConfig;
    messages: ChatMessage[];
    maxTokens?: number;
  }): Promise<JsonCompletion>;
}

export class ModelError extends Error {}

/** Pull the first JSON object out of a reply that may be wrapped in prose or code fences. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
  }
  throw new ModelError(`Model reply wasn't JSON: ${text.slice(0, 160)}`);
}
