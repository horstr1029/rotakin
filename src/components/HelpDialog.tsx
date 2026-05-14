'use client';
import { ClipboardList, ImagePlus, Camera, BarChart2, FileText, Bot, History, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    id: 'M1',
    icon: ClipboardList,
    title: 'Site Setup',
    body: `Set up your audit before visiting site. Enter the site name, client, engineer details, certification number, and select the applicable standard (SANS or BS EN). Upload your company and client logos — they appear on all PDF reports.`,
  },
  {
    id: 'M2',
    icon: ImagePlus,
    title: 'Image Import',
    body: `After the site visit, drop your photo folder here. Name photos as CAM-01_static.jpg, CAM-01_smear.jpg etc. The app detects the camera reference and step type from the filename. If a ref doesn't exist yet, you'll be prompted to create the camera record. Click "Process All" to run automated %R detection via Sobel edge analysis.

• Green badge: auto-accepted (confidence ≥70%)
• Yellow badge: review recommended (40–69%)
• Red badge: manual entry required (<40%)`,
  },
  {
    id: 'M3',
    icon: Camera,
    title: 'Camera Records',
    body: `Click any camera row to open the detail sheet. Fill in make, model, zone, location, and measured %R if not auto-populated. Use the 5 tabs:

• Details: core fields and compliance gauge
• Images: 6 image slots (static, smear, colour, face, extra)
• Audit Steps: 7-step SANS procedure with pass/fail/N/A
• Facial Scoring: 10-line identification test
• Test Record: the full per-camera test certificate data`,
  },
  {
    id: 'M4',
    icon: BarChart2,
    title: 'Dashboard',
    body: `Live overview of your audit. KPI cards show total/compliant/non-compliant/pending cameras. The chart shows level distribution. Any anomalies (low confidence, high blur, missing data) are flagged automatically at the bottom.`,
  },
  {
    id: 'M5',
    icon: FileText,
    title: 'Reports',
    body: `Generate professional PDF reports. Choose a template:

• SANS Full Audit: complete report for submission
• Test Result Certificates: one-page certificate per camera (your field test record)
• Executive Summary: 2-page board-level overview
• Technical Appendix: raw measurement data
• SAPS Forensic Exhibit: chain of custody format
• Remediation Plan: action plan for non-compliant cameras

Also export as JSON (full data backup), CSV (camera list), or ZIP (all + images).`,
  },
  {
    id: 'M6',
    icon: Bot,
    title: 'AI Assistant',
    body: `Generate narrative report sections using AI. Connect to a local Ollama server (no internet required) or enter a Claude API key for cloud vision capabilities. Claude vision can independently verify %R measurements and auto-read face charts.`,
  },
  {
    id: 'M7',
    icon: History,
    title: 'History',
    body: `Save named snapshots of your audit at any point. Useful for tracking before/after remediation visits. Restore any snapshot to compare or recover data.`,
  },
  {
    id: 'M8',
    icon: Settings2,
    title: 'Settings',
    body: `Customise compliance level thresholds and colors (SANS or BS EN presets available). Edit the 7 audit step definitions. Clear all data when starting a fresh site.`,
  },
];

export default function HelpDialog({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-3xl rounded-xl flex flex-col"
        style={{
          background: 'var(--rk-surface)',
          border: '1px solid var(--rk-border)',
          maxHeight: '90vh',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--rk-border)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--rk-text)' }}>User Guide</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--rk-text2)' }}>How to use Rotakin v3</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="w-8 h-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-1" style={{ maxHeight: '70vh' }}>
          {SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={section.id}>
                <div className="flex items-start gap-4 py-4">
                  <div className="shrink-0 flex items-center gap-2.5">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(0,194,255,0.12)', color: 'var(--rk-accent)', border: '1px solid rgba(0,194,255,0.25)' }}
                    >
                      {section.id}
                    </div>
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg"
                      style={{ background: 'var(--rk-surface2)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: 'var(--rk-text2)' }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--rk-text)' }}>
                      {section.id} – {section.title}
                    </h3>
                    <p
                      className="text-xs leading-relaxed whitespace-pre-line"
                      style={{ color: 'var(--rk-text2)' }}
                    >
                      {section.body}
                    </p>
                  </div>
                </div>
                {idx < SECTIONS.length - 1 && (
                  <div className="border-b" style={{ borderColor: 'var(--rk-border)' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
