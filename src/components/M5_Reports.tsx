'use client';
import { useState } from 'react';
import { FileText, Download, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { generateSANSReport } from '@/lib/pdf';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TEMPLATES = [
  {
    id: 'sans-full',
    title: 'SANS Full Audit Report',
    description: 'Complete SANS 10222-5-1-4 compliance audit with all camera data, step results, and facial scoring.',
    sections: ['Cover page with logos', 'Site & audit details table', 'Compliance overview', 'Per-camera records', 'Declarations & signatures'],
    available: true,
  },
  {
    id: 'executive',
    title: 'Executive Summary',
    description: '2-page board-level overview — site, compliance rate, key findings, and recommendations.',
    sections: ['KPI summary', 'Top findings', 'Recommended actions'],
    available: false,
  },
  {
    id: 'technical',
    title: 'Technical Appendix',
    description: 'Engineer-focused detail: raw measurements, confidence scores, step-by-step results, full-size annotated images.',
    sections: ['Raw measurement data', 'Step-by-step results', 'Confidence scores', 'Full annotated images'],
    available: false,
  },
  {
    id: 'saps',
    title: 'SAPS Forensic Exhibit',
    description: 'Formatted for South African Police Service forensic evidence requirements with chain of custody.',
    sections: ['Chain of custody', 'Examiner certification', 'Exhibit reference numbering'],
    available: false,
  },
  {
    id: 'remediation',
    title: 'Remediation Action Plan',
    description: 'Non-compliant cameras only — prioritised upgrade table with suggested equipment and cost bands.',
    sections: ['Non-compliant cameras only', 'Priority rating', 'Suggested equipment', 'Sign-off tracking'],
    available: false,
  },
] as const;

export default function M5_Reports() {
  const { state } = useStore();
  const [selected, setSelected] = useState<string>('sans-full');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (state.audit.cameras.length === 0) {
      toast.error('Add at least one camera before generating a report');
      return;
    }
    setGenerating(true);
    try {
      await generateSANSReport(state);
      toast.success('PDF report generated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  const active = TEMPLATES.find(t => t.id === selected)!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold mb-1">Report Generator</h2>
        <p className="text-sm" style={{ color: 'var(--rk-text2)' }}>Select a template and generate a professional compliance report.</p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => t.available && setSelected(t.id)}
            className={cn(
              'text-left rounded-xl border p-4 transition-all duration-150',
              !t.available && 'opacity-50 cursor-not-allowed',
              selected === t.id && t.available
                ? 'border-[var(--rk-accent)]'
                : 'border-[var(--rk-border)] hover:border-[var(--rk-border2)]'
            )}
            style={{
              background: selected === t.id && t.available ? 'rgba(0,194,255,0.04)' : 'var(--rk-surface)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: selected === t.id && t.available ? 'rgba(0,194,255,0.12)' : 'var(--rk-surface2)',
              }}>
                {t.available
                  ? <FileText className="w-4 h-4" style={{ color: selected === t.id ? 'var(--rk-accent)' : 'var(--rk-text3)' }} />
                  : <Lock className="w-4 h-4" style={{ color: 'var(--rk-text3)' }} />
                }
              </div>
              {!t.available && (
                <Badge className="text-xs font-mono" style={{ color: 'var(--rk-purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                  Phase 3
                </Badge>
              )}
              {t.available && selected === t.id && (
                <Badge className="text-xs" style={{ color: 'var(--rk-accent)', background: 'rgba(0,194,255,0.1)', border: '1px solid rgba(0,194,255,0.2)' }}>
                  Selected
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold mb-1">{t.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--rk-text2)' }}>{t.description}</p>
          </button>
        ))}
      </div>

      {/* Selected template detail + generate */}
      {active.available && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{active.title}</CardTitle>
            <CardDescription className="text-xs">{active.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--rk-text3)' }}>Included sections</p>
              <ul className="space-y-1.5">
                {active.sections.map(s => (
                  <li key={s} className="flex items-center gap-2 text-sm" style={{ color: 'var(--rk-text2)' }}>
                    <span style={{ color: 'var(--rk-green)' }}>✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                <Download className="w-4 h-4" />
                {generating ? 'Generating…' : 'Generate PDF'}
              </Button>
              <p className="text-xs" style={{ color: 'var(--rk-text3)' }}>
                {state.audit.cameras.length} camera{state.audit.cameras.length !== 1 ? 's' : ''} · {state.audit.site.activeStandard}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
