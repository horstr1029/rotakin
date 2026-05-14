'use client';

import React, { useRef } from 'react';
import { useStore } from '@/lib/store';
import type { AuditState } from '@/lib/types';

export default function AppHeader() {
  const { state, newAudit, loadAudit } = useStore();
  const importRef = useRef<HTMLInputElement>(null);
  const siteName = state.audit.site.siteName;

  function handleExport() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fname = `rotakin_audit_${state.audit.site.reportRef || state.audit.id}.json`;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as AuditState;
        if (data.schemaVersion === '3.0') {
          loadAudit(data);
        } else {
          alert('Invalid or incompatible audit file.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleNewAudit() {
    if (confirm('Start a new audit? All unsaved changes will be lost.')) {
      newAudit();
    }
  }

  return (
    <header
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left: branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            style={{
              fontWeight: 900,
              fontSize: '22px',
              letterSpacing: '0.08em',
              color: 'var(--accent)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            ROTAKIN
          </span>
          <span
            style={{
              background: 'var(--accent)',
              color: '#000',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              letterSpacing: '0.05em',
            }}
          >
            v3
          </span>
        </div>
        <div
          style={{
            width: '1px',
            height: '28px',
            background: 'var(--border)',
          }}
        />
        <span style={{ color: 'var(--text2)', fontSize: '13px' }}>
          CCTV Audit Platform
        </span>
        {siteName && (
          <>
            <div style={{ width: '1px', height: '28px', background: 'var(--border)' }} />
            <span
              style={{
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: 500,
                maxWidth: '240px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {siteName}
            </span>
          </>
        )}
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleNewAudit}
          style={{
            background: 'transparent',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            borderRadius: '6px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 500,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)';
          }}
        >
          New Audit
        </button>

        <button
          onClick={() => importRef.current?.click()}
          style={{
            background: 'transparent',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            borderRadius: '6px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 500,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gold)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border2)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text2)';
          }}
        >
          Import JSON
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        <button
          onClick={handleExport}
          style={{
            background: 'var(--accent)',
            color: '#000',
            borderRadius: '6px',
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 600,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#00a8d9';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
          }}
        >
          Export JSON
        </button>
      </div>
    </header>
  );
}
