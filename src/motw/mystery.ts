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

export const MERCY_LAKE: Mystery = {
  id: "mercy-lake",
  title: "The Lantern at Mercy Lake",
  hook:
    "Mercy Lake, late October. Three people have drowned in two weeks, all on calm nights. Each was last seen walking " +
    "into the water toward a small green light out past the dock. The town calls it grief, or drink. The one survivor, " +
    "a fisherman pulled out half-frozen, keeps saying his dead wife was calling him home. The diner by the water still " +
    "has the victims' photos taped to the register.",
  truth:
    "In 1911 the ferry Constance sank in a storm; ferryman Abel Crane went down with his lantern lit, trying to reach " +
    "the passengers. His body was never recovered; the town quietly buried an empty coffin under the old boathouse. " +
    "Last month teenagers broke into the boathouse and pried the rusted ferry lantern off its hook. Crane's spirit, " +
    "bound to the lantern, woke believing the crossing never finished. He is gathering a crew to row the lost across, " +
    "calling people in the voices of the dead they miss.",
  monster: {
    name: "The Lantern Keeper",
    kind: "Bound spirit of a drowned ferryman",
    motivation: "To finish the crossing: gather a crew and row every soul the lake remembers to the far shore.",
    powers: [
      "Speaks in the voice of whoever the listener has lost.",
      "Anyone who stares into the green light is lulled and walks toward it.",
      "Commands the lake within a stone's throw of the water: waves, undertow, fog.",
      "Only solid while the lantern is lit and in his hand; otherwise mist.",
    ],
    weakness:
      "Carry the lantern back to Abel Crane's empty grave under the boathouse floor and break its glass there, " +
      "releasing him. Dousing or smashing it anywhere else only makes him vanish until the next night.",
    attacks: [
      { name: "drag under", harm: 3, tags: ["close", "water"] },
      { name: "cold grasp", harm: 2, tags: ["hand"] },
    ],
    armor: 1,
    harmCapacity: 8,
  },
  minions: [
    { name: "The Drowned Crew", description: "The three victims, grey and dripping, rowing silently. They grab and hold rather than strike.", harm: 1, harmCapacity: 3 },
  ],
  bystanders: [
    { name: "Dot Hale", description: "Runs the lakeside diner. Her son Eli was the second victim. She has started leaving the back door open at night." },
    { name: "Sheriff Ray Okafor", description: "Tired, decent, out of his depth. Wants this to be accidents and will obstruct anyone making a scene." },
    { name: "Father Luis Mendes", description: "Keeps the parish ledgers, including the 1911 ferry burial records. Curious, not credulous." },
    { name: "Kit Varga", description: "Sixteen. Filmed the green light on her phone; one of the kids who broke into the boathouse, and terrified to admit it." },
    { name: "Hollis Grey", description: "The surviving fisherman. Drinking hard at the bar; remembers the light had a shape holding it." },
  ],
  locations: [
    { name: "The public dock", description: "Where the light is seen. Waterline marks are wrong: higher than the lake has been in years." },
    { name: "Hale's Diner", description: "Warm, loud, full of locals and rumors. Photos of the victims at the register." },
    { name: "St. Brendan's parish office", description: "Ledgers, a memorial plaque to the Constance, a locked records room." },
    { name: "The old boathouse", description: "Condemned, chained shut, one window forced. An empty lantern hook; a loose section of floor." },
    { name: "Chapel Island", description: "A ruined chapel on an islet; the ferry's old destination. Rowboats go missing toward it." },
    { name: "Mercy Lake Historical Society", description: "Two rooms above the library; a volunteer who loves an audience." },
  ],
  clues: [
    "Kit's video: the light is a lantern, held at the height of a man's hand, and the waterline rises as it moves.",
    "All three victims had recently lost someone close; each told a friend they 'heard' that person.",
    "Hollis saw a figure in an oilskin coat holding the light, and felt his dead wife's hand on his.",
    "The parish plaque lists the Constance's 1911 sinking: 14 passengers and ferryman Abel Crane, 'lost with his light'.",
    "Parish burial record: Abel Crane interred 'without remains' beneath the ferry boathouse, by his own wish.",
    "The boathouse was broken into last month; the lantern hook is empty and scratched fresh.",
    "Historical society photo of Crane on his ferry with a distinctive green-glassed lantern.",
    "A folk rhyme the volunteer knows: 'Bring the light home, break it on his stone, and Abel rows alone.'",
  ],
  countdown: [
    "Day: another green light on the water; a dog won't stop howling at the dock.",
    "Shadows: Kit starts hearing her late grandmother whispering from the lake.",
    "Sunset: fog rolls in off the water; phones and radios die near the shore.",
    "Nightfall: Dot Hale walks out to the dock, calling for Eli.",
    "Midnight: the Drowned Crew rises and takes Dot (or whoever is at the water) into the boat.",
    "Dawn: the ferry crosses with its new crew, and the lake keeps calling for more.",
  ],
};

export const BUILT_IN_MYSTERIES: readonly Mystery[] = [MERCY_LAKE];
