import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card as CardType, CardColor, PersonalGameState } from '@uno/shared';
import Card from './Card';

interface GameBoardProps {
  state: PersonalGameState;
  onPlayCard: (cardId: string, chosenColor?: CardColor) => void;
  onBreakStack: () => void;
  onPassTurn: () => void;
  onDrawCard: () => void;
  onCallUno: () => void;
  onCatchUno: (targetId: string) => void;
  onAccuseLiar: () => void;
  onLeave: () => void;
}

const COLOR_DOT: Record<CardColor, string> = {
  red: 'bg-uno-red',
  yellow: 'bg-uno-yellow',
  green: 'bg-uno-green',
  blue: 'bg-uno-blue',
  wild: 'bg-slate-500',
};

export default function GameBoard({ state, onPlayCard, onBreakStack, onPassTurn, onDrawCard, onCallUno, onCatchUno, onAccuseLiar, onLeave }: GameBoardProps) {
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [dismissedReveal, setDismissedReveal] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [handWidth, setHandWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));
  const handContainerRef = useRef<HTMLDivElement | null>(null);

  const me = useMemo(() => state.players.find((p) => p.id === state.yourId), [state]);
  const opponents = useMemo(() => state.players.filter((p) => p.id !== state.yourId), [state]);
  const isMyTurn = state.currentPlayerId === state.yourId;
  const canCallUno = state.yourHand.length === 1 && !(me?.hasCalledUno ?? false);
  const isVictim = state.pendingDraw?.victimId === state.yourId;
  const canStack = !!state.pendingDraw && isVictim && state.rules.chaos;
  const isStackOwner = state.stackWindow?.playerId === state.yourId;
  const isBreaker = state.stackWindow?.breakerId === state.yourId;

  useEffect(() => {
    if (!state.stackWindow) return;
    const id = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(id);
  }, [state.stackWindow?.expiresAt]);

  useEffect(() => {
    const el = handContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setHandWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const CARD_WIDTH_PX = 96; // w-24
  const CARD_GAP_PX = 8;
  const handCount = state.yourHand.length;
  const cardStep = handCount > 1
    ? Math.min(
        CARD_WIDTH_PX + CARD_GAP_PX,
        Math.max((handWidth - CARD_WIDTH_PX) / (handCount - 1), 0),
      )
    : CARD_WIDTH_PX + CARD_GAP_PX;
  const stackRemainingSec = state.stackWindow
    ? Math.max(0, Math.ceil((state.stackWindow.expiresAt - now) / 1000))
    : 0;

  const revealSignature = state.lastReveal ? `${state.lastReveal.playerId}-${state.lastReveal.resolvedAt}` : null;
  useEffect(() => {
    if (!revealSignature) return;
    const t = setTimeout(() => setDismissedReveal(revealSignature), 6000);
    return () => clearTimeout(t);
  }, [revealSignature]);
  const showReveal = !!revealSignature && dismissedReveal !== revealSignature;

  function isCardPlayableNow(card: CardType): boolean {
    if (state.stackWindow) {
      return isStackOwner && card.value === state.stackWindow.value;
    }
    if (state.pendingDraw) {
      if (!isVictim) return false;
      return state.rules.chaos && (card.value === 'draw2' || card.value === 'wild4');
    }
    if (isMyTurn) return true;
    if (state.rules.jumpIn && state.topCard && card.color === state.topCard.color && card.value === state.topCard.value) {
      return true;
    }
    return false;
  }

  function handleCardClick(card: CardType) {
    if (!isCardPlayableNow(card)) return;
    if (card.color === 'wild') {
      setPendingWildCardId(card.id);
      return;
    }
    onPlayCard(card.id);
  }

  function chooseColor(color: CardColor) {
    if (pendingWildCardId) {
      onPlayCard(pendingWildCardId, color);
      setPendingWildCardId(null);
    }
  }

  if (state.status === 'finished') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate-900/70 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl text-center animate-card-pop">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold mb-2">Partie terminée !</h2>
          <p className="text-lg text-indigo-300 mb-6">
            {winner ? `${winner.name} a gagné !` : 'Partie terminée'}
          </p>
          <button
            type="button"
            onClick={onLeave}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold transition"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col p-3">
      <div className="flex justify-between items-center mb-2 shrink-0 gap-2">
        <div className="text-base text-slate-400 shrink-0">
          Salon <span className="text-indigo-300 font-bold tracking-widest text-lg">{state.roomCode}</span>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowLog((v) => !v)}
            className="text-sm px-4 py-2 rounded-md border border-slate-600 hover:bg-slate-800"
          >
            Journal
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="text-sm px-4 py-2 rounded-md border border-slate-600 hover:bg-slate-800"
          >
            Quitter
          </button>
        </div>
      </div>

      {showLog && (
        <div className="mb-2 shrink-0 max-h-24 overflow-y-auto bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 space-y-1">
          {state.log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3 mb-2 shrink-0 max-h-[20vh] overflow-y-auto">
        {opponents.map((p) => {
          const isTurn = state.currentPlayerId === p.id;
          return (
            <div
              key={p.id}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl border transition-all duration-300 ${
                isTurn
                  ? 'border-indigo-400 bg-indigo-950/50 animate-turn-glow scale-110'
                  : 'border-slate-700/70 bg-slate-900/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                    isTurn ? 'w-10 h-10 text-sm bg-indigo-500 text-white shadow-lg shadow-indigo-500/50' : 'w-8 h-8 text-xs bg-slate-700 text-slate-300'
                  }`}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={`font-medium transition-all duration-300 ${
                    isTurn ? 'text-base font-bold text-indigo-300 drop-shadow-[0_0_6px_rgba(129,140,248,0.7)]' : 'text-sm'
                  }`}
                >
                  {p.name} {!p.isConnected && <span className="text-red-400">(déco)</span>}
                </span>
              </div>
              <div className="flex -space-x-8">
                {Array.from({ length: Math.min(p.handCount, 7) }).map((_, i) => (
                  <Card key={i} card={{ id: `${p.id}-${i}`, color: 'wild', value: 'wild' }} faceDown small />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{p.handCount} carte{p.handCount > 1 ? 's' : ''}</span>
                {p.handCount === 1 && !p.hasCalledUno && (
                  <button
                    type="button"
                    onClick={() => onCatchUno(p.id)}
                    className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-xs font-bold shadow animate-pulse"
                  >
                    Contre UNO !
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {state.pendingDraw && (
        <div className="mb-2 shrink-0 flex flex-col items-center gap-2 bg-red-950/40 border border-red-700/50 rounded-xl px-4 py-2">
          <p className="text-sm font-semibold text-red-300">
            🔥 {state.pendingDraw.count} carte{state.pendingDraw.count > 1 ? 's' : ''} en jeu —{' '}
            {isVictim ? 'c\'est à vous de réagir !' : `${state.players.find((p) => p.id === state.pendingDraw?.victimId)?.name ?? '...'} doit réagir.`}
          </p>
          {isVictim && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDrawCard}
                className="px-4 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-xs font-bold"
              >
                Piocher {state.pendingDraw.count}
              </button>
              {state.pendingDraw.canChallenge && (
                <button
                  type="button"
                  onClick={onAccuseLiar}
                  className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-xs font-bold shadow animate-pulse"
                >
                  Accuser de menteur !
                </button>
              )}
            </div>
          )}
          {canStack && (
            <p className="text-xs text-red-300/70">Ou empilez un +2/+4 depuis votre main.</p>
          )}
        </div>
      )}

      {state.stackWindow && (
        <div className="mb-2 shrink-0 flex flex-col items-center gap-2 bg-indigo-950/40 border border-indigo-700/50 rounded-xl px-4 py-2">
          <p className="text-sm font-semibold text-indigo-300">
            🔁 {state.players.find((p) => p.id === state.stackWindow?.playerId)?.name ?? '...'} empile des {state.stackWindow.value}
            {state.stackWindow.skipCount > 0 ? ` (x${state.stackWindow.skipCount + 1})` : ''} — {stackRemainingSec}s
          </p>
          {isStackOwner && (
            <p className="text-xs text-indigo-300/70">Jouez un autre {state.stackWindow.value} pour continuer, ou attendez la fin du délai.</p>
          )}
          {isBreaker && (
            <button
              type="button"
              onClick={onBreakStack}
              className="px-4 py-1.5 rounded-full bg-yellow-600 hover:bg-yellow-500 text-xs font-bold shadow animate-pulse"
            >
              Casser le tour !
            </button>
          )}
        </div>
      )}

      {showReveal && state.lastReveal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-float-in" onClick={() => setDismissedReveal(revealSignature)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center animate-card-pop max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-semibold">
              {state.lastReveal.wasLying
                ? `😱 ${state.players.find((p) => p.id === state.lastReveal?.playerId)?.name ?? '...'} avait une carte de la couleur précédente : menteur démasqué !`
                : `✅ ${state.players.find((p) => p.id === state.lastReveal?.playerId)?.name ?? '...'} n'avait vraiment pas la couleur : accusation infondée !`}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 mb-3">
              {state.lastReveal.cards.map((c) => (
                <Card key={c.id} card={c} small />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDismissedReveal(revealSignature)}
              className="text-xs px-4 py-1.5 rounded-md border border-slate-600 hover:bg-slate-800"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3">
        {!isMyTurn && (
          <div
            className="text-indigo-400 text-3xl leading-none select-none animate-bounce shrink-0 mb-1"
            style={{ filter: 'drop-shadow(0 0 10px rgba(129,140,248,0.8))' }}
          >
            ▲
          </div>
        )}

        <div className="relative w-[min(38vh,85vw)] h-[min(38vh,85vw)] min-w-[15rem] min-h-[15rem] max-w-[22rem] max-h-[22rem] flex items-center justify-center shrink-0">
          <div
            className="absolute inset-3 animate-spin-slow"
            style={{ animationDirection: state.direction === 1 ? 'normal' : 'reverse' }}
          >
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <div key={angle} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                <span
                  className="absolute top-1/2 right-0 text-indigo-300/80 text-2xl font-bold"
                  style={{
                    transform: `translate(50%, -50%) rotate(${state.direction === 1 ? 90 : -90}deg)`,
                    textShadow: '0 0 8px rgba(99,102,241,0.6)',
                  }}
                >
                  ➤
                </span>
              </div>
            ))}
          </div>
          <div className="absolute inset-6 rounded-full bg-emerald-900/20 border border-emerald-700/20 shadow-[inset_0_0_50px_rgba(0,0,0,0.4)]" />

          <div className="relative z-10 flex items-center gap-6">
            <div className="relative flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onDrawCard}
                disabled={!isMyTurn || !!state.pendingDraw || !!state.stackWindow || state.hasDrawnThisTurn}
                className={`flex flex-col items-center gap-2 ${isMyTurn && !state.pendingDraw && !state.stackWindow && !state.hasDrawnThisTurn ? '' : 'opacity-50 cursor-not-allowed'}`}
              >
                <Card card={{ id: 'deck', color: 'wild', value: 'wild' }} faceDown />
                <span className="text-sm text-slate-300">Piocher ({state.deckCount})</span>
              </button>

              {isMyTurn && state.hasDrawnThisTurn && !state.pendingDraw && !state.stackWindow && (
                <button
                  type="button"
                  onClick={onPassTurn}
                  title="Passer le tour"
                  className="absolute -bottom-2 -right-3 w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 border-2 border-slate-950 flex items-center justify-center text-base shadow-lg animate-bounce"
                >
                  ⏭
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              {state.topCard && (
                <Card
                  key={state.topCard.id}
                  card={state.topCard}
                  overrideColor={state.topCard.color === 'wild' ? state.currentColor ?? undefined : undefined}
                  animate
                />
              )}
              <span className="flex items-center gap-2 text-sm text-slate-300">
                {state.currentColor && (
                  <span className={`w-3 h-3 rounded-full ${COLOR_DOT[state.currentColor]}`} />
                )}
              </span>
            </div>
          </div>
        </div>

        {isMyTurn && (
          <div
            className="text-green-400 text-3xl leading-none select-none animate-bounce shrink-0 mt-1"
            style={{ filter: 'drop-shadow(0 0 10px rgba(74,222,128,0.8))' }}
          >
            ▼
          </div>
        )}
      </div>

      <div ref={handContainerRef} className="relative flex justify-center items-end pb-1 shrink-0 overflow-x-visible max-w-full">
        {isMyTurn && (
          <div className="absolute inset-x-0 bottom-0 h-28 bg-green-500/15 blur-2xl rounded-full pointer-events-none animate-pulse" />
        )}
        {state.yourHand.map((card, i) => {
          const playable = isCardPlayableNow(card);
          const isHovered = playable && hoveredCardId === card.id;
          const jumpInGlow = !isMyTurn && !state.pendingDraw && !state.stackWindow && playable;
          const stackGlow = !!state.stackWindow && isStackOwner && card.value === state.stackWindow.value;
          return (
            <div
              key={card.id}
              className="relative shrink-0 animate-float-in"
              style={{
                marginLeft: i === 0 ? 0 : `${cardStep - CARD_WIDTH_PX}px`,
                zIndex: isHovered ? 50 : i,
                animationDelay: `${i * 30}ms`,
              }}
              onMouseEnter={() => playable && setHoveredCardId(card.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              <div
                className={`relative rounded-2xl ${jumpInGlow ? 'ring-4 ring-yellow-400/80' : ''} ${stackGlow ? 'ring-4 ring-indigo-400' : ''}`}
                style={{
                  transform: `translateY(${isHovered ? -22 : 0}px) scale(${isHovered ? 1.1 : 1})`,
                  transition: 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <Card card={card} onClick={() => handleCardClick(card)} disabled={!playable} />
              </div>
            </div>
          );
        })}
      </div>

      {canCallUno && (
        <div className="fixed bottom-6 right-6">
          <button
            type="button"
            onClick={onCallUno}
            className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 font-extrabold text-lg shadow-2xl animate-pulse"
          >
            UNO !
          </button>
        </div>
      )}

      {pendingWildCardId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-float-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center animate-card-pop">
            <p className="mb-4 font-semibold">Choisissez une couleur</p>
            <div className="grid grid-cols-2 gap-4">
              {(['red', 'yellow', 'green', 'blue'] as CardColor[]).map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => chooseColor(color)}
                  className={`w-24 h-24 rounded-2xl border-4 border-white shadow-lg hover:scale-110 hover:-translate-y-1 transition-transform ${COLOR_DOT[color]}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
