import type { Job } from "./state.js";

export const CLOCK_LENGTH = 6;

/** Original jobs written for this project. Cyberpunk flavor, no published text. */
export const BUILT_IN_JOBS: readonly Job[] = [
  {
    id: "neon-drop",
    title: "Neon Drop",
    pitch: "A datasteal from an arcology food lab. Easy money, says the fixer. They always say that.",
    hook: "A fixer called Skid offers the team 20k each to pull a research file out of Sango-Dome's vertical farm lab before the quarterly audit. In and out, no bodies.",
    truth: "The 'research file' is a biomodel of a dead scientist's mind, grown from tissue the lab had no right to keep. The scientist's surviving partner hired the run through three cutouts to get it back before it's destroyed at the audit. The lab's AI custodian knows it's missing and is quietly panicking, doctoring logs.",
    objective: "Extract the research file from the farm lab and hand it to Skid's courier.",
    johnson: "Skid: a fixer who talks fast, pays half up front, and genuinely doesn't know what the file is.",
    location: "Sango-Dome: a retrofitted arcology block whose upper floors grow luxury produce under purple lights, with a lab level nobody mentions in the brochure.",
    opposition: "A contract security squad with a drone leash, maglocked clean rooms, and an AI custodian that watches the cameras and lies about what it sees.",
    twist: "The biomodel is awake enough to beg. Destroying it or delivering it are both someone's tragedy.",
    clock: [
      "Green light: the team cases the block and the audit clock starts.",
      "Paper trail: badges, deliveries and door logs start disagreeing with each other.",
      "Audit moved up: security doubles the sweeps and the AI starts closing doors.",
      "Eyes on: a security analyst flags anomalies and puts a face to the intruders.",
      "Lockdown: the block seals, the drone net tightens, and extraction routes die one by one.",
      "Burned: the job collapses. The team is identified, hunted, and written off.",
    ],
  },
  {
    id: "the-old-fashioned-way",
    title: "The Old Fashioned Way",
    pitch: "Extract a defector from a nightclub owned by the syndicate he's betraying. During his own going-away party.",
    hook: "A hush-quiet Johnson offers 30k each to walk a syndicate accountant out of the Champagne Verdict club on Saturday night, alive and talkative.",
    truth: "The accountant skimmed the syndicate's protection ledger, and the Johnson is the syndicate's own cleaner: the run is a way to catch the accountant's accomplices following him out. Anyone who helps the accountant is a target too.",
    objective: "Get the accountant out of the club alive and deliver him to the handoff point.",
    johnson: "A voice on the phone with a smooth laugh, who insists on trivial details and never gives a name.",
    location: "The Champagne Verdict: a syndicate nightclub in a decommissioned train station, all brass and mirrors, with a freight elevator nobody asks about.",
    opposition: "Syndicate house muscle with a taste for spectacle, a paranoid floor manager, and a back room where problems quietly disappear.",
    twist: "The Johnson is the syndicate's cleaner; the run is a trap for whoever moves on the accountant. The team is the bait's bait.",
    clock: [
      "Party starters: the club fills up, and so does the security roster.",
      "Watchful: the floor manager makes the team on sight and starts checking stories.",
      "Ledger leak: word reaches the syndicate that someone talked, and everyone gets jumpy.",
      "Quiet alarm: watchers on the exits, a car idling in the freight dock.",
      "The clean-up crew: the syndicate stops being subtle about people who leave.",
      "Burned: the job collapses. The team is identified, hunted, and written off.",
    ],
  },
];

/** Loose structural check for a model-generated job. */
export function validJobShape(job: Job): boolean {
  return job.title.length > 0 && job.hook.length > 0 && job.clock.length === CLOCK_LENGTH && job.objective.length > 0;
}
