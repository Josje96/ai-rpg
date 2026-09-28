import type { PlayOptions, PlayableRpgSystem } from "../rpg/adapter.js";
import { playMenu } from "./play.js";
import { monsterHuntAdapter } from "./rules.js";

/** The playable Monster Hunt system: the PbtA action-horror game behind the adapter boundary. */
export const monsterHuntSystem: PlayableRpgSystem = {
  ...monsterHuntAdapter,
  play: (io, model, options: PlayOptions = {}) => playMenu(io, model, options),
};
