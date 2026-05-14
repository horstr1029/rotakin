'use client';

import { useRef, useState, useCallback } from 'react';
import {
  FolderOpen, Upload, Play, Trash2, ImageIcon, CheckCircle2,
  AlertCircle, Clock, Loader2, HelpCircle, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { parseFilename, isImageFile } from '@/lib/parseFilename';
import { ImagePipeline } from '@/lib/imagePipeline';
import type { QueueItem, QueueStatus, ImageStepType } from '@/lib/types';
import AnnotationViewer from '@/components/AnnotationViewer';
import { toast } from 'sonner';

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<QueueStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'var(--rk-text3)', bg: 'rgba(120,120,140,0.12)', icon: <Clock className="w-3 h-3" /> },
  processing: { label: 'Processing', color: 'var(--rk-accent)', bg: 'rgba(0,194,255,0.12)', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  done: { label: 'Done', color: 'var(--rk-green)', bg: 'rgba(16,217,138,0.12)', icon: <CheckCircle2 className="w-3 h-3" /> },
  review: { label: 'Review', color: 'var(--rk-gold)', bg: 'rgba(240,180,41,0.12)', icon: <AlertCircle className="w-3 h-3" /> },
  error: { label: 'Error', color: 'var(--rk-red)', bg: 'rgba(255,71,87,0.12)', icon: <AlertCircle className="w-3 h-3" /> },
  unassigned: { label: 'Unassigned', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: <HelpCircle className="w-3 h-3" /> },
};

const STEP_LABELS: Record<ImageStepType, string> = {
  static: 'Static Shot', smear: 'Motion Smear', colour: 'Colour Chart',
  face: 'Face Display', extra1: 'Extra 1', extra2: 'Extra 2',
};

const STEP_TYPES: ImageStepType[] = ['static', 'smear', 'colour', 'face', 'extra1', 'extra2'];

