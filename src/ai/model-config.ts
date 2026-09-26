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
