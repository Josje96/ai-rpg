export type RoleModelConfig = {
  gm: string;
  player: string;
};

/** Resolve models independently by role, with a cost-conscious shared default. */
export function getModelConfig(
  env: Record<string, string | undefined> = process.env,
): RoleModelConfig {
  const shared = env.MODEL;
  return {
    gm: env.GM_MODEL ?? shared ?? "openai/gpt-6-luna",
    player: env.PLAYER_MODEL ?? shared ?? "qwen/qwen3.7-flash",
  };
}

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";
const EFFORTS: readonly ReasoningEffort[] = ["none", "minimal", "low", "medium", "high"];

/**
 * How much hidden reasoning each role may spend. Reasoning tokens count against max_tokens and add latency,
 * so the GM gets a little for rules judgement and players get none by default.
 */
export function getReasoningConfig(
  env: Record<string, string | undefined> = process.env,
): Record<keyof RoleModelConfig, ReasoningEffort> {
  const pick = (value: string | undefined, fallback: ReasoningEffort) =>
    EFFORTS.includes(value as ReasoningEffort) ? (value as ReasoningEffort) : fallback;
  return { gm: pick(env.GM_REASONING, "low"), player: pick(env.PLAYER_REASONING, "none") };
}
