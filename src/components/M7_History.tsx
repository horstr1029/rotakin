'use client';

import React from 'react';

export default function M7_History() {
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕓</div>
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
        <h2
          style={{
            color: 'var(--text)',
            fontSize: '22px',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          Audit History
        </h2>
        <p
          style={{
            color: 'var(--text2)',
            fontSize: '14px',
            lineHeight: '1.6',
            marginBottom: '24px',
          }}
        >
          Browse, compare, and restore previous audit sessions.
          History and version management is coming in Phase 2.
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
          }}
        >
          {[
            'Multi-audit history with timestamps',
            'Side-by-side audit comparison',
            'Restore previous audit versions',
            'Audit diff highlighting changes',
            'Export history as timeline report',
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text3)',
                fontSize: '13px',
              }}
            >
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
