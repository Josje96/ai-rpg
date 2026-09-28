import type { ModelClient } from "../ai/provider.js";

/** Everything a system needs from a front end. The terminal implements it; a web or Discord UI could too. */
export interface GameIO {
  show(kind: "keeper" | "hunter" | "roll" | "system" | "info" | "error" | "heading", text: string, who?: string): void;
  /** Terminal art in several sizes, largest first; show the largest that fits, or nothing. */
  art(variants: readonly string[]): void;
  /** Resolves "/quit" if input ends (Ctrl-D, closed SSH). */
  ask(prompt: string): Promise<string>;
  choose(prompt: string, options: readonly string[]): Promise<number>;
  confirm(prompt: string): Promise<boolean>;
  busy(label: string): () => void;
}

export type PlayOptions = { debug?: boolean };

/**
 * Game-specific rules and state belong behind this boundary.
 * Every system carries this metadata; the setup-time matcher reads `fit` to pick the
 * right system for whatever kind of game the players asked for.
 */
export interface RpgSystemAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** What kinds of sessions this system is right for: "monster hunting", "heists", "dungeon crawls", ... */
  readonly fit: readonly string[];
}

/**
 * A system with a full playable session: its own setup flow, saves and game loop.
 * The boundary is deliberately coarse for now — each adapter owns its whole session —
 * and will be narrowed from the inside out once a second system shows what the turn
 * loop, save plumbing and keeper contract truly share.
 */
export interface PlayableRpgSystem extends RpgSystemAdapter {
  /** Runs a full interactive session for this system. Returns a process exit code. */
  play(io: GameIO, model: ModelClient, options: PlayOptions): Promise<number>;
}

export function isPlayable(adapter: RpgSystemAdapter): adapter is PlayableRpgSystem {
  return typeof (adapter as PlayableRpgSystem).play === "function";
}
