import chalkDefault, { Chalk, type ChalkInstance } from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";

/**
 * The single source of terminal look and feel: every color, box, gradient and
 * spinner comes from here so the whole game shares one consistent theme.
 *
 * The stack is the original Monster Hunt CLI's lightweight ANSI setup:
 * - chalk for colors, with the level clamped to 2 (standard ANSI palette, so
 *   the look follows the player's terminal theme) and gated on the output
 *   stream: pipes, redirects and tests get plain text, as does NO_COLOR.
 * - boxen for rounded bordered boxes (headings, menus, dialogue panels).
 * - gradient-string for the DUSK twilight gradient on ASCII art, falling back
 *   to plain text whenever color is off.
 * - ora's braille dots for busy spinners.
 *
 * Game code never touches these directly — everything sits behind GameIO and
 * this module, so a different renderer could be swapped in wholesale.
 */
const USE_COLOR = process.env.NO_COLOR === undefined;

export interface Theme {
  /** The gated chalk instance every other paint in this theme is built on. */
  chalk: ChalkInstance;
  heading(t: string): string;
  keeper(t: string): string;
  hunter(t: string): string;
  roll(t: string): string;
  system(t: string): string;
  error(t: string): string;
  accent(t: string): string;
  prompt(t: string): string;
  border(t: string): string;
  spinner(t: string): string;
  meterFill(t: string): string;
  meterEmpty(t: string): string;
  /** DUSK twilight gradient for ASCII art; the identity function when color is off. */
  dusk(t: string): string;
  /** Whether this theme paints at all (drives box borders and spinner choices). */
  readonly color: boolean;
}

/** Builds a theme bound to one output stream, so each stream gates its own color. */
export function createTheme(output: { isTTY?: boolean } = process.stdout): Theme {
  const color = USE_COLOR && !!output.isTTY;
  const chalk = new Chalk({ level: color ? 2 : 0 });
  // gradient-string paints through chalk's shared default instance, which only
  // auto-detects process.stdout; pin its level to our stream so art is colored
  // iff this stream is (this CLI has one output stream, so this stays consistent).
  chalkDefault.level = color ? 2 : 0;
  // Deep purple through dusty rose to dusk orange — a sky just after sunset.
  const dusk = color ? gradient(["#3f2669", "#7a5c9e", "#c86b85", "#e8a87c"]).multiline : (t: string) => t;
  return {
    chalk,
    heading: chalk.bold,
    keeper: chalk.bold.cyan,
    hunter: chalk.bold.yellow,
    roll: chalk.magenta,
    system: chalk.dim,
    error: chalk.bold.red,
    accent: chalk.yellow,
    prompt: chalk.bold.cyan,
    border: chalk.dim,
    spinner: chalk.cyan,
    meterFill: chalk.bold.cyan,
    meterEmpty: chalk.dim,
    dusk,
    color,
  };
}

/** The default theme for module-level callers that don't own an output stream. */
export const theme = createTheme();

/** Text with all ANSI escapes removed, for measuring real display width. */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Display width of text as seen on the terminal (ignores escape codes). */
export function visibleWidth(text: string): number {
  return stripAnsi(text).length;
}

export interface BoxOptions {
  /** Total width of the box, borders included; content is padded to fill it. */
  width?: number;
  /** Optional title embedded in the top border. */
  title?: string;
}

/**
 * A rounded bordered box (boxen) around already-wrapped content lines.
 * Wrap the text before calling this — boxen only measures plain widths.
 * With color off the box still draws in plain characters, just untinted.
 */
type BoxenOptions = NonNullable<Parameters<typeof boxen>[1]>;
/** A writable copy of boxen's options, so fields can be set conditionally. */
type WritableBoxOptions = { -readonly [K in keyof BoxenOptions]: BoxenOptions[K] };

export function box(content: string, options: BoxOptions = {}, color = true): string {
  const settings: WritableBoxOptions = {
    borderStyle: "round",
    padding: 1,
    titleAlignment: "center",
  };
  if (options.width !== undefined) settings.width = options.width;
  if (options.title !== undefined) settings.title = options.title;
  if (color) settings.borderColor = "gray";
  return boxen(content, settings);
}

/** Spinner frames for busy indicators; ora's classic braille dots. */
export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Horizontal rule with a centered title, e.g. `── The Hunt ──`. */
export function rule(text: string, width: number, paint: (t: string) => string = (t) => t): string {
  const inner = Math.max(0, width - visibleWidth(text) - 4);
  const left = Math.floor(inner / 2);
  const right = inner - left;
  return paint(`${"─".repeat(left)} ${text} ${"─".repeat(right)}`);
}

/**
 * A progress meter, e.g. `████░░░░ The Plot Thickens`.
 * Filled blocks for steps taken, light blocks for what's left.
 */
export function meter(step: number, total: number, label: string): string {
  const filled = Math.max(0, Math.min(total, step));
  const bars = `${"█".repeat(filled)}${"░".repeat(Math.max(0, total - filled))}`;
  return `${theme.meterFill(bars)} ${theme.system(label)}`;
}
