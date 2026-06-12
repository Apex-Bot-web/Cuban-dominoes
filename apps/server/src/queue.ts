export interface QueueEntry {
  socketId: string;
  playerId: string;
  displayName: string;
}

const queue: QueueEntry[] = [];
let backfillTimer: ReturnType<typeof setTimeout> | null = null;
export const BACKFILL_MS = 45_000;

export function joinQueue(entry: QueueEntry): readonly QueueEntry[] {
  if (!queue.some((e) => e.playerId === entry.playerId)) queue.push(entry);
  return queue;
}

export function leaveQueueBySocket(socketId: string): boolean {
  const idx = queue.findIndex((e) => e.socketId === socketId);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  return true;
}

export function tryFormMatch(): QueueEntry[] | null {
  return queue.length >= 4 ? queue.splice(0, 4) : null;
}

export function drainQueue(): QueueEntry[] {
  return queue.splice(0, queue.length);
}

export function getQueue(): readonly QueueEntry[] {
  return queue;
}

export function startBackfillTimer(onFire: () => void): void {
  if (backfillTimer !== null) return;
  backfillTimer = setTimeout(() => {
    backfillTimer = null;
    onFire();
  }, BACKFILL_MS);
}

export function clearBackfillTimer(): void {
  if (backfillTimer !== null) {
    clearTimeout(backfillTimer);
    backfillTimer = null;
  }
}
