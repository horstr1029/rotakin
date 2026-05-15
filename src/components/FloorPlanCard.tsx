'use client';
import { useRef, useState } from 'react';
import { MapPin, Upload, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStore } from '@/lib/store';
import { classifyLevel } from '@/lib/standards';
import type { Camera } from '@/lib/types';

interface Props {
  floorPlan: string;
  cameras: Camera[];
  onUploadFloorPlan: (dataUrl: string) => void;
  onPinCamera: (cameraId: string, x: number, y: number) => void;
}

export default function FloorPlanCard({ floorPlan, cameras, onUploadFloorPlan, onPinCamera }: Props) {
  const { state } = useStore();
  const { standards } = state.audit;
  const fileRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const url = ev.target?.result as string;
      if (url) onUploadFloorPlan(url);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleClear() {
    if (!window.confirm('Remove the floor plan image? Existing camera pins will remain stored.')) return;
    onUploadFloorPlan('');
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!selectedCameraId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onPinCamera(selectedCameraId, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  }

  const placed = cameras.filter(c => typeof c.pinX === 'number' && typeof c.pinY === 'number');
  const unplaced = cameras.filter(c => typeof c.pinX !== 'number' || typeof c.pinY !== 'number');

  function colorFor(cam: Camera): string {
    const ach = classifyLevel(cam.measuredR, standards);
    return ach ? ach.color : 'var(--rk-text3)';
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--rk-accent)' }}>
            <MapPin className="w-4 h-4" />
            Floor Plan
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5 text-xs">
              <Upload className="w-3.5 h-3.5" />
              {floorPlan ? 'Replace Image' : 'Upload Image'}
            </Button>
            {floorPlan && (
              <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-xs" style={{ color: 'var(--rk-red)' }}>
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!floorPlan ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center min-h-[240px] rounded-lg cursor-pointer border-2 border-dashed transition-colors"
            style={{ borderColor: 'var(--rk-border2)', background: 'var(--rk-surface2)' }}
          >
            <MapPin className="w-10 h-10 mb-3" style={{ color: 'var(--rk-text3)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--rk-text)' }}>Upload a floor plan</p>
            <p className="text-xs" style={{ color: 'var(--rk-text2)' }}>PNG / JPG of the site layout. Camera pins will be placed by clicking.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={containerRef}
              onClick={handleClick}
              className="relative w-full overflow-hidden rounded-lg border"
              style={{
                borderColor: 'var(--rk-border)',
                background: 'var(--rk-surface2)',
                cursor: selectedCameraId ? 'crosshair' : 'default',
              }}
            >
              <img
                src={floorPlan}
                alt="Floor plan"
                className="block w-full h-auto select-none pointer-events-none"
                draggable={false}
              />
              {placed.map(cam => (
                <div
                  key={cam.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${cam.pinX}%`, top: `${cam.pinY}%` }}
                  title={cam.ref || '(no ref)'}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: colorFor(cam),
                      border: '2px solid #fff',
                      boxShadow: `0 0 0 1px ${colorFor(cam)}, 0 0 6px rgba(0,0,0,0.4)`,
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      top: '100%',
                    }}
                  >
                    {cam.ref || '—'}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-64">
                <Select value={selectedCameraId} onValueChange={(v: string | null) => setSelectedCameraId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera to pin…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.length === 0 && (
                      <SelectItem value="__none__" disabled>No cameras yet</SelectItem>
                    )}
                    {cameras.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.ref || '(no ref)'}{c.zone ? ` — ${c.zone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedCameraId && (
                <p className="text-xs" style={{ color: 'var(--rk-text2)' }}>
                  Click on the floor plan to place this camera.
                </p>
              )}
            </div>

            {unplaced.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>
                  Unplaced ({unplaced.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unplaced.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCameraId(c.id)}
                      className="px-2 py-1 rounded text-xs border transition-colors"
                      style={{
                        background: selectedCameraId === c.id ? 'rgba(0,194,255,0.12)' : 'var(--rk-surface2)',
                        borderColor: selectedCameraId === c.id ? 'var(--rk-accent)' : 'var(--rk-border)',
                        color: selectedCameraId === c.id ? 'var(--rk-accent)' : 'var(--rk-text2)',
                      }}
                    >
                      {c.ref || '(no ref)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
