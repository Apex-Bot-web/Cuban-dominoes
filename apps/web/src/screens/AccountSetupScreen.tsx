import { useState } from 'react';

interface AccountSetupScreenProps {
  onDone: (displayName: string) => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
}

export function AccountSetupScreen({ onDone, onPrivacy, onTerms }: AccountSetupScreenProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a display name'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    localStorage.setItem('dominoes-display-name', trimmed);
    onDone(trimmed);
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-6 felt-texture">
      <div className="text-center">
        <div className="text-7xl mb-4 leading-none select-none">🁣</div>
        <h1 className="text-4xl font-black text-white tracking-tight">Cuban Domino</h1>
        <p className="text-white/40 text-sm mt-2">Create your account to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
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
            autoFocus
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/25 rounded-xl px-4 py-3 text-base font-semibold outline-none focus:border-white/50 focus:bg-white/15 transition-colors"
          />
          {error && <p className="text-red-400 text-sm font-semibold mt-1.5">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-500 text-white font-black text-lg rounded-2xl py-4 transition-colors active:scale-95"
        >
          Get Started →
        </button>
      </form>

      <p className="text-white/20 text-xs text-center max-w-xs">
        Your progress is saved on this device. No password needed.
      </p>

      <p className="text-white/20 text-[11px] text-center max-w-xs leading-relaxed">
        By continuing you agree to our{' '}
        <button onClick={onTerms} className="underline underline-offset-2 active:text-white/50">
          Terms of Service
        </button>
        {' '}and{' '}
        <button onClick={onPrivacy} className="underline underline-offset-2 active:text-white/50">
          Privacy Policy
        </button>
      </p>
    </div>
  );
}
