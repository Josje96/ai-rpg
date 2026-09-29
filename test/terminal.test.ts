import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { TerminalIO, wrap } from "../src/session/terminal.js";

function io() {
  const input = new PassThrough();
  const output = new PassThrough();
  let text = "";
  output.on("data", (d) => { text += String(d); });
  const t = new TerminalIO(input as never, output as never);
  return { t, input, out: () => text };
}

test("type-ahead lines aren't lost", async () => {
  const { t, input } = io();
  input.write("first\nsecond\n");
  await new Promise((r) => setImmediate(r));
  assert.equal(await t.ask("one?"), "first");
  assert.equal(await t.ask("two?"), "second");
  const pending = t.ask("three?");
  input.write("third\n");
  assert.equal(await pending, "third");
  t.close();
});

test("end of input (Ctrl-D, dropped SSH) answers /quit", async () => {
  const { t, input } = io();
  const pending = t.ask("still there?");
  input.end();
  assert.equal(await pending, "/quit");
  assert.equal(await t.ask("again?"), "/quit");
  assert.equal(await t.choose("pick", ["a", "b"]), 0);
  assert.equal(await t.confirm("sure?"), false);
});

test("choose re-asks until it gets a valid number", async () => {
  const { t, input, out } = io();
  input.write("9\nzebra\n2\n");
  await new Promise((r) => setImmediate(r));
  assert.equal(await t.choose("Pick", ["a", "b"]), 1);
  assert.match(out(), /Type a number from 1 to 2/);
  t.close();
});

test("wraps to narrow phone widths with a hanging indent", () => {
  assert.equal(wrap("the quick brown fox jumps", 11, "  "), "the quick\n  brown fox\n  jumps");
});

test("art: the largest size that fits, centered; nothing if none fits", () => {
  const large = "\n      /\\\n     /  \\   a mountain drawn wide enough to need space\n";
  const small = "\n   /\\\n  /  \\ hill\n";
  const render = (columns: number, variants: readonly string[] = [large, small]) => {
    const input = new PassThrough();
    const output = new PassThrough() as PassThrough & { columns?: number };
    output.columns = columns;
    let text = "";
    output.on("data", (d) => { text += String(d); });
    const t = new TerminalIO(input as never, output as never);
    t.art(variants);
    t.close();
    return text;
  };
  assert.match(render(80), /a mountain/);
  const narrow = render(30);
  assert.match(narrow, /hill/);
  assert.doesNotMatch(narrow, /mountain/);
  // centered: the 9-wide small version sits in the middle of 29 usable columns
  assert.match(narrow, /\n {11}\/\\\n {10}\/  \\ hill/);
  assert.equal(render(30, [large]).trim(), "", "no size fits: nothing, rather than wrapped art");
});
