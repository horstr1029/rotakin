'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { generateSANSReport } from '@/lib/pdf';

interface Template {
  id: string;
  title: string;
  description: string;
  sections: string[];
  available: boolean;
  comingSoon?: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'sans-full',
    title: 'SANS Full Audit Report',
    description: 'Complete SANS 10222-5-1-4 compliance audit report with all camera data, step results, and facial scoring.',
    sections: [
      'Cover page with logos and report reference',
      'Site & audit detail table',
      'Compliance overview with KPI summary',
      'Per-camera details: measurements, audit steps, facial scoring',
      'Declarations & signature blocks',
    ],
    available: true,
  },
  {
    id: 'executive',
    title: 'Executive Summary',
    description: 'High-level compliance overview suitable for management and non-technical stakeholders.',
    sections: ['KPI summary', 'Zone compliance table', 'Key findings', 'Recommendations'],
    available: false,
    comingSoon: 'Phase 3',
  },
  {
    id: 'technical',
    title: 'Technical Appendix',
    description: 'Detailed technical data including all raw measurements, step logs, and image references.',
    sections: ['Full camera inventory', 'Raw measurement data', 'Step-by-step results', 'Image catalogue'],
    available: false,
    comingSoon: 'Phase 3',
  },
  {
    id: 'saps',
    title: 'SAPS Forensic Exhibit',
    description: 'Formatted for South African Police Service forensic exhibit submission.',
    sections: ['Chain of custody', 'System capability assessment', 'Forensic readiness rating'],
    available: false,
    comingSoon: 'Phase 3',
  },
  {
    id: 'remediation',
    title: 'Remediation Action Plan',
    description: 'Prioritised list of non-compliance issues with recommended corrective actions.',
    sections: ['Non-compliant camera list', 'Delta analysis', 'Priority ranking', 'Cost estimate range'],
    available: false,
    comingSoon: 'Phase 3',
  },
];

export default function M5_Reports() {
  const { state } = useStore();
  const [selected, setSelected] = useState('sans-full');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = TEMPLATES.find(t => t.id === selected)!;

  async function handleGenerate() {
    if (!selectedTemplate.available) return;
    setGenerating(true);
    setError(null);
    try {
      await generateSANSReport(state);
    } catch (err) {
      console.error(err);
      setError('Failed to generate PDF. Check console for details.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Reports</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Generate compliance audit reports in PDF format</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Template selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
            Report Templates
          </div>
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => setSelected(tpl.id)}
              style={{
                background: selected === tpl.id ? 'rgba(0,194,255,0.1)' : 'var(--surface)',
                border: `1px solid ${selected === tpl.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '12px 14px',
                textAlign: 'left',
                color: tpl.available ? 'var(--text)' : 'var(--text3)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{tpl.title}</span>
                {tpl.comingSoon && (
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--purple)',
                      background: 'rgba(167,139,250,0.15)',
                      padding: '2px 5px',
                      borderRadius: '3px',
                      fontWeight: 600,
                      flexShrink: 0,
                      marginLeft: '6px',
                    }}
                  >
                    {tpl.comingSoon}
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text2)', fontSize: '11px', marginTop: '3px' }}>
                {tpl.description.slice(0, 60)}...
              </div>
            </button>
          ))}
        </div>

        {/* Template detail + generate */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                {selectedTemplate.title}
              </h3>
              <p style={{ color: 'var(--text2)', fontSize: '13px', lineHeight: '1.5' }}>
                {selectedTemplate.description}
              </p>
            </div>
            {selectedTemplate.available ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  background: generating ? 'var(--surface2)' : 'var(--accent)',
                  color: generating ? 'var(--text2)' : '#000',
                  borderRadius: '8px',
                  padding: '10px 22px',
                  fontSize: '14px',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginLeft: '20px',
                }}
              >
                {generating ? 'Generating...' : 'Generate PDF'}
              </button>
            ) : (
              <span
                style={{
                  background: 'rgba(167,139,250,0.1)',
                  border: '1px solid var(--purple)',
                  color: 'var(--purple)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                  marginLeft: '20px',
                }}
              >
                {selectedTemplate.comingSoon}
              </span>
            )}
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(255,71,87,0.1)',
                border: '1px solid var(--red)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: 'var(--red)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          {/* Sections preview */}
          <div
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Sections included
            </div>
            {selectedTemplate.sections.map((section, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 0',
                  borderBottom: i < selectedTemplate.sections.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: selectedTemplate.available ? 'rgba(0,194,255,0.15)' : 'rgba(167,139,250,0.1)',
                    border: `1px solid ${selectedTemplate.available ? 'var(--accent)' : 'var(--purple)'}`,
                    color: selectedTemplate.available ? 'var(--accent)' : 'var(--purple)',
                    fontSize: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ color: selectedTemplate.available ? 'var(--text)' : 'var(--text3)', fontSize: '13px' }}>
                  {section}
                </span>
              </div>
            ))}
          </div>

          {/* Audit summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: 'Cameras', value: state.audit.cameras.length },
              { label: 'Site', value: state.audit.site.siteName || 'Not set' },
              { label: 'Standard', value: state.audit.site.activeStandard || 'SANS 10222-5-1-4' },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                }}
              >
                <div style={{ color: 'var(--text2)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  {item.label}
                </div>
                <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
