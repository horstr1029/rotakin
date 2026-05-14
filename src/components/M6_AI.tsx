'use client';

import React, { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { classifyLevel } from '@/lib/standards';
import type { AuditState } from '@/lib/types';

type ReportType = 'fullAudit' | 'executive' | 'technical' | 'sapsForensic' | 'remediation';

interface ReportOption {
  id: ReportType;
  label: string;
  description: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  { id: 'fullAudit', label: 'Full Audit', description: 'Comprehensive audit report with all findings' },
  { id: 'executive', label: 'Executive Summary', description: 'High-level overview for management' },
  { id: 'technical', label: 'Technical Detail', description: 'In-depth technical analysis of all cameras' },
  { id: 'sapsForensic', label: 'SAPS Forensic', description: 'Formatted for police forensic exhibit submission' },
  { id: 'remediation', label: 'Remediation Plan', description: 'Prioritised corrective action recommendations' },
];

function buildPrompt(type: ReportType, auditData: AuditState): string {
  const { audit } = auditData;
  const { site, cameras, standards } = audit;

  const compliant = cameras.filter(c => {
    const ach = classifyLevel(c.measuredR, standards);
    const req = standards.find(s => s.name === c.requiredStandard);
    return ach && req && ach.level >= req.level;
  }).length;

  const camSummary = cameras.map(c => {
    const ach = classifyLevel(c.measuredR, standards);
    const reqStd = standards.find(s => s.name === c.requiredStandard);
    const status = ach && reqStd
      ? (ach.level >= reqStd.level ? 'COMPLIANT' : 'NON-COMPLIANT')
      : 'PENDING';
    return `- Camera ${c.ref || '(no ref)'}: Zone=${c.zone || 'N/A'}, Required=${c.requiredStandard}, Measured %R=${c.measuredR ?? 'not measured'}, Achieved=${ach ? ach.name : 'N/A'}, Status=${status}`;
  }).join('\n');

  const context = `
ROTAKIN CCTV AUDIT DATA:
Standard: ${site.activeStandard || 'SANS 10222-5-1-4'}
Site: ${site.siteName || 'Unknown'} | ${site.siteAddress || ''}
Client: ${site.client || 'Unknown'}
Audit Date: ${site.auditDate || 'Unknown'}
Engineer: ${site.engineerName || 'Unknown'} (${site.engineerId || ''})
Certificate: ${site.certNumber || 'N/A'}
Cert Body: ${site.certBody || 'N/A'}

SUMMARY:
Total Cameras: ${cameras.length}
Compliant: ${compliant}
Non-Compliant: ${cameras.length - compliant - cameras.filter(c => !c.measuredR).length}
Pending: ${cameras.filter(c => !c.measuredR).length}

CAMERA DETAILS:
${camSummary || 'No cameras recorded.'}

Notes: ${site.notes || 'None'}
  `.trim();

  const prompts: Record<ReportType, string> = {
    fullAudit: `You are a CCTV compliance expert. Write a comprehensive ${site.activeStandard || 'SANS 10222-5-1-4'} audit report based on the following data. Include an introduction, methodology, findings for each camera, compliance analysis by zone, and conclusion. Use professional technical language.\n\n${context}`,
    executive: `You are a security consultant. Write a concise executive summary of the following CCTV compliance audit for senior management. Focus on key findings, compliance status, business risk, and recommended actions. Use clear non-technical language.\n\n${context}`,
    technical: `You are a CCTV systems engineer. Write a detailed technical analysis of the following audit data. Include in-depth assessment of each camera's performance, measurement methodology critique, technical recommendations for non-compliant cameras, and system-level observations.\n\n${context}`,
    sapsForensic: `You are a forensic readiness expert. Write a SAPS-formatted forensic exhibit document assessing the CCTV system's evidential capability. Include system identification details, capability assessment per ${site.activeStandard || 'SANS 10222-5-1-4'} level, forensic readiness rating, and chain of custody considerations.\n\n${context}`,
    remediation: `You are a CCTV compliance consultant. Write a prioritised remediation action plan for the non-compliant cameras in the following audit. For each non-compliant camera, provide: specific corrective actions, priority level (Critical/High/Medium), estimated effort, and expected outcome. Include an implementation timeline suggestion.\n\n${context}`,
  };

  return prompts[type];
}

export default function M6_AI() {
  const { state, updateAiReports } = useStore();
  const [serverUrl, setServerUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState('llama3.2');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [activeReport, setActiveReport] = useState<ReportType | null>(null);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleTestConnection() {
    setTestStatus('testing');
    setTestMsg('');
    try {
      const res = await fetch(`${serverUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json() as { models?: { name: string }[] };
        const models = data.models?.map((m: { name: string }) => m.name).join(', ') || 'none';
        setTestStatus('ok');
        setTestMsg(`Connected! Available models: ${models}`);
      } else {
        setTestStatus('error');
        setTestMsg(`Server responded with status ${res.status}`);
      }
    } catch (err) {
      setTestStatus('error');
      setTestMsg(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  async function handleGenerate(type: ReportType) {
    if (generating) {
      abortRef.current?.abort();
      return;
    }
    setActiveReport(type);
    setOutput('');
    setGenerating(true);
    const prompt = buildPrompt(type, state);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${serverUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as { response?: string; done?: boolean };
            if (parsed.response) {
              fullText += parsed.response;
              setOutput(fullText);
              if (outputRef.current) {
                outputRef.current.scrollTop = outputRef.current.scrollHeight;
              }
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      // Save to store
      updateAiReports({
        [type === 'fullAudit' ? 'fullAudit' : 'executive']: fullText,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setOutput(prev => prev + '\n\n[Generation stopped by user]');
      } else {
        setOutput(`Error: ${err instanceof Error ? err.message : 'Unknown error'}\n\nMake sure Ollama is running at ${serverUrl} and model "${model}" is available.`);
      }
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  function handleCopy() {
    if (output) navigator.clipboard.writeText(output);
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>AI Report Generator</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          Generate AI-written audit reports using Ollama (local LLM)
        </p>
      </div>

      {/* Config */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          Ollama Configuration
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 140px', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <div style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Server URL
            </div>
            <input
              style={inputStyle}
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="http://localhost:11434"
            />
          </div>
          <div>
            <div style={{ color: 'var(--text2)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
              Model
            </div>
            <input
              style={inputStyle}
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="llama3.2"
            />
          </div>
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            style={{
              background: testStatus === 'ok' ? 'rgba(16,217,138,0.15)' : testStatus === 'error' ? 'rgba(255,71,87,0.15)' : 'var(--surface2)',
              border: `1px solid ${testStatus === 'ok' ? 'var(--green)' : testStatus === 'error' ? 'var(--red)' : 'var(--border2)'}`,
              color: testStatus === 'ok' ? 'var(--green)' : testStatus === 'error' ? 'var(--red)' : 'var(--text2)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
        {testMsg && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: testStatus === 'ok' ? 'var(--green)' : 'var(--red)' }}>
            {testMsg}
          </div>
        )}
      </div>

      {/* Report type buttons */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px',
        }}
      >
        <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
          Generate Report
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
          {REPORT_OPTIONS.map(opt => {
            const isActive = activeReport === opt.id && generating;
            return (
              <button
                key={opt.id}
                onClick={() => handleGenerate(opt.id)}
                style={{
                  background: isActive ? 'rgba(0,194,255,0.15)' : 'var(--surface2)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border2)'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  borderRadius: '8px',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700 }}>
                  {isActive ? '⏸ Stop' : opt.label}
                </span>
                <span style={{ color: 'var(--text2)', fontSize: '10px', fontWeight: 400, lineHeight: '1.3' }}>
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Output */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Output {activeReport ? `— ${REPORT_OPTIONS.find(o => o.id === activeReport)?.label}` : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {generating && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent)',
                  fontSize: '12px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: 'pulse 1s infinite',
                  }}
                />
                Generating...
              </span>
            )}
            {output && (
              <button
                onClick={handleCopy}
                style={{
                  background: 'var(--surface2)',
                  border: '1px solid var(--border2)',
                  color: 'var(--text2)',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                }}
              >
                Copy to Clipboard
              </button>
            )}
          </div>
        </div>
        <textarea
          ref={outputRef}
          readOnly
          value={output || (generating ? '' : 'Select a report type above to generate AI content...')}
          style={{
            ...inputStyle,
            minHeight: '380px',
            fontFamily: 'monospace',
            fontSize: '12px',
            resize: 'vertical',
            lineHeight: '1.6',
            color: output ? 'var(--text)' : 'var(--text3)',
          }}
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
