import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Production: set DB_PATH env var to a Railway Volume mount path for persistence.
const DB_PATH = process.env['DB_PATH'] ?? path.join(process.cwd(), 'data', 'dominoes.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    player_id    TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS matches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id    TEXT NOT NULL REFERENCES players(player_id),
    won          INTEGER NOT NULL,
    my_score     INTEGER NOT NULL,
    their_score  INTEGER NOT NULL,
    hands_played INTEGER NOT NULL,
    played_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

const stmtUpsert = db.prepare(
  `INSERT INTO players (player_id, display_name) VALUES (?, ?)
   ON CONFLICT (player_id) DO UPDATE SET display_name = excluded.display_name`,
);
const stmtInsertMatch = db.prepare(
  `INSERT INTO matches (player_id, won, my_score, their_score, hands_played) VALUES (?, ?, ?, ?, ?)`,
);
const stmtStats = db.prepare(
  `SELECT COUNT(*) AS mp, SUM(won) AS w, SUM(my_score) AS ts, SUM(hands_played) AS th
   FROM matches WHERE player_id = ?`,
);
const stmtName = db.prepare(`SELECT display_name FROM players WHERE player_id = ?`);
const stmtRecent = db.prepare(
  `SELECT won FROM matches WHERE player_id = ? ORDER BY played_at DESC LIMIT 20`,
);

export function upsertPlayer(playerId: string, displayName: string): void {
  stmtUpsert.run(playerId, displayName);
}

export function recordMatchResult(
  playerId: string,
  won: boolean,
  myScore: number,
  theirScore: number,
  handsPlayed: number,
): void {
  stmtInsertMatch.run(playerId, won ? 1 : 0, myScore, theirScore, handsPlayed);
}

export interface PlayerStatsView {
  displayName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPointsScored: number;
  totalHandsPlayed: number;
  currentStreak: number;
}

export function getPlayerStats(playerId: string): PlayerStatsView | null {
  const nameRow = stmtName.get(playerId) as { display_name: string } | undefined;
  if (!nameRow) return null;

  const row = stmtStats.get(playerId) as
    | { mp: number; w: number; ts: number; th: number }
    | undefined;

  const matchesPlayed = row?.mp ?? 0;
  const wins = row?.w ?? 0;

  const recent = stmtRecent.all(playerId) as { won: number }[];
  let streak = 0;
  if (recent.length > 0) {
    const first = recent[0]!.won;
    for (const r of recent) {
      if (r.won !== first) break;
      streak++;
    }
    if (first === 0) streak = -streak;
  }

  return {
    displayName: nameRow.display_name,
    matchesPlayed,
    wins,
    losses: matchesPlayed - wins,
    winRate: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
    totalPointsScored: row?.ts ?? 0,
    totalHandsPlayed: row?.th ?? 0,
    currentStreak: streak,
  };
}
