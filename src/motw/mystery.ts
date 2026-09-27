/** A mystery is the keeper's hidden prep: what's really going on, and how the week goes if nobody stops it. */

export type MonsterAttack = { name: string; harm: number; tags: readonly string[] };

export type Monster = {
  name: string;
  kind: string;
  motivation: string;
  powers: readonly string[];
  /** How it can actually be stopped. It can't be finished off any other way. */
  weakness: string;
  attacks: readonly MonsterAttack[];
  armor: number;
  harmCapacity: number;
};

export type Minion = { name: string; description: string; harm: number; harmCapacity: number };
export type Bystander = { name: string; description: string };
export type Location = { name: string; description: string };

export type Mystery = {
  id: string;
  title: string;
  /** One line for the mystery menu. */
  pitch?: string;
  /** Content warnings, shown before choosing. */
  warnings?: readonly string[];
  /** Title art shown when the hunt starts (plain ASCII, at most 40 columns). */
  art?: string;
  /** License attributions for material this mystery draws on. */
  credits?: readonly string[];
  /** Read aloud to the players at the start. */
  hook: string;
  /** Keeper-only summary of the truth. */
  truth: string;
  monster: Monster;
  minions: readonly Minion[];
  bystanders: readonly Bystander[];
  locations: readonly Location[];
  clues: readonly string[];
  /** Six escalating steps; the last one is the monster winning. */
  countdown: readonly string[];
};

export const COUNTDOWN_LENGTH = 6;

const str = (v: unknown, max = 2000): string | null =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
const int = (v: unknown, min: number, max: number): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : null;
const list = <T>(v: unknown, parse: (x: unknown) => T | null, max: number): T[] =>
  Array.isArray(v) ? v.map(parse).filter((x): x is T => x !== null).slice(0, max) : [];
const named = (v: unknown) => {
  const o = v as Record<string, unknown> | null;
  const name = str(o?.name, 80);
  const description = str(o?.description, 600);
  return name && description ? { name, description } : null;
};

/** Validate a model-generated mystery. Returns the problems if it's unusable. */
export function parseMystery(raw: unknown, id: string): { mystery: Mystery } | { errors: string[] } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const m = (o.monster ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const need = <T>(value: T | null, field: string): T => {
    if (value === null || (Array.isArray(value) && value.length === 0)) errors.push(`missing ${field}`);
    return value as T;
  };
  const attacks = list(m.attacks, (a) => {
    const x = a as Record<string, unknown> | null;
    const name = str(x?.name, 80);
    const harm = int(x?.harm, 1, 4);
    return name && harm !== null ? { name, harm, tags: list(x?.tags, (t) => str(t, 20), 4) } : null;
  }, 4);
  const mystery: Mystery = {
    id,
    title: need(str(o.title, 100), "title"),
    hook: need(str(o.hook, 1200), "hook"),
    truth: need(str(o.truth, 2000), "truth"),
    monster: {
      name: need(str(m.name, 80), "monster.name"),
      kind: need(str(m.kind, 120), "monster.kind"),
      motivation: need(str(m.motivation, 400), "monster.motivation"),
      powers: need(list(m.powers, (p) => str(p, 300), 6), "monster.powers"),
      weakness: need(str(m.weakness, 400), "monster.weakness"),
      attacks: need(attacks, "monster.attacks"),
      armor: int(m.armor, 0, 2) ?? 1,
      harmCapacity: int(m.harmCapacity, 5, 12) ?? 8,
    },
    minions: list(o.minions, (v) => {
      const base = named(v);
      const x = v as Record<string, unknown>;
      return base ? { ...base, harm: int(x.harm, 0, 3) ?? 1, harmCapacity: int(x.harmCapacity, 1, 6) ?? 3 } : null;
    }, 4),
    bystanders: need(list(o.bystanders, named, 6), "bystanders"),
    locations: need(list(o.locations, named, 8), "locations"),
    clues: need(list(o.clues, (c) => str(c, 400), 12), "clues"),
    countdown: list(o.countdown, (c) => str(c, 400), COUNTDOWN_LENGTH),
  };
  if (mystery.countdown.length !== COUNTDOWN_LENGTH) errors.push(`countdown must have ${COUNTDOWN_LENGTH} steps`);
  if (mystery.clues.length < 4) errors.push("need at least 4 clues");
  return errors.length ? { errors } : { mystery };
}
