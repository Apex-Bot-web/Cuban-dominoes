# Cuban Double-9 Dominoes

A multiplayer web app for classic Cuban dominoes: 55-tile double-9 set, four players in two partnerships, 10 tiles each (15 sleep), no drawing — first team to 100 wins.

## Layout

```
packages/engine   Pure TypeScript rules engine — DONE, 36 tests passing
apps/web          React PWA client (Phase 1 — next)
apps/server       Socket.IO authoritative server (Phase 2)
docs/             ARCHITECTURE.md — the full plan and roadmap
CLAUDE.md         Project brief + invariants for Claude Code
```

## Quick start

```bash
npm install
npm test     # 36 tests incl. 130 full simulated matches
npm run sim  # watch four bots play a complete match in the terminal
```

## The engine in 30 seconds

`createMatch(config, seed)` deals a hand and seats the salida (double-9 holder leads hand one). `applyAction` validates every play/pass — wrong turn, tile not in hand, tile doesn't fit, or passing while holding a playable tile all return typed errors instead of mutating anything. Four consecutive passes trigger a tranque scored to the lower-pip team; emptying your hand is a dominó scored from the opponents' leftover pips. `playerView(match, seat)` produces the only state shape a server may ever send to a client — verified by an information-leak test.

House rules (target score, first lead, tie-tranque resolution, partner-pip scoring) are `GameConfig` flags, because every Cuban table argues about them.
