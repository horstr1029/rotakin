'use client';
import { FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function M2_Placeholder() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="text-center p-12 max-w-md w-full">
        <CardContent className="pt-0 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <FolderOpen className="w-8 h-8" style={{ color: 'var(--rk-purple)' }} />
          </div>
          <Badge variant="secondary" className="text-xs font-mono" style={{ color: 'var(--rk-purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
            Phase 2
          </Badge>
          <div>
            <h2 className="text-lg font-semibold mb-2">Image Importer</h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--rk-text2)' }}>
              Drag-and-drop folder ingestion with automatic Rotakin figure detection, %R measurement, and confidence scoring — coming in Phase 2.
            </p>
          </div>
          <div className="w-full rounded-lg p-4 text-left space-y-2" style={{ background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)' }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>What&apos;s coming</p>
            {['Folder drag-and-drop with batch queue', 'Canvas-based Rotakin target detection', 'Automatic %R measurement', 'WebWorker parallel processing', 'Confidence scoring & flagging'].map(f => (
              <p key={f} className="text-xs flex items-center gap-2" style={{ color: 'var(--rk-text2)' }}>
                <span style={{ color: 'var(--rk-purple)' }}>›</span> {f}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
