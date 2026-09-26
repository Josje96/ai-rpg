import type { Mystery } from "../mystery.js";

export const MERCY_LAKE: Mystery = {
  id: "mercy-lake",
  title: "The Lantern at Mercy Lake",
  pitch: "A drowned ferryman's lantern calls grieving townsfolk into the lake.",
  warnings: ["drowning", "grief"],
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
