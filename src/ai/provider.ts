import type { RoleModelConfig } from "./model-config.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentTurn = {
  dialogue: string;
  action?: Record<string, unknown>;
  toolCalls?: ToolCall[];
};

/** Provider-neutral contract; concrete HTTP clients can be added per provider. */
export interface ModelProvider {
  generateTurn(input: {
    role: keyof RoleModelConfig;
    model: string;
    messages: ChatMessage[];
  }): Promise<AgentTurn>;
}
