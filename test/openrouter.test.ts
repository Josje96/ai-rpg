import assert from "node:assert/strict";
import test from "node:test";
import { OpenRouterClient } from "../src/ai/openrouter.js";
import { getReasoningConfig } from "../src/ai/model-config.js";

function fakeFetch(replies: { status?: number; content?: string; finish?: string }[], bodies: unknown[]) {
  return (async (_url: string, init: { body: string }) => {
    bodies.push(JSON.parse(init.body));
    const r = replies.shift()!;
    return new Response(JSON.stringify({ choices: [{ message: { content: r.content ?? "" }, finish_reason: r.finish ?? "stop" }], usage: { cost: 0.01 } }), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
}

const client = (replies: Parameters<typeof fakeFetch>[0], bodies: unknown[]) => new OpenRouterClient({
  apiKey: "k", models: { gm: "g", player: "p" }, reasoning: { gm: "low", player: "none" },
  fetchImpl: fakeFetch(replies, bodies), sleep: async () => {},
});

test("sends reasoning effort per role and leaves token room for it", async () => {
  const bodies: Record<string, unknown>[] = [];
  const c = client([{ content: '{"a":1}' }, { content: '{"b":2}' }], bodies);
  await c.completeJson({ role: "gm", messages: [], maxTokens: 500 });
  await c.completeJson({ role: "player", messages: [], maxTokens: 500 });
  assert.deepEqual(bodies[0]!.reasoning, { effort: "low", exclude: true });
  assert.equal(bodies[0]!.max_tokens, 2000);
  assert.equal(bodies[1]!.max_tokens, 500);
});

test("retries a truncated reply with a bigger budget, and 5xx errors", async () => {
  const bodies: Record<string, unknown>[] = [];
  const c = client([{ status: 503 }, { content: '{"narr', finish: "length" }, { content: '{"ok":true}' }], bodies);
  const r = await c.completeJson({ role: "player", messages: [], maxTokens: 400 });
  assert.deepEqual(r.data, { ok: true });
  assert.deepEqual(bodies.map((b) => b.max_tokens), [400, 400, 800]);
  assert.ok(Math.abs(r.costUsd - 0.02) < 1e-9);
});

test("asks again when the reply isn't JSON", async () => {
  const bodies: { messages: { content: string }[] }[] = [];
  const c = client([{ content: "Sure! Here it is" }, { content: 'text {"x": 1} more' }], bodies as never);
  assert.deepEqual((await c.completeJson({ role: "gm", messages: [] })).data, { x: 1 });
  assert.match(bodies[1]!.messages.at(-1)!.content, /valid JSON/);
});

test("reasoning config defaults and rejects junk", () => {
  assert.deepEqual(getReasoningConfig({}), { gm: "low", player: "none" });
  assert.deepEqual(getReasoningConfig({ GM_REASONING: "none", PLAYER_REASONING: "lots" }), { gm: "none", player: "none" });
});

test("mentions JSON in the prompt when the caller didn't (some providers require it)", async () => {
  const bodies: { messages: { content: string }[] }[] = [];
  const c = client([{ content: '{"a":1}' }, { content: '{"a":1}' }], bodies as never);
  await c.completeJson({ role: "player", messages: [{ role: "user", content: "say something" }] });
  assert.match(bodies[0]!.messages.at(-1)!.content, /JSON/);
  await c.completeJson({ role: "player", messages: [{ role: "user", content: "reply in json" }] });
  assert.equal(bodies[1]!.messages.length, 1);
});
