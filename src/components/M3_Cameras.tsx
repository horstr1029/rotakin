'use client';
import { useState, useRef, useMemo } from 'react';
import { Plus, FileSpreadsheet, Search, Copy, Trash2, Camera as CameraIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { classifyLevel, getCameraHealth } from '@/lib/standards';
import { parseCSV, CSV_TEMPLATE } from '@/lib/csvImport';
import type { Camera } from '@/lib/types';
import { cn } from '@/lib/utils';
import CameraSheet from './CameraSheet';

type SortMode = 'id' | 'zone' | 'level' | 'status';

const HEALTH_COLOR: Record<string, string> = {
  green: 'var(--rk-green)',
  yellow: 'var(--rk-gold)',
  red: 'var(--rk-red)',
};
const HEALTH_LABEL: Record<string, string> = {
  green: 'All steps complete, compliant',
  yellow: 'Pending measurement or incomplete steps',
  red: 'Non-compliant',
};

export default function M3_Cameras() {
  const { state, addCamera, deleteCamera, duplicateCamera, importCameras } = useStore();
  const { cameras, standards, auditStepDefs } = state.audit;

  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('id');
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  // Keep selected camera in sync with store updates
  const liveSelectedCamera = selectedCamera
    ? (cameras.find(c => c.id === selectedCamera.id) ?? null)
    : null;

  const zones = useMemo(() => {
    const z = [...new Set(cameras.map(c => c.zone).filter(Boolean))];
    return z.sort();
  }, [cameras]);

  const displayed = useMemo(() => {
    let result = [...cameras];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        c =>
          c.ref.toLowerCase().includes(q) ||
          c.zone.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q)
      );
    }
    if (filterZone !== 'all') {
      result = result.filter(c => c.zone === filterZone);
    }
    result.sort((a, b) => {
      if (sortMode === 'zone') return (a.zone || '').localeCompare(b.zone || '');
      if (sortMode === 'level') {
        const achA = classifyLevel(a.measuredR, standards);
        const achB = classifyLevel(b.measuredR, standards);
        return (achB?.level ?? -1) - (achA?.level ?? -1);
      }
      if (sortMode === 'status') {
        const statusScore = (c: Camera) => {
          if (!c.measuredR) return 1;
          const ach = classifyLevel(c.measuredR, standards);
          const req = standards.find(s => s.name === c.requiredStandard);
          if (ach && req && ach.level < req.level) return 2;
          return 0;
        };
        return statusScore(a) - statusScore(b);
      }
      return cameras.indexOf(a) - cameras.indexOf(b);
    });
    return result;
  }, [cameras, search, filterZone, sortMode, standards]);

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text, auditStepDefs);
      if (parsed.length > 0) {
        importCameras(parsed);
        alert(`Imported ${parsed.length} camera(s) successfully.`);
      } else {
        alert('No cameras found in CSV. Check the format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rotakin_camera_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function openCamera(camera: Camera) {
    setSelectedCamera(camera);
    setSheetOpen(true);
  }

  function handleAddCamera() {
    addCamera();
    // Open the newly added camera
    setTimeout(() => {
      const newCam = useStore.getState().state.audit.cameras.at(-1);
      if (newCam) openCamera(newCam);
    }, 0);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--rk-text)' }}>Cameras</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--rk-text2)' }}>
          {cameras.length} camera{cameras.length !== 1 ? 's' : ''} in this audit
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--rk-text3)' }} />
          <Input
            className="pl-8 w-52 text-xs h-9"
            placeholder="Search ref, zone, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterZone} onValueChange={(v: string | null) => setFilterZone(v ?? '')}>
          <SelectTrigger className="w-36 text-xs h-9">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map(z => <SelectItem key={z} value={z}>{z}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={v => setSortMode(v as SortMode)}>
          <SelectTrigger className="w-40 text-xs h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="id">Sort: By Order</SelectItem>
            <SelectItem value="zone">Sort: By Zone</SelectItem>
            <SelectItem value="level">Sort: By Level</SelectItem>
            <SelectItem value="status">Sort: By Status</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs h-9">
          CSV Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()} className="gap-1.5 text-xs h-9">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Import CSV
        </Button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCSVImport} />
        <Button size="sm" onClick={handleAddCamera} className="gap-1.5 text-xs h-9" style={{ background: 'var(--rk-accent)', color: '#000' }}>
          <Plus className="w-3.5 h-3.5" /> Add Camera
        </Button>
      </div>

      {/* Table or empty state */}
      {displayed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            {cameras.length === 0 ? (
              <>
                <CameraIcon className="w-12 h-12 mb-4" style={{ color: 'var(--rk-text3)' }} />
                <div className="text-base font-semibold mb-2" style={{ color: 'var(--rk-text)' }}>No cameras yet</div>
                <div className="text-sm mb-6" style={{ color: 'var(--rk-text2)' }}>Add cameras individually or import via CSV</div>
                <div className="flex gap-3">
                  <Button size="sm" onClick={handleAddCamera} className="gap-1.5" style={{ background: 'var(--rk-accent)', color: '#000' }}>
                    <Plus className="w-3.5 h-3.5" /> Add First Camera
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                    Download CSV Template
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-sm" style={{ color: 'var(--rk-text2)' }}>No cameras match your search / filter.</div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--rk-border)' }}>
          <Table>
            <TableHeader>
              <TableRow style={{ background: 'var(--rk-surface2)', borderColor: 'var(--rk-border)' }}>
                <TableHead className="w-6 text-xs py-2.5"></TableHead>
                <TableHead className="text-xs py-2.5" style={{ color: 'var(--rk-text2)' }}>Ref</TableHead>
                <TableHead className="text-xs py-2.5" style={{ color: 'var(--rk-text2)' }}>Make / Model</TableHead>
                <TableHead className="text-xs py-2.5" style={{ color: 'var(--rk-text2)' }}>Zone</TableHead>
                <TableHead className="text-xs py-2.5" style={{ color: 'var(--rk-text2)' }}>Required</TableHead>
                <TableHead className="text-xs py-2.5" style={{ color: 'var(--rk-text2)' }}>Achieved</TableHead>
                <TableHead className="text-xs py-2.5" style={{ color: 'var(--rk-text2)' }}>%R</TableHead>
                <TableHead className="text-xs py-2.5 w-20" style={{ color: 'var(--rk-text2)' }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.map((cam, i) => {
                const health = getCameraHealth(cam, standards);
                const achieved = classifyLevel(cam.measuredR, standards);
                return (
                  <TableRow
                    key={cam.id}
                    className="cursor-pointer transition-colors"
                    onClick={() => openCamera(cam)}
                    style={{
                      background: i % 2 === 1 ? 'var(--rk-surface2)' : 'var(--rk-surface)',
                      borderColor: 'var(--rk-border)',
                    }}
                  >
                    <TableCell className="py-2.5 pl-4 pr-2">
                      <Tooltip>
                        <TooltipTrigger>
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: HEALTH_COLOR[health],
                              boxShadow: `0 0 5px ${HEALTH_COLOR[health]}`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{HEALTH_LABEL[health]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="py-2.5 font-semibold text-sm" style={{ color: 'var(--rk-text)' }}>
                      {cam.ref || <span style={{ color: 'var(--rk-text3)' }}>(no ref)</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-sm" style={{ color: 'var(--rk-text2)' }}>
                      {[cam.make, cam.model].filter(Boolean).join(' ') || <span style={{ color: 'var(--rk-text3)' }}>Unknown</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs" style={{ color: 'var(--rk-text2)' }}>
                      {cam.zone || <span style={{ color: 'var(--rk-text3)' }}>—</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs" style={{ color: 'var(--rk-text2)' }}>
                      {cam.requiredStandard}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {achieved ? (
                        <Badge
                          className="text-[10px] font-semibold"
                          style={{
                            background: achieved.color + '22',
                            color: achieved.color,
                            border: `1px solid ${achieved.color}`,
                          }}
                        >
                          {achieved.name}
                        </Badge>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--rk-text3)' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 font-bold text-sm" style={{ color: cam.measuredR !== null ? 'var(--rk-text)' : 'var(--rk-text3)' }}>
                      {cam.measuredR !== null ? `${cam.measuredR}%` : '—'}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => duplicateCamera(cam.id)}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Duplicate</p></TooltipContent>
                        </Tooltip>
                        <DeleteCameraDialog camera={cam} onDelete={() => deleteCamera(cam.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CameraSheet
        camera={liveSelectedCamera}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function DeleteCameraDialog({ camera, onDelete }: { camera: Camera; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: 'var(--rk-red)' }}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Delete</p></TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--rk-text)' }}>Delete Camera</DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: 'var(--rk-text2)' }}>
          Delete <span className="font-semibold" style={{ color: 'var(--rk-text)' }}>{camera.ref || '(no ref)'}</span>? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => { onDelete(); setOpen(false); }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
