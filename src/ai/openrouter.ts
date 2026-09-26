import { getModelConfig, getReasoningConfig, type ReasoningEffort, type RoleModelConfig } from "./model-config.js";
import { extractJson, ModelError, type ChatMessage, type JsonCompletion, type ModelClient } from "./provider.js";

type Fetch = typeof fetch;

/** OpenRouter (or any OpenAI-compatible endpoint via OPENROUTER_BASE_URL). */
export class OpenRouterClient implements ModelClient {
  readonly models: RoleModelConfig;
  readonly reasoning: Record<keyof RoleModelConfig, ReasoningEffort>;
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: Fetch;
  readonly #sleep: (ms: number) => Promise<void>;

  constructor(options: {
    apiKey: string;
    models?: RoleModelConfig;
    reasoning?: Record<keyof RoleModelConfig, ReasoningEffort>;
    baseUrl?: string;
    fetchImpl?: Fetch;
    sleep?: (ms: number) => Promise<void>;
  }) {
    if (!options.apiKey) throw new ModelError("OPENROUTER_API_KEY is not set (put it in .env).");
    this.#apiKey = options.apiKey;
    this.models = options.models ?? getModelConfig();
    this.reasoning = options.reasoning ?? getReasoningConfig();
    this.#baseUrl = (options.baseUrl ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
    this.#fetch = options.fetchImpl ?? fetch;
    this.#sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  static fromEnv(env: Record<string, string | undefined> = process.env): OpenRouterClient {
    return new OpenRouterClient({
      apiKey: env.OPENROUTER_API_KEY ?? "",
      models: getModelConfig(env),
      reasoning: getReasoningConfig(env),
      ...(env.OPENROUTER_BASE_URL ? { baseUrl: env.OPENROUTER_BASE_URL } : {}),
    });
  }

  async completeJson(input: { role: keyof RoleModelConfig; messages: ChatMessage[]; maxTokens?: number }): Promise<JsonCompletion> {
    const messages = [...input.messages];
    // Some providers (e.g. Alibaba for Qwen) reject json_object mode unless the prompt mentions JSON.
    if (!messages.some((m) => /json/i.test(m.content))) {
      messages.push({ role: "system", content: "Reply with only a JSON object." });
    }
    let cost = 0;
    let maxTokens = input.maxTokens ?? 1200;
    // One retry if the reply isn't JSON: with a bigger budget if it was cut off, otherwise telling the model what went wrong.
    for (let attempt = 0; attempt < 2; attempt++) {
      const { text, costUsd, truncated } = await this.#post(input.role, messages, maxTokens);
      cost += costUsd;
      if (truncated && attempt === 0) {
        maxTokens *= 2;
        continue;
      }
      try {
        return { data: extractJson(text), costUsd: cost };
      } catch (error) {
        if (attempt === 1) throw error;
        messages.push({ role: "assistant", content: text }, { role: "user", content: "That wasn't valid JSON. Reply with only the JSON object." });
      }
    }
    throw new ModelError("unreachable");
  }

  async #post(role: keyof RoleModelConfig, messages: ChatMessage[], maxTokens: number): Promise<{ text: string; costUsd: number; truncated: boolean }> {
    const effort = this.reasoning[role];
    const body = JSON.stringify({
      model: this.models[role],
      messages,
      // Reasoning tokens come out of max_tokens, so leave room for them.
      max_tokens: maxTokens + (effort === "none" ? 0 : 1500),
      reasoning: { effort, exclude: true },
      temperature: role === "gm" ? 0.8 : 0.9,
      response_format: { type: "json_object" },
      usage: { include: true },
    });
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await this.#sleep(1000 * 2 ** attempt);
      let res: Response;
      try {
        res = await this.#fetch(`${this.#baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.#apiKey}`,
            "content-type": "application/json",
            "x-title": "tabletop-ai",
          },
          body,
          signal: AbortSignal.timeout(120_000),
        });
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        continue;
      }
      const json = (await res.json().catch(() => null)) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: { cost?: number };
        error?: { message?: string; metadata?: { raw?: unknown; provider_name?: string } };
      } | null;
      if (!res.ok || !json) {
        const meta = json?.error?.metadata;
        const detail = meta?.raw ? ` (${meta.provider_name ?? "provider"}: ${String(typeof meta.raw === "string" ? meta.raw : JSON.stringify(meta.raw)).slice(0, 300)})` : "";
        throw new ModelError(`Model request failed: HTTP ${res.status} ${json?.error?.message ?? ""}${detail}`.trim());
      }
      const text = json.choices?.[0]?.message?.content ?? "";
      if (!text) {
        lastError = "empty reply";
        continue;
      }
      return { text, costUsd: json.usage?.cost ?? 0, truncated: json.choices?.[0]?.finish_reason === "length" };
    }
    throw new ModelError(`Model unavailable after retries (${lastError}).`);
  }
}
