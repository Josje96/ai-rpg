/**
 * Live playtest against the real models: plays two scripted humans (who never spend Luck) plus one AI hunter
 * and prints the transcript with timings. Costs a few cents.
 *   npm run playtest            The Lantern at Mercy Lake, with actions written for it
 *   npm run playtest -- 3       mystery #3 from the menu, with generic investigator actions
 */
import { OpenRouterClient } from "../src/ai/openrouter.js";
import { Game, type GameIO } from "../src/motw/game.js";
import { Keeper } from "../src/motw/keeper.js";
import { loadProjectEnv } from "../src/motw/play.js";
import { setupGame } from "../src/motw/setup.js";

loadProjectEnv();
const mysteryNumber = process.argv[2] ?? "1";
const mercyLakeActions = [
  "I head into Hale's Diner and ask Dot, gently, about her son Eli and the green light.",
  "I walk the public dock with a flashlight, looking at the waterline and anything left behind.",
  "I go to St. Brendan's and ask Father Mendes if the parish has records about drownings or the old ferry.",
  "I find Kit Varga and ask to see the video of the light. I promise she's not in trouble.",
  "I go up to the historical society and look for photos of the old ferry and its crew.",
  "I force the boathouse door with a crowbar and search inside, especially the floor.",
  "I pry up the loose floorboards and look for a grave or marker.",
  "I stay by the dock and keep watch on the water for the light, axe ready.",
  "I tell the others what we know: Crane's empty grave is under the boathouse. We need to get the lantern back there and break it.",
  "When the light comes, I wade out and try to grab the lantern from the ferryman's hand.",
  "I run the lantern to the boathouse and smash its glass on the grave.",
  "I hold the drowned crew back at the boathouse door so Mara can finish it.",
];
const genericActions = [
  "I ask around town about what's been happening and who has gone missing.",
  "I look for physical evidence where the last person disappeared.",
  "I dig through local records and archives for anything like this in the past.",
  "I find the most frightened person in town and gently ask what they've seen.",
  "I follow up on the strongest lead we have so far.",
  "I go where the clues point and search it carefully.",
  "I tell the others my theory about what this thing is and how to stop it.",
  "I go after the thing we think will stop it for good.",
];
const actions = [...(mysteryNumber === "1" ? mercyLakeActions : genericActions), "/quit"];
const setup = [mysteryNumber, "2", "Joe", "Sam", "2", "Mara", "she/her", "y", "3", "Theo", "he/him", "y", "1"];
const t0 = Date.now();
let last = Date.now();
const io: GameIO = {
  show(kind, text, who) { console.log(`\n[${kind}${who ? " " + who : ""}] ${text}`); },
  art(variants) { console.log(`\n[art]${variants.at(-1) ?? ""}`); },
  async ask(prompt) {
    const a = setup.length ? setup.shift()! : actions.shift() ?? "/quit";
    console.log(`\n>> ${prompt.split("\n")[0]}\n<< ${a}`);
    return a;
  },
  async choose(prompt, options) {
    if (setup.length) { const a = setup.shift()!; console.log(`\n>> ${prompt}\n<< ${a}`); return Number(a) - 1; }
    console.log(`\n>> ${prompt}\n<< 1 (${options[0]})`); return 0;
  },
  async confirm(prompt) {
    if (setup.length) { const a = setup.shift()!; console.log(`\n>> ${prompt}\n<< ${a}`); return a === "y"; }
    console.log(`\n>> ${prompt}\n<< n`); return false;
  },
  busy(label) { const s = Date.now(); return () => console.log(`   (${label}: ${((Date.now() - s) / 1000).toFixed(1)}s)`); },
};
const model = OpenRouterClient.fromEnv();
const keeper = new Keeper(model);
const state = await setupGame(io, keeper);
await new Game(state, { keeper, model, io, save: async () => {}, debug: true }).run();
console.log(`\n=== cost $${state.costUsd.toFixed(4)}, ${((Date.now() - t0) / 1000).toFixed(0)}s, countdown ${state.countdown}, clues ${state.cluesFound.length}`);
console.log(JSON.stringify(state.hunters.map((h) => ({ n: h.name, harm: h.harm, luck: h.luck, xp: h.xp }))));
