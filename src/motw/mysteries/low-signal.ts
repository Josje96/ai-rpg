import type { Mystery } from "../mystery.js";
import { SOURCE_CREDITS } from "./credits.js";

/** Built on Liminal Horror's Shades (death shadows, harmable only in bright light) and Panopticon (a sinister corporation). */
export const LOW_SIGNAL: Mystery = {
  id: "low-signal",
  title: "Low Signal",
  pitch: "After an 'accident' at a tech campus, the town's shadows came loose, and they're hungry.",
  warnings: ["blackouts", "corporate cover-up", "freezing deaths"],
  credits: SOURCE_CREDITS,
  hook:
    "Marrow Falls, Oregon, is a mill town that got lucky: Panopticon built its Lumen Park research campus on the old " +
    "mill site. Two weeks ago a 'transformer explosion' lit up the sky over the campus. Since then the power keeps " +
    "failing, a healthy man froze to death in his kitchen in July, and people at the diner have started to notice " +
    "something they can't explain: at noon, some of them don't cast a shadow.",
  truth:
    "Panopticon's Penumbra Array was meant to separate light from matter for a stealth contract. When Dr. Imelda Sato " +
    "overloaded it, the focus burned her body away completely and tore loose the shadows of everyone in line of sight. " +
    "Those shadows are now Shades: flat things that slide along surfaces, drink warmth through a numbing touch, and " +
    "can't be hurt unless caught in bright, direct light. Sato's own shadow, the Penumbra, leads them and wants the Array " +
    "opened fully, to pull every shadow in town loose and become solid itself. People without shadows are slowly going " +
    "cold. Panopticon wants the Array back intact and has sent a friendly junior executive to manage the situation.",
  monster: {
    name: "The Penumbra",
    kind: "The shadow of Dr. Imelda Sato, a Shade grown strong",
    motivation: "To open the Array all the way, tear every shadow in Marrow Falls free, and step into the world solid.",
    powers: [
      "Incorporeal and two-dimensional: slides along walls and floors, through cracks, and hides in any darkness.",
      "Only in bright, direct light does it become solid enough to be hurt.",
      "Its numbing touch drains warmth and feeling; it grows stronger as its victims grow cold.",
      "Blacks out lights around it and commands the town's loose Shades.",
    ],
    weakness:
      "Shatter the Penumbra Array's focusing lens in Lab 3 while it is flooded with bright direct light. The torn " +
      "shadows snap back to their owners and the Penumbra is pinned solid, where it can be destroyed.",
    attacks: [
      { name: "numbing touch", harm: 2, tags: ["hand", "cold"] },
      { name: "swallowing dark", harm: 3, tags: ["close", "area"] },
    ],
    armor: 0,
    harmCapacity: 8,
  },
  minions: [
    { name: "Loose Shades", description: "The torn shadows of Marrow Falls residents, flat and hungry, lingering near their owners. Harmless-looking until the lights go out.", harm: 1, harmCapacity: 2 },
  ],
  bystanders: [
    { name: "Nora Pike", description: "Runs the Falls Diner; lost her shadow and keeps her hands wrapped around coffee she can't feel. Knows everyone's business." },
    { name: "Luis Ortega", description: "Power company lineman working double shifts; the outages follow a pattern he can map but not explain." },
    { name: "Dev Okonkwo", description: "Panopticon analyst on the Penumbra team. Guilty, frightened, and on the edge of blowing the whistle." },
    { name: "Caleb Marsh", description: "Panopticon junior executive: friendly, helpful, well-dressed. Offers equipment and access; his orders are to recover the Array intact." },
    { name: "Ezra Pike", description: "Nora's nine-year-old son. Still has his shadow, which has started not quite matching his movements." },
  ],
  locations: [
    { name: "The Falls Diner", description: "Neon sign, gossip, and patrons at the window at noon checking the floor beside them." },
    { name: "Lumen Park campus", description: "Glass buildings behind a new fence on the old mill site; private security; Lab 3 under 'maintenance'." },
    { name: "Lab 3", description: "The Penumbra Array: a ring of mirrors around a humming lens, and a burned human outline on the floor with no body." },
    { name: "Main Street at dusk", description: "Streetlights failing one by one; shadows moving against the light." },
    { name: "The substation", description: "Luis's domain: tripped breakers, frost on the fences in summer." },
    { name: "Panopticon's rented office", description: "Above the hardware store: Caleb's laptop, extraction plans, a list of names." },
  ],
  clues: [
    "Everyone who lost their shadow was within line of sight of Lumen Park the night of the 'transformer explosion'.",
    "People without shadows grow numb and cold; the man who froze in July had lost his first.",
    "A flashlight beam held on a moving shadow makes it thicken, flinch, and briefly become something you could touch.",
    "Luis's outage map: the blackouts spiral inward toward Lab 3 each night.",
    "Dev: the Penumbra Array was built to separate light from matter; it tore shadows instead, and Dr. Sato was standing at the focus.",
    "Lab 3 has a burned human outline on the floor and no body; the lens still hums, and shadows flow toward it after dark.",
    "Caleb's orders on the laptop: 'Recover Penumbra intact. Civilian shadow loss acceptable. Do not permit destruction of the lens.'",
    "Dev's notes: 'If the lens fractures while fully lit, the phase unwinds and everything snaps back.'",
  ],
  countdown: [
    "Calm Before the Storm: at noon, the diner regulars notice who has no shadow; Panopticon trucks are everywhere.",
    "Omens: streetlights die one by one; shadowless townsfolk start to shiver in the heat.",
    "The Plot Thickens: another shadowless neighbor freezes in their bed; shadows move against the light at dusk.",
    "The Horror Exposed: a rolling blackout; Shades attack openly in the dark; Panopticon locks down the campus.",
    "Nowhere to Hide: the whole town goes dark; the Penumbra starts taking the hunters' allies' shadows; Caleb moves to extract the Array.",
    "No Turning Back: at midnight the Array opens fully; every shadow in Marrow Falls tears free, and Panopticon drives away with the lens.",
  ],
};
