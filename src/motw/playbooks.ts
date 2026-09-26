import type { BasicMoveId, Stat, Stats } from "./rules.js";

/** Original hunter types written for this project (not the book's playbooks). */

export type MoveEffect =
  | { kind: "bonus"; move: BasicMoveId; amount: 1 }
  | { kind: "stat-swap"; move: BasicMoveId; stat: Stat };

export type SignatureMove = {
  id: string;
  name: string;
  text: string;
  /** Mechanical effect the engine applies automatically; otherwise it's for the keeper to honor. */
  effect?: MoveEffect;
};

export type Weapon = { name: string; harm: number; tags: readonly string[] };

export type Playbook = {
  id: string;
  name: string;
  pitch: string;
  statOptions: readonly Stats[];
  moves: readonly SignatureMove[];
  gearOptions: readonly (readonly Weapon[])[];
};

const s = (charm: number, cool: number, sharp: number, tough: number, weird: number): Stats =>
  ({ charm, cool, sharp, tough, weird });

export const PLAYBOOKS: readonly Playbook[] = [
  {
    id: "old-hand",
    name: "The Old Hand",
    pitch: "You've been hunting for years. Scars, habits, and a trunk full of weapons.",
    statOptions: [s(-1, 1, 1, 2, 0), s(0, 2, 0, 2, -1)],
    moves: [
      { id: "been-here-before", name: "Been here before", text: "You've seen most of this before. Take +1 when you investigate a mystery.", effect: { kind: "bonus", move: "investigate", amount: 1 } },
      { id: "steady-aim", name: "Steady aim", text: "Take +1 when you kick some ass.", effect: { kind: "bonus", move: "kick-some-ass", amount: 1 } },
      { id: "patch-job", name: "Patch job", text: "You can stitch up a hunter mid-scene: heal 1 harm, or stop them being unstable." },
      { id: "cold-read", name: "Seen worse", text: "Use Cool instead of Sharp to read a bad situation.", effect: { kind: "stat-swap", move: "read-situation", stat: "cool" } },
    ],
    gearOptions: [
      [{ name: "sawn-off shotgun", harm: 3, tags: ["close", "loud", "messy"] }, { name: "silver knife", harm: 1, tags: ["hand", "silver"] }],
      [{ name: "hunting rifle", harm: 2, tags: ["far", "loud"] }, { name: "machete", harm: 2, tags: ["hand", "messy"] }],
    ],
  },
  {
    id: "bookworm",
    name: "The Bookworm",
    pitch: "Libraries, archives, forum threads at 3 a.m. You know what the monster is before anyone else.",
    statOptions: [s(0, 1, 2, -1, 1), s(1, 0, 2, 0, 0)],
    moves: [
      { id: "cross-reference", name: "Cross-reference", text: "There's always a source. Take +1 when you investigate a mystery.", effect: { kind: "bonus", move: "investigate", amount: 1 } },
      { id: "i-read-about-this", name: "I read about this", text: "Once per mystery, name a weakness you think the monster has; the keeper tells you if you're warm or cold." },
      { id: "field-notes", name: "Field notes", text: "You work from written rituals. Use Sharp instead of Weird when you use magic.", effect: { kind: "stat-swap", move: "use-magic", stat: "sharp" } },
      { id: "calm-explainer", name: "Calm explainer", text: "People trust a calm explanation. Take +1 when you manipulate someone.", effect: { kind: "bonus", move: "manipulate", amount: 1 } },
    ],
    gearOptions: [
      [{ name: "old revolver", harm: 2, tags: ["close", "loud"] }],
      [{ name: "iron crowbar", harm: 1, tags: ["hand", "iron"] }, { name: "flare gun", harm: 1, tags: ["close", "fire"] }],
    ],
  },
  {
    id: "sensitive",
    name: "The Sensitive",
    pitch: "You hear what the dead whisper and feel where the air goes wrong.",
    statOptions: [s(1, 0, 1, -1, 2), s(0, 1, 1, -1, 2)],
    moves: [
      { id: "cold-spot", name: "Cold spot", text: "You feel wrongness in the air. Take +1 when you read a bad situation.", effect: { kind: "bonus", move: "read-situation", amount: 1 } },
      { id: "speak-with-echoes", name: "Speak with echoes", text: "You can ask the lingering dead of a place one question; they answer, but not always kindly." },
      { id: "warding-circle", name: "Warding circle", text: "Take +1 when you use magic.", effect: { kind: "bonus", move: "use-magic", amount: 1 } },
      { id: "empath", name: "Empath", text: "You feel what people feel. Use Weird instead of Charm to manipulate someone.", effect: { kind: "stat-swap", move: "manipulate", stat: "weird" } },
    ],
    gearOptions: [
      [{ name: "blessed iron nail", harm: 1, tags: ["hand", "iron", "holy"] }],
      [{ name: "salt shotgun shells", harm: 1, tags: ["close", "salt"] }],
    ],
  },
  {
    id: "guardian",
    name: "The Guardian",
    pitch: "Someone has to stand between the monster and the innocent. That's you.",
    statOptions: [s(0, 1, 0, 2, 0), s(1, 1, 0, 2, -1)],
    moves: [
      { id: "shield", name: "Shield", text: "Take +1 when you protect someone.", effect: { kind: "bonus", move: "protect", amount: 1 } },
      { id: "thick-skin", name: "Thick skin", text: "Harm you take while protecting someone is reduced by 1." },
      { id: "rally", name: "Rally", text: "Take +1 when you help out another hunter.", effect: { kind: "bonus", move: "help-out", amount: 1 } },
      { id: "brawler", name: "Brawler", text: "Take +1 when you kick some ass.", effect: { kind: "bonus", move: "kick-some-ass", amount: 1 } },
    ],
    gearOptions: [
      [{ name: "fire axe", harm: 3, tags: ["hand", "messy", "heavy"] }],
      [{ name: "riot shield", harm: 1, tags: ["hand", "armor"] }, { name: "baton", harm: 1, tags: ["hand"] }],
    ],
  },
  {
    id: "charmer",
    name: "The Charmer",
    pitch: "Everybody talks to you. Cops, witnesses, the bartender who saw everything.",
    statOptions: [s(2, 1, 1, -1, 0), s(2, 0, 1, 1, -1)],
    moves: [
      { id: "silver-tongue", name: "Silver tongue", text: "Take +1 when you manipulate someone.", effect: { kind: "bonus", move: "manipulate", amount: 1 } },
      { id: "i-know-a-guy", name: "I know a guy", text: "Once per mystery, you have a useful contact in town; tell the keeper who." },
      { id: "fast-talk", name: "Fast talk", text: "You talk your way through danger. Use Charm instead of Cool to act under pressure.", effect: { kind: "stat-swap", move: "act-under-pressure", stat: "charm" } },
      { id: "people-watcher", name: "People watcher", text: "Witnesses open up to you. Use Charm instead of Sharp to investigate a mystery.", effect: { kind: "stat-swap", move: "investigate", stat: "charm" } },
    ],
    gearOptions: [
      [{ name: "compact pistol", harm: 2, tags: ["close", "concealed"] }],
      [{ name: "taser", harm: 1, tags: ["close", "stun"] }, { name: "car keys to a fast car", harm: 0, tags: ["escape"] }],
    ],
  },
  {
    id: "touched",
    name: "The Touched",
    pitch: "Something got into you once and never fully left. It makes you strong, and it scares you.",
    statOptions: [s(-1, 1, 0, 1, 2), s(0, 0, 0, 2, 1)],
    moves: [
      { id: "claws-out", name: "Claws out", text: "Your natural attack deals 2 harm, and you take +1 when you kick some ass with it.", effect: { kind: "bonus", move: "kick-some-ass", amount: 1 } },
      { id: "know-your-own", name: "Know your own", text: "You sense your own kind. Use Weird instead of Sharp to investigate a mystery.", effect: { kind: "stat-swap", move: "investigate", stat: "weird" } },
      { id: "quick-mend", name: "Quick mend", text: "Between scenes, you heal 1 harm on your own." },
      { id: "unnerving", name: "Unnerving", text: "People sense what you are. Use Weird instead of Charm to manipulate someone.", effect: { kind: "stat-swap", move: "manipulate", stat: "weird" } },
    ],
    gearOptions: [
      [{ name: "claws and teeth", harm: 2, tags: ["hand", "innate"] }],
      [{ name: "claws and teeth", harm: 2, tags: ["hand", "innate"] }, { name: "chain", harm: 1, tags: ["hand", "area"] }],
    ],
  },
];

export function playbook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** Stat and bonus the engine uses for a basic move, after the hunter's signature moves. */
export function effectiveRoll(
  hunter: { stats: Stats; playbook: string; moves: readonly string[] },
  moveId: BasicMoveId,
  defaultStat: Stat,
): { stat: Stat; bonus: number; sources: string[] } {
  const book = playbook(hunter.playbook);
  let stat = defaultStat;
  let bonus = 0;
  const sources: string[] = [];
  for (const move of book?.moves ?? []) {
    if (!hunter.moves.includes(move.id) || !move.effect || move.effect.move !== moveId) continue;
    if (move.effect.kind === "stat-swap" && hunter.stats[move.effect.stat] > hunter.stats[stat]) {
      stat = move.effect.stat;
      sources.push(move.name);
    } else if (move.effect.kind === "bonus") {
      bonus += move.effect.amount;
      sources.push(move.name);
    }
  }
  return { stat, bonus, sources };
}
