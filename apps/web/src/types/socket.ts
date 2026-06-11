import type { Action, BotLevel, GameConfig, PlayerView, Seat } from '@dominoes/engine';

export type { Action, BotLevel, GameConfig, PlayerView, Seat };

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
