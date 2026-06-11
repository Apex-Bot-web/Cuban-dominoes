import {
  applyAction,
  botAction,
  createMatch,
  DEFAULT_CONFIG,
  legalMoves,
  playerView,
  startNextHand,
} from '@dominoes/engine';
import type {
  Action,
  BotLevel,
  BotSlot,
  GameConfig,
  HumanSlot,
  MatchState,
  PlayerView,
  Room,
  RoomSeatView,
  RoomView,
  Seat,
  SeatSlot,
  Team,
} from './types.js';

// ── In-memory state ───────────────────────────────────────────────────────────

const rooms = new Map<string, Room>();
// socketId → { code, seat } for O(1) disconnect lookup
const socketIndex = new Map<string, { code: string; seat: Seat }>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code: string;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

const BOT_NAMES: Record<BotLevel, string> = {
  facil: 'Bot Fácil',
  medio: 'Bot Medio',
  duro: 'Bot Duro',
};

// ── Exports ───────────────────────────────────────────────────────────────────

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getSocketInfo(socketId: string): { code: string; seat: Seat } | undefined {
  return socketIndex.get(socketId);
}

export function getRoomView(room: Room, playerId: string): RoomView {
  const mySeatIdx = room.slots.findIndex(
    (s) => s?.type === 'human' && s.playerId === playerId,
  );
  const mySeat = mySeatIdx === -1 ? null : (mySeatIdx as Seat);

  const seats = room.slots.map((slot): RoomSeatView | null => {
    if (!slot) return null;
    return {
      displayName: slot.displayName,
      type: slot.type,
      ...(slot.type === 'bot' ? { botLevel: slot.level } : {}),
      connected: slot.type === 'bot' ? true : slot.connected,
      isMe: slot.type === 'human' && slot.playerId === playerId,
    };
  }) as RoomView['seats'];

  return {
    code: room.code,
    mySeat,
    isHost: room.hostPlayerId === playerId,
    seats,
    config: room.config,
    status: room.status,
  };
}

/** Returns one PlayerView per seat (index = seat number), undefined for bot slots. */
export function getGameViews(room: Room): (PlayerView | undefined)[] {
  if (!room.match) return [undefined, undefined, undefined, undefined];
  return room.slots.map((slot, i) => {
    if (!slot || slot.type !== 'human') return undefined;
    return playerView(room.match!, i as Seat);
  });
}

// ── Room lifecycle ────────────────────────────────────────────────────────────

export function createRoom(
  playerId: string,
  socketId: string,
  displayName: string,
  config?: Partial<GameConfig>,
): { room: Room; seat: Seat } {
  const code = genCode();
  const slot: HumanSlot = { type: 'human', playerId, socketId, displayName, connected: true };
  const room: Room = {
    code,
    hostPlayerId: playerId,
    slots: [slot, null, null, null],
    // chooseSalida defaults true on this server — winning team picks who leads
    config: { ...DEFAULT_CONFIG, chooseSalida: true, ...config },
    status: 'waiting',
  };
  rooms.set(code, room);
  socketIndex.set(socketId, { code, seat: 0 });
  return { room, seat: 0 };
}

export function joinRoom(
  code: string,
  playerId: string,
  socketId: string,
  displayName: string,
): { ok: true; room: Room; seat: Seat } | { ok: false; error: string } {
  const room = rooms.get(code.toUpperCase());
  if (!room) return { ok: false, error: 'Sala no encontrada' };
  if (room.status === 'finished') return { ok: false, error: 'La partida ha terminado' };

  // Reconnect: same playerId already has a seat
  for (let i = 0; i < 4; i++) {
    const slot = room.slots[i as Seat];
    if (slot?.type === 'human' && slot.playerId === playerId) {
      const prev = slot.socketId;
      if (prev) socketIndex.delete(prev);
      slot.socketId = socketId;
      slot.connected = true;
      delete slot.disconnectedAt;
      socketIndex.set(socketId, { code: room.code, seat: i as Seat });
      return { ok: true, room, seat: i as Seat };
    }
  }

  if (room.status === 'playing') return { ok: false, error: 'La partida ya comenzó' };

  // New player — find first empty seat
  const emptyIdx = room.slots.findIndex((s) => s === null);
  if (emptyIdx === -1) return { ok: false, error: 'Sala llena' };

  const seat = emptyIdx as Seat;
  const slot: HumanSlot = { type: 'human', playerId, socketId, displayName, connected: true };
  room.slots[seat] = slot;
  socketIndex.set(socketId, { code: room.code, seat });
  return { ok: true, room, seat };
}

export function setBot(
  code: string,
  hostPlayerId: string,
  seat: Seat,
  level: BotLevel | null,
): { ok: true; room: Room } | { ok: false; error: string } {
  const room = rooms.get(code);
  if (!room) return { ok: false, error: 'Sala no encontrada' };
  if (room.hostPlayerId !== hostPlayerId) return { ok: false, error: 'Solo el anfitrión puede modificar la sala' };
  if (room.status !== 'waiting') return { ok: false, error: 'La partida ya comenzó' };

  const existing = room.slots[seat];
  if (existing?.type === 'human') return { ok: false, error: 'Hay un jugador en ese asiento' };

  if (level === null) {
    room.slots[seat] = null;
  } else {
    const bot: BotSlot = { type: 'bot', displayName: BOT_NAMES[level], level };
    room.slots[seat] = bot;
  }
  return { ok: true, room };
}

