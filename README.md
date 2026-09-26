# Tabletop AI

A TypeScript CLI foundation for tabletop RPG sessions with an AI game master and AI player characters. The core is kept independent from the CLI transport so a Discord bot can reuse the same game engine later.

## Status

This is an adapter scaffold, not a playable game yet. Current core-mechanics slices cover D&D 5e (2014), Shadowrun: Anarchy 2.0, Fate Condensed, Blades in the Dark, Pathfinder 2e Remaster, Cairn 2e, and Basic Roleplaying. It also includes a system-neutral SCP Foundation setting module with one original containment case. The session planner supports up to six PC slots, mixed human/AI players, human or AI GM, and random GM assignment; it previews a roster but does not run turns yet. Full character creation, advancement, campaign state, detailed combat, the live model client, and Discord transport remain unimplemented. Anarchy 2.0 was selected because its publisher describes it as narrative-first and newcomer-oriented ([announcement](https://black-book-editions.fr/actualite.php?id=12271)). The SCP module is separate and has its own [license notice](src/settings/scp/NOTICE.md). Do not add SCP Wiki article text or artwork without checking its license.

## Requirements

- Node.js 22+
- npm

Bun can also run the TypeScript entry point, but this scaffold uses npm scripts so it can be run in environments without Bun.

## Quick start

```sh
npm install
npm run test
npm run typecheck
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

- `src/cli.ts` — executable entry point and CLI commands
- `src/domain/` — deterministic game primitives, including dice
- `src/rpg/` — seven rules adapters plus registry (each is an initial mechanics slice, not complete system coverage)
- `src/settings/` — system-neutral setting modules and case files
- `src/ai/` — role-specific model configuration and provider-neutral agent contract; no model HTTP client is wired yet
- `test/` — behavior-focused tests

Keep game logic independent of the CLI so a future Discord transport can call the same engine. The D&D adapter uses SRD 5.1-compatible rules; the required attribution is in [`SRD_ATTRIBUTION.md`](SRD_ATTRIBUTION.md). SCP-derived setting content and its share-alike notice are isolated under `src/settings/scp/`. Before distributing adapters, check each game's license and required attribution. Next slices: deeper per-game character/state models, followed by combat and campaign loops.
