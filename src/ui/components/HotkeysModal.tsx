// Keyboard reference — kept honest with the actual key handlers in App and WorldCanvas.

import React from 'react';
import { X } from 'lucide-react';

interface HotkeysModalProps {
  onClose: () => void;
}

const GROUPS: Array<{ title: string; keys: Array<[string, string]> }> = [
  {
    title: 'Time',
    keys: [
      ['Space', 'Pause or resume time'],
      ['1 – 5', 'Speed: 1×, 5×, 20×, 100×, 1000×']
    ]
  },
  {
    title: 'Camera',
    keys: [
      ['W A S D', 'Move or orbit the world'],
      ['Arrows', 'Move or orbit the world'],
      ['Shift + move', 'Move faster'],
      ['+ / −', 'Zoom in and out'],
      ['Home', 'Reset framing'],
      ['Drag', 'Turn or pan'],
      ['Scroll / pinch', 'Zoom toward the pointer']
    ]
  },
  {
    title: 'Looking around',
    keys: [
      ['V', 'Cycle presentation mode'],
      ['Tab', 'Immersion Mode'],
      ['Esc', 'Close panel or dialog'],
      ['⌘K / Ctrl+K', 'Command palette']
    ]
  },
  {
    title: 'Instruments',
    keys: [
      ['T', 'Tree of Life'],
      ['C', 'Chronicle'],
      ['L', 'World Lab (What if?)'],
      ['G', 'Discoveries'],
      ['?', 'This reference']
    ]
  }
];

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose }) => (
  <div
    className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
    style={{ background: 'rgba(3, 5, 9, 0.78)', backdropFilter: 'blur(8px)' }}
    role="dialog"
    aria-modal="true"
    aria-label="Keyboard shortcuts"
    onClick={onClose}
  >
    <div
      className="ws-panel w-full max-w-[560px] max-h-[82vh] overflow-hidden flex flex-col"
      style={{ background: 'var(--ws-surface-strong)' }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--ws-hairline)' }}>
        <h2 className="ws-display text-[14px]" style={{ letterSpacing: '0.14em' }}>
          SHORTCUTS
        </h2>
        <button onClick={onClose} aria-label="Close Shortcuts" className="p-1.5 rounded-md hover:bg-white/10" style={{ color: 'var(--ws-ink-faint)' }}>
          <X size={16} />
        </button>
      </div>

      <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        {GROUPS.map(group => (
          <section key={group.title}>
            <h3 className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--ws-ink-faint)' }}>
              {group.title}
            </h3>
            <dl className="space-y-1.5">
              {group.keys.map(([key, description]) => (
                <div key={key} className="flex items-baseline justify-between gap-3">
                  <dd className="text-[12px] order-2 text-right" style={{ color: 'var(--ws-ink-muted)' }}>
                    {description}
                  </dd>
                  <dt
                    className="ws-numeric text-[11px] px-1.5 py-0.5 rounded order-1 shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ws-ink)' }}
                  >
                    {key}
                  </dt>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  </div>
);
