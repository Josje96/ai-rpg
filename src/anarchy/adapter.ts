import type { PlayableRpgSystem } from "../rpg/adapter.js";
import { anarchyAdapter } from "./rules.js";
import { playMenu } from "./play.js";

/** The playable Shadowrun-style system: cyberpunk runs behind the adapter boundary. */
export const anarchySystem: PlayableRpgSystem = {
  ...anarchyAdapter,
  play: (io, model, options = {}) => playMenu(io, model, options),
};
