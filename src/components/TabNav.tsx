'use client';
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

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}

export default function TabNav({ activeTab, setActiveTab }: Props) {
  return (
    <nav
      className="flex gap-0 overflow-x-auto shrink-0 border-b scrollbar-none"
      style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)' }}
    >
      {TABS.map(({ id, label, icon: Icon, phase2 }) => {
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id as TabId)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap relative',
              active
                ? 'border-[var(--rk-accent)] text-[var(--rk-accent)]'
                : 'border-transparent text-[var(--rk-text3)] hover:text-[var(--rk-text2)] hover:border-[var(--rk-border2)]'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {phase2 && (
              <span
                className="text-[10px] font-mono px-1 rounded"
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