// ── Main Component ────────────────────────────────────────────────────────────
export default function M2_ImageImporter() {
  const {
    state,
    imageQueue,
    isProcessingQueue,
    addQueueItems,
    updateQueueItem,
    assignQueueItem,
    removeQueueItem,
    clearQueue,
    setProcessingQueue,
    applyQueueItemToCamera,
  } = useStore();

  const cameras = state.audit.cameras;
  const fileMapRef = useRef<Map<string, File>>(new Map());
  const pipelineRef = useRef<ImagePipeline | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [viewerItem, setViewerItem] = useState<QueueItem | null>(null);

  // ── File ingestion ──────────────────────────────────────────────────────
  const ingestFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(f => isImageFile(f.name));
    if (files.length === 0) {
      toast.error('No supported image files found');
      return;
    }

    const items: QueueItem[] = files.map(f => {
      const { cameraRef, stepType } = parseFilename(f.name);
      const matchedCamera = cameras.find(
        c => c.ref.toUpperCase() === cameraRef?.toUpperCase()
      );
      const status: QueueStatus = matchedCamera ? 'pending' : 'unassigned';
      return {
        id: crypto.randomUUID(),
        filename: f.name,
        fileSize: f.size,
        mimeType: f.type || 'image/jpeg',
        thumbnail: '',
        detectedCameraRef: cameraRef,
        detectedStepType: stepType,
        assignedCameraId: matchedCamera?.id ?? null,
        assignedStepType: stepType,
        status,
        error: null,
        result: null,
      };
    });

    addQueueItems(items);
    items.forEach((item, i) => {
      const file = files[i];
      if (file) fileMapRef.current.set(item.id, file);
    });

    toast.success(`Added ${items.length} image${items.length !== 1 ? 's' : ''} to queue`);
  }, [cameras, addQueueItems]);

  // ── Drag and drop ───────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    // Handle directory drops via items
    if (e.dataTransfer.items) {
      const files: File[] = [];
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry();
          if (entry) entries.push(entry);
        }
      }
      if (entries.length > 0) {
        traverseEntries(entries, files, () => ingestFiles(files));
        return;
      }
    }
    ingestFiles(e.dataTransfer.files);
  };

  function traverseEntries(entries: FileSystemEntry[], files: File[], onDone: () => void) {
    let pending = entries.length;
    if (pending === 0) { onDone(); return; }

    function checkDone() {
      pending--;
      if (pending === 0) onDone();
    }

    for (const entry of entries) {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file(f => { files.push(f); checkDone(); }, checkDone);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        reader.readEntries(subEntries => {
          if (subEntries.length === 0) { checkDone(); return; }
          pending += subEntries.length - 1; // replace this entry with its children
          traverseEntries(Array.from(subEntries), files, () => {
            // each sub-entry calls its own checkDone via traverseEntries
            // but we already adjusted pending, so do nothing here
          });
          // For simplicity, read all sub-entries and call checkDone for each
          subEntries.forEach(sub => {
            if (sub.isFile) {
              (sub as FileSystemFileEntry).file(f => { files.push(f); checkDone(); }, checkDone);
            } else {
              checkDone(); // skip nested dirs for simplicity
            }
          });
        }, checkDone);
      } else {
        checkDone();
      }
    }
  }

  // ── Processing ──────────────────────────────────────────────────────────
  function startProcessing() {
    const toProcess = imageQueue.filter(
      i => i.status === 'pending' || (i.status === 'unassigned' && i.assignedCameraId)
    );
    if (toProcess.length === 0) {
      toast.info('No items ready to process');
      return;
    }

    pipelineRef.current?.terminate();
    setProcessingQueue(true);

    pipelineRef.current = new ImagePipeline(
      (id, fields) => updateQueueItem(id, fields),
      () => {
        setProcessingQueue(false);
        toast.success('Processing complete');
      }
    );

    toProcess.forEach(item => {
      const file = fileMapRef.current.get(item.id);
      if (file) pipelineRef.current!.addFile(item, file);
    });

    pipelineRef.current.start();
  }

  function stopProcessing() {
    pipelineRef.current?.stop();
    setProcessingQueue(false);
  }

  function handleClearQueue() {
    pipelineRef.current?.terminate();
    pipelineRef.current = null;
    setProcessingQueue(false);
    clearQueue();
    fileMapRef.current.clear();
  }

  // ── Progress calculations ────────────────────────────────────────────────
  const processable = imageQueue.filter(i => i.status !== 'unassigned');
  const done = imageQueue.filter(i => ['done', 'review', 'error'].includes(i.status)).length;
  const total = processable.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const unassigned = imageQueue.filter(i => i.status === 'unassigned');

  return (
    <div className="space-y-6">
      {/* ── Drop Zone ────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
        style={{
          borderColor: dragActive ? 'var(--rk-accent)' : 'var(--rk-border2)',
          background: dragActive ? 'rgba(0,194,255,0.05)' : 'var(--rk-surface)',
          minHeight: '160px',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => folderInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors"
            style={{
              background: dragActive ? 'rgba(0,194,255,0.15)' : 'rgba(167,139,250,0.08)',
              border: `1px solid ${dragActive ? 'var(--rk-accent)' : 'rgba(167,139,250,0.2)'}`,
            }}
          >
            <FolderOpen className="w-7 h-7" style={{ color: dragActive ? 'var(--rk-accent)' : 'var(--rk-purple)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: 'var(--rk-text)' }}>
              Drop a folder or images here
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--rk-text3)' }}>
              Supports JPG, PNG, BMP, TIFF, WebP — folders with sub-folders
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={e => { e.stopPropagation(); folderInputRef.current?.click(); }}
            >
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              Select Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Select Files
            </Button>
          </div>
        </div>

        <input
          ref={folderInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is non-standard
          webkitdirectory=""
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files) ingestFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files) ingestFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      {imageQueue.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: 'var(--rk-text2)' }}>
              {imageQueue.length} image{imageQueue.length !== 1 ? 's' : ''}
              {unassigned.length > 0 && (
                <span style={{ color: '#f97316' }}> · {unassigned.length} unassigned</span>
              )}
            </span>
          </div>
          <div className="flex gap-2">
            {isProcessingQueue ? (
              <Button size="sm" variant="outline" onClick={stopProcessing} className="text-xs">
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Stop
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={startProcessing}
                disabled={processable.length === 0}
                className="text-xs"
                style={{ background: 'var(--rk-accent)', color: '#000' }}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Process All
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleClearQueue} className="text-xs" style={{ color: 'var(--rk-red)', borderColor: 'var(--rk-red)' }}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear Queue
            </Button>
          </div>
        </div>
      )}

      {/* ── Progress bar ─────────────────────────────────────────── */}
      {isProcessingQueue && total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs" style={{ color: 'var(--rk-text3)' }}>
            <span>Processing images…</span>
            <span>{done} / {total} ({pct}%)</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      {/* ── Queue Grid ───────────────────────────────────────────── */}
      {imageQueue.filter(i => i.status !== 'unassigned').length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {imageQueue
            .filter(i => i.status !== 'unassigned')
            .map(item => (
              <ImageQueueCard
                key={item.id}
                item={item}
                cameras={cameras}
                onRemove={() => { removeQueueItem(item.id); fileMapRef.current.delete(item.id); }}
                onAssign={(cameraId, stepType) => assignQueueItem(item.id, cameraId, stepType)}
                onApply={() => applyQueueItemToCamera(item.id)}
                onView={() => setViewerItem(item)}
              />
            ))}
        </div>
      )}

      {/* ── Unassigned Tray ──────────────────────────────────────── */}
      {unassigned.length > 0 && (
        <Card style={{ border: '1px solid #f97316', background: 'rgba(249,115,22,0.04)' }}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2" style={{ color: '#f97316' }}>
              <HelpCircle className="w-4 h-4" />
              Unassigned Images ({unassigned.length})
            </CardTitle>
            <p className="text-xs" style={{ color: 'var(--rk-text3)' }}>
              These images could not be matched to a camera. Assign them below.
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {unassigned.map(item => (
              <UnassignedRow
                key={item.id}
                item={item}
                cameras={cameras}
                onAssign={(cameraId, stepType) => assignQueueItem(item.id, cameraId, stepType)}
                onRemove={() => { removeQueueItem(item.id); fileMapRef.current.delete(item.id); }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {imageQueue.length === 0 && (
        <div className="text-center py-6" style={{ color: 'var(--rk-text3)' }}>
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Drop images or a folder above to get started</p>
          <p className="text-xs mt-1">
            Files named like <code className="px-1 rounded" style={{ background: 'var(--rk-surface2)' }}>CAM-01_static.jpg</code> are matched automatically
          </p>
        </div>
      )}

      {/* ── Annotation Viewer Dialog ─────────────────────────────── */}
      {viewerItem && (
        <AnnotationViewer
          item={viewerItem}
          open={!!viewerItem}
          onClose={() => setViewerItem(null)}
        />
      )}
    </div>
  );
}

// ── Image Queue Card ──────────────────────────────────────────────────────────
interface CardProps {
  item: QueueItem;
  cameras: import('@/lib/types').Camera[];
  onRemove: () => void;
  onAssign: (cameraId: string, stepType: ImageStepType) => void;
  onApply: () => void;
  onView: () => void;
}

function ImageQueueCard({ item, cameras, onRemove, onAssign, onApply, onView }: CardProps) {
  const cfg = STATUS_CONFIG[item.status];
  const canView = (item.status === 'done' || item.status === 'review') && item.result;
  const canApply = canView && !!item.assignedCameraId;

  return (
    <Card
      className="overflow-hidden flex flex-col"
      style={{ border: '1px solid var(--rk-border)', background: 'var(--rk-surface)' }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full bg-black flex items-center justify-center overflow-hidden"
        style={{ height: '100px' }}
      >
        {item.thumbnail ? (
          <img
            src={item.status === 'done' || item.status === 'review'
              ? (item.result?.annotatedImage || item.thumbnail)
              : item.thumbnail}
            alt={item.filename}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-1" style={{ color: 'var(--rk-text3)' }}>
            {item.status === 'processing' ? (
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--rk-accent)' }} />
            ) : (
              <ImageIcon className="w-6 h-6 opacity-30" />
            )}
          </div>
        )}
        {/* Status badge */}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      <CardContent className="p-2 flex flex-col gap-1.5 flex-1">
        {/* Filename */}
        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--rk-text)' }} title={item.filename}>
          {item.filename}
        </p>

        {/* Camera + step badges */}
        <div className="flex flex-wrap gap-1">
          {item.assignedCameraId && (
            <Badge
              className="text-[9px] px-1.5 py-0"
              style={{ background: 'rgba(167,139,250,0.12)', color: 'var(--rk-purple)', border: '1px solid rgba(167,139,250,0.25)' }}
            >
              {cameras.find(c => c.id === item.assignedCameraId)?.ref ?? '?'}
            </Badge>
          )}
          {item.assignedStepType && (
            <Badge
              className="text-[9px] px-1.5 py-0"
              style={{ background: 'rgba(0,194,255,0.1)', color: 'var(--rk-accent)', border: '1px solid rgba(0,194,255,0.2)' }}
            >
              {STEP_LABELS[item.assignedStepType]}
            </Badge>
          )}
        </div>

        {/* Result: %R + confidence */}
        {item.result && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span style={{ color: 'var(--rk-text2)' }}>
                %R: <strong style={{ color: 'var(--rk-text)' }}>
                  {item.result.measuredR !== null ? `${item.result.measuredR}%` : '—'}
                </strong>
              </span>
              <span style={{ color: 'var(--rk-text2)' }}>
                Conf: <strong style={{
                  color: item.result.confidence >= 70 ? 'var(--rk-green)'
                    : item.result.confidence >= 40 ? 'var(--rk-gold)' : 'var(--rk-red)',
                }}>
                  {item.result.confidence}%
                </strong>
              </span>
            </div>
            {/* Confidence bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--rk-surface2)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.result.confidence}%`,
                  background: item.result.confidence >= 70 ? 'var(--rk-green)'
                    : item.result.confidence >= 40 ? 'var(--rk-gold)' : 'var(--rk-red)',
                }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {item.error && (
          <p className="text-[10px]" style={{ color: 'var(--rk-red)' }} title={item.error}>
            {item.error.slice(0, 60)}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-1 mt-auto pt-1">
          {canView && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-[10px] h-6 px-1"
              onClick={onView}
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
          )}
          {canApply && (
            <Button
              size="sm"
              className="flex-1 text-[10px] h-6 px-1"
              style={{ background: 'var(--rk-green)', color: '#000' }}
              onClick={onApply}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Apply
            </Button>
          )}
          {!canView && !canApply && (
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] h-6 px-1 ml-auto"
              style={{ color: 'var(--rk-red)' }}
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </div>

        {/* Assign dropdowns (for pending items without full assignment) */}
        {(item.status === 'pending' || item.status === 'review') && !item.assignedCameraId && (
          <AssignDropdowns
            item={item}
            cameras={cameras}
            onAssign={onAssign}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Unassigned Row ────────────────────────────────────────────────────────────
function UnassignedRow({
  item,
  cameras,
  onAssign,
  onRemove,
}: {
  item: QueueItem;
  cameras: import('@/lib/types').Camera[];
  onAssign: (cameraId: string, stepType: ImageStepType) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg"
      style={{ background: 'var(--rk-surface)', border: '1px solid var(--rk-border)' }}
    >
      <div className="text-[11px] flex-1 truncate" style={{ color: 'var(--rk-text2)' }}>
        {item.filename}
        {item.detectedCameraRef && (
          <span className="ml-1.5 text-[10px]" style={{ color: 'var(--rk-text3)' }}>
            (detected: {item.detectedCameraRef})
          </span>
        )}
      </div>
      <AssignDropdowns item={item} cameras={cameras} onAssign={onAssign} />
      <Button size="sm" variant="ghost" className="text-[10px] h-6 shrink-0" style={{ color: 'var(--rk-red)' }} onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

// ── Assign Dropdowns ──────────────────────────────────────────────────────────
function AssignDropdowns({
  item,
  cameras,
  onAssign,
}: {
  item: QueueItem;
  cameras: import('@/lib/types').Camera[];
  onAssign: (cameraId: string, stepType: ImageStepType) => void;
}) {
  const [selectedCamera, setSelectedCamera] = useState(item.assignedCameraId ?? '');
  const [selectedStep, setSelectedStep] = useState<ImageStepType | ''>(item.assignedStepType ?? '');

  function tryAssign(cameraId: string, stepType: ImageStepType | '') {
    if (cameraId && stepType) {
      onAssign(cameraId, stepType as ImageStepType);
    }
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      <Select
        value={selectedCamera}
        onValueChange={v => {
          if (v) { setSelectedCamera(v); tryAssign(v, selectedStep); }
        }}
      >
        <SelectTrigger className="h-6 text-[10px] w-28">
          <SelectValue placeholder="Camera" />
        </SelectTrigger>
        <SelectContent>
          {cameras.map(c => (
            <SelectItem key={c.id} value={c.id} className="text-xs">
              {c.ref || `(no ref) ${c.id.slice(0, 6)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedStep}
        onValueChange={v => {
          if (v) { setSelectedStep(v as ImageStepType); tryAssign(selectedCamera, v as ImageStepType); }
        }}
      >
        <SelectTrigger className="h-6 text-[10px] w-28">
          <SelectValue placeholder="Step" />
        </SelectTrigger>
        <SelectContent>
          {STEP_TYPES.map(s => (
            <SelectItem key={s} value={s} className="text-xs">
              {STEP_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
