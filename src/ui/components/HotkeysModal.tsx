// Keyboard Shortcuts & Accessibility Guide Modal

import React from 'react';
import { X, Keyboard, HelpCircle } from 'lucide-react';

interface HotkeysModalProps {
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose }) => {
  const hotkeys = [
    { key: 'Space', desc: 'Toggle Pause / Resume Simulation' },
    { key: '1, 2, 3, 4, 5', desc: 'Set Simulation Speed (1x, 5x, 20x, 100x, 1000x)' },
    { key: 'T', desc: 'Open Phylogenetic Tree of Life' },
    { key: 'C', desc: 'Open Historical Chronicle of Eras' },
    { key: 'W', desc: 'Open World Lab (Interventions & Catastrophes)' },
    { key: 'D', desc: 'Open Emergent Discoveries Ledger' },
    { key: 'Esc', desc: 'Close open modal or deselect current entity' },
    { key: 'Click + Drag', desc: 'Pan planet camera viewport' },
    { key: 'Mouse Wheel', desc: 'Zoom camera from 0.6x orbit to 8.0x surface detail' }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600/30 border border-sky-500/50 rounded-xl text-sky-400">
              <Keyboard size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Controls & Accessibility
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Keyboard Shortcuts & Navigation
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-2.5 text-xs font-sans">
          {hotkeys.map((hk, i) => (
            <div
              key={i}
              className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between"
            >
              <span className="text-slate-300">{hk.desc}</span>
              <kbd className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-sky-400 font-mono font-bold shadow-inner">
                {hk.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
