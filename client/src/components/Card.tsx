import type { Card as CardType, CardColor } from '@uno/shared';

const GRADIENTS: Record<CardColor, string> = {
  red: 'linear-gradient(155deg, #ff6b6b 0%, #c0392b 60%, #7f1d1d 100%)',
  yellow: 'linear-gradient(155deg, #ffe066 0%, #f5a623 60%, #92400e 100%)',
  green: 'linear-gradient(155deg, #6ee7a0 0%, #2f9e44 60%, #14532d 100%)',
  blue: 'linear-gradient(155deg, #7cc4ff 0%, #1971c2 60%, #0c2d55 100%)',
  wild: 'conic-gradient(from 200deg, #ff6b6b, #ffe066, #6ee7a0, #7cc4ff, #ff6b6b)',
};

const VALUE_LABELS: Record<string, string> = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: '★',
  wild4: '+4',
};

function label(value: string): string {
  return VALUE_LABELS[value] ?? value;
}

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
  overrideColor?: CardColor;
  animate?: boolean;
}

export default function Card({ card, onClick, disabled, small, faceDown, overrideColor, animate }: CardProps) {
  const size = small ? 'w-14 h-20' : 'w-24 h-36';
  const fontSize = small ? 'text-xl' : 'text-5xl';
  const cornerSize = small ? 'text-[10px]' : 'text-sm';
  const displayColor = overrideColor ?? card.color;
  const text = label(card.value);

  if (faceDown) {
    return (
      <div
        className={`${size} rounded-2xl border-4 border-white shadow-lg select-none relative overflow-hidden`}
        style={{ background: 'radial-gradient(circle at 50% 50%, #1a1a1a 0%, #050505 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{ background: 'repeating-linear-gradient(45deg, #fff 0 2px, transparent 2px 14px)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center rounded-full bg-white"
            style={{
              width: small ? '2.6rem' : '4.6rem',
              height: small ? '1.8rem' : '3.1rem',
              transform: 'rotate(-18deg)',
              boxShadow: `0 0 0 ${small ? '2px' : '4px'} #d32f2f, inset 0 0 8px rgba(0,0,0,0.2)`,
            }}
          >
            <span
              className={`font-black italic tracking-tighter ${small ? 'text-sm' : 'text-2xl'}`}
              style={{ transform: 'rotate(18deg)', textShadow: '1px 1px 0 rgba(0,0,0,0.25)' }}
            >
              <span className="text-uno-red">U</span>
              <span className="text-uno-yellow">N</span>
              <span className="text-uno-blue">O</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${size} relative rounded-2xl border-4 border-white shadow-lg select-none
        ${onClick && !disabled ? 'cursor-pointer' : 'cursor-default'}
        ${animate ? 'animate-card-pop' : ''}`}
      style={{
        background: GRADIENTS[displayColor],
        boxShadow: disabled ? undefined : `0 6px 14px -4px ${displayColor === 'yellow' ? 'rgba(245,166,35,0.5)' : 'rgba(0,0,0,0.45)'}`,
      }}
    >
      <span
        className={`absolute top-1 left-1 font-extrabold rounded px-1 ${cornerSize}`}
        style={{ color: '#ffffff', background: 'rgba(0,0,0,0.35)' }}
      >
        {text}
      </span>
      <span
        className={`absolute bottom-1 right-1 font-extrabold rotate-180 rounded px-1 ${cornerSize}`}
        style={{ color: '#ffffff', background: 'rgba(0,0,0,0.35)' }}
      >
        {text}
      </span>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: 'rotate(0deg)' }}
      >
        <div
          className="flex items-center justify-center rounded-full bg-white/95"
          style={{
            width: small ? '2.2rem' : '3.9rem',
            height: small ? '2.9rem' : '5.3rem',
            transform: 'rotate(-18deg)',
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.15)',
          }}
        >
          <span
            className={`font-black ${fontSize}`}
            style={{ color: displayColor === 'wild' ? '#1a1a1a' : GRADIENTS[displayColor].match(/#[0-9a-fA-F]{6}/)?.[0], transform: 'rotate(18deg)' }}
          >
            {text}
          </span>
        </div>
      </div>
    </button>
  );
}
