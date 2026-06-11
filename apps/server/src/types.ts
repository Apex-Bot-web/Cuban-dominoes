import type {
  Action,
  BotLevel,
  GameConfig,
  MatchState,
  PlayerView,
  Seat,
} from '@dominoes/engine';

export type { Action, BotLevel, GameConfig, MatchState, PlayerView, Seat };

// ── Server-side room state ────────────────────────────────────────────────────

export interface HumanSlot {
  type: 'human';
  playerId: string;
  socketId: string;
  displayName: string;
  connected: boolean;
  disconnectedAt?: number;
}

export interface BotSlot {
  type: 'bot';
  displayName: string;
  level: BotLevel;
}

export type SeatSlot = HumanSlot | BotSlot;

export interface Room {
  code: string;
  hostPlayerId: string;
  slots: [SeatSlot | null, SeatSlot | null, SeatSlot | null, SeatSlot | null];
  config: GameConfig;
  status: 'waiting' | 'playing' | 'finished';
  match?: MatchState;
}

// ── Client-safe room view ─────────────────────────────────────────────────────

export interface RoomSeatView {
  displayName: string;
  type: 'human' | 'bot';
  botLevel?: BotLevel;
  connected: boolean;
  isMe: boolean;
}

export interface RoomView {
  code: string;
  mySeat: Seat | null;
  isHost: boolean;
  seats: [RoomSeatView | null, RoomSeatView | null, RoomSeatView | null, RoomSeatView | null];
  config: GameConfig;
  status: 'waiting' | 'playing' | 'finished';
}
