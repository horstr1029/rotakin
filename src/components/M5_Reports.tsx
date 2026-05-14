'use client';
import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { generateSANSReport, generateExecutiveSummary, generateTechnicalAppendix, generateSAPSForensicReport, generateRemediationPlan, generateTestResultCards } from '@/lib/pdf';
import { exportJSON, exportCSV, exportZIP } from '@/lib/exports';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ExportFormat = 'pdf' | 'json' | 'csv' | 'zip';

const TEMPLATES = [
  {
    id: 'sans-full',
    title: 'SANS Full Audit Report',
    description: 'Complete SANS 10222-5-1-4 compliance audit with all camera data, step results, and facial scoring.',
    sections: ['Cover page with logos', 'Site & audit details table', 'Compliance overview', 'Per-camera records', 'Declarations & signatures'],
  },
  {
    id: 'executive',
    title: 'Executive Summary',
    description: '2-page board-level overview — site, compliance rate, key findings, and recommendations.',
    sections: ['KPI summary', 'Top findings', 'Recommended actions'],
  },
  {
    id: 'technical',
    title: 'Technical Appendix',
    description: 'Engineer-focused detail: raw measurements, confidence scores, step-by-step results, full-size annotated images.',
    sections: ['Raw measurement data', 'Step-by-step results', 'Confidence scores', 'Full annotated images'],
  },
  {
    id: 'saps',
    title: 'SAPS Forensic Exhibit',
    description: 'Formatted for South African Police Service forensic evidence requirements with chain of custody.',
    sections: ['Chain of custody', 'Examiner certification', 'Exhibit reference numbering'],
  },
  {
    id: 'remediation',
    title: 'Remediation Action Plan',
    description: 'Non-compliant cameras only — prioritised upgrade table with suggested equipment and cost bands.',
    sections: ['Non-compliant cameras only', 'Priority rating', 'Suggested equipment', 'Sign-off tracking'],
  },
  {
    id: 'test-cards',
    title: 'Test Result Certificates',
    description: 'One-page compliance certificate per camera — matches the standard field test record format.',
    sections: ['Camera header & site info', 'All 6 test categories with expected vs actual', 'Overall verdict', '%R measurement gauge', 'Problems & recommendations', 'Engineer/witness signature blocks'],
    available: true,
  },
] as const;

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  json: 'JSON',
  csv: 'CSV',
  zip: 'ZIP',
};

export default function M5_Reports() {
  const { state } = useStore();
  const [selected, setSelected] = useState<string>('sans-full');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate(templateId: string, fmt: ExportFormat) {
    if (state.audit.cameras.length === 0) {
      toast.error('Add at least one camera before generating a report');
      return;
    }
    setGenerating(true);
    try {
      if (fmt === 'json') {
        exportJSON(state);
        toast.success('JSON export downloaded');
        return;
      }
      if (fmt === 'csv') {
        exportCSV(state);
        toast.success('CSV export downloaded');
        return;
      }
      if (fmt === 'zip') {
        await exportZIP(state);
        toast.success('ZIP export downloaded');
        return;
      }
      switch (templateId) {
        case 'sans-full':
          await generateSANSReport(state);
          break;
        case 'executive':
          await generateExecutiveSummary(state);
          break;
        case 'technical':
          await generateTechnicalAppendix(state);
          break;
        case 'saps':
          await generateSAPSForensicReport(state);
          break;
        case 'remediation':
          await generateRemediationPlan(state);
          break;
        case 'test-cards':
          await generateTestResultCards(state);
          break;
        default:
          toast.error('Unknown template');
          return;
      }
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
        <p className="text-sm" style={{ color: 'var(--rk-text2)' }}>Select a template and export format, then generate a professional compliance report.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setSelected(t.id)}
            className={cn(
              'text-left rounded-xl border p-4 transition-all duration-150',
              selected === t.id
                ? 'border-[var(--rk-accent)]'
                : 'border-[var(--rk-border)] hover:border-[var(--rk-border2)]'
            )}
            style={{
              background: selected === t.id ? 'rgba(0,194,255,0.04)' : 'var(--rk-surface)',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                background: selected === t.id ? 'rgba(0,194,255,0.12)' : 'var(--rk-surface2)',
              }}>
                <FileText className="w-4 h-4" style={{ color: selected === t.id ? 'var(--rk-accent)' : 'var(--rk-text3)' }} />
              </div>
              {selected === t.id && (
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

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>Format:</span>
        {(['pdf', 'json', 'csv', 'zip'] as ExportFormat[]).map(fmt => (
          <button
            key={fmt}
            onClick={() => setFormat(fmt)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-150',
              format === fmt
                ? 'border-[var(--rk-accent)] text-[var(--rk-accent)]'
                : 'border-[var(--rk-border)] text-[var(--rk-text2)] hover:border-[var(--rk-border2)]'
            )}
            style={{
              background: format === fmt ? 'rgba(0,194,255,0.08)' : 'var(--rk-surface)',
            }}
          >
            {FORMAT_LABELS[fmt]}
          </button>
        ))}
      </div>

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
            <Button onClick={() => handleGenerate(selected, format)} disabled={generating} className="gap-2">
              <Download className="w-4 h-4" />
              {generating ? 'Generating…' : `Export ${FORMAT_LABELS[format]}`}
            </Button>
            <p className="text-xs" style={{ color: 'var(--rk-text3)' }}>
              {state.audit.cameras.length} camera{state.audit.cameras.length !== 1 ? 's' : ''} · {state.audit.site.activeStandard}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
