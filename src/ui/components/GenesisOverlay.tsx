// Shown while a world is being generated.
//
// Later starting eras genuinely simulate centuries of history before the first frame, so
// this states what is happening rather than pretending the wait is not there.

import React from 'react';

interface GenesisOverlayProps {
  eraSummary: string;
  eraLabel: string;
}

export const GenesisOverlay: React.FC<GenesisOverlayProps> = ({ eraSummary, eraLabel }) => (
  <div
    className="absolute inset-0 z-[60] flex items-center justify-center"
    style={{ background: 'rgba(4, 6, 11, 0.92)' }}
    role="status"
    aria-live="polite"
  >
    <div className="max-w-[420px] px-8 text-center">
      <div className="ws-display text-[13px] mb-3 ws-pulse" style={{ color: 'var(--ws-accent)', letterSpacing: '0.24em' }}>
        FORGING A WORLD
      </div>
      <div className="ws-display text-[20px] mb-2.5" style={{ color: 'var(--ws-ink)' }}>
        {eraLabel}
      </div>
      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--ws-ink-muted)' }}>
        {eraSummary}
      </p>
      <p className="text-[11px] mt-4" style={{ color: 'var(--ws-ink-faint)' }}>
        Simulating the centuries that had to happen first…
      </p>
    </div>
  </div>
);
