// Historical Civilization Dossier with 3D Architecture & Cultural Genealogy

import React, { useState, useRef, useEffect } from 'react';
import { X, Navigation, Search, BookOpen, Shield, Globe, Landmark, Users } from 'lucide-react';
import { Polity, Settlement, WorldState } from '../../types/simulation';
import { Settlement3DEngine } from '../../visuals/3d/settlement3DEngine';

interface CivilizationDossierModalProps {
  state: WorldState;
  onClose: () => void;
  onOpenWhy: (nodeId: string) => void;
}

export const CivilizationDossierModal: React.FC<CivilizationDossierModalProps> = ({
  state,
  onClose,
  onOpenWhy
}) => {
  const politiesList = Object.values(state.polities);
  const [selectedPolityId, setSelectedPolityId] = useState<string>(politiesList[0]?.id || '');
  const currentPolity = state.polities[selectedPolityId] || politiesList[0];

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Find a representative settlement for the polity
  const representativeSettlement = currentPolity
    ? Object.values(state.settlements).find(s => s.polityId === currentPolity.id && !s.isAbandoned)
    : null;

  // Render 3D Architecture for settlement
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !representativeSettlement) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark tabletop base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    Settlement3DEngine.renderSettlement3D(
      ctx,
      representativeSettlement,
      canvas.width / 2,
      canvas.height / 2 + 10,
      1.6
    );
  }, [representativeSettlement]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/30 border border-amber-500/50 rounded-xl text-amber-400">
              <Landmark size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                Civilization Dossier
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Imperial Archives & Political Lineages
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

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden font-sans text-xs">
          {/* Polity List Sidebar */}
          <div className="w-64 bg-slate-950/60 border-r border-slate-800 p-2 space-y-1 overflow-y-auto">
            {politiesList.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedPolityId(p.id)}
                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 ${
                  selectedPolityId === p.id
                    ? 'bg-amber-950/60 border border-amber-500/50 text-white shadow'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.colorHex }} />
                <div className="truncate font-bold">{p.name}</div>
              </button>
            ))}
            {politiesList.length === 0 && (
              <div className="p-6 text-center text-slate-500 italic font-mono">
                No active polities in the current era
              </div>
            )}
          </div>

          {/* Polity Details */}
          {currentPolity && (
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-6">
                {/* 3D Architectural Preview */}
                <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center relative">
                  <span className="absolute top-3 left-3 text-[10px] font-mono text-slate-400">
                    3D Civic Architecture ({representativeSettlement?.tier || 'Capital'})
                  </span>
                  <canvas ref={canvasRef} width={260} height={180} />
                  <div className="text-[10px] font-mono text-amber-300 mt-2">
                    {representativeSettlement?.name || 'Metropolitan Citadel'}
                  </div>
                </div>

                {/* Main Stats */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif">{currentPolity.name}</h3>
                    <p className="text-amber-400 font-mono text-xs">Form of Rule: {currentPolity.governmentType}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 font-mono text-[11px]">
                    <div>Founded: <span className="text-white">Year {currentPolity.foundedYear}</span></div>
                    <div>Capital: <span className="text-amber-300">{state.settlements[currentPolity.capitalSettlementId]?.name || 'Unknown'}</span></div>
                    <div>Total Pop: <span className="text-emerald-400 font-bold">{Object.values(state.settlements).filter(s => s.polityId === currentPolity.id && !s.isAbandoned).reduce((sum, s) => sum + s.population, 0).toLocaleString()}</span></div>
                    <div>Settlements: <span className="text-white">{Object.values(state.settlements).filter(s => s.polityId === currentPolity.id && !s.isAbandoned).length}</span></div>
                  </div>

                  <button
                    onClick={() => onOpenWhy(currentPolity.id)}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    <Search size={14} />
                    <span>WHY DOES THIS EMPIRE EXIST?</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
