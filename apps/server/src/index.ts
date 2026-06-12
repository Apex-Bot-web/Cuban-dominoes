import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import {
  advanceHand,
  applyAutoAction,
  applyBotTurn,
  applyPlayerAction,
  confirmSalidaInHand,
  createRoom,
  disconnectSocket,
  enterChoosingState,
  getGameViews,
  getHumanPlayers,
  getMatchSummary,
  getRoom,
  getRoomView,
  getSocketInfo,
  joinRoom,
  setBot,
  setChosenSalida,
  startGame,
} from './store.js';
import type { Action, BotLevel, GameConfig, Room, Seat, Team } from './types.js';
import { getLeaderboard, getPlayerStats, recordMatchResult, upsertPlayer } from './db.js';
import {
  clearBackfillTimer,
  drainQueue,
  getQueue,
  joinQueue,
  leaveQueueBySocket,
  startBackfillTimer,
  tryFormMatch,
} from './queue.js';
import type { QueueEntry } from './queue.js';

// ── Express + Socket.IO setup ─────────────────────────────────────────────────

const IS_PROD = process.env['NODE_ENV'] === 'production';
const PORT = Number(process.env['PORT'] ?? 3001);

// In production the web app is served from the same origin — no CORS needed.
// In dev allow the Vite dev server and any explicit CLIENT_ORIGIN.
const ALLOWED_ORIGINS = IS_PROD
  ? true // same-origin, allow all (socket.io path is /socket.io/)
  : [
      'http://localhost:5173',
      'http://localhost:4173',
      ...(process.env['CLIENT_ORIGIN'] ? [process.env['CLIENT_ORIGIN']] : []),
    ];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
if (!IS_PROD) app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Health — before static middleware so it always responds
app.get('/health', (_req, res) => res.json({ ok: true }));

// Player stats (anonymous accounts — keyed by client-generated playerId)
app.get('/api/stats/:playerId', (req, res) => {
  const pid = req.params['playerId'];
  if (!pid) { res.status(400).json({ error: 'Missing playerId' }); return; }
  const stats = getPlayerStats(pid);
  if (!stats) { res.status(404).json({ error: 'Player not found' }); return; }
  res.json(stats);
});

// Global leaderboard — top 20 players with ≥3 matches
app.get('/api/leaderboard', (_req, res) => {
  res.json(getLeaderboard());
});

// Live online count — total connected sockets
app.get('/api/online', (_req, res) => {
  res.json({ count: io.engine.clientsCount });
});

