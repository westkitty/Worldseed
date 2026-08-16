// Language Families & Place-Name Archaeology Modal

import React from 'react';
import { X, Languages, Book, MapPin } from 'lucide-react';
import { Language, WorldState } from '../../types/simulation';

interface LanguageFamilyModalProps {
  state: WorldState;
  onClose: () => void;
}

export const LanguageFamilyModal: React.FC<LanguageFamilyModalProps> = ({
  state,
  onClose
}) => {
  const languages = Object.values(state.languages);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/60 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 border border-purple-500/50 rounded-xl text-purple-400">
              <Languages size={20} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400 font-bold">
                Linguistic Archaeology & Phonology
              </span>
              <h2 className="text-lg font-bold text-white font-serif tracking-tight">
                Language Families & Etymology ({languages.length} Recorded Tongues)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Close Languages"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {languages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-serif text-sm">
              No sapient languages have crystallized yet. Advance simulation time to witness the emergence of speech.
            </div>
          ) : (
            languages.map(lang => (
              <div
                key={lang.id}
                className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white font-serif">{lang.name}</h3>
                    <p className="text-xs font-mono text-purple-300">
                      Family: {lang.familyId} | Emerged: Year {lang.originYear} | Grammar: {lang.grammarType}
                    </p>
                  </div>
                </div>

                {/* Phonology Matrix */}
                <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-400 block mb-1">Consonants:</span>
                    <div className="flex flex-wrap gap-1">
                      {lang.phonemes.consonants.map((c, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-800 text-purple-300 rounded border border-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Vowels:</span>
                    <div className="flex flex-wrap gap-1">
                      {lang.phonemes.vowels.map((v, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Core Vocabulary Dictionary */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Core Semantic Root Words</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono">
                    {Object.entries(lang.vocabulary).slice(0, 12).map(([concept, word]) => (
                      <div key={concept} className="p-2 bg-slate-900/40 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">{concept}</div>
                        <div className="text-amber-300 font-bold">{word}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
