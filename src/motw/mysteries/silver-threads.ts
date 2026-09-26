import type { Mystery } from "../mystery.js";
import { SOURCE_CREDITS } from "./credits.js";

/** Built on Liminal Horror's Goloch (corpse-puppeting parasites) and the Bureau (a government cleanup agency). */
export const SILVER_THREADS: Mystery = {
  id: "silver-threads",
  title: "Silver Threads",
  pitch: "The dead are walking out of a small-town funeral home, and the men in black suits want no witnesses.",
  warnings: ["corpses", "parasites", "government violence"],
  credits: SOURCE_CREDITS,
  hook:
    "Pell's Crossing, Kentucky: one stoplight, one diner, one funeral home. In three weeks, three bodies have gone " +
    "missing from Hollister & Sons before burial. The family says grave robbers; the sheriff says paperwork. Last " +
    "night a trucker swore on the radio that he nearly hit old Mrs. Tolliver walking down Route 9, three days after " +
    "her funeral, moving 'like somebody was working her with strings'.",
  truth:
    "This spring the cemetery expansion cut into an unmarked pit from the 1887 'Pell fever', when the dead would not " +
    "stay down. It woke a Goloch brood-mother: a spider-like parasite that hangs bodies on silver tendrils like " +
    "puppets. She has taken the embalmed body of Adelaide Pell, the founder's wife, in the Pell mausoleum. Her young " +
    "are crawling into fresh corpses at the funeral home and walking them to her as nest material and future hosts. " +
    "Groundskeeper Gabe Tolliver is implanted and doesn't know it yet. The Bureau has noticed. Agent Dana Voss's " +
    "protocol is to burn the town's problem, and anyone who knows about it, off the map.",
  monster: {
    name: "The Brood-Mother",
    kind: "Goloch queen wearing the preserved corpse of Adelaide Pell",
    motivation: "To nest, multiply, and spread her young into every body in the county, dead or alive.",
    powers: [
      "Rebuilds a damaged host with silver tendrils, even using bones and scrap to stand back up.",
      "When her host is destroyed, she bursts out and scuttles to the nearest body, living or dead, to take it.",
      "Her young puppet corpses from the inside; they pass for people at a distance.",
      "Feels through every thread she's spun; she knows when the nest is disturbed.",
    ],
    weakness:
      "Fire. Burn Adelaide Pell's body in the Pell mausoleum with the brood-mother still inside, or pin her when she " +
      "bursts out and burn her before she reaches another body. Once she's ash, the young go still.",
    attacks: [
      { name: "tendril lash", harm: 2, tags: ["close", "reach"] },
      { name: "implant", harm: 3, tags: ["hand", "infects"] },
    ],
    armor: 1,
    harmCapacity: 9,
  },
  minions: [
    { name: "Threaded dead", description: "Corpses walked by Goloch young; slow, strong, grasping. Put one down and the parasite scuttles out looking for another.", harm: 1, harmCapacity: 3 },
    { name: "Bureau Operators", description: "Armored cleanup team with shotguns and tear gas, answering to Agent Voss. Not monsters; worse at listening.", harm: 3, harmCapacity: 4 },
  ],
  bystanders: [
    { name: "Everett Hollister", description: "Third-generation funeral director. Has been quietly hiding the missing-body reports to save the business." },
    { name: "Rosa Hollister", description: "Everett's daughter, apprentice mortician. Pulled silver 'wire' out of a drain and kept it in a jar." },
    { name: "Gabe Tolliver", description: "Cemetery groundskeeper who dug the expansion. Silver threads are spreading under the skin of his arm; he's been sleeping at the cemetery." },
    { name: "Sheriff Walt Ames", description: "Decent, overwhelmed, and about to be told by federal agents to look away." },
    { name: "Agent Dana Voss", description: "Bureau field agent. Polite, well-informed, and ready to call in Operators and 'sanitize'. Might trade information for results." },
  ],
  locations: [
    { name: "Hollister & Sons Funeral Home", description: "Victorian house over a tiled prep room and cold room; one cold-room door was forced from the inside." },
    { name: "Pell Cemetery", description: "Old stones on the hill; raw red dirt in the new section where the 1887 pit was opened." },
    { name: "The Pell mausoleum", description: "Marble, ivy, a broken seal. Inside: webbing like fishing line, and the missing dead arranged around one coffin." },
    { name: "Bluegrass Inn", description: "Roadside motel the Bureau has quietly rented out; black SUVs, a locked room full of files." },
    { name: "County library", description: "Microfilm of the Pell Crossing Herald, including the 1887 fever year." },
    { name: "Gabe's trailer", description: "Out past the tree line: unwashed dishes, a snoring dog, and silver threads in the bedsheets." },
  ],
  clues: [
    "The cold-room door at Hollister & Sons was forced from inside; scratch marks on the steel are at the height of a walking person's hands.",
    "Rosa's jar: fine silver filaments from the prep-room drain. They're warm, and they twitch toward a dead mouse.",
    "Road-camera footage of Mrs. Tolliver on Route 9: her joints move a beat before her limbs, like strings pulling.",
    "Gabe's forearm has silver threads branching under the skin from a small wound he got digging the new section.",
    "The 1887 Herald: 'the Pell fever' — dead who rose were burned and stayed down; 'Mother Pell we could not burn, for the family forbade it.'",
    "The new cemetery section cut straight into an unmarked 1887 grave pit; the soil there is laced with old silver threads.",
    "The Pell mausoleum's seal is broken from inside; the missing dead sit around Adelaide Pell's coffin, which pulses.",
    "Bureau file from the Bluegrass Inn: 'Specimen class GOLOCH, brood-mother priority. Protocol: sanitize by fire. Collateral acceptable.'",
  ],
  countdown: [
    "Calm Before the Storm: a fourth body walks out of Hollister & Sons overnight; Everett doesn't report it.",
    "Omens: cattle found hollowed out and strung on fence wire; Gabe stops showing up for work.",
    "The Plot Thickens: black SUVs arrive; Agent Voss takes over the sheriff's office and tells the hunters to leave town.",
    "The Horror Exposed: Gabe's body turns on his sister; the threaded dead walk openly after dark.",
    "Nowhere to Hide: the Bureau seals the roads and starts burning, with the funeral home first, witnesses inside.",
    "No Turning Back: the Brood-Mother rides out of town in a Bureau body bag, and Pell's Crossing is 'sanitized' off the map.",
  ],
};
