'use client';

import React, { useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import type { Camera, ImageSlot } from '@/lib/types';
import { classifyLevel } from '@/lib/standards';

type ImageSlotKey = keyof Camera['images'];

const IMAGE_SLOTS: { key: ImageSlotKey; label: string }[] = [
  { key: 'static', label: 'Static Shot' },
  { key: 'smear', label: 'Motion Smear' },
  { key: 'colour', label: 'Colour Chart' },
  { key: 'face', label: 'Face Display' },
  { key: 'extra1', label: 'Extra 1' },
  { key: 'extra2', label: 'Extra 2' },
];

type CameraTab = 'details' | 'images' | 'steps' | 'facial';

interface CameraCardProps {
  camera: Camera;
}

export default function CameraCard({ camera }: CameraCardProps) {
  const { state, updateCamera, updateCameraImage, updateAuditStep, updateFaceLine, deleteCamera, duplicateCamera } = useStore();
  const { standards, auditStepDefs } = state.audit;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CameraTab>('details');

  const achieved = classifyLevel(camera.measuredR, standards);
  const required = standards.find(s => s.name === camera.requiredStandard);
  const isCompliant = achieved && required ? achieved.level >= required.level : null;

  // Health dot color
  function getHealthColor(): string {
    if (!camera.measuredR) return 'var(--gold)';
    if (isCompliant === false) return 'var(--red)';
    const stepsOk = camera.auditSteps.every(s => s.result.trim() !== '');
    if (!stepsOk) return 'var(--gold)';
    return 'var(--green)';
  }

  const fieldStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    color: 'var(--text2)',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '5px',
  };

  // Gauge value (0-100 based on measured vs highest possible)
  const maxR = Math.max(...standards.map(s => s.minR), 120);
  const gaugeWidth = camera.measuredR !== null
    ? Math.min(100, Math.round((camera.measuredR / maxR) * 100))
    : 0;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Health dot */}
        <div
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: getHealthColor(),
            flexShrink: 0,
            boxShadow: `0 0 6px ${getHealthColor()}`,
          }}
        />

        {/* Camera ref + make/model */}
        <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px', minWidth: '90px' }}>
          {camera.ref || '(no ref)'}
        </span>
        <span style={{ color: 'var(--text2)', fontSize: '13px', flex: 1 }}>
          {[camera.make, camera.model].filter(Boolean).join(' ') || 'Unknown camera'}
        </span>

        {/* Zone badge */}
        {camera.zone && (
          <span
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              color: 'var(--text2)',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            {camera.zone}
          </span>
        )}

        {/* Level badge */}
        {achieved && (
          <span
            style={{
              background: achieved.color + '22',
              border: `1px solid ${achieved.color}`,
              color: achieved.color,
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
            }}
          >
            {achieved.name}
          </span>
        )}

        {/* %R */}
        <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '14px', minWidth: '50px', textAlign: 'right' }}>
          {camera.measuredR !== null ? `${camera.measuredR}%R` : '—'}
        </span>

        {/* Actions */}
        <button
          onClick={e => { e.stopPropagation(); duplicateCamera(camera.id); }}
          title="Duplicate"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: '5px', padding: '4px 8px', fontSize: '12px' }}
        >
          Copy
        </button>
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`Delete camera ${camera.ref || '(no ref)'}?`)) deleteCamera(camera.id); }}
          title="Delete"
          style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '5px', padding: '4px 8px', fontSize: '12px' }}
        >
          Del
        </button>

        {/* Chevron */}
        <span style={{ color: 'var(--text3)', fontSize: '12px', marginLeft: '4px' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', background: 'var(--surface2)' }}>
            {(['details', 'images', 'steps', 'facial'] as CameraTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  color: activeTab === tab ? 'var(--accent)' : 'var(--text2)',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  borderRadius: 0,
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontWeight: activeTab === tab ? 600 : 400,
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'details' ? 'Details' : tab === 'images' ? 'Images' : tab === 'steps' ? 'Audit Steps' : 'Facial Scoring'}
              </button>
            ))}
          </div>

          <div style={{ padding: '16px' }}>
            {/* ── DETAILS TAB ── */}
            {activeTab === 'details' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {[
                    { field: 'ref' as const, label: 'Camera Ref' },
                    { field: 'make' as const, label: 'Make' },
                    { field: 'model' as const, label: 'Model' },
                    { field: 'lens' as const, label: 'Lens' },
                    { field: 'zone' as const, label: 'Zone' },
                    { field: 'resolution' as const, label: 'Resolution' },
                    { field: 'location' as const, label: 'Location' },
                    { field: 'purpose' as const, label: 'Purpose' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <div style={labelStyle}>{label}</div>
                      <input
                        style={fieldStyle}
                        value={camera[field] as string}
                        onChange={e => updateCamera(camera.id, { [field]: e.target.value })}
                        placeholder={label}
                      />
                    </div>
                  ))}

                  {/* Required Standard */}
                  <div>
                    <div style={labelStyle}>Required Standard</div>
                    <select
                      style={fieldStyle}
                      value={camera.requiredStandard}
                      onChange={e => updateCamera(camera.id, { requiredStandard: e.target.value })}
                    >
                      {standards.map(s => (
                        <option key={s.level} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Measured %R */}
                  <div>
                    <div style={labelStyle}>Measured %R</div>
                    <input
                      style={fieldStyle}
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

                  {[
                    { field: 'mountingHeight' as const, label: 'Mounting Height' },
                    { field: 'targetDistance' as const, label: 'Target Distance' },
                    { field: 'lighting' as const, label: 'Lighting' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <div style={labelStyle}>{label}</div>
                      <input
                        style={fieldStyle}
                        value={camera[field] as string}
                        onChange={e => updateCamera(camera.id, { [field]: e.target.value })}
                        placeholder={label}
                      />
                    </div>
                  ))}

                  {/* Notes */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={labelStyle}>Notes</div>
                    <textarea
                      style={{ ...fieldStyle, minHeight: '60px', resize: 'vertical' }}
                      value={camera.notes}
                      onChange={e => updateCamera(camera.id, { notes: e.target.value })}
                      placeholder="Notes..."
                    />
                  </div>
                </div>

                {/* Level result */}
                <div
                  style={{
                    marginTop: '16px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--text2)', fontSize: '12px' }}>Achieved: </span>
                      <span
                        style={{
                          color: achieved ? achieved.color : 'var(--text3)',
                          fontWeight: 700,
                          fontSize: '14px',
                        }}
                      >
                        {achieved ? achieved.name : 'Not measured'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text2)', fontSize: '12px' }}>Required: </span>
                      <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px' }}>
                        {camera.requiredStandard}
                      </span>
                    </div>
                    <div>
                      {isCompliant === true && <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: '13px' }}>COMPLIANT</span>}
                      {isCompliant === false && <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: '13px' }}>NON-COMPLIANT</span>}
                      {isCompliant === null && <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '13px' }}>PENDING</span>}
                    </div>
                  </div>
                  {/* Gauge bar */}
                  <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${gaugeWidth}%`,
                        background: achieved ? achieved.color : 'var(--text3)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text3)', fontSize: '10px' }}>0%R</span>
                    <span style={{ color: 'var(--text2)', fontSize: '11px' }}>
                      {camera.measuredR !== null ? `${camera.measuredR}%R` : '—'}
                    </span>
                    <span style={{ color: 'var(--text3)', fontSize: '10px' }}>{maxR}%R</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── IMAGES TAB ── */}
            {activeTab === 'images' && (
              <div>
                <div
                  style={{
                    background: 'rgba(167,139,250,0.1)',
                    border: '1px solid var(--purple)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: 'var(--purple)',
                  }}
                >
                  Image analysis (AI scoring, NPPD, pixel density) available in Phase 2
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {IMAGE_SLOTS.map(slot => (
                    <ImageSlotComponent
                      key={slot.key}
                      slotKey={slot.key}
                      label={slot.label}
                      image={camera.images[slot.key]}
                      onUpload={(img) => updateCameraImage(camera.id, slot.key, img)}
                      onRemove={() => updateCameraImage(camera.id, slot.key, null)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── AUDIT STEPS TAB ── */}
            {activeTab === 'steps' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {auditStepDefs.map(def => {
                  const step = camera.auditSteps.find(s => s.stepId === def.id);
                  if (!step) return null;
                  return (
                    <div
                      key={def.id}
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px' }}>
                            <span style={{ color: 'var(--text3)', marginRight: '6px' }}>#{def.id}</span>
                            {def.name}
                          </div>
                          <div style={{ color: 'var(--text2)', fontSize: '12px', marginTop: '2px' }}>{def.desc}</div>
                        </div>
                        {/* Pass/Fail/N-A */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '16px' }}>
                          {(['pass', 'fail', 'na'] as const).map(v => {
                            const isSelected = v === 'pass' ? step.passed === true : v === 'fail' ? step.passed === false : step.passed === null && step.result !== '';
                            const colors: Record<string, string> = { pass: 'var(--green)', fail: 'var(--red)', na: 'var(--text3)' };
                            return (
                              <button
                                key={v}
                                onClick={() => {
                                  const newPassed = v === 'pass' ? true : v === 'fail' ? false : null;
                                  updateAuditStep(camera.id, def.id, { passed: newPassed });
                                }}
                                style={{
                                  background: isSelected ? colors[v] + '22' : 'var(--surface)',
                                  border: `1px solid ${isSelected ? colors[v] : 'var(--border2)'}`,
                                  color: isSelected ? colors[v] : 'var(--text3)',
                                  borderRadius: '5px',
                                  padding: '3px 9px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                {v.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: '4px' }}>Result</div>
                          <textarea
                            style={{ ...fieldStyle, minHeight: '50px', resize: 'vertical', fontSize: '12px' }}
                            value={step.result}
                            onChange={e => updateAuditStep(camera.id, def.id, { result: e.target.value })}
                            placeholder="Enter result..."
                          />
                        </div>
                        <div>
                          <div style={{ ...labelStyle, marginBottom: '4px' }}>Notes</div>
                          <textarea
                            style={{ ...fieldStyle, minHeight: '50px', resize: 'vertical', fontSize: '12px' }}
                            value={step.notes}
                            onChange={e => updateAuditStep(camera.id, def.id, { notes: e.target.value })}
                            placeholder="Additional notes..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── FACIAL SCORING TAB ── */}
            {activeTab === 'facial' && (
              <FacialScoringPanel
                camera={camera}
                onUpdateLine={(lineNo, fields) => updateFaceLine(camera.id, lineNo, fields)}
                fieldStyle={fieldStyle}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Image Slot Component ──────────────────────────────────────────────────────
function ImageSlotComponent({
  slotKey,
  label,
  image,
  onUpload,
  onRemove,
}: {
  slotKey: ImageSlotKey;
  label: string;
  image: ImageSlot | null;
  onUpload: (img: ImageSlot) => void;
  onRemove: () => void;
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

  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text2)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div
        onClick={() => !image && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && file.type.startsWith('image/')) handleFile(file);
        }}
        style={{
          border: `2px dashed ${image ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: '8px',
          minHeight: '100px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: image ? 'default' : 'pointer',
          background: 'var(--surface2)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {image ? (
          <img
            src={image.original}
            alt={label}
            style={{ width: '100%', height: '100px', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: 'var(--text3)', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
            Drop image or click to upload
          </span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        key={slotKey}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {image && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text3)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
            {image.filename}
          </span>
          <button
            onClick={onRemove}
            style={{ background: 'transparent', color: 'var(--red)', fontSize: '11px', padding: '0' }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ── Facial Scoring Panel ──────────────────────────────────────────────────────
import type { FaceLine } from '@/lib/types';

function FacialScoringPanel({
  camera,
  onUpdateLine,
  fieldStyle,
}: {
  camera: Camera;
  onUpdateLine: (lineNo: number, fields: Partial<FaceLine>) => void;
  fieldStyle: React.CSSProperties;
}) {
  const matches = camera.faceLines.filter(
    fl =>
      fl.techRead &&
      fl.obsRead &&
      fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase()
  ).length;
  const score = Math.round((matches / 10) * 100);
  const pass = score >= 80;

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Line #', 'Expected', 'Tech Read', 'Observer Read', 'Match'].map(h => (
                <th
                  key={h}
                  style={{
                    color: 'var(--text2)',
                    fontWeight: 600,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '6px 8px',
                    textAlign: 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {camera.faceLines.map(fl => {
              const match =
                fl.techRead &&
                fl.obsRead &&
                fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase();
              return (
                <tr
                  key={fl.lineNo}
                  style={{ borderBottom: '1px solid var(--border)', background: fl.lineNo % 2 === 0 ? 'var(--surface2)' : 'transparent' }}
                >
                  <td style={{ padding: '6px 8px', color: 'var(--text3)', fontWeight: 700, width: '50px' }}>
                    {fl.lineNo}
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      style={{ ...fieldStyle, fontSize: '12px', padding: '5px 8px' }}
                      value={fl.expected}
                      onChange={e => onUpdateLine(fl.lineNo, { expected: e.target.value })}
                      placeholder="Expected"
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      style={{ ...fieldStyle, fontSize: '12px', padding: '5px 8px' }}
                      value={fl.techRead}
                      onChange={e => onUpdateLine(fl.lineNo, { techRead: e.target.value })}
                      placeholder="Tech read"
                    />
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    <input
                      style={{ ...fieldStyle, fontSize: '12px', padding: '5px 8px' }}
                      value={fl.obsRead}
                      onChange={e => onUpdateLine(fl.lineNo, { obsRead: e.target.value })}
                      placeholder="Observer read"
                    />
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', width: '60px' }}>
                    {fl.techRead && fl.obsRead ? (
                      <span style={{ color: match ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: '12px' }}>
                        {match ? 'Yes' : 'No'}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text3)', fontSize: '12px' }}>—</span>
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
        style={{
          marginTop: '16px',
          background: pass ? 'rgba(16,217,138,0.1)' : 'rgba(255,71,87,0.1)',
          border: `1px solid ${pass ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '2px' }}>Facial Score</div>
          <div style={{ color: pass ? 'var(--green)' : 'var(--red)', fontWeight: 800, fontSize: '24px' }}>
            {score}%
          </div>
        </div>
        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
          <div style={{ color: 'var(--text2)', fontSize: '12px' }}>{matches} / 10 lines match</div>
          <div style={{ color: pass ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>
            {pass ? 'PASS' : 'FAIL'} <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: '11px' }}>(threshold: 80%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
