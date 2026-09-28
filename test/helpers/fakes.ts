import type { ChatMessage, JsonCompletion, ModelClient } from "../../src/ai/provider.js";
import type { GameIO } from "../../src/hunt/game.js";

/** Scripted model: returns queued replies per role and records every request. */
export class FakeModel implements ModelClient {
  readonly calls: { role: string; messages: ChatMessage[] }[] = [];
  constructor(private readonly replies: { gm: unknown[]; player: unknown[] }) {}

  async completeJson(input: { role: "gm" | "player"; messages: ChatMessage[] }): Promise<JsonCompletion> {
    this.calls.push({ role: input.role, messages: input.messages });
    const queue = this.replies[input.role];
    if (!queue.length) throw new Error(`FakeModel: no ${input.role} reply left (call ${this.calls.length})`);
    const next = queue.shift();
    if (next instanceof Error) throw next;
    return { data: next, costUsd: 0.001 };
  }

  lastTask(): string {
    return this.calls.at(-1)?.messages.at(-1)?.content ?? "";
  }
}

/** Scripted player input; records everything shown. */
export class ScriptIO implements GameIO {
  readonly shown: { kind: string; text: string; who?: string }[] = [];
  readonly prompts: string[] = [];
  constructor(private readonly answers: string[]) {}

  show(kind: string, text: string, who?: string): void {
    this.shown.push(who === undefined ? { kind, text } : { kind, text, who });
  }
  /** Every art call, all sizes (largest first). Also recorded in `shown` as kind "art" with the small size. */
  readonly arts: (readonly string[])[] = [];
  art(variants: readonly string[]): void {
    this.arts.push(variants);
    this.shown.push({ kind: "art", text: variants.at(-1) ?? "" });
  }
  async ask(prompt: string): Promise<string> {
    this.prompts.push(prompt);
    const next = this.answers.shift();
    if (next === undefined) throw new Error(`ScriptIO ran out of answers at prompt: ${prompt}`);
    return next;
  }
  async choose(prompt: string, options: readonly string[]): Promise<number> {
    const raw = await this.ask(`${prompt} ${options.join(" | ")}`);
    const n = Number(raw) - 1;
    if (!(n >= 0 && n < options.length)) throw new Error(`bad choice ${raw} for ${prompt}`);
    return n;
  }
  async confirm(prompt: string): Promise<boolean> {
    return (await this.ask(prompt)).toLowerCase() === "y";
  }
  busy(): () => void {
    return () => {};
  }
  remaining(): number {
    return this.answers.length;
  }
  text(kind?: string): string {
    return this.shown.filter((s) => !kind || s.kind === kind).map((s) => s.text).join("\n");
  }
}

/** Deterministic random source: returns queued values (clamped into range), then min. */
export function scriptedRandom(values: number[]) {
  return (min: number, maxExclusive: number) => {
    const v = values.shift();
    return v === undefined ? min : Math.min(maxExclusive - 1, Math.max(min, v));
  };
}
