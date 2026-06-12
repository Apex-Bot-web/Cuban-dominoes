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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_matches_player ON matches(player_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS oauth_accounts (
    provider    TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    player_id   TEXT NOT NULL REFERENCES players(player_id),
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (provider, provider_id)
  )
`);

// Migration: add friend_code column to existing installs
try { db.exec(`ALTER TABLE players ADD COLUMN friend_code TEXT`); } catch {}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_players_friend_code ON players(friend_code)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS friends (
    player_id        TEXT NOT NULL REFERENCES players(player_id),
    friend_player_id TEXT NOT NULL REFERENCES players(player_id),
    created_at       INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (player_id, friend_player_id)
  )
`);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateFriendCode(): string {
  let code: string;
  const check = db.prepare('SELECT 1 FROM players WHERE friend_code = ?');
  do {
    code = Array.from({ length: 6 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)] as string,
    ).join('');
  } while (check.get(code));
  return code;
}

const stmtUpsert = db.prepare(
  `INSERT INTO players (player_id, display_name) VALUES (?, ?)
   ON CONFLICT (player_id) DO UPDATE SET display_name = excluded.display_name`,
);
const stmtAssignCode = db.prepare(
  `UPDATE players SET friend_code = ? WHERE player_id = ? AND friend_code IS NULL`,
);
const stmtGetCode = db.prepare(`SELECT friend_code FROM players WHERE player_id = ?`);
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
  // Assign a friend code on first seen
  const row = stmtGetCode.get(playerId) as { friend_code: string | null } | undefined;
  if (row && !row.friend_code) stmtAssignCode.run(generateFriendCode(), playerId);
}

export function getMyInfo(playerId: string): { displayName: string; friendCode: string } | null {
  const row = db.prepare('SELECT display_name, friend_code FROM players WHERE player_id = ?').get(playerId) as
    | { display_name: string; friend_code: string | null }
    | undefined;
  if (!row) return null;
  // Assign code if missing (player registered before friends feature)
  let code = row.friend_code;
  if (!code) {
    code = generateFriendCode();
    stmtAssignCode.run(code, playerId);
  }
  return { displayName: row.display_name, friendCode: code };
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

const stmtLeaderboard = db.prepare(`
  SELECT p.display_name, COUNT(*) AS mp,
    SUM(m.won) AS w,
    ROUND(100.0 * SUM(m.won) / COUNT(*), 0) AS wr
  FROM matches m
  JOIN players p ON p.player_id = m.player_id
  GROUP BY m.player_id
  HAVING mp >= 3
  ORDER BY w DESC, wr DESC
  LIMIT 20
`);

export interface LeaderboardEntry {
  displayName: string;
  matchesPlayed: number;
  wins: number;
  winRate: number;
}

export function getLeaderboard(): LeaderboardEntry[] {
  const rows = stmtLeaderboard.all() as {
    display_name: string; mp: number; w: number; wr: number;
  }[];
  return rows.map((r) => ({
    displayName: r.display_name,
    matchesPlayed: r.mp,
    wins: r.w,
    winRate: r.wr,
  }));
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

const stmtFindByOAuth = db.prepare(
  `SELECT player_id FROM oauth_accounts WHERE provider = ? AND provider_id = ?`,
);
const stmtLinkOAuth = db.prepare(
  `INSERT OR IGNORE INTO oauth_accounts (provider, provider_id, player_id) VALUES (?, ?, ?)`,
);

export function findPlayerByOAuth(provider: string, providerId: string): string | null {
  const row = stmtFindByOAuth.get(provider, providerId) as { player_id: string } | undefined;
  return row?.player_id ?? null;
}

export function linkOAuth(provider: string, providerId: string, playerId: string): void {
  stmtLinkOAuth.run(provider, providerId, playerId);
}

// ── Friends ───────────────────────────────────────────────────────────────────

export interface FriendEntry {
  playerId: string;
  displayName: string;
  friendCode: string;
}

const stmtLookupByCode = db.prepare(
  `SELECT player_id, display_name FROM players WHERE friend_code = ?`,
);
const stmtAddFriend = db.prepare(
  `INSERT OR IGNORE INTO friends (player_id, friend_player_id) VALUES (?, ?)`,
);
const stmtRemoveFriend = db.prepare(
  `DELETE FROM friends WHERE player_id = ? AND friend_player_id = ?`,
);
const stmtGetFriends = db.prepare(`
  SELECT p.player_id, p.display_name, COALESCE(p.friend_code, '') AS friend_code
  FROM friends f JOIN players p ON p.player_id = f.friend_player_id
  WHERE f.player_id = ?
  ORDER BY p.display_name
`);

export function lookupByFriendCode(code: string): { playerId: string; displayName: string } | null {
  const row = stmtLookupByCode.get(code.toUpperCase().trim()) as
    | { player_id: string; display_name: string }
    | undefined;
  return row ? { playerId: row.player_id, displayName: row.display_name } : null;
}

export function addFriend(playerId: string, friendPlayerId: string): void {
  db.transaction(() => {
    stmtAddFriend.run(playerId, friendPlayerId);
    stmtAddFriend.run(friendPlayerId, playerId);
  })();
}

export function removeFriend(playerId: string, friendPlayerId: string): void {
  db.transaction(() => {
    stmtRemoveFriend.run(playerId, friendPlayerId);
    stmtRemoveFriend.run(friendPlayerId, playerId);
  })();
}

export function getFriends(playerId: string): FriendEntry[] {
  const rows = stmtGetFriends.all(playerId) as {
    player_id: string;
    display_name: string;
    friend_code: string;
  }[];
  return rows.map((r) => ({
    playerId: r.player_id,
    displayName: r.display_name,
    friendCode: r.friend_code,
  }));
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
