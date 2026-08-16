// Deep Contextual Inspector Panel with Pinned Follower & Sprite Integration

import React from 'react';
import { X, Search, Pin, Shield, Heart, Zap, Globe, Book, Activity, AlertTriangle, ChevronRight } from 'lucide-react';
import { InspectionSelection, WorldState } from '../../types/simulation';
import { OrganismSpriteEngine } from '../../visuals/sprites/organismSprites';
import { CivilizationSpriteEngine } from '../../visuals/sprites/civilizationSprites';

interface InspectorPanelProps {
  selection: InspectionSelection | null;
  state: WorldState;
  pinnedEntity: InspectionSelection | null;
  onClose: () => void;
  onSelectEntity: (selection: InspectionSelection | null) => void;
  onPinEntity: (selection: InspectionSelection) => void;
  onOpenWhyForNode: (nodeId: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selection,
  state,
  pinnedEntity,
  onClose,
  onSelectEntity,
  onPinEntity,
  onOpenWhyForNode
}) => {
  if (!selection) return null;

  const { grid, species, settlements, polities, cultures, languages, ruins, myths, pathogens } = state;
  const isPinned = pinnedEntity?.id === selection.id && pinnedEntity?.type === selection.type;

  return (
    <div className="absolute top-16 right-4 w-96 max-h-[calc(100vh-140px)] bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col z-20 overflow-hidden text-slate-200">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
            {selection.type}
          </span>
          <button
            onClick={() => onPinEntity(selection)}
            className={`p-1 rounded text-xs flex items-center gap-1 font-mono transition-all ${
              isPinned
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
            title="Pin this subject to live tracking HUD"
          >
            <Pin size={12} />
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700"
          aria-label="Close Inspector"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 overflow-y-auto space-y-4 text-xs font-sans">
        {/* TILE SELECTION */}
        {selection.type === 'TILE' && (() => {
          const [tx, ty] = selection.id.split(',').map(Number);
          const tile = grid[ty]?.[tx];
          if (!tile) return <div>Tile not found</div>;

          return (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-white font-serif">{tile.biome.replace('_', ' ')}</h3>
                <p className="text-slate-400 font-mono text-[11px]">Coordinates: ({tile.x}, {tile.y}) | Tectonic Plate #{tile.plateId}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 font-mono">
                <div>Elevation: <span className="text-white font-semibold">{Math.round(tile.elevation * 1000)}m</span></div>
                <div>Temp: <span className="text-white font-semibold">{tile.currentTemp}°C</span></div>
                <div>Rainfall: <span className="text-white font-semibold">{Math.round(tile.rainfall * 100)}%</span></div>
                <div>Moisture: <span className="text-white font-semibold">{Math.round(tile.moisture * 100)}%</span></div>
                <div>Soil Fertility: <span className="text-emerald-400 font-semibold">{Math.round(tile.soilFertility * 100)}%</span></div>
                <div>Biomass: <span className="text-emerald-400 font-semibold">{tile.biomass}</span></div>
                <div>Capacity: <span className="text-amber-400 font-semibold">{tile.carryingCapacity}</span></div>
                <div>Pop Density: <span className="text-amber-400 font-semibold">{tile.populationDensity}</span></div>
              </div>

              {/* Minerals */}
              <div>
                <h4 className="font-semibold text-slate-300 mb-1">Mineral Deposits</h4>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(tile.minerals).map(([m, val]) => val > 0.05 && (
                    <span key={m} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-amber-300 border border-slate-700">
                      {m}: {Math.round(val * 100)}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Ruins on this tile */}
              {tile.ruins.length > 0 && (
                <div className="space-y-1">
                  <h4 className="font-semibold text-purple-300">Archaeological Ruins</h4>
                  {tile.ruins.map(r => (
                    <button
                      key={r.id}
                      onClick={() => onSelectEntity({ type: 'RUIN', id: r.id })}
                      className="w-full text-left p-2 bg-purple-950/40 border border-purple-800/60 rounded-lg hover:bg-purple-900/40 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-purple-200">{r.originalName}</div>
                        <div className="text-[10px] text-purple-400">Collapsed Year {r.collapsedYear}</div>
                      </div>
                      <ChevronRight size={14} className="text-purple-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Fossils on this tile */}
              {tile.fossils.length > 0 && (
                <div className="space-y-1">
                  <h4 className="font-semibold text-amber-400">Fossil Stratigraphy</h4>
                  {tile.fossils.map((f, idx) => (
                    <div key={idx} className="p-2 bg-amber-950/30 border border-amber-800/40 rounded-lg text-[11px]">
                      <div className="font-medium text-amber-200">{f.speciesName} ({f.scientificName})</div>
                      <div className="text-amber-400/80 text-[10px]">Extinct Year {f.extinctionYear} | Depth {f.geologicalDepthMeters}m</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* SPECIES SELECTION */}
        {selection.type === 'SPECIES' && (() => {
          const s = species[selection.id];
          if (!s) return <div>Species not found</div>;

          return (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{s.iconSymbol}</span>
                  <div>
                    <h3 className="text-base font-bold text-white font-serif">{s.commonName}</h3>
                    <p className="text-slate-400 italic text-[11px] font-mono">{s.scientificName}</p>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {s.trophicLevel}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-300 border border-blue-800">
                    {s.morphology.replace('_', ' ')}
                  </span>
                  {s.isSapient && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                      🧠 SAPIENT
                    </span>
                  )}
                  {s.isDomesticated && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                      🐕 DOMESTICATED
                    </span>
                  )}
                  {s.isFeral && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                      🐺 FERAL LINEAGE
                    </span>
                  )}
                  {s.isExtinct && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-300 border border-red-800">
                      ☠️ EXTINCT (Year {s.extinctionYear})
                    </span>
                  )}
                </div>
              </div>

              {/* WHY Button */}
              <button
                onClick={() => onOpenWhyForNode(s.causalNodeId)}
                className="w-full py-2 px-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <Search size={14} />
                <span>WHY DOES THIS SPECIES EXIST?</span>
              </button>

              {/* Genome Traits */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-300">Genome & Anatomy</h4>
                <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 font-mono text-[11px]">
                  <div>Body Size: <span className="text-white">{s.genome.bodySizeMeters}m</span></div>
                  <div>Speed: <span className="text-white">{s.genome.speedKmh} km/h</span></div>
                  <div>Lifespan: <span className="text-white">{s.genome.lifespanYears}y</span></div>
                  <div>Cognition: <span className="text-purple-300 font-bold">{s.genome.cognition}/100</span></div>
                  <div>Reproduction: <span className="text-white">{Math.round(s.genome.fertility * 100)}%</span></div>
                  <div>Social: <span className="text-white">{Math.round(s.genome.socialTendency * 100)}%</span></div>
                  <div>Locomotion: <span className="text-white">{s.genome.locomotion}</span></div>
                  <div>Sensory: <span className="text-white">{s.genome.sensoryModality}</span></div>
                  <div className="col-span-2">Appendages: <span className="text-amber-300">{s.genome.manipulationOrgan}</span></div>
                </div>
              </div>

              {/* Population & Ancestry */}
              <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Population:</span>
                  <span className="font-mono text-emerald-400 font-bold">{s.totalPopulation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Diverged In Year:</span>
                  <span className="font-mono text-white">{s.divergenceYear}</span>
                </div>
                {s.parentSpeciesId && species[s.parentSpeciesId] && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-700">
                    <span className="text-slate-400">Direct Ancestor:</span>
                    <button
                      onClick={() => onSelectEntity({ type: 'SPECIES', id: s.parentSpeciesId! })}
                      className="text-sky-400 hover:underline font-mono"
                    >
                      {species[s.parentSpeciesId].commonName}
                    </button>
                  </div>
                )}
                {s.isExtinct && s.extinctionCause && (
                  <div className="mt-2 p-2 bg-red-950/40 border border-red-800/40 rounded text-red-300 text-[11px]">
                    <div className="font-semibold">Extinction Cause:</div>
                    <div>{s.extinctionCause}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* SETTLEMENT SELECTION */}
        {selection.type === 'SETTLEMENT' && (() => {
          const sett = settlements[selection.id];
          if (!sett) return <div>Settlement not found</div>;
          const cult = cultures[sett.cultureId];
          const pol = polities[sett.polityId];

          return (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-white font-serif">{sett.name}</h3>
                <p className="text-amber-400 font-mono text-[11px]">Tier: {sett.tier} | Founded Year {sett.foundedYear}</p>
              </div>

              {/* WHY Button */}
              <button
                onClick={() => onOpenWhyForNode(sett.causalNodeId)}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <Search size={14} />
                <span>WHY IS THIS CITY HERE?</span>
              </button>

              <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 font-mono">
                <div>Population: <span className="text-white font-bold">{sett.population.toLocaleString()}</span></div>
                <div>Food Reserve: <span className="text-emerald-400">{sett.foodSupplyDays} days</span></div>
                {cult && <div className="col-span-2">Culture: <span className="text-amber-300 font-sans">{cult.name}</span></div>}
                {pol && <div className="col-span-2">Polity: <span className="text-sky-300 font-sans">{pol.name}</span></div>}
              </div>

              {/* Infrastructure */}
              <div>
                <h4 className="font-semibold text-slate-300 mb-1">Civic Infrastructure</h4>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {Object.entries(sett.infrastructure).map(([key, has]) => (
                    <span
                      key={key}
                      className={`px-2 py-0.5 rounded border ${
                        has
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {key.replace('has', '')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* RUIN SELECTION */}
        {selection.type === 'RUIN' && (() => {
          const r = ruins[selection.id];
          if (!r) return <div>Ruin not found</div>;

          return (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-bold text-purple-300 font-serif">Ruins of {r.originalName}</h3>
                <p className="text-slate-400 font-mono text-[11px]">Active: Year {r.foundedYear} — {r.collapsedYear}</p>
              </div>

              {/* WHY Button */}
              <button
                onClick={() => onOpenWhyForNode(r.id)}
                className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <Search size={14} />
                <span>WHY DID THIS CITY COLLAPSE?</span>
              </button>

              <div className="bg-red-950/30 p-2.5 rounded-lg border border-red-800/40 text-[11px]">
                <span className="font-semibold text-red-300">Historical Collapse Cause:</span>
                <p className="text-slate-300 mt-0.5">{r.collapseCause}</p>
              </div>

              <div className="bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50 font-mono space-y-1 text-[11px]">
                <div>Excavation Level: <span className="text-amber-400">{Math.round(r.excavationLevel * 100)}%</span></div>
                <div>Decay Index: <span className="text-slate-300">{Math.round(r.decayLevel * 100)}%</span></div>
                {r.shelteredTroglobites && (
                  <div className="mt-1 text-emerald-400 font-bold">
                    🌿 Shelters Unique Troglobite Micro-Refugium!
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-slate-300 mb-1">Prominent Architecture</h4>
                <div className="flex flex-wrap gap-1">
                  {r.prominentStructures.map((str, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-800 text-purple-300 rounded text-[10px] border border-slate-700">
                      {str}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
