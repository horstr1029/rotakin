'use client';
import { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/lib/store';
import type { Camera, ImageSlot, FaceLine } from '@/lib/types';
import { classifyLevel } from '@/lib/standards';
import { cn } from '@/lib/utils';
import AnnotationViewer from '@/components/AnnotationViewer';
import type { QueueItem } from '@/lib/types';

type ImageSlotKey = keyof Camera['images'];

const IMAGE_SLOTS: { key: ImageSlotKey; label: string }[] = [
  { key: 'static', label: 'Static Shot' },
  { key: 'smear', label: 'Motion Smear' },
  { key: 'colour', label: 'Colour Chart' },
  { key: 'face', label: 'Face Display' },
  { key: 'extra1', label: 'Extra 1' },
  { key: 'extra2', label: 'Extra 2' },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </Label>
  );
}

interface Props {
  camera: Camera | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CameraSheet({ camera, open, onOpenChange }: Props) {
  const { state, updateCamera, updateCameraImage, updateAuditStep, updateFaceLine } = useStore();
  const { standards, auditStepDefs } = state.audit;

  const [annotationViewerItem, setAnnotationViewerItem] = useState<QueueItem | null>(null);

  if (!camera) return null;

  // Find the best analysis result across all image slots
  const autoAnalysis = Object.values(camera.images)
    .map(slot => slot?.analysisResult)
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  const achieved = classifyLevel(camera.measuredR, standards);
  const required = standards.find(s => s.name === camera.requiredStandard);
  const isCompliant = achieved && required ? achieved.level >= required.level : null;
  const maxR = Math.max(...standards.map(s => s.minR), 120);
  const gaugeValue = camera.measuredR !== null
    ? Math.min(100, Math.round((camera.measuredR / maxR) * 100))
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto p-0 rk-sheet-full"
        style={{ background: 'var(--rk-surface)', borderColor: 'var(--rk-border)' }}
      >
        <SheetHeader className="px-6 py-4 border-b" style={{ borderColor: 'var(--rk-border)' }}>
          <SheetTitle className="flex items-center gap-3" style={{ color: 'var(--rk-text)' }}>
            <span className="font-bold">{camera.ref || '(no ref)'}</span>
            {camera.make || camera.model ? (
              <span className="font-normal text-sm" style={{ color: 'var(--rk-text2)' }}>
                {[camera.make, camera.model].filter(Boolean).join(' ')}
              </span>
            ) : null}
            {achieved && (
              <Badge
                style={{
                  background: achieved.color + '22',
                  color: achieved.color,
                  border: `1px solid ${achieved.color}`,
                }}
              >
                {achieved.name}
              </Badge>
            )}
            {isCompliant === true && <Badge style={{ background: 'rgba(16,217,138,0.15)', color: 'var(--rk-green)', border: '1px solid var(--rk-green)' }}>Compliant</Badge>}
            {isCompliant === false && <Badge style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--rk-red)', border: '1px solid var(--rk-red)' }}>Non-Compliant</Badge>}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex flex-col">
          <TabsList
            className="grid grid-cols-4 rounded-none border-b h-auto"
            style={{ background: 'var(--rk-surface2)', borderColor: 'var(--rk-border)' }}
          >
            <TabsTrigger value="details" className="text-xs py-3 rounded-none">Details</TabsTrigger>
            <TabsTrigger value="images" className="text-xs py-3 rounded-none">Images</TabsTrigger>
            <TabsTrigger value="steps" className="text-xs py-3 rounded-none">Audit Steps</TabsTrigger>
            <TabsTrigger value="facial" className="text-xs py-3 rounded-none">Facial Scoring</TabsTrigger>
          </TabsList>

          {/* ── DETAILS TAB ── */}
          <TabsContent value="details" className="p-6 space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-4">
              {([
                { field: 'ref', label: 'Camera Ref' },
                { field: 'make', label: 'Make' },
                { field: 'model', label: 'Model' },
                { field: 'lens', label: 'Lens' },
                { field: 'zone', label: 'Zone' },
                { field: 'resolution', label: 'Resolution' },
                { field: 'location', label: 'Location' },
                { field: 'purpose', label: 'Purpose' },
              ] as { field: keyof Camera; label: string }[]).map(({ field, label }) => (
                <div key={field as string} className="space-y-1.5">
                  <FieldLabel>{label}</FieldLabel>
                  <Input
                    value={camera[field] as string}
                    onChange={e => updateCamera(camera.id, { [field]: e.target.value })}
                    placeholder={label}
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <FieldLabel>Required Standard</FieldLabel>
                <Select
                  value={camera.requiredStandard}
                  onValueChange={(v: string | null) => v && updateCamera(camera.id, { requiredStandard: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {standards.map(s => (
                      <SelectItem key={s.level} value={s.name}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FieldLabel>Measured %R</FieldLabel>
                  {autoAnalysis && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Badge
                              className="text-[9px] px-1.5 py-0 cursor-help"
                              style={{ background: 'rgba(0,194,255,0.12)', color: 'var(--rk-accent)', border: '1px solid rgba(0,194,255,0.3)' }}
                            >
                              Auto {autoAnalysis.confidence}%
                            </Badge>
                          }
                        />
                        <TooltipContent side="top" className="text-xs max-w-[200px]">
                          Auto-populated from canvas image analysis. Confidence: {autoAnalysis.confidence}%. Source: {autoAnalysis.source}.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={camera.measuredR ?? ''}
                  onChange={e => {
                    const v = e.target.value;
                    updateCamera(camera.id, { measuredR: v === '' ? null : parseFloat(v) });
                  }}
                  placeholder="e.g. 65"
                />
              </div>

              {([
                { field: 'mountingHeight', label: 'Mounting Height' },
                { field: 'targetDistance', label: 'Target Distance' },
                { field: 'lighting', label: 'Lighting' },
              ] as { field: keyof Camera; label: string }[]).map(({ field, label }) => (
                <div key={field as string} className="space-y-1.5">
                  <FieldLabel>{label}</FieldLabel>
                  <Input
                    value={camera[field] as string}
                    onChange={e => updateCamera(camera.id, { [field]: e.target.value })}
                    placeholder={label}
                  />
                </div>
              ))}

              <div className="col-span-2 space-y-1.5">
                <FieldLabel>Notes</FieldLabel>
                <Textarea
                  value={camera.notes}
                  onChange={e => updateCamera(camera.id, { notes: e.target.value })}
                  placeholder="Notes..."
                  className="min-h-[70px] resize-y"
                />
              </div>
            </div>

            {/* Level result */}
            <div className="rounded-lg p-4 space-y-3" style={{ background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)' }}>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span style={{ color: 'var(--rk-text2)' }}>Achieved: </span>
                  <span className="font-bold" style={{ color: achieved ? achieved.color : 'var(--rk-text3)' }}>
                    {achieved ? achieved.name : 'Not measured'}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--rk-text2)' }}>Required: </span>
                  <span className="font-semibold" style={{ color: 'var(--rk-text)' }}>{camera.requiredStandard}</span>
                </div>
                <div>
                  {isCompliant === true && <span className="font-bold text-xs" style={{ color: 'var(--rk-green)' }}>COMPLIANT</span>}
                  {isCompliant === false && <span className="font-bold text-xs" style={{ color: 'var(--rk-red)' }}>NON-COMPLIANT</span>}
                  {isCompliant === null && <span className="font-bold text-xs" style={{ color: 'var(--rk-gold)' }}>PENDING</span>}
                </div>
              </div>
              <Progress value={gaugeValue} className="h-2" />
              <div className="flex justify-between text-xs" style={{ color: 'var(--rk-text3)' }}>
                <span>0%R</span>
                <span style={{ color: 'var(--rk-text2)' }}>
                  {camera.measuredR !== null ? `${camera.measuredR}%R` : '—'}
                </span>
                <span>{maxR}%R</span>
              </div>
            </div>
          </TabsContent>

          {/* ── IMAGES TAB ── */}
          <TabsContent value="images" className="p-6 mt-0">
            <div className="grid grid-cols-3 gap-3">
              {IMAGE_SLOTS.map(slot => (
                <ImageSlotCard
                  key={slot.key}
                  slotKey={slot.key}
                  label={slot.label}
                  image={camera.images[slot.key]}
                  onUpload={(img) => updateCameraImage(camera.id, slot.key, img)}
                  onRemove={() => updateCameraImage(camera.id, slot.key, null)}
                  onViewAnalysis={(item) => setAnnotationViewerItem(item)}
                />
              ))}
            </div>
          </TabsContent>

          {/* ── AUDIT STEPS TAB ── */}
          <TabsContent value="steps" className="p-6 space-y-3 mt-0">
            {auditStepDefs.map(def => {
              const step = camera.auditSteps.find(s => s.stepId === def.id);
              if (!step) return null;
              return (
                <div
                  key={def.id}
                  className="rounded-lg p-4 space-y-3"
                  style={{ background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--rk-text)' }}>
                        <span className="mr-2 font-normal text-xs" style={{ color: 'var(--rk-text3)' }}>#{def.id}</span>
                        {def.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--rk-text2)' }}>{def.desc}</div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {(['pass', 'fail', 'na'] as const).map(v => {
                        const isSelected = v === 'pass' ? step.passed === true : v === 'fail' ? step.passed === false : step.passed === null && step.result !== '';
                        const colorMap = { pass: 'var(--rk-green)', fail: 'var(--rk-red)', na: 'var(--rk-text3)' };
                        const color = colorMap[v];
                        return (
                          <Button
                            key={v}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newPassed = v === 'pass' ? true : v === 'fail' ? false : null;
                              updateAuditStep(camera.id, def.id, { passed: newPassed });
                            }}
                            className="text-[10px] h-7 px-2 font-bold"
                            style={{
                              background: isSelected ? color + '22' : undefined,
                              borderColor: isSelected ? color : undefined,
                              color: isSelected ? color : undefined,
                            }}
                          >
                            {v.toUpperCase()}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Result</FieldLabel>
                    <Textarea
                      value={step.result}
                      onChange={e => updateAuditStep(camera.id, def.id, { result: e.target.value })}
                      placeholder="Enter result..."
                      className="mt-1.5 min-h-[60px] resize-y text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ── FACIAL SCORING TAB ── */}
          <TabsContent value="facial" className="p-6 mt-0">
            <FacialScoringPanel camera={camera} onUpdateLine={(lineNo, fields) => updateFaceLine(camera.id, lineNo, fields)} />
          </TabsContent>
        </Tabs>
      </SheetContent>

      {annotationViewerItem && (
        <AnnotationViewer
          item={annotationViewerItem}
          open={!!annotationViewerItem}
          onClose={() => setAnnotationViewerItem(null)}
        />
      )}
    </Sheet>
  );
}

// ── Image Slot Card ──────────────────────────────────────────────────────────
function ImageSlotCard({
  slotKey,
  label,
  image,
  onUpload,
  onRemove,
  onViewAnalysis,
}: {
  slotKey: ImageSlotKey;
  label: string;
  image: ImageSlot | null;
  onUpload: (img: ImageSlot) => void;
  onRemove: () => void;
  onViewAnalysis: (item: QueueItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = e => {
      onUpload({
        original: e.target?.result as string,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  }

  const hasAnalysis = !!(image?.analysisResult);
  const displaySrc = image?.annotated || image?.original;
  const result = image?.analysisResult;
  const confColor = !result ? 'var(--rk-text3)'
    : result.confidence >= 70 ? 'var(--rk-green)'
    : result.confidence >= 40 ? 'var(--rk-gold)'
    : 'var(--rk-red)';

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div
        onClick={() => !image && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && file.type.startsWith('image/')) handleFile(file);
        }}
        className={cn(
          'relative flex flex-col items-center justify-center min-h-[100px] rounded-lg border-2 border-dashed overflow-hidden transition-colors',
          !image && 'cursor-pointer',
        )}
        style={{
          borderColor: image ? 'var(--rk-accent)' : 'var(--rk-border2)',
          background: 'var(--rk-surface2)',
        }}
      >
        {image ? (
          <>
            <img src={displaySrc} alt={label} className="w-full h-[100px] object-cover" />
            {hasAnalysis && result && (
              <div
                className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 flex justify-between items-center text-[9px] font-semibold"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}
              >
                <span>%R: {result.measuredR !== null ? `${result.measuredR}%` : '—'}</span>
                <span style={{ color: confColor }}>Conf: {result.confidence}%</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-3">
            <ImageIcon className="w-6 h-6" style={{ color: 'var(--rk-text3)' }} />
            <span className="text-[10px] text-center" style={{ color: 'var(--rk-text3)' }}>Drop or click</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        key={slotKey}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {image && (
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] truncate max-w-[50%]" style={{ color: 'var(--rk-text3)' }}>{image.filename}</span>
          <div className="flex gap-1 shrink-0">
            {hasAnalysis && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-auto py-0.5 px-1.5"
                style={{ color: 'var(--rk-accent)' }}
                onClick={() => {
                  if (!image.analysisResult) return;
                  // Build a minimal QueueItem for the viewer
                  const synthetic: QueueItem = {
                    id: `slot-${slotKey}`,
                    filename: image.filename,
                    fileSize: 0,
                    mimeType: 'image/jpeg',
                    thumbnail: image.original,
                    detectedCameraRef: null,
                    detectedStepType: null,
                    assignedCameraId: null,
                    assignedStepType: null,
                    status: 'done',
                    error: null,
                    result: image.analysisResult,
                  };
                  onViewAnalysis(synthetic);
                }}
              >
                View Analysis
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-[10px] h-auto py-0.5 px-1.5" style={{ color: 'var(--rk-red)' }}>
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Facial Scoring Panel ─────────────────────────────────────────────────────
function FacialScoringPanel({
  camera,
  onUpdateLine,
}: {
  camera: Camera;
  onUpdateLine: (lineNo: number, fields: Partial<FaceLine>) => void;
}) {
  const matches = camera.faceLines.filter(
    fl => fl.techRead && fl.obsRead && fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase()
  ).length;
  const score = Math.round((matches / 10) * 100);
  const pass = score >= 80;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--rk-border)' }}>
              {['Line #', 'Expected', 'Tech Read', 'Observer Read', 'Match'].map(h => (
                <th
                  key={h}
                  className="text-left py-2 px-2 font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--rk-text2)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {camera.faceLines.map(fl => {
              const match = fl.techRead && fl.obsRead &&
                fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase();
              return (
                <tr
                  key={fl.lineNo}
                  className="border-b"
                  style={{
                    borderColor: 'var(--rk-border)',
                    background: fl.lineNo % 2 === 0 ? 'var(--rk-surface2)' : 'transparent',
                  }}
                >
                  <td className="py-1.5 px-2 font-bold w-12" style={{ color: 'var(--rk-text3)' }}>{fl.lineNo}</td>
                  <td className="py-1 px-1">
                    <Input
                      value={fl.expected}
                      onChange={e => onUpdateLine(fl.lineNo, { expected: e.target.value })}
                      placeholder="Expected"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <Input
                      value={fl.techRead}
                      onChange={e => onUpdateLine(fl.lineNo, { techRead: e.target.value })}
                      placeholder="Tech read"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="py-1 px-1">
                    <Input
                      value={fl.obsRead}
                      onChange={e => onUpdateLine(fl.lineNo, { obsRead: e.target.value })}
                      placeholder="Observer read"
                      className="h-7 text-xs"
                    />
                  </td>
                  <td className="py-1.5 px-2 text-center w-16">
                    {fl.techRead && fl.obsRead ? (
                      <span className="font-bold" style={{ color: match ? 'var(--rk-green)' : 'var(--rk-red)' }}>
                        {match ? 'Yes' : 'No'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--rk-text3)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Score summary */}
      <div
        className="rounded-lg p-4 flex items-center gap-6"
        style={{
          background: pass ? 'rgba(16,217,138,0.1)' : 'rgba(255,71,87,0.1)',
          border: `1px solid ${pass ? 'var(--rk-green)' : 'var(--rk-red)'}`,
        }}
      >
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--rk-text2)' }}>Facial Score</div>
          <div className="text-3xl font-extrabold" style={{ color: pass ? 'var(--rk-green)' : 'var(--rk-red)' }}>
            {score}%
          </div>
        </div>
        <div className="border-l pl-6" style={{ borderColor: 'var(--rk-border)' }}>
          <div className="text-sm" style={{ color: 'var(--rk-text2)' }}>{matches} / 10 lines match</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: pass ? 'var(--rk-green)' : 'var(--rk-red)' }}>
            {pass ? 'PASS' : 'FAIL'}{' '}
            <span className="font-normal text-xs" style={{ color: 'var(--rk-text2)' }}>(threshold: 80%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
