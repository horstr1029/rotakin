'use client';

import { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ZoomIn } from 'lucide-react';
import type { QueueItem } from '@/lib/types';

interface Props {
  item: QueueItem;
  open: boolean;
  onClose: () => void;
}

interface ZoomState {
  zoom: number;
  tx: number;
  ty: number;
  dragging: boolean;
  startX: number;
  startY: number;
  startTx: number;
  startTy: number;
}

function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState<ZoomState>({
    zoom: 1, tx: 0, ty: 0,
    dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0,
  });

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZ(prev => {
      const next = Math.min(5, Math.max(1, prev.zoom + e.deltaY * -0.001));
      return { ...prev, zoom: next };
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setZ(prev => ({
      ...prev,
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startTx: prev.tx,
      startTy: prev.ty,
    }));
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setZ(prev => {
      if (!prev.dragging) return prev;
      return {
        ...prev,
        tx: prev.startTx + (e.clientX - prev.startX),
        ty: prev.startTy + (e.clientY - prev.startY),
      };
    });
  }, []);

  const onMouseUp = useCallback(() => {
    setZ(prev => ({ ...prev, dragging: false }));
  }, []);

  const reset = useCallback(() => {
    setZ(prev => ({ ...prev, zoom: 1, tx: 0, ty: 0 }));
  }, []);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          overflow: 'hidden',
          height: '400px',
          background: '#000',
          borderRadius: '8px',
          cursor: z.dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: `scale(${z.zoom}) translate(${z.tx / z.zoom}px, ${z.ty / z.zoom}px)`,
            transformOrigin: 'center center',
            transition: z.dragging ? 'none' : 'transform 0.1s ease',
          }}
        />
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={reset}
        className="absolute top-2 right-2 h-7 gap-1.5 text-xs"
        style={{ background: 'rgba(11,15,26,0.8)', borderColor: 'var(--rk-border)' }}
      >
        <ZoomIn className="w-3 h-3" />
        {Math.round(z.zoom * 100)}%
      </Button>
    </div>
  );
}

export default function AnnotationViewer({ item, open, onClose }: Props) {
  const { result, filename, thumbnail } = item;
  const [activeTab, setActiveTab] = useState('annotated');

  const confColor = !result ? 'var(--rk-text3)'
    : result.confidence >= 70 ? 'var(--rk-green)'
    : result.confidence >= 40 ? 'var(--rk-gold)'
    : 'var(--rk-red)';

  const confLabel = !result ? '—'
    : result.confidence >= 70 ? 'Auto-Accept'
    : result.confidence >= 40 ? 'Review'
    : 'Manual';

  function handleOpenChange(v: boolean) {
    if (!v) {
      setActiveTab('annotated');
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-3xl w-full overflow-y-auto"
        style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)', maxHeight: '90vh' }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-3 text-sm font-semibold truncate"
            style={{ color: 'var(--rk-text)' }}
          >
            <span className="truncate">{filename}</span>
            {result && (
              <Badge
                className="shrink-0 text-[11px]"
                style={{ background: confColor + '22', color: confColor, border: `1px solid ${confColor}` }}
              >
                {confLabel} — {result.confidence}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList
                className="rounded-md border h-8"
                style={{ background: 'var(--rk-surface2)', borderColor: 'var(--rk-border)' }}
              >
                <TabsTrigger value="annotated" className="text-xs h-7 px-3">Annotated</TabsTrigger>
                <TabsTrigger value="original" className="text-xs h-7 px-3">Original</TabsTrigger>
              </TabsList>

              <TabsContent value="annotated" className="mt-3">
                {result.annotatedImage ? (
                  <ZoomableImage src={result.annotatedImage} alt="Annotated" />
                ) : (
                  <div className="flex items-center justify-center h-48 rounded-lg" style={{ background: 'var(--rk-surface2)', color: 'var(--rk-text3)' }}>
                    No annotated image available
                  </div>
                )}
              </TabsContent>

              <TabsContent value="original" className="mt-3">
                {thumbnail ? (
                  <ZoomableImage src={thumbnail} alt="Original" />
                ) : (
                  <div className="flex items-center justify-center h-48 rounded-lg" style={{ background: 'var(--rk-surface2)', color: 'var(--rk-text3)' }}>
                    No preview available
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--rk-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--rk-surface2)' }}>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--rk-text3)' }}>
                      Field
                    </th>
                    <th className="text-left px-3 py-2 font-semibold uppercase tracking-wider text-[10px]" style={{ color: 'var(--rk-text3)' }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <DataRow label="Measured %R" value={result.measuredR !== null ? `${result.measuredR}%` : '—'} highlight />
                  <DataRow label="Confidence" value={`${result.confidence}%`} valueColor={confColor} />
                  <DataRow label="Confidence Band" value={confLabel} valueColor={confColor} />
                  <DataRow label="Blur Index (Laplacian)" value={result.blurIndex !== null ? String(result.blurIndex) : '—'} />
                  {result.bbox && (
                    <>
                      <DataRow label="Bounding Box" value={`x:${result.bbox.x} y:${result.bbox.y} w:${result.bbox.width} h:${result.bbox.height}`} />
                      <DataRow label="Frame Size" value={`${result.bbox.frameWidth} × ${result.bbox.frameHeight} px`} />
                    </>
                  )}
                  <DataRow label="Source" value={result.source} />
                  <DataRow label="Processed At" value={new Date(result.processedAt).toLocaleString()} />
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center py-16 rounded-lg"
            style={{ background: 'var(--rk-surface2)', color: 'var(--rk-text3)' }}
          >
            No analysis result available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DataRow({
  label,
  value,
  highlight = false,
  valueColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <tr
      className="border-t"
      style={{ borderColor: 'var(--rk-border)', background: highlight ? 'rgba(0,194,255,0.04)' : undefined }}
    >
      <td className="px-3 py-2" style={{ color: 'var(--rk-text2)' }}>{label}</td>
      <td className="px-3 py-2 font-semibold" style={{ color: valueColor ?? 'var(--rk-text)' }}>
        {value}
      </td>
    </tr>
  );
}
