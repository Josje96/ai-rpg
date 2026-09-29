import { randomInt } from "node:crypto";
import type { ModelClient } from "../ai/provider.js";
import type { RandomInt } from "../domain/dice.js";
import type { GameIO } from "../rpg/adapter.js";
import { GameInterrupted } from "./retry.js";
import type { LogEntry, SessionBase, SessionContext, SessionMember, TurnInput } from "./types.js";

const SUMMARIZE_AFTER = 40;
const KEEP_RECENT = 16;

/**
 * What a system provides so the shared loop can run its session. The loop owns the parts
 * that are true of any tabletop game: turn order, autosaves, running recap, model-failure
 * retries. The system owns the rules, the keeper and the fiction.
 */
export interface SessionHooks<S extends SessionBase, M extends SessionMember = SessionMember> {
  /** The party in turn order. */
  members(state: S): readonly M[];
  /** Whether this member can act this turn (out of action, unconscious, ...). */
  active(state: S, member: M): boolean;
  /** Presentation when starting or resuming: art, title, the opening scene. */
  open(state: S, ctx: SessionContext<S>, resuming: boolean): Promise<void>;
  /** One member's turn. */
  turn(state: S, member: M, ctx: SessionContext<S>): Promise<TurnInput>;
  /** Resolve an action a member declared. */
  resolve(state: S, member: M, text: string, ctx: SessionContext<S>): Promise<void>;
  /** Between rounds: the keeper, the world, the opposition moves. */
  betweenRounds(state: S, ctx: SessionContext<S>): Promise<void>;
  /** The end-of-session screen. */
  finish(state: S, ctx: SessionContext<S>): Promise<void>;
  save(state: S): Promise<unknown>;
  /** Fold old log entries into the running recap. */
  summarize?(state: S, entries: readonly LogEntry[]): Promise<string>;
}

export type LoopDeps = {
  io: GameIO;
  model: ModelClient;
  random?: RandomInt | undefined;
  debug?: boolean | undefined;
};

/** Drives a session of any system until it ends or the players quit. */
export class SessionLoop<S extends SessionBase, M extends SessionMember = SessionMember> {
  readonly #random: RandomInt;
  readonly #hooks: SessionHooks<S, M>;
  readonly #deps: LoopDeps;

  constructor(readonly state: S, hooks: SessionHooks<S, M>, deps: LoopDeps) {
    this.#hooks = hooks;
    this.#deps = deps;
    this.#random = deps.random ?? randomInt;
  }

  #ctx(): SessionContext<S> {
    return {
      io: this.#deps.io,
      model: this.#deps.model,
      random: this.#random,
      debug: this.#deps.debug ?? false,
      save: (state) => this.#hooks.save(state),
    };
  }

  /** Runs until the session ends or a player quits. Returns true if the session is over. */
  async run(): Promise<boolean> {
    try {
      return await this.#run();
    } catch (error) {
      if (!(error instanceof GameInterrupted)) throw error;
      await this.#hooks.save(this.state);
      this.#deps.io.show("info", "Game saved. When the model is back, resume with: bun run play");
      return false;
    }
  }

  async #run(): Promise<boolean> {
    const { state } = this;
    const ctx = this.#ctx();
    const resuming = state.round > 0;
    await this.#hooks.open(state, ctx, resuming);
    if (!resuming) {
      state.round = 1;
      state.turn = 0;
      await this.#hooks.save(state);
    }

    while (state.status === "active") {
      while (state.turn < this.#hooks.members(state).length && state.status === "active") {
        const member = this.#hooks.members(state)[state.turn]!;
        if (this.#hooks.active(state, member)) {
          const input = await this.#hooks.turn(state, member, ctx);
          if (input.kind === "quit") {
            await this.#hooks.save(state);
            this.#deps.io.show("info", "Game saved. Pick it back up with: bun run play");
            return false;
          }
          if (input.kind === "action") await this.#hooks.resolve(state, member, input.text, ctx);
        }
        state.turn += 1;
        await this.#maybeSummarize(ctx);
        await this.#hooks.save(state);
      }
      if (state.status !== "active") break;
      await this.#hooks.betweenRounds(state, ctx);
      if (state.status !== "active") break;
      state.round += 1;
      state.turn = 0;
      await this.#hooks.save(state);
    }

    await this.#hooks.finish(state, ctx);
    await this.#hooks.save(state);
    return true;
  }

  async #maybeSummarize(ctx: SessionContext<S>): Promise<void> {
    const { state } = this;
    if (!this.#hooks.summarize) return;
    if (state.log.length - state.summarizedThrough < SUMMARIZE_AFTER) return;
    const upTo = state.log.length - KEEP_RECENT;
    try {
      state.summary = await this.#hooks.summarize(state, state.log.slice(state.summarizedThrough, upTo));
      state.summarizedThrough = upTo;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (ctx.debug) ctx.io.show("error", `(debug) recap failed, will retry: ${message}`);
    }
  }
}
