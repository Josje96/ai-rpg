import type { Mystery } from "../mystery.js";
import { SOURCE_CREDITS } from "./credits.js";

/** Built on Liminal Horror's Frog-Men (hidden amphibian folk who want to free their master) and Dead Gods. */
export const SWEETWATER: Mystery = {
  id: "sweetwater",
  title: "Sweetwater",
  pitch: "A reservoir town's founding families have been feeding something under the dam for a hundred years.",
  warnings: ["drowning", "cults", "body changes"],
  credits: SOURCE_CREDITS,
  hook:
    "Sweetwater, Georgia, sits above a reservoir that drowned the old town in 1924. It's a pretty place: church " +
    "suppers, bass tournaments, Founders' Night every June. This summer a drought has dropped the water so far that " +
    "the old church steeple shows above the surface. A state surveyor's truck was found at the boat ramp with the " +
    "keys still in it. And the fishing guide who called you says the locals keep smiling at him like they're waiting " +
    "for something.",
  truth:
    "Something sleeps in the mud beneath the drowned church: a Dead God, a fragment of something vast that once had " +
    "a claim on this world. The three founding families of Sweetwater (Marlowe, Pruitt and Addison) made a pact with it " +
    "when they built the dam. Every twenty-five years they drown outsiders to feed it, and over generations the " +
    "families have changed: webbed hands, damp skin, and for the eldest, Frog-Men who hide as men and cloud minds. " +
    "This is the year the Sleeper can turn over and wake. On Founders' Night, Deacon Amos Marlowe will open the " +
    "floodgates, drowning the lower town as the final offering.",
  monster: {
    name: "Deacon Amos Marlowe",
    kind: "Frog-Man elder and high priest of the Sleeper Under Sweetwater",
    motivation: "To finish the century's rite on Founders' Night, wake the Sleeper, and let his people inherit the valley.",
    powers: [
      "Clouds minds: most people see a kindly old deacon; cameras and the unafraid see what he really is.",
      "Commands the families' Frog-Men and holds the town's institutions: church, council, sheriff.",
      "In or near water he is fast, strong, and hard to hold; his tongue can drag a grown man under.",
      "The Sleeper stirs when he calls it: the reservoir churns, and the mud breathes.",
    ],
    weakness:
      "Close the old sluice gate beneath the dam with the founders' iron key from the town hall display, sealing the " +
      "drowned church chamber before Founders' Night. Without the rite the Sleeper sinks back, and the Deacon's hold on " +
      "the town (and his strength) breaks.",
    attacks: [
      { name: "claws", harm: 2, tags: ["hand"] },
      { name: "tongue lash and drag", harm: 3, tags: ["close", "water"] },
    ],
    armor: 1,
    harmCapacity: 9,
  },
  minions: [
    { name: "Frog-Men", description: "The families' changed elders: big, strong, damp, patient. Some can pass for men in bad light. They want to stay hidden until the rite.", harm: 2, harmCapacity: 4 },
  ],
  bystanders: [
    { name: "Hattie Marlowe", description: "Sixteen, the Deacon's great-granddaughter. Her fingers have started to web and she's terrified of what she's becoming." },
    { name: "Sheriff Boone Pruitt", description: "Founding-family sheriff. Friendly until the hunters ask the wrong question; will arrest them on Founders' Night." },
    { name: "Wade Kessler", description: "Outsider fishing guide who called the hunters. Two of his clients never came back from the lake." },
    { name: "Lillian Addison-Moore", description: "Town historian, 84. Family, but she's watched this happen four times and is sick of it. Talks in hints." },
    { name: "Dr. Carol Ferris", description: "Town doctor. Treating a dozen founding-family patients for the same 'skin condition' and afraid to ask why." },
  ],
  locations: [
    { name: "Sweetwater Reservoir & dam", description: "Concrete dam, floodgate controls, and a maintenance stair down into the dark." },
    { name: "Old Sweetwater", description: "The drowned town, surfacing in the drought: a steeple, rooftops, a road running into the water." },
    { name: "Town hall founders' display", description: "Glass case: the 1924 charter, a ceremony photo at the dam, and a heavy iron key." },
    { name: "The Marlowe house", description: "Big white house by the water; humid rooms, aquarium tanks, a basement that floods on purpose." },
    { name: "Kessler's fish camp", description: "Wade's cabins and boats at the far end of the lake; someone keeps cutting his lines." },
    { name: "The sluice tunnel", description: "Beneath the dam: an old tunnel sloping down into the drowned church, where the mud breathes." },
  ],
  clues: [
    "Everyone who has vanished at the lake was an outsider: fishermen, a surveyor, tourists. No locals, ever.",
    "Dr. Ferris has a dozen patients with webbing between the fingers and constantly damp skin, all from the Marlowe, Pruitt and Addison families.",
    "The drought has exposed the drowned church steeple; its carvings show a vast coiled shape asleep beneath the building.",
    "Lillian: 'Every twenty-five years someone new drowns in June, and the town throws a party. This is the fourth time I've seen it.'",
    "Phone video from Wade's dock shows what the Deacon really is; in person, everyone swears they saw a kindly old man.",
    "The founders' display: the 1924 charter signed by the three families, a photo of them on the dam, and an iron key labeled 'Old Sluice'.",
    "Hattie: the families pray to 'the one who waits under the water'. This year it wakes, if the gates open on Founders' Night.",
    "The sluice tunnel under the dam runs down into the drowned church; an old iron gate there could still be closed and locked.",
  ],
  countdown: [
    "Calm Before the Storm: the surveyor's truck is towed away and the town says he drove off drunk.",
    "Omens: frogs sing at noon; the reservoir smells of deep mud; the steeple rises further out of the water.",
    "The Plot Thickens: the council asks outsiders to leave before Founders' Night; Wade's cabins burn overnight.",
    "The Horror Exposed: Frog-Men walk openly on the shore at night; one of the hunters' allies goes missing near the water.",
    "Nowhere to Hide: Founders' Night begins; the town gathers on the dam and Sheriff Pruitt arrests the hunters on sight.",
    "No Turning Back: the floodgates open, lower Sweetwater drowns, and the Sleeper turns over and begins to wake.",
  ],
};
