'use client';

import { useState, useEffect } from 'react';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import { loadHistorySnapshots } from '@/lib/storage';
import type { HistorySnapshot } from '@/lib/types';
import { toast } from 'sonner';

export default function M7_History() {
  const { state, saveSnapshot, deleteSnapshot, restoreSnapshot } = useStore();
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [label, setLabel] = useState('Pre-remediation visit');
  const [saving, setSaving] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<HistorySnapshot | null>(null);

  async function loadSnapshots() {
    const list = await loadHistorySnapshots(state.audit.id);
    setSnapshots(list);
  }

  useEffect(() => {
    loadSnapshots();
  }, [state.audit.id]);

  async function handleSave() {
    if (!label.trim()) {
      toast.error('Enter a label for the snapshot');
      return;
    }
    setSaving(true);
    try {
      await saveSnapshot(label.trim());
      await loadSnapshots();
      toast.success('Snapshot saved');
    } catch {
      toast.error('Failed to save snapshot');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteSnapshot(id);
    setSnapshots(prev => prev.filter(s => s.id !== id));
    toast.success('Snapshot deleted');
  }

  function handleRestore(snap: HistorySnapshot) {
    restoreSnapshot(snap);
    setConfirmRestore(null);
    toast.success(`Restored: ${snap.label}`);
  }

  function rateColor(rate: number): string {
    if (rate >= 80) return 'var(--rk-green)';
    if (rate >= 50) return 'var(--rk-gold)';
    return 'var(--rk-red)';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold mb-1">Audit History</h2>
          <p className="text-sm" style={{ color: 'var(--rk-text2)' }}>
            Save timestamped snapshots of the current audit state for comparison and post-remediation tracking.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 flex items-center gap-3">
          <Input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Snapshot label…"
            className="flex-1 text-sm"
          />
          <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
            <Clock className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Snapshot'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {snapshots.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl gap-3"
          style={{ background: 'var(--rk-surface)', border: '1px solid var(--rk-border)' }}
        >
          <Clock className="w-10 h-10" style={{ color: 'var(--rk-text3)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--rk-text2)' }}>No snapshots yet</p>
          <p className="text-xs" style={{ color: 'var(--rk-text3)' }}>
            Save a snapshot before making changes to capture the current state.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {snapshots.map(snap => (
            <Card key={snap.id} style={{ border: '1px solid var(--rk-border)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--rk-text3)' }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{snap.label}</span>
                        <Badge
                          className="text-xs shrink-0"
                          style={{
                            background: rateColor(snap.complianceRate) + '22',
                            color: rateColor(snap.complianceRate),
                            border: `1px solid ${rateColor(snap.complianceRate)}44`,
                          }}
                        >
                          {snap.complianceRate}% compliant
                        </Badge>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--rk-text3)' }}>
                        {new Date(snap.savedAt).toLocaleString()} · {snap.cameraCount} camera{snap.cameraCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-7"
                      onClick={() => setConfirmRestore(snap)}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(snap.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--rk-red)' }} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={confirmRestore !== null} onOpenChange={v => { if (!v) setConfirmRestore(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore snapshot?</DialogTitle>
            <DialogDescription>
              This will replace the current audit state with &ldquo;{confirmRestore?.label}&rdquo; saved on{' '}
              {confirmRestore ? new Date(confirmRestore.savedAt).toLocaleString() : ''}. Unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>Cancel</Button>
            <Button onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
