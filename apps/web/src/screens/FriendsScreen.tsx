import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { FriendView } from '../types/socket';

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

interface FriendsScreenProps {
  onBack: () => void;
}

export function FriendsScreen({ onBack }: FriendsScreenProps) {
  const playerId = localStorage.getItem('dominoes-player-id') ?? '';

  const [myCode, setMyCode] = useState<string | null>(null);
  const [myName, setMyName] = useState('');
  const [friends, setFriends] = useState<FriendView[]>([]);
  const [loading, setLoading] = useState(true);

  const [addCode, setAddCode] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const [copied, setCopied] = useState(false);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playerId) { setLoading(false); return; }
    const savedName = (localStorage.getItem('dominoes-display-name') ?? '').trim();

    // Register presence (pass display name so solo-only players get auto-registered)
    const nameParam = savedName ? `?name=${encodeURIComponent(savedName)}` : '';
    void fetch(`${SERVER_URL}/api/me/${encodeURIComponent(playerId)}${nameParam}`)
      .then((r) => r.json() as Promise<{ displayName: string; friendCode: string }>)
      .then((d) => { setMyCode(d.friendCode); setMyName(d.displayName); })
      .catch(() => {});

    void fetchFriends();

    // Heartbeat so friends see us as online
    void fetch(`${SERVER_URL}/api/heartbeat/${encodeURIComponent(playerId)}`, { method: 'POST' }).catch(() => {});
    heartbeatRef.current = setInterval(() => {
      void fetch(`${SERVER_URL}/api/heartbeat/${encodeURIComponent(playerId)}`, { method: 'POST' }).catch(() => {});
    }, 60_000);

    return () => {
      if (heartbeatRef.current !== null) clearInterval(heartbeatRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  function fetchFriends() {
    return fetch(`${SERVER_URL}/api/friends/${encodeURIComponent(playerId)}`)
      .then((r) => r.json() as Promise<FriendView[]>)
      .then((d) => { setFriends(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  function handleCopyCode() {
    if (!myCode) return;
    void navigator.clipboard.writeText(myCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleAddFriend() {
    const code = addCode.trim().toUpperCase();
    if (!code || code.length !== 6) { setAddError('Enter the 6-character friend code'); return; }
    setAddError('');
    setAddSuccess('');
    setAddLoading(true);

    fetch(`${SERVER_URL}/api/friends/${encodeURIComponent(playerId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendCode: code }),
    })
      .then((r) => r.json() as Promise<{ ok?: boolean; error?: string; friend?: { displayName: string } }>)
      .then((d) => {
        if (d.error) { setAddError(d.error); }
        else {
          setAddSuccess(`Added ${d.friend?.displayName ?? 'friend'}!`);
          setAddCode('');
          void fetchFriends();
        }
      })
      .catch(() => setAddError('Could not connect to server'))
      .finally(() => setAddLoading(false));
  }

  function handleRemove(friendPlayerId: string, name: string) {
    if (!confirm(`Remove ${name} from friends?`)) return;
    fetch(`${SERVER_URL}/api/friends/${encodeURIComponent(playerId)}/${encodeURIComponent(friendPlayerId)}`, {
      method: 'DELETE',
    })
      .then(() => fetchFriends())
      .catch(() => {});
  }

  function handleInvite(name: string) {
    const url = window.location.origin;
    const text = `Play Cuban Domino with me! 🎲 Create a private room and share the code, or I'll create one for us. Add me with friend code: ${myCode ?? ''}`;
    if (navigator.share) {
      void navigator.share({ title: `Play Cuban Domino with ${name}`, text, url }).catch(() => {});
    } else {
      void navigator.clipboard.writeText(`${text}\n${url}`);
    }
  }

  const onlineFriends = friends.filter((f) => f.online);
  const offlineFriends = friends.filter((f) => !f.online);

  return (
    <div className="h-full flex flex-col felt-texture">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-felt-dark/80 border-b border-white/10 pt-safe shrink-0">
        <button
          onClick={onBack}
          className="text-white/40 active:text-white text-sm font-bold transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-white font-black text-lg flex-1 text-center">Friends</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-5 flex flex-col gap-5 max-w-sm mx-auto w-full">

        {/* My friend code */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">
            Your Friend Code
          </p>
          {myName && (
            <p className="text-white/60 text-xs font-bold mb-2">{myName}</p>
          )}
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-white tracking-[0.25em] tabular-nums flex-1">
              {myCode ?? '———'}
            </span>
            <button
              onClick={handleCopyCode}
              disabled={!myCode}
              className={clsx(
                'shrink-0 px-4 py-2 rounded-xl font-black text-sm transition-all active:scale-95',
                copied
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-white/10 active:bg-white/20 text-white border border-white/15',
              )}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-white/25 text-[10px] mt-2">
            Share this code so friends can add you
          </p>
        </div>

        {/* Add friend */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            Add a Friend
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={addCode}
              onChange={(e) => { setAddCode(e.target.value.toUpperCase()); setAddError(''); setAddSuccess(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFriend()}
              placeholder="6-CHAR CODE"
              maxLength={6}
              className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/25 rounded-xl px-3 py-3 text-base font-black text-center tracking-widest outline-none focus:border-white/50 transition-colors uppercase"
            />
            <button
              onClick={handleAddFriend}
              disabled={addLoading}
              className={clsx(
                'font-black text-base rounded-xl px-5 py-3 transition-colors active:scale-95 shrink-0',
                addLoading
                  ? 'bg-blue-700 text-white/50 cursor-not-allowed'
                  : 'bg-blue-600 active:bg-blue-500 text-white',
              )}
            >
              {addLoading ? '…' : 'Add'}
            </button>
          </div>
          {addError && <p className="text-red-400 text-xs font-semibold">{addError}</p>}
          {addSuccess && <p className="text-green-400 text-xs font-semibold">{addSuccess}</p>}
        </div>

        {/* Friends list */}
        <div>
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 px-1">
            Friends {friends.length > 0 ? `· ${friends.length}` : ''}
          </p>

          {loading && (
            <div className="flex justify-center py-8">
              <span className="text-white/30 text-sm animate-pulse">Loading…</span>
            </div>
          )}

          {!loading && friends.length === 0 && (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <span className="text-4xl">👥</span>
              <p className="text-white/40 text-sm">No friends yet.<br />Share your code to get started!</p>
            </div>
          )}

          {!loading && onlineFriends.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              <p className="text-green-400/60 text-[9px] font-bold uppercase tracking-widest px-1">Online now</p>
              {onlineFriends.map((f) => (
                <FriendRow key={f.playerId} friend={f} onRemove={handleRemove} onInvite={handleInvite} />
              ))}
            </div>
          )}

          {!loading && offlineFriends.length > 0 && (
            <div className="flex flex-col gap-2">
              {onlineFriends.length > 0 && (
                <p className="text-white/25 text-[9px] font-bold uppercase tracking-widest px-1 mt-1">Offline</p>
              )}
              {offlineFriends.map((f) => (
                <FriendRow key={f.playerId} friend={f} onRemove={handleRemove} onInvite={handleInvite} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FriendRow({
  friend,
  onRemove,
  onInvite,
}: {
  friend: FriendView;
  onRemove: (id: string, name: string) => void;
  onInvite: (name: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-2xl px-4 py-3">
      {/* Avatar */}
      <div className={clsx(
        'w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0',
        friend.online ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white/50',
      )}>
        {friend.displayName.charAt(0).toUpperCase()}
      </div>

      {/* Name + code */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx('font-black text-sm truncate', friend.online ? 'text-white' : 'text-white/70')}>
            {friend.displayName}
          </span>
          {friend.online && (
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.8)]" />
          )}
        </div>
        <span className="text-white/30 text-[10px] font-mono tracking-widest">{friend.friendCode}</span>
      </div>

      {/* Invite */}
      <button
        onClick={() => onInvite(friend.displayName)}
        className="shrink-0 bg-green-600/20 active:bg-green-600/40 text-green-300 border border-green-600/30 font-black text-xs rounded-xl px-3 py-1.5 transition-colors"
      >
        Invite
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(friend.playerId, friend.displayName)}
        className="text-white/20 active:text-red-400 text-lg leading-none transition-colors shrink-0 w-8 h-8 flex items-center justify-center"
        aria-label="Remove friend"
      >
        ×
      </button>
    </div>
  );
}
