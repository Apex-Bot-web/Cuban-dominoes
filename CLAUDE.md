# CLAUDE.md — Cuban Double-9 Dominoes

Multiplayer web app for classic Cuban dominoes (double-9, 4 players, two partnerships, to 100 points). Full plan: `docs/ARCHITECTURE.md`. Read it before starting any phase.

## Project status

- **Phase 0 — DONE.** `packages/engine` is complete, strictly typed, and tested (36 tests, including 130 full simulated matches and an information-leak audit). `npm test` from root must stay green.
- **Phase 1 — NEXT.** Build `apps/web`: React + Vite + TypeScript PWA where a human plays vs three bots using the engine directly in the browser. Mobile-first.
- **Phase 2.** `apps/server`: Node + Socket.IO + Redis, private rooms with codes, seat/team assignment, turn timers, reconnect grace + bot substitution.
- **Phase 3.** Accounts (anonymous-first + OAuth), matchmaking queue with bot backfill, stats.

## Non-negotiable invariants

1. **Server-authoritative.** Clients never receive another seat's hand or the sleeping tiles. The ONLY payload shape sent to a client is `PlayerView` from `packages/engine/src/view.ts`. Never serialize raw `MatchState`/`HandState` to a socket.
2. **The engine stays pure and dependency-free.** No I/O, no network, no framework imports in `packages/engine`. Game-rule changes go in the engine with tests, never in UI or server code.
3. **House rules are config, not code.** New variants extend `GameConfig` with a default that preserves current behavior.
4. **Bots read only public info + their own hand** (own tiles, board, pass history). A bot reading `hand.hands[otherSeat]` is a bug, full stop.
5. **Determinism.** All randomness flows through the seeded rng (`src/rng.ts`). A match must be reproducible from (seed, action log).

## Commands

- `npm test` — engine test suite (run from root or `packages/engine`)
- `npm run sim` — tests + a full logged bot match (`npx tsx src/cli-sim.ts [seed]` inside the engine for a specific seed)
- `npm run typecheck --workspace=@dominoes/engine` — strict TS check

## Engine API cheat sheet

```ts
import {
  createMatch, applyAction, startNextHand,   // match lifecycle
  legalMoves, canPlay,                        // move queries
  playerView,                                 // the ONLY client-safe view
  botAction,                                  // 'facil' | 'medio' | 'duro'
} from '@dominoes/engine';

let match = createMatch({ targetScore: 100 }, seed);
const moves = legalMoves(match.hand, match.hand.turn);
const r = applyAction(match, { type: 'play', seat, tile, side });
if (r.ok) match = r.match;            // hand may now have .result
// show the score screen, then:
const next = startNextHand(match);
```

Conventions: seats 0–3 in turn order; teams by parity (0&2 vs 1&3); tiles are `[a, b]` pairs, oriented on the board so `board[i][1] === board[i+1][0]`.

## Style

- TypeScript strict everywhere; `noUncheckedIndexedAccess` stays on.
- Pure functions over classes in game logic. Results as `{ ok: true, ... } | { ok: false, error }` — no throwing for rule violations.
- Spanish flavor in user-facing strings is welcome (dominó, tranque, la salida); code identifiers stay English.
