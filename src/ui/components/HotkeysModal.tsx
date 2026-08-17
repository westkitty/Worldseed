import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface HotkeysModalProps { onClose: () => void; }

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose }) => {
  const hotkeys = [
    { key: 'Tab / Shift+Tab', desc: 'Move keyboard focus through interface controls' },
    { key: 'Space', desc: 'Toggle pause / resume when the world owns keyboard focus' },
    { key: '1, 2, 3, 4, 5', desc: 'Set simulation speed (1×, 5×, 20×, 100×, 1000×)' },
    { key: 'WASD / Arrows', desc: 'Pan flat maps or orbit 3D world views' },
    { key: '+ / -', desc: 'Zoom camera in / out' },
    { key: 'Home', desc: 'Reset flat-map camera to world overview' },
    { key: 'V', desc: 'Cycle world presentation mode' },
    { key: 'T', desc: 'Open Tree of Life' },
    { key: 'C', desc: 'Open Chronicle' },
    { key: 'Cmd/Ctrl + K', desc: 'Open command palette' },
    { key: '/', desc: 'Open world search' },
    { key: 'Esc', desc: 'Close the current modal or selection' },
    { key: 'Drag / Swipe', desc: 'Pan flat maps or orbit 3D world views' },
    { key: 'Wheel / Trackpad', desc: 'Zoom toward or away from the world' },
    { key: 'World Tools → Immersion', desc: 'Enter minimal observation mode without stealing Tab navigation' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-200 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-sky-500/50 bg-sky-600/30 p-2 text-sky-300"><Keyboard size={20} /></div>
            <div><span className="text-[10px] font-mono font-bold uppercase tracking-widest text-sky-300">Controls & accessibility</span><h2 className="font-serif text-lg font-bold tracking-tight text-white">Keyboard & Navigation</h2></div>
          </div>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Close controls"><X size={20} /></button>
        </div>
        <div className="space-y-2.5 overflow-y-auto p-6 text-xs select-text">
          {hotkeys.map(hk => (
            <div key={hk.key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/60 bg-slate-800/60 p-3">
              <span className="text-slate-300">{hk.desc}</span>
              <kbd className="whitespace-nowrap rounded border border-slate-700 bg-slate-900 px-2.5 py-1 font-mono font-bold text-sky-300 shadow-inner">{hk.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
