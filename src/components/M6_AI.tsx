'use client';
import { useState, useRef, useEffect } from 'react';
import { Bot, Wifi, WifiOff, Square, Copy, Check, Eye, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { classifyLevel } from '@/lib/standards';
import { toast } from 'sonner';
import { saveApiKey, loadApiKey } from '@/lib/storage';
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

  const [apiKey, setApiKey] = useState('');
  const [claudeModel, setClaudeModel] = useState('claude-sonnet-4-6');
  const [claudeOutput, setClaudeOutput] = useState('');
  const [claudeRunning, setClaudeRunning] = useState(false);
  const [claudeCopied, setClaudeCopied] = useState(false);

  useEffect(() => {
    loadApiKey().then(k => { if (k) setApiKey(k); });
  }, []);

  function handleApiKeyBlur() {
    saveApiKey(apiKey);
  }

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

  async function callClaudeVision(base64: string, prompt: string): Promise<string> {
    const data = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const json = await res.json() as { content: { type: string; text: string }[] };
    return json.content.find(c => c.type === 'text')?.text ?? '';
  }

  async function verifyRReadings() {
    if (!apiKey.trim()) { toast.error('Enter a Claude API key first'); return; }
    const cameras = state.audit.cameras;
    const withImages = cameras.filter(c => c.images.static?.original);
    if (withImages.length === 0) { toast.error('No cameras with static images'); return; }
    setClaudeRunning(true);
    setClaudeOutput('');
    const results: string[] = [];
    for (const cam of withImages) {
      const img = cam.images.static?.annotated || cam.images.static?.original;
      if (!img) continue;
      try {
        const prompt = `This is a CCTV camera image from a Rotakin compliance audit. The automated analysis measured a %R (figure height as percentage of frame height) of ${cam.measuredR ?? 'unknown'}%. Please examine the image and: 1) Confirm if a human-shaped figure is visible 2) Estimate the %R value visually 3) Rate image quality (blur, lighting) on a scale of 1-10. Respond in JSON: {"figureVisible": bool, "estimatedR": number|null, "imageQuality": number, "notes": string}`;
        const text = await callClaudeVision(img, prompt);
        results.push(`=== ${cam.ref || cam.id} ===\n${text}`);
        setClaudeOutput(results.join('\n\n'));
      } catch (err: unknown) {
        results.push(`=== ${cam.ref || cam.id} === ERROR: ${err instanceof Error ? err.message : String(err)}`);
        setClaudeOutput(results.join('\n\n'));
      }
    }
    setClaudeRunning(false);
    toast.success('Verification complete');
  }

  async function scoreFaceCharts() {
    if (!apiKey.trim()) { toast.error('Enter a Claude API key first'); return; }
    const cameras = state.audit.cameras;
    const withFace = cameras.filter(c => c.images.face?.original);
    if (withFace.length === 0) { toast.error('No cameras with face chart images'); return; }
    setClaudeRunning(true);
    setClaudeOutput('');
    const results: string[] = [];
    for (const cam of withFace) {
      const img = cam.images.face?.annotated || cam.images.face?.original;
      if (!img) continue;
      try {
        const prompt = `This is a facial identification chart from a CCTV audit. Read each line of text visible in the image. There are 10 lines numbered 1-10. For each line, state what text is visible. Respond in JSON: {"lines": [{"lineNo": number, "text": string}]}`;
        const text = await callClaudeVision(img, prompt);
        results.push(`=== ${cam.ref || cam.id} ===\n${text}`);
        setClaudeOutput(results.join('\n\n'));
      } catch (err: unknown) {
        results.push(`=== ${cam.ref || cam.id} === ERROR: ${err instanceof Error ? err.message : String(err)}`);
        setClaudeOutput(results.join('\n\n'));
      }
    }
    setClaudeRunning(false);
    toast.success('Face scoring complete');
  }

  async function copyClaudeOutput() {
    await navigator.clipboard.writeText(claudeOutput);
    setClaudeCopied(true);
    setTimeout(() => setClaudeCopied(false), 2000);
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

      {/* Claude API card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="w-4 h-4" style={{ color: 'var(--rk-accent)' }} />
            Claude API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onBlur={handleApiKeyBlur}
                placeholder="sk-ant-..."
              />
              <p className="text-[10px]" style={{ color: 'var(--rk-text3)' }}>
                Stored in browser session only, never sent to any server other than api.anthropic.com
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>Model</Label>
              <Select value={claudeModel} onValueChange={v => { if (v) setClaudeModel(v); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-haiku-4-5-20251001">claude-haiku-4-5-20251001</SelectItem>
                  <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={claudeRunning}
              onClick={verifyRReadings}
              className="gap-2"
            >
              <Eye className="w-3.5 h-3.5" />
              Verify %R Readings
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={claudeRunning}
              onClick={scoreFaceCharts}
              className="gap-2"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Score Face Charts
            </Button>
            {claudeRunning && (
              <Badge className="text-xs self-center" style={{ color: 'var(--rk-accent)', background: 'rgba(0,194,255,0.1)', border: '1px solid rgba(0,194,255,0.2)' }}>
                Running…
              </Badge>
            )}
          </div>

          {(claudeOutput || claudeRunning) && (
            <>
              <Separator className="my-2" />
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>
                  {claudeRunning ? 'Processing…' : 'Output'}
                </p>
                {claudeOutput && !claudeRunning && (
                  <Button variant="outline" size="sm" onClick={copyClaudeOutput} className="gap-1.5 text-xs h-7">
                    {claudeCopied ? <Check className="w-3 h-3" style={{ color: 'var(--rk-green)' }} /> : <Copy className="w-3 h-3" />}
                    {claudeCopied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </div>
              <div
                className="rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono"
                style={{ background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)', color: 'var(--rk-text2)', fontSize: 13 }}
              >
                {claudeOutput || <span style={{ color: 'var(--rk-text3)' }}>Waiting for response…</span>}
              </div>
            </>
          )}
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
