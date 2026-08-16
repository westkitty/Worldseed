// Comprehensive Categorized Settings Hub Modal

import React, { useState } from 'react';
import {
  X, Settings, Sliders, Eye, Map, Navigation, Volume2, History,
  Sparkles, Accessibility, Gauge, RotateCcw, Check
} from 'lucide-react';
import { WorldViewMode } from '../../types/simulation';

interface SettingsModalProps {
  currentViewMode: WorldViewMode;
  onSetViewMode: (mode: WorldViewMode) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentViewMode,
  onSetViewMode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<
    'DISPLAY' | 'SIMULATION' | 'CAMERA' | 'MAP' | 'AUDIO' | 'ACCESSIBILITY' | 'PERFORMANCE' | 'HISTORY'
  >('DISPLAY');

  // Local settings state
  const [zoomSensitivity, setZoomSensitivity] = useState(1.0);
  const [panSensitivity, setPanSensitivity] = useState(1.0);
  const [invertZoom, setInvertZoom] = useState(false);
  const [weatherParticles, setWeatherParticles] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [perfPreset, setPerfPreset] = useState<'LOW' | 'BALANCED' | 'HIGH' | 'ULTRA'>('BALANCED');
  const [autoPauseMajor, setAutoPauseMajor] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600/30 border border-sky-500/50 rounded-xl text-sky-400">
              <Settings size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Configuration & Preferences
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Settings Hub
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

        {/* Tab Selector & Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Tab Rail */}
          <div className="w-48 bg-slate-950/60 border-r border-slate-800 p-2 space-y-1 overflow-y-auto font-mono text-xs">
            <button
              onClick={() => setActiveTab('DISPLAY')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'DISPLAY'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Eye size={14} />
              <span>Display & Views</span>
            </button>

            <button
              onClick={() => setActiveTab('SIMULATION')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'SIMULATION'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders size={14} />
              <span>Simulation</span>
            </button>

            <button
              onClick={() => setActiveTab('CAMERA')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'CAMERA'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Navigation size={14} />
              <span>Camera & Input</span>
            </button>

            <button
              onClick={() => setActiveTab('MAP')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'MAP'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Map size={14} />
              <span>Map & Labels</span>
            </button>

            <button
              onClick={() => setActiveTab('AUDIO')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'AUDIO'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Volume2 size={14} />
              <span>Audio Controls</span>
            </button>

            <button
              onClick={() => setActiveTab('ACCESSIBILITY')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'ACCESSIBILITY'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Accessibility size={14} />
              <span>Accessibility</span>
            </button>

            <button
              onClick={() => setActiveTab('PERFORMANCE')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'PERFORMANCE'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Gauge size={14} />
              <span>Performance</span>
            </button>
          </div>

          {/* Right Content Panel */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs">
            {/* DISPLAY TAB */}
            {activeTab === 'DISPLAY' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif font-bold text-white text-sm mb-1">World Presentation Mode</h3>
                  <p className="text-slate-400 text-[11px] mb-3">
                    Switch between 6 high-precision optical projections. The underlying simulation state remains untouched.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'FLAT_ATLAS', name: 'Flat Atlas', desc: 'Cartographic 2D map' },
                      { id: 'SQUARE_TILE', name: 'Square Board', desc: 'Framed physical slab' },
                      { id: 'GLOBE', name: '3D Globe', desc: 'Spherical planetary view' },
                      { id: 'SNOW_GLOBE', name: 'Snow Globe', desc: 'Enchanted glass diorama' },
                      { id: 'RELIEF_DIORAMA', name: 'Relief Slab', desc: 'Isometric 3D elevation' },
                      { id: 'ORBITAL_VIEW', name: 'Orbital Cosmos', desc: 'Deep space satellite view' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => onSetViewMode(mode.id as WorldViewMode)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          currentViewMode === mode.id
                            ? 'bg-sky-600/30 border-sky-500 text-white shadow-lg'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="font-bold font-sans flex items-center justify-between">
                          <span>{mode.name}</span>
                          {currentViewMode === mode.id && <Check size={14} className="text-sky-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Animated Weather & Environmental Particles</div>
                    <div className="text-[11px] text-slate-400">Rain streaks, snowdrifts, dust storms, bird migrations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={weatherParticles}
                    onChange={e => setWeatherParticles(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SIMULATION TAB */}
            {activeTab === 'SIMULATION' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Auto-Pause on Milestone Events</div>
                    <div className="text-[11px] text-slate-400">Automatically pause simulation upon sapience emergence or mass extinctions</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoPauseMajor}
                    onChange={e => setAutoPauseMajor(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* CAMERA TAB */}
            {activeTab === 'CAMERA' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between font-mono mb-1">
                    <span className="text-slate-300">Zoom Sensitivity</span>
                    <span className="text-sky-400">{zoomSensitivity.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={zoomSensitivity}
                    onChange={e => setZoomSensitivity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-mono mb-1">
                    <span className="text-slate-300">Pan & Orbit Sensitivity</span>
                    <span className="text-sky-400">{panSensitivity.toFixed(1)}×</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={panSensitivity}
                    onChange={e => setPanSensitivity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">Invert Zoom Direction</div>
                    <div className="text-[11px] text-slate-400">Reverse mouse wheel scroll direction</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={invertZoom}
                    onChange={e => setInvertZoom(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* ACCESSIBILITY TAB */}
            {activeTab === 'ACCESSIBILITY' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Reduced Motion</div>
                    <div className="text-[11px] text-slate-400">Disable floating ambient particles and rapid camera transitions</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={e => setReducedMotion(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div>
                    <div className="font-semibold text-slate-200">High-Contrast Colorblind Mode</div>
                    <div className="text-[11px] text-slate-400">Enhance hue separations for biome and political territory maps</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={e => setHighContrast(e.target.checked)}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* PERFORMANCE TAB */}
            {activeTab === 'PERFORMANCE' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2">Quality & Performance Presets</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(['LOW', 'BALANCED', 'HIGH', 'ULTRA'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setPerfPreset(p)}
                        className={`p-2.5 rounded-xl border text-center font-mono font-bold transition-all ${
                          perfPreset === p
                            ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                            : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
