'use client';
import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/useTheme';
import AppHeader from '@/components/AppHeader';
import TabNav from '@/components/TabNav';
import AuditManager from '@/components/AuditManager';
import M1_SiteSetup from '@/components/M1_SiteSetup';
import M2_ImageImporter from '@/components/M2_ImageImporter';
import M3_Cameras from '@/components/M3_Cameras';
import M4_Dashboard from '@/components/M4_Dashboard';
import M5_Reports from '@/components/M5_Reports';
import M6_AI from '@/components/M6_AI';
import M7_History from '@/components/M7_History';
import M8_Settings from '@/components/M8_Settings';

export type TabId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('M1');
  const [view, setView] = useState<'manager' | 'audit'>('manager');
  const { initialize } = useStore();
  useTheme();

  useEffect(() => { initialize(); }, [initialize]);

  const panels: Record<TabId, React.ReactNode> = {
    M1: <M1_SiteSetup />,
    M2: <M2_ImageImporter />,
    M3: <M3_Cameras />,
    M4: <M4_Dashboard />,
    M5: <M5_Reports />,
    M6: <M6_AI />,
    M7: <M7_History />,
    M8: <M8_Settings />,
  };

  if (view === 'manager') {
    return (
      <AuditManager
        onOpen={() => { setActiveTab('M1'); setView('audit'); }}
        onNew={() => { setActiveTab('M1'); setView('audit'); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--rk-bg)' }}>
      <AppHeader activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setView('manager')} />
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {panels[activeTab]}
        </div>
      </main>
    </div>
  );
}
