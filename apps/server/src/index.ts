import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  advanceHand,
  applyAutoAction,
  applyBotTurn,
  applyPlayerAction,
  createRoom,
  disconnectSocket,
  getGameViews,
  getRoom,
  getRoomView,
  getSocketInfo,
  joinRoom,
  setBot,
  startGame,
} from './store.js';
import type { Action, BotLevel, GameConfig, Room, Seat } from './types.js';

// ── Express + Socket.IO setup ─────────────────────────────────────────────────

const PORT = Number(process.env['PORT'] ?? 3001);
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env['CLIENT_ORIGIN'] ? [process.env['CLIENT_ORIGIN']] : []),
];

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

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

function handleActionResult(
  code: string,
  room: Room,
  handOver: boolean,
  matchOver: boolean,
): void {
  broadcastGameState(room);

  if (matchOver) {
    clearTimer(code);
    return;
  }

  if (handOver) {
    setTimer(code, HAND_ADVANCE_MS, () => doAdvanceHand(code));
    return;
  }

  scheduleNextTurn(code);
}

function scheduleNextTurn(code: string): void {
  const room = getRoom(code);
  if (!room?.match || room.match.hand.result) return;

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

function doAdvanceHand(code: string): void {
  clearTimer(code);
  const result = advanceHand(code);
  if (!result.ok) return;
  broadcastGameState(result.room);
  scheduleNextTurn(code);
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
      const { room } = createRoom(playerId, socket.id, displayName, config);
      socket.join(room.code);
      socket.emit('room:updated', getRoomView(room, playerId));
    },
  );

  // ── room:join ────────────────────────────────────────────────────────────────
  socket.on(
    'room:join',
    ({ code, displayName }: { code: string; displayName: string }) => {
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
    clearTimer(info.code);

    const result = applyPlayerAction(info.code, playerId, action);
    if (!result.ok) {
      socket.emit('error', { message: result.error });
      return;
    }
    handleActionResult(info.code, result.room, result.handOver, result.matchOver);
  });

  // ── game:next-hand ───────────────────────────────────────────────────────────
  socket.on('game:next-hand', () => {
    const info = getSocketInfo(socket.id);
    if (!info) return;
    doAdvanceHand(info.code);
  });

  // ── disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
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
