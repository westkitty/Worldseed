// Save, Load, Seed Sharing, and JSON Export/Import Modal

import React, { useEffect, useState } from 'react';
import { X, Save, Download, Upload, Trash2, Copy, Check, RefreshCw } from 'lucide-react';
import { PersistenceManager } from '../../persistence/storage';
import { WorldConfig, WorldState } from '../../types/simulation';

interface SaveLoadModalProps {
  state: WorldState;
  onClose: () => void;
  onLoadWorld: (state: WorldState) => void;
  onResetWorld: (newConfig: WorldConfig) => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  state,
  onClose,
  onLoadWorld,
  onResetWorld
}) => {
  const [saveName, setSaveName] = useState('');
  const [savedList, setSavedList] = useState<Array<{ id: string; name: string; savedAt: string; year: number }>>([]);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const refreshList = async () => {
    try {
      const list = await PersistenceManager.listSavedWorlds();
      setSavedList(list);
    } catch (e) {
      console.warn('Could not load saved list from IndexedDB:', e);
    }
  };

  useEffect(() => {
    refreshList();
  }, []);

  const handleSave = async () => {
    const name = saveName.trim() || `World (Year ${state.currentYear})`;
    const id = `save_${Date.now()}`;
    await PersistenceManager.saveWorld(id, name, state);
    setSaveName('');
    await refreshList();
  };

  const handleLoad = async (id: string) => {
    const loaded = await PersistenceManager.loadWorld(id);
    if (loaded) {
      onLoadWorld(loaded);
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    await PersistenceManager.deleteWorld(id);
    await refreshList();
  };

  const handleExportJSON = () => {
    PersistenceManager.exportWorldToFile(state, `worldseed_year_${state.currentYear}.json`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const jsonStr = evt.target?.result as string;
        const loadedState = PersistenceManager.importWorldFromJSON(jsonStr);
        onLoadWorld(loadedState);
        onClose();
      } catch (err: any) {
        setImportError(err.message || 'Corrupted file');
      }
    };
    reader.readAsText(file);
  };

  const handleCopySeed = () => {
    const seedStr = PersistenceManager.encodeSeedString({
      seed: state.config.seed,
      preset: state.config.preset,
      seaLevel: state.config.seaLevel
    });
    navigator.clipboard.writeText(seedStr);
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 2000);
  };

  const handleNewRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000) + 1;
    onResetWorld({
      ...state.config,
      seed: newSeed
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700/50 border border-slate-600 rounded-xl text-sky-400">
              <Save size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Local-First Persistence Engine
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Save, Load, Export & Seed Sharing
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Saves"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
          {/* Seed Sharing Banner */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-slate-400 text-[10px] uppercase">Planetary Seed</div>
              <div className="font-mono text-base font-bold text-sky-400">{state.config.seed}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySeed}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-mono flex items-center gap-1.5"
              >
                {copiedSeed ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedSeed ? 'Copied Config' : 'Copy Seed String'}</span>
              </button>
              <button
                onClick={handleNewRandomSeed}
                className="px-3 py-1.5 bg-sky-700 hover:bg-sky-600 text-white rounded-lg font-mono flex items-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>New Planet</span>
              </button>
            </div>
          </div>

          {/* Save Current World */}
          <div className="space-y-2">
            <h3 className="font-mono font-semibold uppercase text-slate-400 text-[11px]">Save Current World State</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter save slot name..."
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md"
              >
                Save to Browser DB
              </button>
            </div>
          </div>

          {/* Export / Import JSON */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportJSON}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 font-semibold text-slate-200"
            >
              <Download size={16} />
              <span>Export Planet (.json)</span>
            </button>
            <label className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center gap-2 font-semibold text-slate-200 cursor-pointer">
              <Upload size={16} />
              <span>Import Planet (.json)</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {importError && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-red-300 text-xs">
              {importError}
            </div>
          )}

          {/* Saved Worlds List */}
          <div className="space-y-2 pt-2">
            <h3 className="font-mono font-semibold uppercase text-slate-400 text-[11px]">Browser Saved Worlds ({savedList.length})</h3>
            {savedList.length === 0 ? (
              <div className="text-slate-500 italic p-4 text-center bg-slate-800/30 rounded-xl border border-slate-800">
                No saved worlds found in IndexedDB.
              </div>
            ) : (
              savedList.map(s => (
                <div
                  key={s.id}
                  className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm font-serif">{s.name}</h4>
                    <div className="text-[10px] font-mono text-slate-400">
                      Year {s.year.toLocaleString()} | Saved {new Date(s.savedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoad(s.id)}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700"
                      title="Delete Save"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