// Serve built web app in production
if (IS_PROD) {
  const webDist = path.join(__dirname, '../../web/dist');
  app.use(express.static(webDist));
  // SPA fallback — any unmatched GET returns index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

// ── Timer management ──────────────────────────────────────────────────────────

const timers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(code: string): void {
  const t = timers.get(code);
  if (t !== undefined) {
    clearTimeout(t);
    timers.delete(code);
  }
}

function setTimer(code: string, ms: number, fn: () => void): void {
  clearTimer(code);
  timers.set(code, setTimeout(fn, ms));
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────

function broadcastRoomState(room: Room): void {
  for (const slot of room.slots) {
    if (!slot || slot.type !== 'human' || !slot.connected) continue;
    io.to(slot.socketId).emit('room:updated', getRoomView(room, slot.playerId));
  }
}

function broadcastGameState(room: Room): void {
  const views = getGameViews(room);
  for (let s = 0; s < 4; s++) {
    const view = views[s];
    if (!view) continue;
    const slot = room.slots[s as Seat];
    if (!slot || slot.type !== 'human' || !slot.connected) continue;
    io.to(slot.socketId).emit('game:state', view);
  }
}

// ── Turn scheduling ───────────────────────────────────────────────────────────

const TURN_TIMEOUT_MS = 30_000;
const BOT_THINK_MS = 750;
const HAND_ADVANCE_MS = 8_000;
const SCORE_VIEW_MS = 5_000;          // delay from "Siguiente mano" click to picker appearing
const CHOOSE_SALIDA_AUTO_MS = 45_000; // auto-trigger picker if nobody clicks in time
const CHOOSE_SALIDA_TIMEOUT_MS = 60_000;

function handleActionResult(
  code: string,
  room: Room,
  handOver: boolean,
  matchOver: boolean,
): void {
  broadcastGameState(room);

  if (matchOver) {
    clearTimer(code);
    const summary = getMatchSummary(code);
    if (summary) {
      for (const { playerId: pid, seat } of getHumanPlayers(code)) {
        const t = (seat % 2) as 0 | 1;
        recordMatchResult(
          pid,
          t === summary.winnerTeam,
          summary.teamScores[t] ?? 0,
          summary.teamScores[(1 - t) as 0 | 1] ?? 0,
          summary.handNumber,
        );
      }
    }
    return;
  }

  if (handOver) {
    const result = room.match?.hand.result;
    const winnerTeam = result?.winnerTeam;

    // chooseSalida: let winning team pick who leads — but only if a human is on that team
    if (
      room.config.chooseSalida &&
      winnerTeam !== undefined &&
      result?.type !== undefined
    ) {
      // tied tranque keeps same salida automatically — no choice needed
      const isTiedTranque = result.type === 'tranque' && result.tie;
      if (!isTiedTranque) {
        const teamSeats = [0, 1, 2, 3].filter(
          (s) => (s % 2) === winnerTeam,
        ) as [Seat, Seat];
        const hasHuman = teamSeats.some((s) => {
          const slot = room.slots[s];
          return slot?.type === 'human' && slot.connected;
        });

        if (hasHuman) {
          const defaultSalida = room.match!.nextSalida;
          // Park here — a player clicking "Siguiente mano →" (game:next-hand)
          // deals tiles immediately, waits 5 s, then shows the picker. If nobody
          // clicks within CHOOSE_SALIDA_AUTO_MS, do the same automatically.
          setTimer(code, CHOOSE_SALIDA_AUTO_MS, () => {
            const r = getRoom(code);
            if (!r?.match?.hand.result || r.choosingSalida) return;
            // Deal tiles for the new hand
            const autoAdvResult = advanceHand(code, defaultSalida);
            if (!autoAdvResult.ok) return;
            enterChoosingState(code, winnerTeam as Team, teamSeats, defaultSalida);
            broadcastGameState(autoAdvResult.room);
            // Show picker immediately (no 5 s buffer for the auto-triggered path)
            broadcastChoosingState(autoAdvResult.room, winnerTeam as Team, teamSeats, true);
            setTimer(code, CHOOSE_SALIDA_TIMEOUT_MS, () => {
              const autoResult = confirmSalidaInHand(code, defaultSalida);
              if (!autoResult.ok) return;
              broadcastGameState(autoResult.room);
              scheduleNextTurn(code);
            });
          });
          return;
        }
      }
    }

    setTimer(code, HAND_ADVANCE_MS, () => doAdvanceHand(code));
    return;
  }

  scheduleNextTurn(code);
}

function broadcastChoosingState(room: Room, winnerTeam: Team, seats: [Seat, Seat], showPicker = true): void {
  for (const slot of room.slots) {
    if (!slot || slot.type !== 'human' || !slot.connected) continue;
    io.to(slot.socketId).emit('game:choosing-salida', { winnerTeam, seats, showPicker });
  }
}

function scheduleNextTurn(code: string): void {
  const room = getRoom(code);
  if (!room?.match || room.match.hand.result) return;
  if (room.choosingSalida) return; // hand dealt but salida not chosen yet — don't schedule

  const turn = room.match.hand.turn;
  const slot = room.slots[turn];

  if (!slot || slot.type === 'bot') {
    setTimer(code, BOT_THINK_MS, () => doBotTurn(code, turn));
  } else if (!slot.connected) {
    setTimer(code, 2_000, () => doAutoTurn(code, turn));
  } else {
    setTimer(code, TURN_TIMEOUT_MS, () => doAutoTurn(code, turn));
  }
}

function doBotTurn(code: string, seat: Seat): void {
  const result = applyBotTurn(code, seat);
  if (!result.ok) return;
  handleActionResult(code, result.room, result.handOver, result.matchOver);
}

function doAutoTurn(code: string, seat: Seat): void {
  const result = applyAutoAction(code, seat);
  if (!result.ok) return;
  handleActionResult(code, result.room, result.handOver, result.matchOver);
}

function doAdvanceHand(code: string, salida?: Seat): void {
  clearTimer(code);
  const result = advanceHand(code, salida);
  if (!result.ok) return;
  broadcastGameState(result.room);
  scheduleNextTurn(code);
}

// ── Matchmaking ───────────────────────────────────────────────────────────────

const BOT_BACKFILL_LEVEL: BotLevel = 'medio';

function broadcastQueueUpdate(): void {
  const q = getQueue();
  q.forEach((e, i) => {
    io.to(e.socketId).emit('queue:update', { size: q.length, position: i + 1 });
  });
}

function launchMatchedGame(entries: QueueEntry[]): void {
  if (entries.length === 0) return;
  const first = entries[0]!;
  const { room } = createRoom(first.playerId, first.socketId, first.displayName);
  io.sockets.sockets.get(first.socketId)?.join(room.code);

  for (let i = 1; i < entries.length; i++) {
    const e = entries[i]!;
    const r = joinRoom(room.code, e.playerId, e.socketId, e.displayName);
    if (r.ok) io.sockets.sockets.get(e.socketId)?.join(room.code);
  }

  for (let s = 0; s < 4; s++) {
    const r = getRoom(room.code);
    if (r && !r.slots[s as Seat]) setBot(room.code, first.playerId, s as Seat, BOT_BACKFILL_LEVEL);
  }

  const startResult = startGame(room.code, first.playerId);
  if (!startResult.ok) { console.error('[queue] start failed:', startResult.error); return; }

  const views = getGameViews(startResult.room);
  for (const e of entries) {
    const slotIdx = startResult.room.slots.findIndex(
      (s) => s?.type === 'human' && s.playerId === e.playerId,
    );
    const view = views[slotIdx];
    if (view) {
      io.to(e.socketId).emit('queue:matched', {
        view,
        room: getRoomView(startResult.room, e.playerId),
      });
    }
  }

  scheduleNextTurn(room.code);
}

// ── Socket.IO connection handler ──────────────────────────────────────────────

io.on('connection', (socket) => {
  const playerId = socket.handshake.auth['playerId'] as string | undefined;
  if (!playerId || typeof playerId !== 'string') {
    socket.disconnect();
    return;
  }

  // ── room:create ──────────────────────────────────────────────────────────────
  socket.on(
    'room:create',
    ({ displayName, config }: { displayName: string; config?: Partial<GameConfig> }) => {
      upsertPlayer(playerId, displayName.trim().slice(0, 20));
      const { room } = createRoom(playerId, socket.id, displayName, config);
      socket.join(room.code);
      socket.emit('room:updated', getRoomView(room, playerId));
    },
  );

  // ── room:join ────────────────────────────────────────────────────────────────
  socket.on(
    'room:join',
    ({ code, displayName }: { code: string; displayName: string }) => {
      upsertPlayer(playerId, displayName.trim().slice(0, 20));
      const result = joinRoom(code, playerId, socket.id, displayName);
      if (!result.ok) {
        socket.emit('error', { message: result.error });
        return;
      }
      socket.join(result.room.code);
      broadcastRoomState(result.room);
      // If game already in progress, send current game state
      if (result.room.status === 'playing') {
        const views = getGameViews(result.room);
        const view = views[result.seat];
        if (view) socket.emit('game:state', view);
      }
    },
  );

  // ── room:set-bot ─────────────────────────────────────────────────────────────
  socket.on(
    'room:set-bot',
    ({ seat, level }: { seat: Seat; level: BotLevel | null }) => {
      const info = getSocketInfo(socket.id);
      if (!info) return;
      const result = setBot(info.code, playerId, seat, level);
      if (!result.ok) {
        socket.emit('error', { message: result.error });
        return;
      }
      broadcastRoomState(result.room);
    },
  );

  // ── room:start ───────────────────────────────────────────────────────────────
  socket.on('room:start', () => {
    const info = getSocketInfo(socket.id);
    if (!info) return;
    const result = startGame(info.code, playerId);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }
    broadcastRoomState(result.room);
    broadcastGameState(result.room);
    scheduleNextTurn(info.code);
  });

  // ── game:action ──────────────────────────────────────────────────────────────
  socket.on('game:action', (action: Action) => {
    const info = getSocketInfo(socket.id);
    if (!info) return;
    const roomCheck = getRoom(info.code);
    if (roomCheck?.choosingSalida) return; // salida picker is up — no play until chosen
    clearTimer(info.code);

    const result = applyPlayerAction(info.code, playerId, action);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }
    handleActionResult(info.code, result.room, result.handOver, result.matchOver);
  });

  // ── game:choose-salida ───────────────────────────────────────────────────────
  socket.on('game:choose-salida', ({ seat }: { seat: Seat }) => {
    const info = getSocketInfo(socket.id);
    if (!info) return;
    const validateResult = setChosenSalida(info.code, playerId, seat);
    if (!validateResult.ok) {
      socket.emit('error', { message: validateResult.error });
      return;
    }
    // Hand was already dealt in game:next-hand; just update who leads.
    const applyResult = confirmSalidaInHand(info.code, validateResult.seat);
    if (!applyResult.ok) {
      socket.emit('error', { message: applyResult.error });
      return;
    }
    clearTimer(info.code);
    broadcastGameState(applyResult.room);
    scheduleNextTurn(info.code);
  });

  // ── game:next-hand ───────────────────────────────────────────────────────────
  socket.on('game:next-hand', () => {
    const info = getSocketInfo(socket.id);
    if (!info) return;
    const room = getRoom(info.code);
    if (!room) return;
    // Already in the choosing phase — picker is up, ignore stray clicks.
    if (room.choosingSalida) return;

    // If chooseSalida is on and the hand ended with a clear winner, clicking
    // "Siguiente mano →" starts the 5-second countdown before the picker shows.
    const result = room.match?.hand.result;
    const winnerTeam = result?.winnerTeam;
    if (room.config.chooseSalida && result !== undefined && winnerTeam !== undefined) {
      const isTiedTranque = result.type === 'tranque' && result.tie;
      if (!isTiedTranque) {
        const teamSeats = ([0, 1, 2, 3] as Seat[]).filter(
          (s) => (s % 2) === winnerTeam,
        ) as [Seat, Seat];
        const hasHuman = teamSeats.some((s) => {
          const slot = room.slots[s];
          return slot?.type === 'human' && slot.connected;
        });
        if (hasHuman) {
          const defaultSalida = room.match!.nextSalida;
          // Deal tiles immediately so all players can see their new fichas.
          const dealResult = advanceHand(info.code, defaultSalida);
          if (!dealResult.ok) {
            doAdvanceHand(info.code); // fallback
            return;
          }
          // advanceHand clears choosingSalida; re-enter choosing state.
          enterChoosingState(info.code, winnerTeam as Team, teamSeats, defaultSalida);
          broadcastGameState(dealResult.room);
          // Block play immediately but hide the picker for 5 s.
          broadcastChoosingState(dealResult.room, winnerTeam as Team, teamSeats, false);
          // After 5 s (SCORE_VIEW_MS), show the picker.
          setTimer(info.code, SCORE_VIEW_MS, () => {
            const r = getRoom(info.code);
            if (!r?.choosingSalida) return;
            broadcastChoosingState(r, winnerTeam as Team, teamSeats, true);
            setTimer(info.code, CHOOSE_SALIDA_TIMEOUT_MS, () => {
              const autoResult = confirmSalidaInHand(info.code, defaultSalida);
              if (!autoResult.ok) return;
              broadcastGameState(autoResult.room);
              scheduleNextTurn(info.code);
            });
          });
          return;
        }
      }
    }

    doAdvanceHand(info.code);
  });

  // ── queue:join ────────────────────────────────────────────────────────────────
  socket.on('queue:join', ({ displayName }: { displayName: string }) => {
    if (!displayName?.trim()) return;
    const name = String(displayName).trim().slice(0, 20);
    upsertPlayer(playerId, name);
    joinQueue({ socketId: socket.id, playerId, displayName: name });
    broadcastQueueUpdate();
    const matched = tryFormMatch();
    if (matched) {
      clearBackfillTimer();
      broadcastQueueUpdate();
      launchMatchedGame(matched);
    } else {
      startBackfillTimer(() => {
        const entries = drainQueue();
        if (entries.length > 0) launchMatchedGame(entries);
      });
    }
  });

  // ── queue:leave ───────────────────────────────────────────────────────────────
  socket.on('queue:leave', () => {
    leaveQueueBySocket(socket.id);
    const q = getQueue();
    if (q.length === 0) clearBackfillTimer();
    else broadcastQueueUpdate();
  });

  // ── chat:send ────────────────────────────────────────────────────────────────
  socket.on('chat:send', ({ emoji, text }: { emoji?: string; text?: string }) => {
    const info = getSocketInfo(socket.id);
    if (!info) return;
    const room = getRoom(info.code);
    if (!room) return;
    const slot = room.slots[info.seat];
    if (!slot) return;

    const validEmoji = typeof emoji === 'string' && emoji.length <= 8 ? emoji : undefined;
    const validText = typeof text === 'string' ? text.trim().slice(0, 120) : undefined;
    if (!validEmoji && !validText) return;

    io.to(info.code).emit('chat:message', {
      seat: info.seat,
      displayName: slot.displayName,
      ...(validEmoji ? { emoji: validEmoji } : {}),
      ...(validText  ? { text: validText }  : {}),
    });
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    leaveQueueBySocket(socket.id);
    if (getQueue().length === 0) clearBackfillTimer();
    else broadcastQueueUpdate();

    const info = disconnectSocket(socket.id);
    if (!info) return;
    const room = getRoom(info.code);
    if (!room) return;
    broadcastRoomState(room);
    // If game in progress and it was this player's turn, restart the turn timer
    if (room.status === 'playing' && room.match && !room.match.hand.result) {
      if (room.match.hand.turn === info.seat) {
        setTimer(info.code, 2_000, () => doAutoTurn(info.code, info.seat));
      }
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
