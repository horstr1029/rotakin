'use client';
import { useRef } from 'react';
import { ClipboardList, FolderOpen, Camera, BarChart3, FileText, Bot, History, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '@/app/page';

const TABS = [
  { id: 'M1', label: 'Site Setup',  icon: ClipboardList, phase2: false },
  { id: 'M2', label: 'Images',      icon: FolderOpen,    phase2: true  },
  { id: 'M3', label: 'Cameras',     icon: Camera,        phase2: false },
  { id: 'M4', label: 'Dashboard',   icon: BarChart3,     phase2: false },
  { id: 'M5', label: 'Reports',     icon: FileText,      phase2: false },
  { id: 'M6', label: 'AI',          icon: Bot,           phase2: false },
  { id: 'M7', label: 'History',     icon: History,       phase2: true  },
  { id: 'M8', label: 'Settings',    icon: Settings2,     phase2: false },
] as const;

const TAB_IDS = TABS.map(t => t.id) as TabId[];

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}

export default function TabNav({ activeTab, setActiveTab }: Props) {
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 50) return;
    const idx = TAB_IDS.indexOf(activeTab);
    if (delta < 0 && idx < TAB_IDS.length - 1) {
      setActiveTab(TAB_IDS[idx + 1]);
    } else if (delta > 0 && idx > 0) {
      setActiveTab(TAB_IDS[idx - 1]);
    }
  }

  return (
    <nav
      className="flex gap-0 overflow-x-auto shrink-0 border-b scrollbar-none"
      style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {TABS.map(({ id, label, icon: Icon, phase2 }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id as TabId)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 min-h-[44px] text-xs font-medium border-b-2 transition-colors whitespace-nowrap relative',
              active
                ? 'border-[var(--rk-accent)] text-[var(--rk-accent)]'
                : 'border-transparent text-[var(--rk-text3)] hover:text-[var(--rk-text2)] hover:border-[var(--rk-border2)]'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="rk-tab-label">{label}</span>
            {phase2 && (
              <span
                className="text-[10px] font-mono px-1 rounded rk-tab-label"
                style={{ background: 'rgba(167,139,250,0.12)', color: 'var(--rk-purple)' }}
              >
                P2
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
