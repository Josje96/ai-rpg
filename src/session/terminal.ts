import { createInterface, type Interface } from "node:readline/promises";
import type { WriteStream } from "node:fs";
import ora from "ora";
import type { GameIO } from "../rpg/adapter.js";
import { box, createTheme, SPINNER_FRAMES, type Theme } from "./theme.js";

/** Wrap to the terminal width (phones are narrow), keeping paragraph breaks and a hanging indent. */
export function wrap(text: string, width: number, indent = ""): string {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const prefix = out.length && !line ? indent : "";
      if (line && (line + " " + word).length > width) {
        out.push(line);
        line = indent + word;
      } else {
        line = line ? `${line} ${word}` : prefix + word;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

export class TerminalIO implements GameIO {
  readonly #rl: Interface;
  /** The look and feel is bound to this stream, so pipes/tests degrade to plain text. */
  readonly #theme: Theme;
  #closed = false;
  /** Lines typed before a prompt was waiting (type-ahead, paste, laggy SSH); readline would drop them. */
  readonly #buffered: string[] = [];
  #waiting: ((line: string | null) => void) | undefined;

  constructor(input = process.stdin, private readonly output = process.stdout) {
    this.#theme = createTheme(output);
    this.#rl = createInterface({ input, output, terminal: input.isTTY ?? false });
    this.#rl.on("line", (line) => {
      const waiting = this.#waiting;
      this.#waiting = undefined;
      if (waiting) waiting(line);
      else this.#buffered.push(line);
    });
    this.#rl.once("close", () => {
      this.#closed = true;
      this.#waiting?.(null);
      this.#waiting = undefined;
    });
    // Ctrl-C: close input so the current prompt resolves as /quit and the game saves before exiting.
    this.#rl.on("SIGINT", () => this.#rl.close());
  }

  get #width(): number {
    return Math.max(30, Math.min(this.output.columns || 80, 100) - 1);
  }

  #print(text: string): void {
    this.output.write(text + "\n");
  }

  show(kind: Parameters<GameIO["show"]>[0], text: string, who?: string): void {
    const w = this.#width;
    const wrapName = (name: string, body: string, paint: (t: string) => string): string => {
      const lines = wrap(`${name}: ${body}`, w).split("\n");
      const nameLen = `${name}:`.length;
      lines[0] = `${paint(`${name}:`)}${lines[0]!.slice(nameLen)}`;
      return lines.join("\n");
    };
    switch (kind) {
      case "heading": this.#print("\n" + box(wrap(text, w - 4), { width: w }, this.#theme.color)); break;
      case "keeper": this.#print("\n" + wrapName("Keeper", text, this.#theme.keeper)); break;
      case "hunter": this.#print("\n" + wrapName(who ?? "Hunter", text, this.#theme.hunter)); break;
      case "roll": this.#print(this.#theme.roll(wrap(`  dice ${who ? who + ": " : ""}${text}`, w, "    "))); break;
      case "system": this.#print(this.#theme.system(wrap(`  * ${text}`, w, "    "))); break;
      case "error": this.#print(this.#theme.error(wrap(text, w))); break;
      case "info": this.#print(wrap(text, w)); break;
    }
  }

  art(variants: readonly string[]): void {
    const width = this.#width;
    for (const variant of variants) {
      const lines = variant.replace(/^\n+|\s+$/g, "").split("\n");
      // Drop the shared left margin, then center in the terminal.
      const margin = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
      const trimmed = lines.map((l) => l.slice(margin));
      const artWidth = Math.max(...trimmed.map((l) => l.length));
      if (artWidth > width) continue; // too wide: try the next size down; wrapped art is just noise
      const pad = " ".repeat(Math.floor((width - artWidth) / 2));
      this.#print("\n" + this.#theme.dusk(trimmed.map((l) => (l ? pad + l : l)).join("\n")));
      return;
    }
  }

  async ask(prompt: string): Promise<string> {
    this.#print("\n" + this.#theme.prompt(wrap(prompt, this.#width)));
    const ready = this.#buffered.shift();
    if (ready !== undefined) {
      this.#print(`${this.#theme.prompt(">")} ${ready}`);
      return ready;
    }
    if (this.#closed) return "/quit";
    this.#rl.setPrompt(`${this.#theme.prompt(">")} `);
    this.#rl.prompt();
    const answer = await new Promise<string | null>((resolve) => { this.#waiting = resolve; });
    return answer ?? "/quit";
  }

  async choose(prompt: string, options: readonly string[]): Promise<number> {
    const w = this.#width;
    const list = box(options.map((o, i) => wrap(`${i + 1}) ${o}`, w - 6, "   ")).join("\n"), { width: w }, this.#theme.color);
    for (;;) {
      const raw = (await this.ask(`${prompt}\n${list}`)).trim();
      if (raw === "/quit") return 0;
      const n = Number(raw);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) return n - 1;
      this.show("info", `Type a number from 1 to ${options.length}.`);
    }
  }

  async confirm(prompt: string): Promise<boolean> {
    const raw = (await this.ask(`${prompt} (y/N)`)).trim().toLowerCase();
    return raw === "y" || raw === "yes";
  }

  busy(label: string): () => void {
    // ora needs a live cursor; streams without one (pipes, test fakes) get a plain status line.
    if (!this.#theme.color || typeof this.output.cursorTo !== "function") {
      this.#print(this.#theme.system(`${label}...`));
      return () => {};
    }
    const spinner = ora({
      text: this.#theme.system(`${label}...`),
      color: "cyan",
      spinner: { interval: 80, frames: SPINNER_FRAMES },
      stream: this.output as unknown as WriteStream,
    }).start();
    return () => spinner.stop();
  }

  close(): void {
    this.#rl.close();
  }
}
