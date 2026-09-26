# Tabletop AI

A TypeScript CLI foundation for tabletop RPG sessions with an AI game master and AI player characters. The core is kept independent from the CLI transport so a Discord bot can reuse the same game engine later.

## Status

**Playable: Monster of the Week-style monster hunting with an AI Keeper**, in the terminal, hot-seat on one device (works over SSH from a phone). Up to 5 hunters, any mix of humans and AI. Everything else (the other seven systems, the party planner, the SCP setting) is still a rules slice or scaffold.

## Play

```sh
npm install
npm run play
```

Needs `OPENROUTER_API_KEY` in `.env` (see `.env.example`). A session is a few cents: a six-round playtest cost about $0.02.

- **Setup:** pick a mystery (the hand-written *The Lantern at Mercy Lake*, or have the AI write a new one), say how many people are at the device, and each person builds a hunter. Choose from six original hunter types, step by step or quick-built at random. AI hunters fill out the team.
- **Turns:** each hunter acts once per round, then the Keeper moves the monster and the world. On your turn, type what your hunter does in plain words. The Keeper decides if it triggers a move; **the engine rolls the dice** (2d6 + stat: 10+ strong hit, 7-9 hit with a cost, 6- miss and +1 XP) and tracks harm, Luck, XP, clues and the countdown.
- **Luck** (7 each) turns a roll into a 12 or cancels incoming harm; you're asked when it matters.
- **Win** by finding the monster's weakness through clues and using it before the six-step countdown runs out.
- **Commands:** `/sheet`, `/party`, `/clues`, `/recap`, `/ask <question>` (out of character), `/rules`, `/pass`, `/save`, `/quit`.
- **Saves** happen after every turn (`~/.local/share/tabletop-ai/saves`). Ctrl-C, Ctrl-D or a dropped SSH connection saves too; `npm run play` offers to continue.

### How the AI is kept honest

The Keeper (GM model) only *proposes*: every reply is JSON that the engine validates before it touches the game. Harm is clamped (at most 4 per hit, monster damage capped by the hunter's weapon); unknown hunters are ignored; it can't declare victory before the weakness is found. It never rolls dice. **Pacing is engine-enforced:** at most one countdown step per round, and the final step (the monster winning) only on the Keeper's own turn, so one bad roll can't end the game. AI hunters are played by a cheaper model that never sees the Keeper's secrets. Run with `DEBUG=1` to see when the engine overrides the Keeper.

### About the rules text

*Monster of the Week* (Evil Hat) isn't openly licensed. This project implements the Powered by the Apocalypse mechanics with **original** hunter types, move wording and mystery. Don't paste the book's playbook or move text into the repo.

## Requirements

- Node.js 22+
- npm

Bun can also run the TypeScript entry point, but this scaffold uses npm scripts so it can be run in environments without Bun.

## Quick start

```sh
npm install
npm run test
npm run typecheck
npm run play
npm run dev -- systems
npm run dev -- settings
npm run dev -- scenario scp-foundation quiet-annex-001
npm run dev -- roll 2d6+3
npm run dev -- shadowrun-roll 6 --advantage
npm run dev -- party-plan 4 2 --gm ai
npm run dev -- party-plan 4 2 --gm human
npm run dev -- party-plan 4 2 --randomize
```

## Model recommendation (checked Sep 2026)

The first recommendation was too expensive for this project. **GPT-6 Luna** is a much better baseline than Gemini 3.6 Flash: OpenRouter lists it at **$0.10/M input and $0.50/M output**, and its API accepts tool calls. The current role defaults use GPT-6 Luna for the GM.

For AI players, the scaffold defaults to **Qwen3.7 Flash** at **$0.03/M input and $0.13/M output**. OpenRouter reports tool support and JSON response formatting, but not JSON-schema enforcement; validate all actions/tool arguments in the app. This is a cost-first candidate, not a proven roleplay winner. If the dialogue or instruction following is weak, set `PLAYER_MODEL=openai/gpt-6-luna`.

A second cheap comparison is **DeepSeek V4 Flash 0731** at **$0.021/M input and $0.32/M output** on OpenRouter. Its product description targets reasoning and agent workflows; it is worth including in a small eval if Qwen's dialogue quality disappoints.

Keep models configurable by role. Evaluate the same scripted scenes for narrative quality, character consistency, valid action/tool calls, rules consistency, latency, and cost per scene before locking in models. Don't treat a large context window as a reason to resend whole transcripts—summarize and budget context per turn.

Prices change; recheck before deployment. For API behavior, see [GPT-6 Luna on OpenRouter](https://openrouter.ai/openai/gpt-6-luna), [Qwen3.7 Flash on OpenRouter](https://openrouter.ai/qwen/qwen3.7-flash), and [DeepSeek V4 Flash 0731 on OpenRouter](https://openrouter.ai/deepseek/deepseek-v4-flash-0731). These listings expose current prices and supported API features.


## Current structure

- `src/cli.ts` — executable entry point and CLI commands (`play` starts the game)
- `src/motw/` — the playable game: rules, hunter types, mysteries, keeper prompts/validation, game loop, terminal UI, saves
- `scripts/playtest.ts` — live playtest against the real models (`npm run playtest`, a few cents)
- `src/domain/` — deterministic game primitives, including dice
- `src/rpg/` — seven rules adapters plus registry (each is an initial mechanics slice, not complete system coverage)
- `src/settings/` — system-neutral setting modules and case files
- `src/ai/` — role-specific model and reasoning configuration, and the OpenRouter client (any OpenAI-compatible endpoint via `OPENROUTER_BASE_URL`)
- `test/` — behavior-focused tests

Keep game logic independent of the CLI so a future Discord transport can call the same engine. The D&D adapter uses SRD 5.1-compatible rules; the required attribution is in [`SRD_ATTRIBUTION.md`](SRD_ATTRIBUTION.md). SCP-derived setting content and its share-alike notice are isolated under `src/settings/scp/`. Before distributing adapters, check each game's license and required attribution. Next slices: deeper per-game character/state models, followed by combat and campaign loops.
