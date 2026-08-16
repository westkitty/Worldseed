// Procedural Biological Field Guide with 3D Creature Rotation & Taxonomy

import React, { useState, useRef, useEffect } from 'react';
import { X, Dna, Search, Pin, Navigation, ArrowRight, Shield, Heart, Zap, Globe } from 'lucide-react';
import { Species, WorldState } from '../../types/simulation';
import { CreatureMeshEngine } from '../../visuals/3d/creatureMeshEngine';

interface FieldGuideModalProps {
  state: WorldState;
  onClose: () => void;
  onSelectSpecies: (speciesId: string) => void;
  onOpenWhy: (nodeId: string) => void;
}

export const FieldGuideModal: React.FC<FieldGuideModalProps> = ({
  state,
  onClose,
  onSelectSpecies,
  onOpenWhy
}) => {
  const speciesList = Object.values(state.species);
  const [selectedId, setSelectedId] = useState<string>(speciesList[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [rotX, setRotX] = useState(0.2);
  const [rotY, setRotY] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentSpecies = state.species[selectedId] || speciesList[0];

  const filtered = searchFilter.trim()
    ? speciesList.filter(s => s.commonName.toLowerCase().includes(searchFilter.toLowerCase().trim()) || s.scientificName.toLowerCase().includes(searchFilter.toLowerCase().trim()))
    : speciesList;

  // 3D Creature Canvas render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentSpecies) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle dark circular pedestal
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height / 2 + 45, 70, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Render 3D Creature model
    CreatureMeshEngine.renderCreature3D(
      ctx,
      currentSpecies,
      canvas.width / 2,
      canvas.height / 2,
      2.0,
      rotX,
      rotY
    );
  }, [currentSpecies, rotX, rotY]);

  // Drag to rotate 3D creature
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setRotY(prev => prev + dx * 0.015);
      setRotX(prev => Math.max(-1.0, Math.min(1.0, prev + dy * 0.015)));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/50 rounded-xl text-emerald-400">
              <Dna size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Taxonomic Compendium
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Procedural Biological Field Guide
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
          {/* Species List Sidebar */}
          <div className="w-64 bg-slate-950/60 border-r border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter species..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 ${
                    selectedId === s.id
                      ? 'bg-emerald-950/60 border border-emerald-500/50 text-white shadow'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="text-xl">{s.iconSymbol}</span>
                  <div className="truncate">
                    <div className="font-bold truncate">{s.commonName}</div>
                    <div className="text-[10px] text-slate-400 italic truncate font-mono">{s.scientificName}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Species Details & 3D Interactive Model */}
          {currentSpecies && (
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 gap-6">
                {/* 3D Model Canvas */}
                <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center relative">
                  <span className="absolute top-3 left-3 text-[10px] font-mono text-slate-400">
                    3D Phenotype (Drag to rotate)
                  </span>
                  <canvas
                    ref={canvasRef}
                    width={260}
                    height={200}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="cursor-grab active:cursor-grabbing"
                  />
                  <div className="text-[10px] font-mono text-emerald-400 mt-2">
                    Size: {currentSpecies.genome.bodySizeMeters}m | Speed: {currentSpecies.genome.speedKmh} km/h
                  </div>
                </div>

                {/* Main Stats */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-bold text-white font-serif">{currentSpecies.commonName}</h3>
                    <p className="text-slate-400 font-mono text-xs italic">{currentSpecies.scientificName}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px]">
                      {currentSpecies.trophicLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono text-[10px]">
                      {currentSpecies.morphology.replace('_', ' ')}
                    </span>
                    {currentSpecies.isSapient && (
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[10px] font-bold">
                        🧠 SAPIENT
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 font-mono text-[11px]">
                    <div>Lifespan: <span className="text-white">{currentSpecies.genome.lifespanYears}y</span></div>
                    <div>Cognition: <span className="text-purple-300 font-bold">{currentSpecies.genome.cognition}/100</span></div>
                    <div>Fertility: <span className="text-white">{Math.round(currentSpecies.genome.fertility * 100)}%</span></div>
                    <div>Locomotion: <span className="text-white">{currentSpecies.genome.locomotion}</span></div>
                    <div>Sensory: <span className="text-white">{currentSpecies.genome.sensoryModality}</span></div>
                    <div>Appendages: <span className="text-amber-300">{currentSpecies.genome.manipulationOrgan}</span></div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onOpenWhy(currentSpecies.causalNodeId)}
                      className="flex-1 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow flex items-center justify-center gap-1.5"
                    >
                      <Search size={14} />
                      <span>WHY DOES THIS SPECIES EXIST?</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
