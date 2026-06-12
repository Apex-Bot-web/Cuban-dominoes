import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

const GOOGLE_CLIENT_ID = import.meta.env['VITE_GOOGLE_CLIENT_ID'] as string | undefined;
const APPLE_CLIENT_ID = import.meta.env['VITE_APPLE_CLIENT_ID'] as string | undefined;

interface OAuthResult {
  playerId: string;
  displayName: string;
  friendCode: string;
}

interface AccountSetupScreenProps {
  onDone: (displayName: string) => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export function AccountSetupScreen({ onDone, onPrivacy, onTerms }: AccountSetupScreenProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Initialize Google Identity Services once the script loads
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    function tryInit() {
      if (cancelled) return;
      if (!window.google?.accounts?.id) { setTimeout(tryInit, 200); return; }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID!,
        callback: handleGoogleCredential,
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          width: 280,
        });
      }
    }
    tryInit();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveAndDone(result: OAuthResult) {
    localStorage.setItem('dominoes-player-id', result.playerId);
    localStorage.setItem('dominoes-display-name', result.displayName);
    onDone(result.displayName);
  }

  function handleGoogleCredential(response: { credential: string }) {
    setOauthLoading('google');
    setError('');
    const currentPlayerId = localStorage.getItem('dominoes-player-id') ?? undefined;

    fetch(`${SERVER_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: response.credential, currentPlayerId }),
    })
      .then((r) => r.json() as Promise<OAuthResult & { error?: string }>)
      .then((data) => {
        if (data.error) { setError(data.error); setOauthLoading(null); return; }
        saveAndDone(data);
      })
      .catch(() => { setError('Could not connect to server'); setOauthLoading(null); });
  }

  async function handleAppleSignIn() {
    if (!APPLE_CLIENT_ID || !window.AppleID) return;
    setOauthLoading('apple');
    setError('');
    try {
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name',
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const result = await window.AppleID.auth.signIn();
      const idToken = result.authorization.id_token;
      const firstName = result.user?.name?.firstName;
      const lastName = result.user?.name?.lastName;
      const currentPlayerId = localStorage.getItem('dominoes-player-id') ?? undefined;

      const res = await fetch(`${SERVER_URL}/api/auth/apple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, firstName, lastName, currentPlayerId }),
      });
      const data = (await res.json()) as OAuthResult & { error?: string };
      if (data.error) { setError(data.error); setOauthLoading(null); return; }
      saveAndDone(data);
    } catch (e) {
      // User cancelled the popup — not a real error
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('cancel') && !msg.includes('popup')) setError('Apple sign-in failed');
      setOauthLoading(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a display name'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    localStorage.setItem('dominoes-display-name', trimmed);
    onDone(trimmed);
  }

  const showOAuth = GOOGLE_CLIENT_ID || APPLE_CLIENT_ID;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-6 felt-texture overflow-y-auto">
      {/* Logo */}
      <div className="text-center">
        <div className="text-7xl mb-3 leading-none select-none">🁣</div>
        <h1 className="text-4xl font-black text-white tracking-tight">Cuban Domino</h1>
        <p className="text-white/40 text-sm mt-2">Sign in to save your progress across devices</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Google Sign In */}
        {GOOGLE_CLIENT_ID && (
          <div className={clsx('relative', oauthLoading === 'google' && 'opacity-60 pointer-events-none')}>
            {/* GIS renders its own button into this div */}
            <div ref={googleBtnRef} className="flex justify-center" />
            {oauthLoading === 'google' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/60 text-sm animate-pulse">Signing in…</span>
              </div>
            )}
          </div>
        )}

        {/* Apple Sign In */}
        {APPLE_CLIENT_ID && (
          <button
            onClick={() => void handleAppleSignIn()}
            disabled={oauthLoading !== null}
            className={clsx(
              'w-full flex items-center justify-center gap-3 rounded-full py-3 font-semibold text-sm transition-all active:scale-95',
              oauthLoading === 'apple'
                ? 'bg-white/60 text-black/60 cursor-not-allowed'
                : 'bg-white text-black hover:bg-white/90',
            )}
          >
            {/* Apple logo SVG */}
            <svg viewBox="0 0 14 17" width="14" height="17" fill="currentColor" aria-hidden="true">
              <path d="M7.05 3.56c.8 0 1.8-.54 2.4-1.26.54-.65.93-1.56.93-2.47 0-.12-.01-.24-.03-.34-.88.03-1.94.59-2.58 1.35-.5.57-.96 1.46-.96 2.38 0 .13.02.26.03.3.06.01.14.04.21.04zm-2.7 13.3c1.08 0 1.56-.72 2.91-.72 1.37 0 1.67.7 2.87.7 1.18 0 1.97-1.1 2.72-2.17.84-1.23 1.18-2.43 1.2-2.49-.08-.03-2.34-.95-2.34-3.55 0-2.24 1.74-3.27 1.83-3.34-1.12-1.6-2.82-1.64-3.34-1.64-1.32 0-2.4.8-3.08.8-.73 0-1.7-.76-2.84-.76C2.3 4.19 0 6.08 0 9.67c0 2.22.86 4.57 1.92 6.08.91 1.28 1.7 2.11 2.43 2.11z"/>
            </svg>
            {oauthLoading === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </button>
        )}

        {/* Divider */}
        {showOAuth && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/15" />
            <span className="text-white/30 text-xs font-bold uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/15" />
          </div>
        )}

        {/* Manual name entry */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-white/60 text-xs font-bold uppercase tracking-widest mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Carlos"
              maxLength={20}
              autoFocus={!showOAuth}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/25 rounded-xl px-4 py-3 text-base font-semibold outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={oauthLoading !== null}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-lg rounded-2xl py-4 transition-colors active:scale-95 disabled:opacity-50"
          >
            Get Started →
          </button>
        </form>

        <p className="text-white/20 text-xs text-center leading-relaxed">
          Your progress is saved{showOAuth ? ' to your account' : ' on this device'}.
          No password needed.
        </p>

        {/* Legal */}
        <p className="text-white/20 text-[11px] text-center leading-relaxed">
          By continuing you agree to our{' '}
          <button onClick={onTerms} className="underline underline-offset-2 active:text-white/50">
            Terms
          </button>
          {' '}and{' '}
          <button onClick={onPrivacy} className="underline underline-offset-2 active:text-white/50">
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
}
