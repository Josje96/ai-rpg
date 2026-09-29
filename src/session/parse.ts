/**
 * JSON validation helpers for model replies. The keeper proposes; the engine disposes —
 * everything a model says is parsed, clamped and dropped here before it touches game state.
 */
export type Raw = Record<string, unknown>;

export const asObj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
export const asStr = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const clamp = (v: unknown, min: number, max: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : 0;

export type Choice = { prompt: string; options: string[] };

/** A keeper-offered choice for the acting player; null unless well-formed. */
export function parseChoice(raw: unknown): Choice | null {
  const o = asObj(raw);
  const prompt = asStr(o.prompt, 240);
  const options = (Array.isArray(o.options) ? o.options : []).map((x) => asStr(x, 140)).filter(Boolean).slice(0, 4);
  return prompt && options.length >= 2 ? { prompt, options } : null;
}

/** Models sometimes wrap dialogue in its own quotes; the game adds them. */
export const unquote = (text: string): string => text.replace(/^["'\u201c\u201d\s]+|["'\u201c\u201d\s]+$/g, "");
