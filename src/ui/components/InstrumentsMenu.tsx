// Instruments — every secondary tool, one press away and otherwise invisible.
//
// The world stays dominant because these live behind a single control rather than as a
// permanent wall of buttons.

import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart2,
  BookOpen,
  Dna,
  GitCompare,
  GitFork,
  Keyboard,
  Landmark,
  Languages,
  LayoutGrid,
  Save,
  Settings,
  GitBranch
} from 'lucide-react';

export interface InstrumentAction {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  group: 'Life' | 'History' | 'Worlds' | 'Session';
  onSelect: () => void;
}

interface InstrumentsMenuProps {
  onOpenTreeOfLife: () => void;
  onOpenFieldGuide: () => void;
  onOpenChronicle: () => void;
  onOpenLanguages: () => void;
  onOpenCivilizationDossier: () => void;
  onOpenBranchCompare: () => void;
  onOpenTwinWorlds: () => void;
  onOpenStats: () => void;
  onOpenSaveLoad: () => void;
  onOpenSettings: () => void;
  onOpenHotkeys: () => void;
}

export const InstrumentsMenu: React.FC<InstrumentsMenuProps> = props => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const actions: InstrumentAction[] = [
    { id: 'tree', label: 'Tree of Life', hint: 'Phylogeny and descent', icon: <GitBranch size={15} />, group: 'Life', onSelect: props.onOpenTreeOfLife },
    { id: 'guide', label: 'Field Guide', hint: 'Species anatomy in 3D', icon: <Dna size={15} />, group: 'Life', onSelect: props.onOpenFieldGuide },
    { id: 'chronicle', label: 'Chronicle', hint: 'Every recorded event', icon: <BookOpen size={15} />, group: 'History', onSelect: props.onOpenChronicle },
    { id: 'languages', label: 'Languages', hint: 'Families and place names', icon: <Languages size={15} />, group: 'History', onSelect: props.onOpenLanguages },
    { id: 'dossier', label: 'Civilisations', hint: 'Polities and architecture', icon: <Landmark size={15} />, group: 'History', onSelect: props.onOpenCivilizationDossier },
    { id: 'fork', label: 'Fork World', hint: 'Branch an alternate history', icon: <GitFork size={15} />, group: 'Worlds', onSelect: props.onOpenBranchCompare },
    { id: 'twins', label: 'Twin Worlds', hint: 'Compare counterfactuals', icon: <GitCompare size={15} />, group: 'Worlds', onSelect: props.onOpenTwinWorlds },
    { id: 'stats', label: 'Planetary Data', hint: 'Global metrics', icon: <BarChart2 size={15} />, group: 'Session', onSelect: props.onOpenStats },
    { id: 'saves', label: 'Saves', hint: 'Local saves, import and export', icon: <Save size={15} />, group: 'Session', onSelect: props.onOpenSaveLoad },
    { id: 'settings', label: 'Settings', hint: 'Presentation and input', icon: <Settings size={15} />, group: 'Session', onSelect: props.onOpenSettings },
    { id: 'keys', label: 'Shortcuts', hint: 'Keyboard reference', icon: <Keyboard size={15} />, group: 'Session', onSelect: props.onOpenHotkeys }
  ];

  const groups: InstrumentAction['group'][] = ['Life', 'History', 'Worlds', 'Session'];

  return (
    <div ref={wrapRef} className="relative">
      <button
        data-testid="world-tools-button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Instruments"
        className="ws-chip flex items-center gap-1.5 px-2.5 h-9 text-[12px]"
        style={{ color: 'var(--ws-ink-muted)', borderColor: open ? 'color-mix(in srgb, var(--ws-accent) 55%, transparent)' : undefined }}
      >
        <LayoutGrid size={15} style={{ color: 'var(--ws-accent)' }} />
        <span className="hidden lg:inline">Instruments</span>
      </button>

      {open && (
        <div
          role="menu"
          data-testid="world-tools-panel"
          className="ws-panel ws-rise absolute right-0 top-11 w-[268px] p-2 z-50 max-h-[70vh] overflow-y-auto"
          style={{ background: 'var(--ws-surface-strong)' }}
        >
          {groups.map(group => (
            <div key={group} className="mb-1.5 last:mb-0">
              <div className="px-2 py-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--ws-ink-faint)' }}>
                {group}
              </div>
              {actions
                .filter(a => a.group === group)
                .map(action => (
                  <button
                    key={action.id}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      action.onSelect();
                    }}
                    className="w-full flex items-start gap-2.5 px-2 py-2 rounded-[8px] text-left transition-colors hover:bg-white/5"
                  >
                    <span className="mt-0.5 shrink-0" style={{ color: 'var(--ws-ink-muted)' }}>
                      {action.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12.5px] leading-tight" style={{ color: 'var(--ws-ink)' }}>
                        {action.label}
                      </span>
                      <span className="block text-[11px] leading-tight mt-0.5 truncate" style={{ color: 'var(--ws-ink-faint)' }}>
                        {action.hint}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
