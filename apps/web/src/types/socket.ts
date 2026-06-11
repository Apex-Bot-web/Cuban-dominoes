import type { Action, BotLevel, GameConfig, PlayerView, Seat, Team } from '@dominoes/engine';

export type { Action, BotLevel, GameConfig, PlayerView, Seat, Team };

export interface ChoosingAboutSalida {
  winnerTeam: Team;
  seats: [Seat, Seat];
}

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
