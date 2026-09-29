import { STATS, type Stat, type Stats } from "./rules.js";

/** Original runner archetypes written for this project. No published text. */

export type Archetype = {
  id: string;
  name: string;
  pitch: string;
  statOptions: readonly Stats[];
  /** Skill tags the player picks two of. */
  skills: readonly string[];
  gearOptions: readonly (readonly string[])[];
};

const s = (muscle: number, reflex: number, wits: number, style: number): Stats => ({ muscle, reflex, wits, style });

export const ARCHETYPES: readonly Archetype[] = [
  {
    id: "street-samurai",
    name: "The Street Samurai",
    pitch: "Muscle and chrome. You go through doors, whether they're open or not.",
    statOptions: [s(4, 3, 1, 1), s(5, 2, 1, 0)],
    skills: ["blades", "firearms", "intimidation", "vehicle handling"],
    gearOptions: [
      ["armored jacket", "cyber arm", "combat axe"],
      ["armored jacket", "smart pistol", "grenade (flash)"],
    ],
  },
  {
    id: "infiltrator",
    name: "The Infiltrator",
    pitch: "Locks, cameras, guard rotations. You're already inside before anyone notices.",
    statOptions: [s(2, 4, 2, 1), s(1, 4, 3, 0)],
    skills: ["stealth", "locksmith", "climbing", "disguise"],
    gearOptions: [
      ["chameleon suit", "lockpick kit", "grapple glove"],
      ["sound dampeners", "bypass kit", "smoke pellets"],
    ],
  },
  {
    id: "face",
    name: "The Face",
    pitch: "Every guard has a boss, every boss has a weakness, and you are that weakness.",
    statOptions: [s(1, 2, 2, 4), s(2, 1, 2, 4)],
    skills: ["negotiation", "con artistry", "etiquette", "impersonation"],
    gearOptions: [
      ["tailored suit", "fake SIN", "voice modulator"],
      ["designer coat", "burner contacts", "credit chip (deep)"],
    ],
  },
  {
    id: "deck-jockey",
    name: "The Deck Jockey",
    pitch: "Cameras, maglocks, paydata. The building obeys whoever owns its code.",
    statOptions: [s(1, 2, 4, 2), s(1, 1, 4, 3)],
    skills: ["hacking", "electronics", "drones", "data search"],
    gearOptions: [
      ["cyberdeck", "jammer", "repair kit"],
      ["control rig", "crawler drone", "signal booster"],
    ],
  },
  {
    id: "spell-slinger",
    name: "The Spell Slinger",
    pitch: "The sprawl forgot magic exists. You're about to remind it.",
    statOptions: [s(1, 2, 3, 3), s(2, 1, 3, 3)],
    skills: ["spellcasting", "astral perception", "ritual magic", "spirit binding"],
    gearOptions: [
      ["force-focus charm", "reagents pouch", "sturdy walking stick"],
      ["warding tattoo", "spirit fetish", "old grimoire (borrowed)"],
    ],
  },
];

export function archetype(id: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

export const statLine = (stats: Stats): string => STATS.map((st: Stat) => `${st} ${stats[st]}`).join(", ");
