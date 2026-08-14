import { useState } from 'react';
import type { FormEvent } from 'react';
import Card from './Card';

interface LobbyProps {
  onCreate: (name: string) => void;
  onJoin: (name: string, roomCode: string) => void;
  errorMessage: string | null;
}

const DECOR_CARDS: { color: 'red' | 'yellow' | 'green' | 'blue'; value: string; className: string; rot: number; delay: string }[] = [
  { color: 'red', value: '7', className: 'top-[8%] left-[6%] hidden sm:block', rot: -18, delay: '0s' },
  { color: 'blue', value: 'skip', className: 'top-[14%] right-[8%] hidden sm:block', rot: 14, delay: '1.2s' },
  { color: 'yellow', value: 'wild', className: 'bottom-[10%] left-[10%] hidden md:block', rot: 10, delay: '0.6s' },
  { color: 'green', value: 'reverse', className: 'bottom-[12%] right-[6%] hidden md:block', rot: -12, delay: '1.8s' },
];

export default function Lobby({ onCreate, onJoin, errorMessage }: LobbyProps) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [shake, setShake] = useState(false);

  const canSubmit = name.trim().length > 0 && (mode === 'create' || roomCode.trim().length >= 5);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (mode === 'create') {
      onCreate(name.trim());
    } else {
      onJoin(name.trim(), roomCode.trim().toUpperCase());
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {DECOR_CARDS.map((d, i) => (
        <div
          key={i}
          className={`absolute pointer-events-none opacity-25 blur-[0.5px] animate-drift ${d.className}`}
          style={{ '--rot': `${d.rot}deg`, animationDelay: d.delay, transform: `rotate(${d.rot}deg)` } as React.CSSProperties}
        >
          <Card card={{ id: `decor-${i}`, color: d.color, value: d.value as any }} />
        </div>
      ))}

      <div className="relative w-full max-w-md bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl animate-card-pop">
        <h1 className="text-4xl font-extrabold text-center mb-1 tracking-tight">
          <span className="text-uno-red drop-shadow-[0_2px_8px_rgba(229,57,53,0.5)]">U</span>
          <span className="text-uno-yellow drop-shadow-[0_2px_8px_rgba(251,192,45,0.5)]">N</span>
          <span className="text-uno-green drop-shadow-[0_2px_8px_rgba(67,160,71,0.5)]">O</span>
          <span className="ml-2 text-white">en ligne</span>
        </h1>
        <p className="text-center text-slate-400 mb-7 text-sm">Jouez au UNO gratuitement avec vos amis, en temps réel</p>

        <div className="relative flex bg-slate-800/80 rounded-xl p-1 mb-6">
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-indigo-600 shadow-lg transition-transform duration-300 ease-out"
            style={{ transform: mode === 'create' ? 'translateX(0.25rem)' : 'translateX(calc(100% + 0.25rem))' }}
          />
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`relative z-10 flex-1 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              mode === 'create' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Créer un salon
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`relative z-10 flex-1 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              mode === 'join' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Rejoindre
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Votre pseudo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
                </svg>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                placeholder="Ex: Alex"
                className="w-full rounded-lg bg-slate-800 border border-slate-600 pl-10 pr-4 py-2.5 text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            </div>
          </div>

          {mode === 'join' && (
            <div className="animate-fade-in">
              <label className="block text-sm text-slate-300 mb-1.5">Code du salon</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
                  </svg>
                </span>
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 5))}
                  maxLength={5}
                  placeholder="A1B2C"
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 pl-10 pr-4 py-2.5 text-white tracking-[0.3em] font-bold uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition"
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-md px-3 py-2 animate-fade-in">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="group w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2"
          >
            {mode === 'create' ? 'Créer le salon' : 'Rejoindre le salon'}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">Aucune inscription requise · Jouez instantanément</p>
      </div>
    </div>
  );
}
