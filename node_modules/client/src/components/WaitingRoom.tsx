import { useState } from 'react';
import type { GameRules, PersonalGameState } from '@uno/shared';

interface WaitingRoomProps {
  state: PersonalGameState;
  onStart: () => void;
  onLeave: () => void;
  onUpdateRules: (rules: Partial<GameRules>) => void;
}

const RULE_INFO: { key: keyof GameRules; icon: string; label: string; description: string }[] = [
  { key: 'stacking', icon: '🔁', label: 'Identique', description: 'Enchaînez les cartes du même chiffre une par une ; le joueur suivant peut casser le tour si vous êtes trop lent.' },
  { key: 'jumpIn', icon: '🐸', label: 'Saute-mouton', description: 'Jouer hors tour si vous avez la carte identique (couleur + chiffre) à celle du dessus.' },
  { key: 'chaos', icon: '🔥', label: 'Chaos', description: 'Empiler des +2 et +4 les uns sur les autres.' },
  { key: 'infiniteDraw', icon: '♾️', label: 'Pioche infinie', description: 'Piocher jusqu\'à obtenir une carte de la bonne couleur.' },
];

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-fuchsia-500'];

export default function WaitingRoom({ state, onStart, onLeave, onUpdateRules }: WaitingRoomProps) {
  const isHost = state.hostId === state.yourId;
  const canStart = state.players.length >= 2;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard?.writeText(state.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl animate-card-pop">
        <p className="text-center text-slate-400 mb-1 text-sm">Code du salon — partagez-le à vos amis</p>
        <button
          type="button"
          onClick={handleCopy}
          className="group w-full flex items-center justify-center gap-3 mb-6 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 py-3 transition"
        >
          <span className="text-4xl font-extrabold tracking-[0.3em] text-indigo-300">{state.roomCode}</span>
          <span className="text-slate-500 group-hover:text-indigo-300 transition">
            {copied ? (
              <span className="text-xs font-semibold text-emerald-400">Copié !</span>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
            )}
          </span>
        </button>

        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-2">Joueurs · {state.players.length}</p>
          <div className="space-y-1.5">
            {state.players.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2 animate-float-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span className="font-medium flex-1 truncate">
                  {p.name}
                  {p.id === state.yourId && <span className="ml-2 text-xs text-slate-500">(vous)</span>}
                </span>
                {p.id === state.hostId && <span title="Hôte">👑</span>}
                <span className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-2">Règles spéciales</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RULE_INFO.map((rule) => {
              const active = state.rules[rule.key];
              return (
                <div
                  key={rule.key}
                  className={`relative rounded-xl border px-3 py-2.5 transition ${
                    active ? 'border-indigo-500/60 bg-indigo-950/30' : 'border-slate-700 bg-slate-800/60'
                  } ${isHost ? '' : 'opacity-80'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-none">{rule.icon}</span>
                      <div>
                        <p className="text-sm font-semibold leading-tight">{rule.label}</p>
                        <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{rule.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isHost}
                      onClick={() => onUpdateRules({ [rule.key]: !active })}
                      className={`shrink-0 w-9 h-5 rounded-full relative transition-colors mt-0.5 ${
                        active ? 'bg-indigo-500' : 'bg-slate-600'
                      } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: active ? 'translateX(1rem)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isHost ? (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition shadow-lg shadow-indigo-950/50"
          >
            {canStart ? 'Démarrer la partie' : 'En attente de joueurs (min. 2)'}
          </button>
        ) : (
          <p className="text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            En attente que l'hôte démarre la partie...
          </p>
        )}

        <button
          type="button"
          onClick={onLeave}
          className="w-full mt-3 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm text-slate-300 transition"
        >
          Quitter le salon
        </button>
      </div>
    </div>
  );
}
