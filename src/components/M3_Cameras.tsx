'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '@/lib/store';
import CameraCard from './CameraCard';
import { parseCSV, CSV_TEMPLATE } from '@/lib/csvImport';
import { classifyLevel } from '@/lib/standards';

type SortMode = 'id' | 'zone' | 'level' | 'status';

export default function M3_Cameras() {
  const { state, addCamera, importCameras } = useStore();
  const { cameras, standards } = state.audit;

  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('id');
  const csvRef = useRef<HTMLInputElement>(null);

  // Unique zones
  const zones = useMemo(() => {
    const z = [...new Set(cameras.map(c => c.zone).filter(Boolean))];
    return z.sort();
  }, [cameras]);

  // Filtered + sorted cameras
  const displayed = useMemo(() => {
    let result = [...cameras];

    // Search
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

    // Zone filter
    if (filterZone !== 'all') {
      result = result.filter(c => c.zone === filterZone);
    }

    // Sort
    result.sort((a, b) => {
      if (sortMode === 'zone') return (a.zone || '').localeCompare(b.zone || '');
      if (sortMode === 'level') {
        const achA = classifyLevel(a.measuredR, standards);
        const achB = classifyLevel(b.measuredR, standards);
        return (achB?.level ?? -1) - (achA?.level ?? -1);
      }
      if (sortMode === 'status') {
        const statusScore = (c: typeof a) => {
          if (!c.measuredR) return 1;
          const ach = classifyLevel(c.measuredR, standards);
          const req = standards.find(s => s.name === c.requiredStandard);
          if (ach && req && ach.level < req.level) return 2;
          return 0;
        };
        return statusScore(a) - statusScore(b);
      }
      // 'id' - original order by index in original array
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
      const parsed = parseCSV(text, state.audit.auditStepDefs);
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

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
          Cameras
        </h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
          {cameras.length} camera{cameras.length !== 1 ? 's' : ''} in this audit
        </p>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <input
          style={{ ...inputStyle, width: '220px' }}
          placeholder="Search ref, zone, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Zone filter */}
        <select
          style={{ ...inputStyle, width: '160px' }}
          value={filterZone}
          onChange={e => setFilterZone(e.target.value)}
        >
          <option value="all">All Zones</option>
          {zones.map(z => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          style={{ ...inputStyle, width: '160px' }}
          value={sortMode}
          onChange={e => setSortMode(e.target.value as SortMode)}
        >
          <option value="id">Sort: By Order</option>
          <option value="zone">Sort: By Zone</option>
          <option value="level">Sort: By Level</option>
          <option value="status">Sort: By Status</option>
        </select>

        <div style={{ flex: 1 }} />

        {/* Download template */}
        <button
          onClick={downloadTemplate}
          style={{
            background: 'transparent',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
          }}
        >
          CSV Template
        </button>

        {/* Import CSV */}
        <button
          onClick={() => csvRef.current?.click()}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '13px',
          }}
        >
          Import CSV
        </button>
        <input ref={csvRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleCSVImport} />

        {/* Add Camera */}
        <button
          onClick={addCamera}
          style={{
            background: 'var(--accent)',
            color: '#000',
            borderRadius: '6px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          + Add Camera
        </button>
      </div>

      {/* Camera list */}
      {displayed.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '60px 24px',
            textAlign: 'center',
          }}
        >
          {cameras.length === 0 ? (
            <div>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📷</div>
              <div style={{ color: 'var(--text)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                No cameras yet
              </div>
              <div style={{ color: 'var(--text2)', fontSize: '13px', marginBottom: '20px' }}>
                Add cameras individually or import via CSV
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={addCamera}
                  style={{
                    background: 'var(--accent)',
                    color: '#000',
                    borderRadius: '6px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  + Add First Camera
                </button>
                <button
                  onClick={downloadTemplate}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border2)',
                    color: 'var(--text2)',
                    borderRadius: '6px',
                    padding: '9px 20px',
                    fontSize: '13px',
                  }}
                >
                  Download CSV Template
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text2)', fontSize: '14px' }}>
              No cameras match your search / filter.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayed.map(cam => (
            <CameraCard key={cam.id} camera={cam} />
          ))}
        </div>
      )}
    </div>
  );
}
