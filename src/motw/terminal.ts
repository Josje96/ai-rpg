import { createInterface, type Interface } from "node:readline/promises";
import type { GameIO } from "./game.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (text: string) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = paint("1");
const dim = paint("2");
const red = paint("31");
const yellow = paint("33");
const magenta = paint("35");
const cyan = paint("36");

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
  #closed = false;
  /** Lines typed before a prompt was waiting (type-ahead, paste, laggy SSH); readline would drop them. */
  readonly #buffered: string[] = [];
  #waiting: ((line: string | null) => void) | undefined;

  constructor(input = process.stdin, private readonly output = process.stdout) {
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
    switch (kind) {
      case "heading": this.#print("\n" + bold(`== ${text} ==`)); break;
      case "keeper": this.#print("\n" + wrap(`${cyan("Keeper:")} ${text}`, w + (useColor ? 9 : 0))); break;
      case "hunter": this.#print("\n" + wrap(`${yellow(`${who ?? "Hunter"}:`)} ${text}`, w + (useColor ? 9 : 0))); break;
      case "roll": this.#print(magenta(wrap(`  dice ${who ? who + ": " : ""}${text}`, w, "    "))); break;
      case "system": this.#print(dim(wrap(`  * ${text}`, w, "    "))); break;
      case "error": this.#print(red(wrap(text, w))); break;
      case "info": this.#print(wrap(text, w)); break;
    }
  }

  async ask(prompt: string): Promise<string> {
    this.#print("\n" + bold(wrap(prompt, this.#width)));
    const ready = this.#buffered.shift();
    if (ready !== undefined) {
      this.#print(`> ${ready}`);
      return ready;
    }
    if (this.#closed) return "/quit";
    this.#rl.setPrompt("> ");
    this.#rl.prompt();
    const answer = await new Promise<string | null>((resolve) => { this.#waiting = resolve; });
    return answer ?? "/quit";
  }

  async choose(prompt: string, options: readonly string[]): Promise<number> {
    const w = this.#width;
    const list = options.map((o, i) => wrap(`  ${i + 1}) ${o}`, w, "     ")).join("\n");
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
    let stopped = false;
    if (!this.output.isTTY) {
      this.#print(dim(`${label}...`));
      return () => {};
    }
    const frames = ["|", "/", "-", "\\"];
    let i = 0;
    const draw = () => this.output.write(`\r${dim(`${frames[i++ % frames.length]} ${label}...`)}`);
    draw();
    const timer = setInterval(draw, 150);
    return () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      this.output.write("\r\x1b[2K");
    };
  }

  close(): void {
    this.#rl.close();
  }
}