export function startGame(
  code: string,
  playerId: string,
): { ok: true; room: Room } | { ok: false; error: string } {
  const room = rooms.get(code);
  if (!room) return { ok: false, error: 'Sala no encontrada' };

  if (room.status === 'playing') return { ok: false, error: 'La partida ya está en curso' };
  if (room.status === 'waiting' && room.hostPlayerId !== playerId) {
    return { ok: false, error: 'Solo el anfitrión puede iniciar la partida' };
  }
  if (room.slots.some((s) => s === null)) return { ok: false, error: 'Faltan jugadores (necesita 4)' };

  room.match = createMatch(room.config);
  room.status = 'playing';
  return { ok: true, room };
}

// ── In-game actions ───────────────────────────────────────────────────────────

type ActionResult =
  | { ok: true; room: Room; handOver: boolean; matchOver: boolean }
  | { ok: false; error: string };

export function applyPlayerAction(
  code: string,
  playerId: string,
  action: Action,
): ActionResult {
  const room = rooms.get(code);
  if (!room?.match) return { ok: false, error: 'No hay partida en curso' };
  if (room.match.hand.result) return { ok: false, error: 'La mano ya terminó' };

  const turn = room.match.hand.turn;
  const slot = room.slots[turn];
  if (slot?.type !== 'human' || slot.playerId !== playerId) {
    return { ok: false, error: 'No es tu turno' };
  }
  if (action.seat !== turn) return { ok: false, error: 'Seat incorrecto en la acción' };

  const result = applyAction(room.match, action);
  if (!result.ok) return { ok: false, error: result.error };

  room.match = result.match;
  const handOver = !!room.match.hand.result;
  const matchOver = room.match.winnerTeam !== undefined;
  if (matchOver) room.status = 'finished';
  return { ok: true, room, handOver, matchOver };
}

export function applyBotTurn(code: string, seat: Seat): ActionResult {
  const room = rooms.get(code);
  if (!room?.match) return { ok: false, error: 'No hay partida' };
  if (room.match.hand.result) return { ok: false, error: 'Mano terminada' };
  if (room.match.hand.turn !== seat) return { ok: false, error: 'No es el turno del bot' };

  const slot = room.slots[seat];
  if (slot?.type !== 'bot') return { ok: false, error: 'No es un bot' };

  const seed =
    (room.match.rngState ^
      ((seat + 1) * 0x9e3779b9) ^
      (room.match.hand.board.length * 0x517cc1b7)) >>>
    0;
  const action = botAction(room.match.hand, seat, slot.level, seed);
  const result = applyAction(room.match, action);
  if (!result.ok) return { ok: false, error: result.error };

  room.match = result.match;
  const handOver = !!room.match.hand.result;
  const matchOver = room.match.winnerTeam !== undefined;
  if (matchOver) room.status = 'finished';
  return { ok: true, room, handOver, matchOver };
}

export function applyAutoAction(code: string, seat: Seat): ActionResult {
  const room = rooms.get(code);
  if (!room?.match) return { ok: false, error: 'No hay partida' };
  if (room.match.hand.result) return { ok: false, error: 'Mano terminada' };
  if (room.match.hand.turn !== seat) return { ok: false, error: 'No es ese turno' };

  const moves = legalMoves(room.match.hand, seat);
  const action: Action =
    moves.length > 0
      ? { type: 'play', seat, tile: moves[0]!.tile, side: moves[0]!.side }
      : { type: 'pass', seat };

  const result = applyAction(room.match, action);
  if (!result.ok) return { ok: false, error: result.error };

  room.match = result.match;
  const handOver = !!room.match.hand.result;
  const matchOver = room.match.winnerTeam !== undefined;
  if (matchOver) room.status = 'finished';
  return { ok: true, room, handOver, matchOver };
}

export function advanceHand(
  code: string,
  salida?: Seat,
): { ok: true; room: Room } | { ok: false; error: string } {
  const room = rooms.get(code);
  if (!room?.match) return { ok: false, error: 'No hay partida' };
  if (!room.match.hand.result) return { ok: false, error: 'La mano no ha terminado' };

  const result = startNextHand(room.match, salida);
  if (!result.ok) return { ok: false, error: result.error };

  room.match = result.match;
  delete room.choosingSalida;
  return { ok: true, room };
}

export function enterChoosingState(
  code: string,
  winnerTeam: Team,
  seats: [Seat, Seat],
  defaultSalida: Seat,
): Room | undefined {
  const room = rooms.get(code);
  if (!room) return undefined;
  room.choosingSalida = { winnerTeam, seats, defaultSalida };
  return room;
}

export function setChosenSalida(
  code: string,
  playerId: string,
  seat: Seat,
): { ok: true; seat: Seat } | { ok: false; error: string } {
  const room = rooms.get(code);
  if (!room?.choosingSalida) return { ok: false, error: 'No se está eligiendo salida' };

  const { winnerTeam, seats } = room.choosingSalida;

  // Validate player is on the winning team
  const playerSeat = room.slots.findIndex(
    (s) => s?.type === 'human' && s.playerId === playerId,
  ) as Seat | -1;
  if (playerSeat === -1) return { ok: false, error: 'Jugador no encontrado' };
  if (!seats.includes(playerSeat)) return { ok: false, error: 'No estás en el equipo ganador' };
  if (!seats.includes(seat)) {
    return { ok: false, error: `El asiento ${seat} no pertenece al equipo ganador` };
  }

  void winnerTeam; // used for validation via seats check above
  return { ok: true, seat };
}

// ── Connection events ─────────────────────────────────────────────────────────

export function disconnectSocket(socketId: string): { code: string; seat: Seat } | null {
  const info = socketIndex.get(socketId);
  if (!info) return null;
  socketIndex.delete(socketId);

  const room = rooms.get(info.code);
  if (!room) return null;

  const slot = room.slots[info.seat];
  if (slot?.type === 'human') {
    slot.connected = false;
    slot.disconnectedAt = Date.now();
  }
  return info;
}
