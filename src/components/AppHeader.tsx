'use client';
import { useState } from 'react';
import { Shield, Plus, Upload, Download, HelpCircle, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/useTheme';
import { toast } from 'sonner';
import type { TabId } from '@/app/page';
import type { AuditState } from '@/lib/types';
import HelpDialog from '@/components/HelpDialog';

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}

export default function AppHeader({ setActiveTab }: Props) {
  const { state, newAudit, loadAudit } = useStore();
  const siteName = state.audit.site.siteName;
  const { theme, toggle } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

  function handleNew() {
    if (confirm('Start a new audit? Unsaved changes will be lost.')) {
      newAudit();
      toast.success('New audit started');
      setActiveTab('M1');
    }
  }

  function handleExport() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotakin-${state.audit.site.reportRef || 'audit'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit exported');
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as AuditState;
        if (data.schemaVersion === '3.0') {
          loadAudit(data);
          toast.success('Audit imported');
        } else {
          toast.error('Invalid or incompatible audit file');
        }
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    input.click();
  }

  return (
    <header
      className="flex items-center gap-4 px-6 h-14 shrink-0 border-b"
      style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: 'rgba(0,194,255,0.12)', border: '1px solid rgba(0,194,255,0.25)' }}
        >
          <Shield className="w-4 h-4" style={{ color: 'var(--rk-accent)' }} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--rk-accent)' }}>ROTAKIN</span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(0,194,255,0.1)', color: 'var(--rk-accent)', border: '1px solid rgba(0,194,255,0.2)' }}
          >
            v3
          </span>
        </div>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Site name */}
      <div className="flex-1 min-w-0">
        {siteName ? (
          <p className="text-sm font-medium truncate" style={{ color: 'var(--rk-text)' }}>{siteName}</p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--rk-text3)' }}>No audit loaded</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={toggle} className="text-xs w-8 h-8 p-0">
          {theme === 'dark'
            ? <Sun className="w-4 h-4" style={{ color: 'var(--rk-gold)' }} />
            : <Moon className="w-4 h-4" style={{ color: 'var(--rk-accent)' }} />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)} className="text-xs gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" /> Help
        </Button>
        <Button variant="outline" size="sm" onClick={handleNew} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
        <Button variant="outline" size="sm" onClick={handleImport} className="gap-1.5 text-xs">
          <Upload className="w-3.5 h-3.5" /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
