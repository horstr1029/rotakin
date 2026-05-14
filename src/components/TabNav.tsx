'use client';

import React from 'react';

export type TabId = 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6' | 'M7' | 'M8';

interface Tab {
  id: TabId;
  label: string;
  phase2?: boolean;
}

const TABS: Tab[] = [
  { id: 'M1', label: 'Site Setup' },
  { id: 'M2', label: 'Image Importer', phase2: true },
  { id: 'M3', label: 'Cameras' },
  { id: 'M4', label: 'Dashboard' },
  { id: 'M5', label: 'Reports' },
  { id: 'M6', label: 'AI' },
  { id: 'M7', label: 'History', phase2: true },
  { id: 'M8', label: 'Settings' },
];

interface TabNavProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'stretch',
        paddingLeft: '16px',
        overflowX: 'auto',
        flexShrink: 0,
      }}
    >
      {TABS.map(tab => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background: 'transparent',
              color: isActive ? 'var(--accent)' : tab.phase2 ? 'var(--text3)' : 'var(--text2)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = tab.phase2 ? 'var(--text2)' : 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = tab.phase2 ? 'var(--text3)' : 'var(--text2)';
              }
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                letterSpacing: '0.05em',
              }}
            >
              {tab.id}
            </span>
            <span>{tab.label}</span>
            {tab.phase2 && (
              <span
                style={{
                  fontSize: '9px',
                  color: 'var(--purple)',
                  background: 'rgba(167,139,250,0.15)',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                }}
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
