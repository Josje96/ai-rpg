import type { Mystery } from "../mystery.js";
import { SOURCE_CREDITS } from "./credits.js";

/** Built on Liminal Horror's Puppets (flesh over mannequins, thrown voices, self-repair with tools and flesh). */
export const MANNEQUIN_SEASON: Mystery = {
  id: "mannequin-season",
  title: "Mannequin Season",
  pitch: "A dying mall's window displays are getting new, very lifelike staff.",
  warnings: ["body horror", "skinning", "people going missing"],
  credits: SOURCE_CREDITS,
  hook:
    "Harwick Mall has two weeks left before the wrecking ball. Everything must go: 70% off, fixtures for sale, the " +
    "fountain drained. In the last ten days two night janitors and a pretzel-stand kid named Marcus Bell have vanished " +
    "after closing. The manager calls them quitters. The last security guard on nights has started sleeping in her car, " +
    "and the shoppers keep taking selfies with the new mannequins in the old Delacroix & Sons windows, because they " +
    "look so real.",
  truth:
    "Vernon Ashby dressed the Delacroix & Sons windows for forty years. When the store closed and his wife died, he " +
    "kept his keys and found the store founder's brass tailoring shears in the basement: an object that hums with " +
    "something from outside the world. With them he can stitch human skin over the old display mannequins and wake " +
    "them as Puppets: things that throw stolen voices, move when no one is watching, and rebuild themselves with tools " +
    "and fresh flesh. Vernon is trying to bring back the store's 1987 staff photo, his 'family', one face at a time. " +
    "Four of seven are done. The seventh place is for his own daughter.",
  monster: {
    name: "The Window Dresser",
    kind: "Grieving man remade by a humming artifact (ritual user)",
    motivation: "To finish the 1987 family portrait and open Delacroix & Sons forever, with everyone he's lost back behind the glass.",
    powers: [
      "Arranges any room like a display while no one is looking; exits vanish, mannequins appear.",
      "Commands his Puppets, who mimic voices they've heard recently to lure people into the dark.",
      "His Puppets rebuild themselves from any damage if they reach the workroom tools and fresh skin.",
      "Knows every service door, crawlspace and dead camera angle in the mall.",
    ],
    weakness:
      "Destroy the brass shears in the fourth-floor display workroom, ideally with the workroom tools. Without them the " +
      "Puppets are only wood and stolen skin, and Vernon is just a sick old man who can be stopped or talked down.",
    attacks: [
      { name: "tailor's shears", harm: 3, tags: ["hand", "messy"] },
      { name: "pinning needles", harm: 2, tags: ["close"] },
    ],
    armor: 1,
    harmCapacity: 8,
  },
  minions: [
    { name: "Puppets", description: "Mannequins wearing human skin. Dancers pose in plain sight; Crawlers drop from ceilings; Stalkers move only when unwatched. They flay rather than kill, to harvest more.", harm: 2, harmCapacity: 3 },
  ],
  bystanders: [
    { name: "Priya Nair", description: "The last night security guard. Brave, broke, and quietly sure the mannequins moved on camera. Keeps the CCTV logs." },
    { name: "Tom Wieczorek", description: "Mall manager. Only cares that demolition stays on schedule and nothing hits the news; will lock hunters out." },
    { name: "Kelsey Dunn", description: "Seventeen, works the pretzel stand. Her coworker Marcus vanished. Someone keeps calling her in Marcus's voice." },
    { name: "June Ashby", description: "Vernon's estranged daughter. Thinks her dad has dementia; he keeps asking her to 'come sit for the photo'." },
    { name: "Vernon Ashby", description: "Retired window-dresser, 71, soft-spoken and helpful by day. Still has his keys." },
  ],
  locations: [
    { name: "Center court", description: "Dry fountain full of pennies, clearance racks, the big countdown banner to demolition day." },
    { name: "Delacroix & Sons", description: "The dead anchor store: dark floors, covered racks, and the lit front windows with the new mannequins." },
    { name: "Fourth-floor display workroom", description: "Behind a 'staff only' door in Delacroix: work tables, forms, a sewing machine, the shears, and things being rebuilt." },
    { name: "Security office", description: "Bank of flickering monitors; badge-swipe logs; Priya's cold coffee." },
    { name: "Service corridors", description: "Cinderblock tunnels behind every store; cameras dead for years; mannequin parts where they shouldn't be." },
    { name: "Food court", description: "Mostly shuttered. Kelsey's pretzel stand. Voices carry strangely here after closing." },
  ],
  clues: [
    "On the CCTV, the Delacroix window mannequins change pose only in the frames where the feed glitches, or when nobody is at the monitors.",
    "Up close, the newest mannequins have real skin: pores, fingerprints, and one has Marcus Bell's forearm tattoo.",
    "Kelsey got a voicemail from Marcus two days after he vanished. The voice is his, but it only repeats things she said to him the night he disappeared.",
    "The badge logs show Vernon Ashby's old employee card opening Delacroix every night between 1 and 4 a.m.",
    "June Ashby says her father keeps talking about 'the family coming back' and has pinned the 1987 Delacroix staff photo to his fridge.",
    "In the workroom, faces are cut out of the 1987 staff photo and pinned to the mannequins: seven places, four filled, one labeled 'June'.",
    "Broken Puppets in the workroom are being repaired with the shears and tools; the brass shears are warm and hum when touched.",
    "Vernon's notebook: 'Without the shears they are only wood. Mr. Delacroix knew. That is why he hid them.' An incinerated 1987 mannequin never moved again.",
  ],
  countdown: [
    "Calm Before the Storm: another night janitor doesn't clock out; Tom calls it a no-show and hires a temp.",
    "Omens: a new 'family' pose appears in the Delacroix windows, with very human hands; shoppers post it online.",
    "The Plot Thickens: Marcus's voice calls Kelsey into the dark food court; mannequins are seen riding the dead escalator.",
    "The Horror Exposed: a Puppet flays a shopper during the afternoon sale; Tom blames a 'fixture accident' and keeps the mall open.",
    "Nowhere to Hide: the doors chain themselves at closing; Stalkers roam the corridors; Vernon takes June for the last place in the photo.",
    "No Turning Back: the family is complete. Delacroix & Sons reopens behind the glass, and Harwick's missing become its permanent display.",
  ],
};
