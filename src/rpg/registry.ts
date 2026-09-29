import { isPlayable, type PlayableRpgSystem, type RpgSystemAdapter } from "./adapter.js";
import { dnd5e2014Adapter } from "./dnd5e-2014.js";
import { fateCondensedAdapter } from "./fate-condensed.js";
import { bladesInTheDarkAdapter } from "./blades-in-the-dark.js";
import { pathfinder2RemasterAdapter } from "./pathfinder2-remaster.js";
import { cairn2Adapter } from "./cairn-2e.js";
import { basicRoleplayingAdapter } from "./basic-roleplaying.js";
import { monsterHuntSystem } from "../hunt/adapter.js";
import { anarchySystem } from "../anarchy/adapter.js";

/** Explicit registry; game-specific adapters can be plugged in as they are implemented. */
export class RpgSystemRegistry {
  readonly #systems = new Map<string, RpgSystemAdapter>();

  register(adapter: RpgSystemAdapter): void {
    if (this.#systems.has(adapter.id)) {
      throw new Error(`RPG system already registered: ${adapter.id}`);
    }
    this.#systems.set(adapter.id, adapter);
  }

  list(): readonly RpgSystemAdapter[] {
    return [...this.#systems.values()];
  }

  /** Systems with a full playable session, in registry order. */
  listPlayable(): readonly PlayableRpgSystem[] {
    return this.list().filter(isPlayable);
  }

  get(id: string): RpgSystemAdapter | undefined {
    return this.#systems.get(id);
  }
}

export function createDefaultRpgRegistry(): RpgSystemRegistry {
  const registry = new RpgSystemRegistry();
  registry.register(dnd5e2014Adapter);
  registry.register(anarchySystem);
  registry.register(fateCondensedAdapter);
  registry.register(bladesInTheDarkAdapter);
  registry.register(pathfinder2RemasterAdapter);
  registry.register(cairn2Adapter);
  registry.register(basicRoleplayingAdapter);
  registry.register(monsterHuntSystem);
  return registry;
}
