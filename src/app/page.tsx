'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import AppHeader from '@/components/AppHeader';
import TabNav from '@/components/TabNav';
import type { TabId } from '@/components/TabNav';
import M1_SiteSetup from '@/components/M1_SiteSetup';
import M3_Cameras from '@/components/M3_Cameras';
import M4_Dashboard from '@/components/M4_Dashboard';
import M5_Reports from '@/components/M5_Reports';
import M6_AI from '@/components/M6_AI';
import M7_History from '@/components/M7_History';
import M8_Settings from '@/components/M8_Settings';

function M2_Placeholder() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: 'rgba(167,139,250,0.08)',
          border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: '16px',
          padding: '48px 56px',
          maxWidth: '480px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
        <div
          style={{
            color: 'var(--purple)',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '10px',
          }}
        >
          Phase 2 Feature
        </div>
        <h2 style={{ color: 'var(--text)', fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>
          Image Importer
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
          Bulk import and AI-assisted image analysis for CCTV audit images. Includes NPPD calculation,
          pixel density measurement, and automated compliance scoring.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
          {[
            'Bulk image import with drag & drop',
            'AI-powered NPPD (pixels per metre) calculation',
            'Automated %R extraction from images',
            'Motion smear detection',
            'Colour chart analysis',
          ].map((feature, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text3)', fontSize: '13px' }}>
              <span
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '1px solid rgba(167,139,250,0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '9px',
                  color: 'var(--purple)',
                }}
              >
                {i + 1}
              </span>
              {feature}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabId>('M1');
  const { initialize, initialized } = useStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg)',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: 'var(--text2)', fontSize: '14px' }}>Loading Rotakin...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  function renderTab() {
    switch (activeTab) {
      case 'M1': return <M1_SiteSetup />;
      case 'M2': return <M2_Placeholder />;
      case 'M3': return <M3_Cameras />;
      case 'M4': return <M4_Dashboard />;
      case 'M5': return <M5_Reports />;
      case 'M6': return <M6_AI />;
      case 'M7': return <M7_History />;
      case 'M8': return <M8_Settings />;
      default: return null;
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      <AppHeader />
      <TabNav active={activeTab} onChange={setActiveTab} />
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {renderTab()}
      </main>
    </div>
  );
}
