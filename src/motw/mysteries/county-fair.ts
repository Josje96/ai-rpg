import type { Mystery } from "../mystery.js";
import { COUNTY_FAIR_ART } from "./art.js";
import { SOURCE_CREDITS } from "./credits.js";

/** Built on Liminal Horror's Gremlins (machine saboteurs who covet shiny things) and resonant artifacts. Lighter in tone. */
export const COUNTY_FAIR: Mystery = {
  id: "county-fair",
  title: "The County Fair",
  pitch: "Gremlins are wrecking the Pike County Fair, and they're after one lucky carnie's charm. (Lighter tone.)",
  warnings: ["finger biting", "machinery accidents"],
  art: COUNTY_FAIR_ART,
  credits: SOURCE_CREDITS,
  hook:
    "The Pike County Fair: funnel cakes, a demolition derby, a prize-goat competition, and the tallest Ferris wheel " +
    "in three counties. This year the rides are breaking in ways that make no sense: bolts replaced with forks, the " +
    "Tilt-a-Whirl rewired to spin backward. Two ride operators are missing fingertips. Somebody has stolen every " +
    "cowbell in the livestock barn, and the fair board says it's teenagers.",
  truth:
    "Dee Faraday, a carnie with the traveling midway, won a brass token in a card game in Tulsa. It's a resonant " +
    "artifact: it bends luck (coins land heads, balloons pop, rings land on bottles) and it shines with something only " +
    "certain creatures can see. Gremlins followed it from town to town: impish, hairless, sharp-toothed, obsessed with " +
    "shiny things, and able to rebuild any machine into something dangerous. Their leader, grown fat on the token's " +
    "glow, has built a throne in the Ferris wheel's motor house. It wants the token as its crown. Once it has it, the " +
    "swarm doubles and the Tinker King rides the wheel into legend on Saturday night.",
  monster: {
    name: "The Tinker King",
    kind: "An overgrown gremlin, swollen on the token's glow",
    motivation: "To crown itself with the brass token, double its swarm, and turn the whole fair into its toy.",
    powers: [
      "Repurposes any machine it touches into something new and dangerous: rides, generators, the P.A., a golf cart.",
      "Its swarm steals anything shiny and sabotages everything else.",
      "Cornered, it puffs up in a frightening display: faster and nastier, but easier to hurt while it lasts.",
      "Always goes for the fingers first.",
    ],
    weakness:
      "Melt the brass token, for instance in the funnel-cake fryer. Without its glow the swarm scatters and the Tinker " +
      "King shrinks back into one ordinary, very annoyed gremlin that can be caught in a cage.",
    attacks: [
      { name: "jagged teeth", harm: 2, tags: ["hand", "fingers"] },
      { name: "rewired machine", harm: 3, tags: ["area", "messy"] },
    ],
    armor: 0,
    harmCapacity: 7,
  },
  minions: [
    { name: "Gremlin swarm", description: "Dozens of cat-sized imps with floppy ears and too many teeth. Chaotic, giggling, easily distracted by shiny things.", harm: 1, harmCapacity: 2 },
  ],
  bystanders: [
    { name: "Dee Faraday", description: "Midway games carnie on an impossible winning streak since Tulsa. Superstitious, and won't give up her 'lucky' token easily." },
    { name: "Hank Sorensen", description: "Fair board president. The Saturday fireworks and Ferris wheel ride are his legacy; nothing shuts them down." },
    { name: "Tammy Lynn Boggs", description: "Twelve, 4-H, deadly serious about her goat Duchess, whose bell keeps getting stolen. Has seen 'the little guys'." },
    { name: "Deputy Carl Mayhew", description: "Certain it's teenagers. His badge went missing yesterday." },
    { name: "Rufus Dean", description: "Old ride mechanic missing two fingers. He's seen this before, at a fair in '98, and nobody believed him." },
  ],
  locations: [
    { name: "The midway", description: "Games, lights, barkers, and Dee's ring-toss booth, where nobody ever seems to lose." },
    { name: "Ferris wheel & motor house", description: "The fair's pride; a padlocked shed at its base humming with stolen power." },
    { name: "Livestock barn", description: "Goats, hay, 4-H ribbons, and a pile of missing cowbells somewhere nearby." },
    { name: "Funnel-cake stand", description: "Big vats of hot oil, a cheerful owner, and the best smell on the grounds." },
    { name: "Generator yard", description: "Diesel generators behind the midway, wired in ways no electrician would recognize." },
    { name: "Carnie camp", description: "Trailers behind the grandstand; Dee's is the one with scratch marks all over the door." },
  ],
  clues: [
    "The broken rides weren't just sabotaged, they were rebuilt: forks for bolts, a Tilt-a-Whirl rewired to run backward.",
    "Every stolen item is shiny: cowbells, keys, jewelry, the deputy's badge. Most vanished near the midway after dark.",
    "Rufus: 'They go for the fingers first. Saw 'em in '98 at the Clinton County fair. Left when the carnival did.'",
    "Dee's winning streak started the night she won a brass token in Tulsa; her trailer door is covered in tiny tooth marks.",
    "The token is warm and hums; coins flipped near it always land heads. It looks older than the carnival.",
    "A cornered gremlin puffs up huge and vicious, and goes down easier while it's puffed.",
    "In the Ferris wheel motor house: a nest of shiny junk and a throne of hubcaps with a tiny crown missing its centerpiece, just the size of the token.",
    "Rufus's '98 scrapbook: the swarm fizzled when a carnie's brass good-luck coin fell into a fry vat and melted.",
  ],
  countdown: [
    "Calm Before the Storm: the Tilt-a-Whirl stops mid-spin and nobody can find a cause.",
    "Omens: shiny things vanish all over the fairgrounds; chittering under the bleachers; Duchess's bell is gone again.",
    "The Plot Thickens: a gremlin bites a kid on the carousel; the swarm is visible at dusk; Dee's trailer is ransacked.",
    "The Horror Exposed: the generators blow, the midway goes dark, and the swarm comes out giggling.",
    "Nowhere to Hide: during the Saturday night ride, the Tinker King rewires the Ferris wheel with riders at the top.",
    "No Turning Back: the Tinker King crowns itself with the token, the wheel spins free, and a doubled swarm heads for the next town.",
  ],
};
