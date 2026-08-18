// First-use guidance — one card, six verbs, dismissed forever on the first real interaction.
//
// Deliberately not a tutorial. Its only job is to make the first minute obvious: you can
// turn this world, look closer, run time, and ask it questions.

import React from 'react';
import { X } from 'lucide-react';

interface FirstLightHintProps {
  onDismiss: () => void;
  onStartTime: () => void;
}

const MOVES: Array<{ verb: string; how: string }> = [
  { verb: 'Turn the world', how: 'drag anywhere' },
  { verb: 'Come closer', how: 'scroll or pinch' },
  { verb: 'Inspect anything', how: 'click a place' },
  { verb: 'Run deep time', how: 'space, or press play' },
  { verb: 'Ask why', how: 'Why? on any selection' },
  { verb: 'Change the past', how: 'What if?' }
];

export const FirstLightHint: React.FC<FirstLightHintProps> = ({ onDismiss, onStartTime }) => (
  // Anchored to the side rather than the centre: the first thing a new user should see is
  // the planet, with the guidance beside it.
  <div className="absolute inset-y-0 right-0 z-40 flex items-center px-3 py-20 pointer-events-none">
    <div className="ws-panel ws-rise pointer-events-auto relative w-[min(360px,calc(100vw-24px))] p-4 sm:p-5" style={{ background: 'var(--ws-surface-strong)' }}>
      <button
        onClick={onDismiss}
        aria-label="Dismiss introduction"
        className="absolute top-2.5 right-2.5 p-1.5 rounded-md hover:bg-white/10"
        style={{ color: 'var(--ws-ink-faint)' }}
      >
        <X size={14} />
      </button>

      <h2 className="ws-display text-[15px] mb-1" style={{ color: 'var(--ws-ink)' }}>
        A WORLD IS WAITING
      </h2>
      <p className="text-[12.5px] leading-relaxed mb-3.5" style={{ color: 'var(--ws-ink-muted)' }}>
        Nothing here is scripted. Geology makes climate, climate makes life, life makes history — and
        every one of those steps is recorded and can be questioned.
      </p>

      <ul className="grid grid-cols-1 gap-y-1.5 mb-4">
        {MOVES.map(move => (
          <li key={move.verb} className="flex items-baseline justify-between gap-2 text-[12px]">
            <span style={{ color: 'var(--ws-ink)' }}>{move.verb}</span>
            <span className="ws-numeric text-[10.5px] text-right" style={{ color: 'var(--ws-ink-faint)' }}>
              {move.how}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <button
          onClick={onStartTime}
          className="flex-1 py-2 rounded-[10px] text-[12.5px] font-medium transition-transform hover:scale-[1.01]"
          style={{ background: 'var(--ws-accent)', color: '#04202e' }}
        >
          Start time and watch
        </button>
        <button
          onClick={onDismiss}
          className="ws-chip px-3 py-2 text-[12.5px]"
          style={{ color: 'var(--ws-ink-muted)' }}
        >
          I'll explore
        </button>
      </div>
    </div>
  </div>
);
