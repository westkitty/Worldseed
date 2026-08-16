// New World Creation Wizard: Quick Start, Preset Library, Advanced Builder, and Recipe Import

import React, { useState } from 'react';
import {
  X, Sparkles, Compass, Sliders, Globe, Shield, Zap, Copy, Check,
  Layers, RefreshCw, BookOpen, ArrowRight, Dna
} from 'lucide-react';
import { WorldConfig, WorldPreset, WorldTopology, GenreRuleset, StartingEra } from '../../types/simulation';
import { WORLDSEED_PRESETS, getPresetConfig } from '../../simulation/scenarios/presets';

interface NewWorldWizardModalProps {
  onClose: () => void;
  onCreateWorld: (config: WorldConfig) => void;
}

export const NewWorldWizardModal: React.FC<NewWorldWizardModalProps> = ({
  onClose,
  onCreateWorld
}) => {
  const [wizardMode, setWizardMode] = useState<'QUICK_START' | 'PRESET_LIBRARY' | 'ADVANCED_BUILDER'>('QUICK_START');
  const [selectedPresetId, setSelectedPresetId] = useState<WorldPreset>('PRIMORDIAL_OCEAN');
  const [presetCategory, setPresetCategory] = useState<'ALL' | 'REALISTIC' | 'FANTASY' | 'SCI_FI'>('ALL');

  // Advanced builder state
  const [seed, setSeed] = useState(Math.floor(Math.random() * 900000 + 100000));
  const [width, setWidth] = useState(64);
  const [height, setHeight] = useState(48);
  const [topology, setTopology] = useState<WorldTopology>('SPHERICAL');
  const [genre, setGenre] = useState<GenreRuleset>('REALISTIC');
  const [startingEra, setStartingEra] = useState<StartingEra>('PREBIOTIC');
  const [seaLevel, setSeaLevel] = useState(0.42);
  const [volcanism, setVolcanism] = useState(0.35);
  const [tectonicPlates, setTectonicPlates] = useState(8);
  const [axialTilt, setAxialTilt] = useState(23.5);
  const [lifeDiversity, setLifeDiversity] = useState(6);
  const [sapienceLikelihood, setSapienceLikelihood] = useState(1.0);
  const [manaRichness, setManaRichness] = useState(0.5);

  const [recipeCopied, setRecipeCopied] = useState(false);
  const [recipeInput, setRecipeInput] = useState('');

  const handleLaunchQuickPreset = (pId: WorldPreset) => {
    const config = getPresetConfig(pId, Math.floor(Math.random() * 900000 + 100000));
    onCreateWorld(config);
  };

  const handleLaunchAdvanced = () => {
    const config: WorldConfig = {
      seed,
      width,
      height,
      preset: selectedPresetId,
      topology,
      genre,
      startingEra,
      seaLevel,
      volcanism,
      tectonicPlatesCount: tectonicPlates,
      axialTilt,
      initialLifeDiversity: lifeDiversity,
      sapienceLikelihood,
      manaRichness: genre === 'FANTASY' || genre === 'SCIENCE_FANTASY' ? manaRichness : 0.0
    };
    onCreateWorld(config);
  };

  const handleCopyRecipe = () => {
    const currentConfig: WorldConfig = {
      seed,
      width,
      height,
      preset: selectedPresetId,
      topology,
      genre,
      startingEra,
      seaLevel,
      volcanism,
      tectonicPlatesCount: tectonicPlates,
      axialTilt,
      initialLifeDiversity: lifeDiversity,
      sapienceLikelihood,
      manaRichness
    };
    const b64 = btoa(JSON.stringify(currentConfig));
    navigator.clipboard.writeText(b64);
    setRecipeCopied(true);
    setTimeout(() => setRecipeCopied(false), 2000);
  };

  const handleImportRecipe = () => {
    try {
      const decoded = JSON.parse(atob(recipeInput.trim()));
      if (decoded.seed && decoded.width && decoded.height) {
        onCreateWorld(decoded);
      }
    } catch {
      alert('Invalid World Recipe string format');
    }
  };

  const filteredPresets = presetCategory === 'ALL'
    ? WORLDSEED_PRESETS
    : WORLDSEED_PRESETS.filter(p => p.category === presetCategory);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 rounded-xl text-white shadow-lg">
              <Globe size={22} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                Planet Synthesis
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                New World Genesis Wizard
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-700 text-xs font-mono">
              <button
                onClick={() => setWizardMode('QUICK_START')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  wizardMode === 'QUICK_START' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Quick Start
              </button>
              <button
                onClick={() => setWizardMode('PRESET_LIBRARY')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  wizardMode === 'PRESET_LIBRARY' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Preset Library (18+)
              </button>
              <button
                onClick={() => setWizardMode('ADVANCED_BUILDER')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  wizardMode === 'ADVANCED_BUILDER' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Advanced Builder
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 1. QUICK START */}
          {wizardMode === 'QUICK_START' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white font-serif mb-1">Instant Genesis</h3>
                <p className="text-xs text-slate-400">Choose a primary archetype to generate an immediately playable deep-time simulation.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { id: 'ADAPTIVE_RADIATION', title: '🌱 Realistic Earthlike', desc: 'Plausible plate tectonics, climate circulation, and Cambrian radiation', tag: 'REALISTIC' },
                  { id: 'MANA_TECTONIC_WORLD', title: '🔮 Mana-Tectonic World', desc: 'Magical ley faults, crystal veins, and arcane civil spires', tag: 'FANTASY' },
                  { id: 'TIDALLY_LOCKED_EXOPLANET', title: '🪐 Sci-Fi Eyeball World', desc: 'Boiling dayside, frozen nightside, twilight habitable ribbon', tag: 'SCI_FI' },
                  { id: 'SAPIENCE_DAWN_PRESET', title: '🧠 Sapience Dawn', desc: 'Emergence of first tool users and linguistic syntax', tag: 'REALISTIC' },
                  { id: 'FIRST_RIVER_CIVILIZATIONS', title: '🏛️ Civilization Dawn', desc: 'Fertile river valleys, cuneiform, and bronze metallurgy', tag: 'REALISTIC' },
                  { id: 'SURPRISE_ME', title: '✨ Surprise Me!', desc: 'Randomized procedural synthesis of topology, genre, and physics', tag: 'WILDCARD' }
                ].map(card => (
                  <button
                    key={card.id}
                    onClick={() => handleLaunchQuickPreset(card.id as WorldPreset)}
                    className="p-4 bg-slate-800/60 border border-slate-700/70 hover:border-sky-500 rounded-2xl text-left hover:bg-slate-800 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                          {card.tag}
                        </span>
                        <ArrowRight size={14} className="text-slate-500 group-hover:text-sky-400 transition-all transform group-hover:translate-x-1" />
                      </div>
                      <h4 className="font-bold text-white text-sm mb-1">{card.title}</h4>
                      <p className="text-xs text-slate-400">{card.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. PRESET LIBRARY */}
          {wizardMode === 'PRESET_LIBRARY' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-serif mb-1">Scenario & Preset Library</h3>
                  <p className="text-xs text-slate-400">18+ curated starting conditions spanning realistic deep time, speculative biology, high fantasy, and spacefaring sci-fi.</p>
                </div>

                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                  {(['ALL', 'REALISTIC', 'FANTASY', 'SCI_FI'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setPresetCategory(cat)}
                      className={`px-2.5 py-1 rounded transition-all ${
                        presetCategory === cat ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {filteredPresets.map(preset => (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      selectedPresetId === preset.id
                        ? 'bg-sky-950/40 border-sky-500 shadow-xl'
                        : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-700">
                          {preset.category}
                        </span>
                        <button
                          onClick={() => handleLaunchQuickPreset(preset.id)}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1"
                        >
                          <span>Synthesize</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                      <h4 className="font-bold text-white text-sm mb-0.5">{preset.name}</h4>
                      <p className="text-xs text-sky-300/90 font-medium mb-1.5">{preset.tagline}</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{preset.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. ADVANCED BUILDER */}
          {wizardMode === 'ADVANCED_BUILDER' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-serif mb-1">Advanced World Parameter Synthesizer</h3>
                  <p className="text-xs text-slate-400">Meticulously customize planetary geometry, climate circulation, biological complexity, and genre rulesets.</p>
                </div>
                <button
                  onClick={handleLaunchAdvanced}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>Synthesize World</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Seed & Grid */}
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-3">
                  <h4 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">Planetary Coordinates & Seed</h4>
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Deterministic Seed</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={seed}
                        onChange={e => setSeed(parseInt(e.target.value) || 0)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={() => setSeed(Math.floor(Math.random() * 900000 + 100000))}
                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300"
                        title="Randomize Seed"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Topology & Geometry</label>
                    <select
                      value={topology}
                      onChange={e => setTopology(e.target.value as WorldTopology)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value="SPHERICAL">Spherical Planet</option>
                      <option value="PLANAR_BOUNDED">Planar Bounded Flat World</option>
                      <option value="TOROIDAL_WRAP">Toroidal Wraparound World</option>
                      <option value="FLOATING_ISLANDS">Floating Sky Archipelago</option>
                      <option value="RINGWORLD_SEGMENT">Ringworld Megastructure</option>
                      <option value="CYLINDRICAL_HABITAT">O'Neill Cylinder Interior</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Genre Ruleset</label>
                    <select
                      value={genre}
                      onChange={e => setGenre(e.target.value as GenreRuleset)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value="REALISTIC">Realistic (Strict Physics & Biology)</option>
                      <option value="SPECULATIVE_BIO">Speculative Biology (Alien Body Plans)</option>
                      <option value="FANTASY">High Fantasy (Mana Ley Lines & Arcana)</option>
                      <option value="SCI_FI">Science Fiction (Terraforming & Machines)</option>
                      <option value="SCIENCE_FANTASY">Science Fantasy (Techno-Arcane Fusion)</option>
                    </select>
                  </div>
                </div>

                {/* Physics & Life */}
                <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-3">
                  <h4 className="font-bold text-sky-400 text-xs uppercase font-mono tracking-wider">Geology & Biosphere</h4>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Sea Level</span>
                      <span className="font-mono text-sky-400">{Math.round(seaLevel * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.8"
                      step="0.05"
                      value={seaLevel}
                      onChange={e => setSeaLevel(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Volcanism & Tectonic Activity</span>
                      <span className="font-mono text-orange-400">{Math.round(volcanism * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={volcanism}
                      onChange={e => setVolcanism(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Primordial Life Diversity</span>
                      <span className="font-mono text-emerald-400">{lifeDiversity} base lineages</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="8"
                      step="1"
                      value={lifeDiversity}
                      onChange={e => setLifeDiversity(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Cognitive Sapience Likelihood</span>
                      <span className="font-mono text-purple-400">{sapienceLikelihood.toFixed(1)}×</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.2"
                      value={sapienceLikelihood}
                      onChange={e => setSapienceLikelihood(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Recipe String Export / Import */}
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyRecipe}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border border-slate-700"
                  >
                    {recipeCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{recipeCopied ? 'Recipe Copied!' : 'Copy World Recipe'}</span>
                  </button>
                  <span className="text-[11px] text-slate-400">Share or duplicate complete world configurations</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste World Recipe string..."
                    value={recipeInput}
                    onChange={e => setRecipeInput(e.target.value)}
                    className="w-64 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs font-mono text-white focus:outline-none"
                  />
                  <button
                    onClick={handleImportRecipe}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Import
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
