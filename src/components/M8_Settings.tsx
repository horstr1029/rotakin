'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import type { Standard, StepDef } from '@/lib/types';
import { DEFAULT_STANDARDS, BS_EN_STANDARDS, DEFAULT_STEP_DEFS } from '@/lib/standards';
import { clearAuditDB } from '@/lib/storage';

export default function M8_Settings() {
  const { state, updateStandards, updateStepDefs, newAudit } = useStore();
  const { standards, auditStepDefs } = state.audit;

  const [editingStd, setEditingStd] = useState<Standard | null>(null);
  const [newStd, setNewStd] = useState<Partial<Standard>>({});
  const [showAddStd, setShowAddStd] = useState(false);

  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editStepData, setEditStepData] = useState<Partial<StepDef>>({});

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };

  // ── Standards editor ─────────────────────────────────────────────────────────
  function handleDeleteStd(level: number) {
    if (standards.length <= 1) { alert('Cannot delete the last standard.'); return; }
    if (!confirm(`Delete level ${level}?`)) return;
    updateStandards(standards.filter(s => s.level !== level));
  }

  function handleSaveStd() {
    if (!editingStd) return;
    updateStandards(standards.map(s => s.level === editingStd.level ? editingStd : s));
    setEditingStd(null);
  }

  function handleAddStd() {
    if (!newStd.level || !newStd.name || newStd.minR === undefined) {
      alert('Please fill in Level, Name, and Min %R.');
      return;
    }
    if (standards.find(s => s.level === newStd.level)) {
      alert('A standard with that level already exists.');
      return;
    }
    const std: Standard = {
      level: Number(newStd.level),
      name: newStd.name,
      minR: Number(newStd.minR),
      color: newStd.color ?? '#8899b4',
    };
    updateStandards([...standards, std].sort((a, b) => b.level - a.level));
    setNewStd({});
    setShowAddStd(false);
  }

  function handleMoveStep(idx: number, dir: -1 | 1) {
    const arr = [...auditStepDefs];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    updateStepDefs(arr);
  }

  function handleSaveStep() {
    if (editingStep === null) return;
    updateStepDefs(
      auditStepDefs.map(s =>
        s.id === editingStep ? { ...s, ...editStepData } : s
      )
    );
    setEditingStep(null);
    setEditStepData({});
  }

  async function handleClearAll() {
    if (!confirm('This will permanently delete all audit data. Are you sure?')) return;
    if (!confirm('Final confirmation: clear all data?')) return;
    await clearAuditDB();
    newAudit();
  }

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '14px',
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Settings</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Manage standards, audit step definitions, and app preferences</p>
      </div>

      {/* ── Standards editor ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={sectionTitleStyle}>Standards Editor</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => updateStandards(DEFAULT_STANDARDS)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border2)',
                color: 'var(--text2)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
              }}
            >
              Reset to SANS Defaults
            </button>
            <button
              onClick={() => updateStandards(BS_EN_STANDARDS)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border2)',
                color: 'var(--text2)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
              }}
            >
              Reset to BS EN 50132-7
            </button>
            <button
              onClick={() => setShowAddStd(true)}
              style={{
                background: 'var(--accent)',
                color: '#000',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              + Add Standard
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Level', 'Name', 'Min %R', 'Color', 'Actions'].map(h => (
                  <th
                    key={h}
                    style={{
                      color: 'var(--text2)',
                      fontWeight: 600,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '8px 10px',
                      textAlign: 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...standards].sort((a, b) => b.level - a.level).map((std, i) => (
                <tr
                  key={std.level}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 1 ? 'var(--surface2)' : 'transparent',
                  }}
                >
                  {editingStd?.level === std.level ? (
                    <>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          style={{ ...inputStyle, width: '60px' }}
                          type="number"
                          value={editingStd.level}
                          onChange={e => setEditingStd({ ...editingStd, level: parseInt(e.target.value) })}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          style={inputStyle}
                          value={editingStd.name}
                          onChange={e => setEditingStd({ ...editingStd, name: e.target.value })}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          style={{ ...inputStyle, width: '80px' }}
                          type="number"
                          value={editingStd.minR}
                          onChange={e => setEditingStd({ ...editingStd, minR: parseFloat(e.target.value) })}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="color"
                          value={editingStd.color}
                          onChange={e => setEditingStd({ ...editingStd, color: e.target.value })}
                          style={{ width: '40px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSaveStd}
                            style={{ background: 'var(--green)', color: '#000', borderRadius: '5px', padding: '4px 10px', fontSize: '11px', fontWeight: 700 }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStd(null)}
                            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 10px', color: 'var(--text2)', fontWeight: 700 }}>{std.level}</td>
                      <td style={{ padding: '8px 10px', color: std.color, fontWeight: 600 }}>{std.name}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--text)' }}>{std.minR}%R</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: std.color }} />
                          <span style={{ color: 'var(--text3)', fontSize: '11px' }}>{std.color}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => setEditingStd({ ...std })}
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStd(std.level)}
                            style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '5px', padding: '4px 10px', fontSize: '11px' }}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add standard form */}
        {showAddStd && (
          <div
            style={{
              marginTop: '16px',
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: '8px',
              padding: '16px',
            }}
          >
            <div style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Add New Standard</div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 100px 60px', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '4px' }}>Level</div>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="6"
                  value={newStd.level ?? ''}
                  onChange={e => setNewStd(s => ({ ...s, level: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '4px' }}>Name</div>
                <input
                  style={inputStyle}
                  placeholder="e.g. Extreme Identification"
                  value={newStd.name ?? ''}
                  onChange={e => setNewStd(s => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '4px' }}>Min %R</div>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="150"
                  value={newStd.minR ?? ''}
                  onChange={e => setNewStd(s => ({ ...s, minR: parseFloat(e.target.value) }))}
                />
              </div>
              <div>
                <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '4px' }}>Color</div>
                <input
                  type="color"
                  value={newStd.color ?? '#ffffff'}
                  onChange={e => setNewStd(s => ({ ...s, color: e.target.value }))}
                  style={{ width: '40px', height: '32px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={handleAddStd}
                style={{ background: 'var(--accent)', color: '#000', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: 700 }}
              >
                Add Standard
              </button>
              <button
                onClick={() => { setShowAddStd(false); setNewStd({}); }}
                style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: '6px', padding: '7px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Audit Step Definitions ── */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={sectionTitleStyle}>Audit Step Definitions</div>
          <button
            onClick={() => updateStepDefs(DEFAULT_STEP_DEFS)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border2)',
              color: 'var(--text2)',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
            }}
          >
            Reset to Defaults
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {auditStepDefs.map((step, idx) => (
            <div
              key={step.id}
              style={{
                background: 'var(--surface2)',
                border: `1px solid ${editingStep === step.id ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              {editingStep === step.id ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '10px' }}>
                    <div>
                      <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '4px' }}>Step Name</div>
                      <input
                        style={inputStyle}
                        value={editStepData.name ?? step.name}
                        onChange={e => setEditStepData(d => ({ ...d, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '4px' }}>Description</div>
                      <input
                        style={inputStyle}
                        value={editStepData.desc ?? step.desc}
                        onChange={e => setEditStepData(d => ({ ...d, desc: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveStep}
                      style={{ background: 'var(--green)', color: '#000', borderRadius: '5px', padding: '5px 14px', fontSize: '12px', fontWeight: 700 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingStep(null); setEditStepData({}); }}
                      style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)', borderRadius: '5px', padding: '5px 14px', fontSize: '12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--text3)', fontWeight: 700, fontSize: '12px', minWidth: '24px' }}>
                    #{step.id}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '13px' }}>{step.name}</div>
                    <div style={{ color: 'var(--text2)', fontSize: '11px' }}>{step.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      onClick={() => handleMoveStep(idx, -1)}
                      disabled={idx === 0}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border2)',
                        color: 'var(--text3)',
                        borderRadius: '4px',
                        padding: '3px 7px',
                        fontSize: '11px',
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveStep(idx, 1)}
                      disabled={idx === auditStepDefs.length - 1}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border2)',
                        color: 'var(--text3)',
                        borderRadius: '4px',
                        padding: '3px 7px',
                        fontSize: '11px',
                      }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => { setEditingStep(step.id); setEditStepData({ name: step.name, desc: step.desc }); }}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border2)',
                        color: 'var(--text2)',
                        borderRadius: '4px',
                        padding: '3px 10px',
                        fontSize: '11px',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── App Settings ── */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>App Settings</div>

        {/* Confidence thresholds (read-only info) */}
        <div
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            Phase 2 — Image AI Confidence Thresholds (read-only)
          </div>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div>
              <span style={{ color: 'var(--text3)', fontSize: '12px' }}>Low confidence: </span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>40%</span>
            </div>
            <div>
              <span style={{ color: 'var(--text3)', fontSize: '12px' }}>Review threshold: </span>
              <span style={{ color: 'var(--gold)', fontWeight: 700 }}>70%</span>
            </div>
            <div>
              <span style={{ color: 'var(--text3)', fontSize: '12px' }}>Auto-pass: </span>
              <span style={{ color: 'var(--green)', fontWeight: 700 }}>≥ 70%</span>
            </div>
          </div>
        </div>

        {/* Clear all data */}
        <div
          style={{
            background: 'rgba(255,71,87,0.06)',
            border: '1px solid rgba(255,71,87,0.3)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>Clear All Data</div>
            <div style={{ color: 'var(--text2)', fontSize: '12px' }}>
              Permanently delete all audit data from local storage. This cannot be undone.
            </div>
          </div>
          <button
            onClick={handleClearAll}
            style={{
              background: 'var(--red)',
              color: '#fff',
              borderRadius: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              marginLeft: '20px',
              flexShrink: 0,
            }}
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
