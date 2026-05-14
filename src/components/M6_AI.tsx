'use client';
import { useState, useRef } from 'react';
import { Bot, Wifi, WifiOff, Square, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/lib/store';
import { classifyLevel } from '@/lib/standards';
import { toast } from 'sonner';
import type { AuditState } from '@/lib/types';

type ReportType = 'fullAudit' | 'executive' | 'technical' | 'sapsForensic' | 'remediation';

const REPORT_OPTIONS: { id: ReportType; label: string; description: string }[] = [
  { id: 'fullAudit',    label: 'Full Audit',        description: 'Comprehensive audit report with all findings' },
  { id: 'executive',   label: 'Executive Summary',  description: 'High-level overview for management' },
  { id: 'technical',   label: 'Technical Detail',   description: 'In-depth technical analysis of all cameras' },
  { id: 'sapsForensic',label: 'SAPS Forensic',      description: 'Formatted for police forensic exhibit submission' },
  { id: 'remediation', label: 'Remediation Plan',   description: 'Prioritised corrective action recommendations' },
];

function buildPrompt(type: ReportType, auditData: AuditState): string {
  const { site, cameras, standards } = auditData.audit;
  const compliant = cameras.filter(c => {
    const ach = classifyLevel(c.measuredR, standards);
    const req = standards.find(s => s.name === c.requiredStandard);
    return ach && req && ach.level >= req.level;
  }).length;
  const rate = cameras.length ? Math.round((compliant / cameras.length) * 100) : 0;
  const cameraList = cameras.map(c => {
    const ach = classifyLevel(c.measuredR, standards);
    return `- ${c.ref || 'Unnamed'} (Zone: ${c.zone || 'N/A'}, %R: ${c.measuredR ?? 'N/A'}, Level: ${ach?.name ?? 'Pending'}, Required: ${c.requiredStandard})`;
  }).join('\n');

  const systemContext = `You are a professional CCTV compliance engineer writing a formal audit report. Use precise, technical language. Standard: ${site.activeStandard}.`;

  const prompts: Record<ReportType, string> = {
    fullAudit: `${systemContext}\n\nWrite a comprehensive CCTV audit report for:\nSite: ${site.siteName}\nClient: ${site.client}\nDate: ${site.auditDate}\nEngineer: ${site.engineerName}\nCompliance rate: ${rate}%\n\nCamera results:\n${cameraList}\n\nInclude: Executive Summary, Scope, Methodology, Findings per camera zone, Compliance Assessment, Recommendations, Conclusion.`,
    executive: `${systemContext}\n\nWrite a 1-page executive summary for ${site.siteName}. Compliance rate: ${rate}% (${compliant}/${cameras.length} cameras). Highlight top 3 findings and recommended actions.`,
    technical: `${systemContext}\n\nWrite a detailed technical appendix for ${site.siteName}. Cover measurement methodology, per-camera technical findings, anomalies, and equipment recommendations.\n\nCamera data:\n${cameraList}`,
    sapsForensic: `${systemContext}\n\nWrite a SAPS forensic exhibit report for ${site.siteName}. Include chain of custody statement, examiner qualifications, exhibit numbering, and evidentiary notes per camera.\n\nCamera data:\n${cameraList}`,
    remediation: `${systemContext}\n\nWrite a remediation action plan for non-compliant cameras at ${site.siteName}. For each non-compliant camera provide: issue description, recommended fix, priority (High/Medium/Low), and estimated impact.\n\nCamera data:\n${cameraList}`,
  };

  return prompts[type];
}

export default function M6_AI() {
  const { state, updateAiReports } = useStore();
  const [serverUrl, setServerUrl] = useState('http://localhost:11434');
  const [model, setModel] = useState('llama3.2');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeType, setActiveType] = useState<ReportType | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch(`${serverUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      setConnected(res.ok);
      toast[res.ok ? 'success' : 'error'](res.ok ? 'Ollama connected' : 'Connection failed');
    } catch {
      setConnected(false);
      toast.error('Cannot reach Ollama server');
    } finally {
      setTesting(false);
    }
  }

  async function generate(type: ReportType) {
    setGenerating(true);
    setActiveType(type);
    setOutput('');
    const prompt = buildPrompt(type, state);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${serverUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: true }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n').filter(Boolean)) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              full += json.response;
              setOutput(full);
            }
          } catch { /* skip malformed */ }
        }
      }
      updateAiReports({ [type]: full, generatedAt: new Date().toISOString() });
      toast.success('Report generated');
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') toast.error('Generation failed');
    } finally {
      setGenerating(false);
      setActiveType(null);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setGenerating(false);
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }

  return (
    <div className="space-y-6">
      {/* Connection config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: 'var(--rk-purple)' }} />
            Ollama Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>Server URL</Label>
              <Input value={serverUrl} onChange={e => setServerUrl(e.target.value)} placeholder="http://localhost:11434" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>Model</Label>
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="llama3.2" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={testConnection} disabled={testing} className="gap-2">
              {connected === true ? <Wifi className="w-3.5 h-3.5" style={{ color: 'var(--rk-green)' }} />
                : connected === false ? <WifiOff className="w-3.5 h-3.5" style={{ color: 'var(--rk-red)' }} />
                : <Wifi className="w-3.5 h-3.5" />}
              {testing ? 'Testing…' : 'Test Connection'}
            </Button>
            {connected !== null && (
              <Badge className="text-xs" style={connected
                ? { color: 'var(--rk-green)', background: 'rgba(16,217,138,0.1)', border: '1px solid rgba(16,217,138,0.2)' }
                : { color: 'var(--rk-red)', background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.2)' }
              }>
                {connected ? 'Connected' : 'Offline'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report buttons */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Generate AI Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {REPORT_OPTIONS.map(opt => (
              <Button
                key={opt.id}
                variant="outline"
                size="sm"
                disabled={generating}
                onClick={() => generate(opt.id)}
                className="justify-start gap-2 h-auto py-3 px-4 flex-col items-start"
                style={activeType === opt.id ? { borderColor: 'var(--rk-purple)', background: 'rgba(167,139,250,0.06)' } : {}}
              >
                <span className="font-medium text-xs">{opt.label}</span>
                <span className="text-xs font-normal opacity-60 text-left">{opt.description}</span>
              </Button>
            ))}
          </div>

          {/* Output */}
          {(output || generating) && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>
                  {generating ? 'Generating…' : 'Output'}
                </p>
                <div className="flex items-center gap-2">
                  {generating && (
                    <Button variant="outline" size="sm" onClick={stop} className="gap-1.5 text-xs h-7">
                      <Square className="w-3 h-3" /> Stop
                    </Button>
                  )}
                  {output && !generating && (
                    <Button variant="outline" size="sm" onClick={copyOutput} className="gap-1.5 text-xs h-7">
                      {copied ? <Check className="w-3 h-3" style={{ color: 'var(--rk-green)' }} /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  )}
                </div>
              </div>
              <div
                className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono"
                style={{ background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)', color: 'var(--rk-text2)', fontSize: 13 }}
              >
                {output || <span style={{ color: 'var(--rk-text3)' }}>Waiting for response…</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
