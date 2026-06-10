# Cuban Double-9 Dominoes — Architecture & Roadmap

A multiplayer web app for classic Cuban dominoes: private rooms with friends, online matchmaking with strangers, and AI bots that can fill empty seats or serve as practice opponents.

---

## 1. Game Specification (lock this down first)

Everything downstream depends on a precise, written rule set. Cuban dominoes is well-defined at its core, but every family plays slight variants, so the engine should treat house rules as configuration, not code changes.

### Core rules (the canonical mode)

The set is double-9: 55 tiles (0-0 through 9-9). Four players sit in fixed positions and play as two partnerships — you and the player across from you are a team. Each player draws 10 tiles, leaving 15 tiles out of play for the entire hand (no boneyard, no drawing — if you can't play, you knock and pass).

Play proceeds counterclockwise (the traditional Cuban direction — make this configurable since many online players expect clockwise). The first hand starts with whoever holds the 9-9 (or by agreement, any player leads anything); in every subsequent hand, the side that won the previous hand leads, typically the player who dominoed (la salida es del ganador). The opening tile can be anything — there's no requirement to open with a double.

A hand ends one of two ways. **Dominó:** a player plays their last tile; their team scores the sum of all pips remaining in the opponents' hands. **Tranque (blocked game):** nobody can play; each team sums its remaining pips, and the team with the lower total scores the opponents' pips. On a tie tranque, nobody scores and the same salida leads again (configurable: some houses give the hand to the team of the player who didn't close).

The match is played to a target score — 100 is the classic Cuban target, 150 is also common. First team to reach it wins.

### House-rule configuration flags

Build these as room settings from day one: target score (100 / 150 / 200), direction of play, who leads the first hand (9-9 holder vs. random vs. winner of a draw), tie-tranque resolution, whether the winning team scores opponents' pips only or all remaining pips, and an optional timer per turn (essential online — 30s default with auto-pass or auto-play is standard).

Deliberately out of scope for v1: capicúa bonuses and pollona/viuda variants (more Dominican/Puerto Rican than Cuban), 2-player and 3-player modes, and double-6 sets. The engine should be parameterized enough that these are add-ons later, not rewrites.

---

## 2. System Architecture

### The one decision that matters most: server-authoritative everything

In any online card/tile game, the #1 design rule is that the client never knows anything it shouldn't. The server holds the full game state; each client receives only its own hand, the board, the pip *counts* of other hands (not contents), and the pass history. All moves are validated server-side. This kills cheating-by-inspection (opening dev tools to see opponents' tiles) at the architectural level rather than trying to patch it later. Given your trading background, think of it like broker-side order validation — the client is just a terminal.

### Stack

**Monorepo (TypeScript end to end)** with three packages:

`packages/engine` — Pure TypeScript game engine with zero dependencies. Tile representation, shuffle/deal, legal-move computation, tranque detection, scoring, full hand/match state machine. Pure functions: `(state, action) → newState`. This is the heart of the project and the part to build and test first. Because it's pure, the same code runs on the server (authoritative), in the bots (simulation), and optionally on the client (instant move validation for snappy UX before server confirmation).

`apps/server` — Node.js with **Socket.IO** for realtime transport. Alternatives considered: Colyseus (a game-server framework — nice room abstractions but adds a learning curve and lock-in) and raw WebSockets (more work for reconnect handling). Socket.IO wins for v1 because reconnection, rooms, and fallback transports come free, and the ecosystem/documentation depth means Claude Code can move fast in it. Room state lives in **Redis** (survives server restarts, enables horizontal scaling later); completed games, accounts, and stats persist to **PostgreSQL**.

`apps/web` — **React + Vite + TypeScript**, built as a **PWA** (installable on phones from the browser — your friends get an "app icon" without you touching the App Store). Tailwind for styling. The board rendered in SVG/HTML rather than canvas: dominoes layouts are structured and benefit from DOM hit-testing, accessibility, and easy animation. Mobile-first layout, since realistically most games with friends happen on phones.

### Realtime flow

Player action → Socket.IO event → server validates against engine → server applies move → server broadcasts personalized state diffs to each seat (each player gets their own filtered view) → clients animate. Turn timers run server-side; on expiry the server auto-passes (or auto-plays the only legal tile) and broadcasts. Reconnection: a player who drops gets a grace window (60–90s) where a bot does *not* take over; on reconnect the server replays current filtered state. If the window expires, a bot substitutes until they return — games with friends die instantly without this.

### Rooms, matchmaking, and identity

**Identity:** anonymous-first. A guest picks a display name and gets a signed token; that's enough for private rooms and bot games. Optional account (Google OAuth / magic-link email) unlocks persistent stats, ELO, and friend lists. Don't gate playing behind signup — it's the fastest way to lose your first hundred users.

**Private rooms:** creator gets a 6-character room code and shareable link, picks house rules, assigns seats/teams (drag players to seats — partnerships matter in Cuban dominoes and people have opinions about who they partner with). Empty seats can be filled with bots at three difficulty levels.

**Matchmaking:** a Redis-backed queue. v1 logic is simple: group four players, randomize partnerships, standard rules, go. The honest truth about matchmaking (truth mode): it's worthless without player liquidity. With 12 concurrent users you'll have 3-minute waits and people will leave. The standard mitigation is **bot backfill** — after ~45 seconds in queue, fill remaining seats with bots (disclosed or not, your call; disclosed is the ethical default). This is why bots are a P0 feature, not a nice-to-have: they solve cold-start for matchmaking *and* give solo players a reason to return. ELO/ranked queues only make sense once you have real traffic — phase 3 at the earliest.

### Bot AI

Heuristic, not ML — dominoes bots get genuinely strong with rule-based play, and it's debuggable. Three tiers:

*Fácil* plays a random legal tile. *Medio* plays greedy: dump the heaviest playable tile, prefer keeping suit flexibility. *Duro* does what good Cuban players do: track every pass (a pass on 6s means that player has no 6s — remember it), count how many of each suit have been played and infer hand distributions, protect the partner (don't kill the suit your partner opened; if your partner passed on 5s, don't force 5s back to them), and play for the tranque when the team pip count favors it. All of this is bookkeeping plus weighted scoring of legal moves — a few hundred lines on top of the engine, and very much the kind of logic you'll enjoy tuning (it's filter-confluence scoring, same instinct as your trading work).

### Hosting & cost

Server + Redis + Postgres on **Railway** or **Fly.io**; static frontend on Vercel/Netlify or served by the same box. Realistic cost at hobby scale: **$10–25/month** total. A single small Node instance comfortably handles hundreds of concurrent games — dominoes is tiny payloads at human speed, nothing like market-data throughput. Scaling beyond one instance (Socket.IO Redis adapter, sticky sessions) is a known path you won't need until thousands of concurrent users.

---

## 3. Roadmap

### Phase 0 — Engine + rules (week 1)

Build `packages/engine` with exhaustive unit tests: dealing, legal moves, tranque detection, every scoring path, every house-rule flag. This is where bugs are cheapest to kill. Deliverable: a CLI where four scripted players complete a full match correctly. No UI, no network.

### Phase 1 — Single-player vs. bots (weeks 2–3)

React board UI (mobile-first), drag-or-tap to play, the three bot tiers, full match flow with scoring screen. Deliverable: you can play a complete, satisfying match against three bots in the browser. This is also your visual-design iteration loop — get the table felt, tile snapping, and end-of-hand pip-count reveal feeling right before multiplayer complicates everything.

### Phase 2 — Private rooms (weeks 4–6)

Server + Socket.IO + Redis, room codes, seat/team assignment, house-rule settings, turn timers, reconnect grace + bot substitution, in-room emoji/quick-chat (full chat invites moderation headaches; canned phrases + emojis cover 90% of table talk). Deliverable: you send four friends a link and play a real match Friday night. **This is the milestone that matters — everything before it is buildup, everything after is growth.**

### Phase 3 — Accounts + matchmaking (weeks 7–9)

OAuth/magic-link accounts, persistent stats (win rate, average pips left, tranques won), quick-match queue with bot backfill, basic leaderboard. Deliverable: a stranger can land on the site and be in a game within 60 seconds.

### Phase 4 — Polish & growth (ongoing)

Spectator mode, match history/replays, ELO + ranked queue (only if liquidity supports it), sound design, animations, Spanish/English localization (non-negotiable for this audience — do it earlier if bandwidth allows), and optionally wrapping the PWA with Capacitor for real App Store / Play Store listings.

### Honest effort estimate

Working with Claude Code at a steady part-time pace, Phase 0–1 is very achievable in 2–3 weeks, and a friends-playable Phase 2 in 5–7 weeks total. The long tail is always multiplayer edge cases: disconnects mid-turn, two actions racing, timer expiry at the exact moment a move lands. Budget real time for that — it's the difference between a demo and a thing people actually use weekly.

---

## 4. Risks, stated plainly

**Cold start is the real boss fight, not the code.** The build is well-trodden engineering; getting strangers into the matchmaking pool is the hard part. Plan for the app to be "private rooms + bots" for its first months and treat matchmaking as a feature you *earn* with traffic. **Scope creep on variants:** everyone you show it to will ask for their house rules; the config-flag design absorbs this, but say no to new rule *mechanics* until Phase 4. **Moderation:** the moment strangers can interact, you need mute/report — quick-chat-only sidesteps most of it. **Monetization (if ever):** cosmetics (tile skins, table felts) and an ad-free tier are the proven path for parlor games; never sell gameplay advantage.

---

## 5. Immediate next steps

1. Confirm/adjust the rule spec in Section 1 — especially direction of play, salida rules, and tranque tie-breaking as *you* play them.
2. Stand up the monorepo and build the engine with tests (Phase 0).
3. First playable vs. bots, then iterate the table UI until it feels like dominoes, not a spreadsheet.

The right tool for the build itself is Claude Code — point it at this document as the project brief and work phase by phase.
