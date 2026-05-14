'use client';
import { useState } from 'react';
import { Plus, RotateCcw, Trash2, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import type { Standard, StepDef } from '@/lib/types';
import { DEFAULT_STANDARDS, BS_EN_STANDARDS, DEFAULT_STEP_DEFS } from '@/lib/standards';
import { clearAuditDB, clearHistoryDB } from '@/lib/storage';
import { toast } from 'sonner';

export default function M8_Settings() {
  const { state, updateStandards, updateStepDefs, newAudit } = useStore();
  const { standards, auditStepDefs } = state.audit;

  // — Standards editing —
  const [editingStdId, setEditingStdId] = useState<number | null>(null);
  const [editStdBuf, setEditStdBuf] = useState<Partial<Standard>>({});

  function startEditStd(s: Standard) { setEditingStdId(s.level); setEditStdBuf({ ...s }); }
  function saveStd() {
    updateStandards(standards.map(s => s.level === editingStdId ? { ...s, ...editStdBuf, minR: Number(editStdBuf.minR) } : s));
    setEditingStdId(null);
    toast.success('Standard updated');
  }
  function deleteStd(level: number) {
    updateStandards(standards.filter(s => s.level !== level));
    toast.success('Standard removed');
  }
  function addStd() {
    const maxLevel = Math.max(0, ...standards.map(s => s.level));
    const newStd: Standard = { level: maxLevel + 1, name: 'New Level', minR: 0, color: '#ffffff' };
    updateStandards([...standards, newStd]);
    startEditStd(newStd);
  }

  // — Step defs editing —
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editStepBuf, setEditStepBuf] = useState<Partial<StepDef>>({});

  function startEditStep(s: StepDef) { setEditingStepId(s.id); setEditStepBuf({ ...s }); }
  function saveStep() {
    updateStepDefs(auditStepDefs.map(s => s.id === editingStepId ? { ...s, ...editStepBuf } : s));
    setEditingStepId(null);
    toast.success('Step updated');
  }
  function moveStep(id: number, dir: -1 | 1) {
    const arr = [...auditStepDefs];
    const idx = arr.findIndex(s => s.id === id);
    const next = idx + dir;
    if (next < 0 || next >= arr.length) return;
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    updateStepDefs(arr);
  }

  // — Clear data —
  async function clearAll() {
    await clearAuditDB();
    await clearHistoryDB();
    newAudit();
    toast.success('All data cleared');
  }

  return (
    <div className="space-y-6">
      {/* Standards Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-sm font-medium">SANS Standards</CardTitle>
              <CardDescription className="text-xs mt-1">Configure %R thresholds for each compliance level.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { updateStandards(DEFAULT_STANDARDS); toast.success('Reset to SANS defaults'); }}>
                <RotateCcw className="w-3 h-3" /> SANS
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { updateStandards(BS_EN_STANDARDS); toast.success('Reset to BS EN defaults'); }}>
                <RotateCcw className="w-3 h-3" /> BS EN
              </Button>
              <Button size="sm" className="gap-1.5 text-xs" onClick={addStd}>
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Min %R</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...standards].sort((a, b) => b.level - a.level).map(s => (
                <TableRow key={s.level}>
                  <TableCell className="font-mono text-sm">{s.level}</TableCell>
                  <TableCell>
                    {editingStdId === s.level
                      ? <Input value={editStdBuf.name ?? ''} onChange={e => setEditStdBuf(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs w-32" />
                      : <span className="text-sm font-medium">{s.name}</span>}
                  </TableCell>
                  <TableCell>
                    {editingStdId === s.level
                      ? <Input type="number" value={editStdBuf.minR ?? ''} onChange={e => setEditStdBuf(p => ({ ...p, minR: Number(e.target.value) }))} className="h-7 text-xs w-20" />
                      : <span className="font-mono text-sm">{s.minR}%</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full border border-white/10" style={{ background: s.color }} />
                      {editingStdId === s.level && (
                        <Input type="color" value={editStdBuf.color ?? s.color} onChange={e => setEditStdBuf(p => ({ ...p, color: e.target.value }))} className="h-7 w-14 p-0.5 cursor-pointer" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingStdId === s.level ? (
                        <>
                          <Button size="sm" className="h-7 text-xs px-2" onClick={saveStd}>Save</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingStdId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => startEditStd(s)}>Edit</Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStd(s.level)}>
                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--rk-red)' }} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Step Definitions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Audit Step Definitions</CardTitle>
          <CardDescription className="text-xs">The 7-step Rotakin audit procedure shown on each camera card.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditStepDefs.map((s, idx) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm text-center">{s.id}</TableCell>
                  <TableCell>
                    {editingStepId === s.id
                      ? <Input value={editStepBuf.name ?? ''} onChange={e => setEditStepBuf(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs w-36" />
                      : <span className="text-sm font-medium">{s.name}</span>}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {editingStepId === s.id
                      ? <Input value={editStepBuf.desc ?? ''} onChange={e => setEditStepBuf(p => ({ ...p, desc: e.target.value }))} className="h-7 text-xs" />
                      : <span className="text-xs" style={{ color: 'var(--rk-text2)' }}>{s.desc}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(s.id, -1)} disabled={idx === 0}>
                        <ChevronUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(s.id, 1)} disabled={idx === auditStepDefs.length - 1}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                      {editingStepId === s.id ? (
                        <>
                          <Button size="sm" className="h-7 text-xs px-2" onClick={saveStep}>Save</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setEditingStepId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => startEditStep(s)}>Edit</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="px-4 pb-4 pt-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { updateStepDefs(DEFAULT_STEP_DEFS); toast.success('Steps reset to defaults'); }}>
            <RotateCcw className="w-3 h-3" /> Reset to Defaults
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card style={{ borderColor: 'rgba(255,71,87,0.25)' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--rk-red)' }}>
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear all audit data</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--rk-text2)' }}>Permanently deletes all cameras, site info, and images from this browser. Cannot be undone.</p>
            </div>
            <Dialog>
              <DialogTrigger>
                <Button variant="destructive" size="sm">Clear All Data</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear all audit data?</DialogTitle>
                  <DialogDescription>This permanently deletes all cameras, site info, images, and settings stored in this browser. Export a JSON backup first if you want to keep the data.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Cancel</Button>
                  <Button variant="destructive" onClick={clearAll}>Yes, clear everything</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
