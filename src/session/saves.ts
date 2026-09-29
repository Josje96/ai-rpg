import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Shared save directory for every system; files are tagged with their owning system. */
export function savesDir(env: Record<string, string | undefined> = process.env): string {
  if (env.TABLETOP_AI_SAVES) return env.TABLETOP_AI_SAVES;
  return join(env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "tabletop-ai", "saves");
}

/** Anything a system's state must expose to be saved. */
export type Saveable = {
  id: string;
  system: string;
  updatedAt: string;
  status: "active" | "won" | "lost";
};

/** Loose view for the menus: tolerates every system's shape. */
export type SessionSaveSummary = {
  id: string;
  system: string;
  title: string;
  members: string;
  updatedAt: string;
  status: string;
};

export async function saveSession(
  state: Saveable & object,
  dir = savesDir(),
): Promise<string> {
  await mkdir(dir, { recursive: true });
  state.updatedAt = new Date().toISOString();
  const path = join(dir, `${state.id}.json`);
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(state, null, 2));
  await rename(tmp, path); // atomic, so a crash mid-save can't corrupt the game
  return path;
}

/** The loose fields the menus need, whatever system wrote the file. */
type LooseState = { system?: string; title?: string; mystery?: { title?: string }; hunters?: { name: string }[]; runners?: { name: string }[] };

export async function listSessionSaves(dir = savesDir()): Promise<SessionSaveSummary[]> {
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: SessionSaveSummary[] = [];
  for (const file of files) {
    try {
      const s = JSON.parse(await readFile(join(dir, file), "utf8")) as Saveable & LooseState;
      const members = s.runners ?? s.hunters ?? [];
      out.push({
        id: s.id,
        system: s.system ?? "monster-hunt", // saves from before the adapter boundary are all monster-hunt
        title: s.title ?? s.mystery?.title ?? "Untitled",
        members: members.map((m) => m.name).join(", "),
        updatedAt: s.updatedAt,
        status: s.status,
      });
    } catch {
      // skip unreadable files
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function loadSession<T extends Saveable>(id: string, system: string, dir = savesDir()): Promise<T> {
  const state = JSON.parse(await readFile(join(dir, `${id}.json`), "utf8")) as T;
  // Saves from before the adapter boundary have no system tag; they're all monster-hunt.
  if ((state.system ?? "monster-hunt") !== system) {
    throw new Error(`Save ${id} belongs to ${state.system ?? "monster-hunt"}, not ${system}`);
  }
  state.system ??= "monster-hunt";
  return state;
}
