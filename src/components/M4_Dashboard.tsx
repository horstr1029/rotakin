'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useStore } from '@/lib/store';
import { classifyLevel } from '@/lib/standards';

export default function M4_Dashboard() {
  const { state } = useStore();
  const { cameras, standards } = state.audit;

  // ── KPI calculations ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = cameras.length;
    const pending = cameras.filter(c => c.measuredR === null).length;
    const compliant = cameras.filter(c => {
      if (!c.measuredR) return false;
      const ach = classifyLevel(c.measuredR, standards);
      const req = standards.find(s => s.name === c.requiredStandard);
      return ach && req && ach.level >= req.level;
    }).length;
    const nonCompliant = cameras.filter(c => {
      if (!c.measuredR) return false;
      const ach = classifyLevel(c.measuredR, standards);
      const req = standards.find(s => s.name === c.requiredStandard);
      return ach && req && ach.level < req.level;
    }).length;
    return { total, pending, compliant, nonCompliant };
  }, [cameras, standards]);

  // ── Bar chart data ───────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const buckets: Record<string, { name: string; count: number; color: string }> = {};
    // Initialise with standards
    for (const std of [...standards].sort((a, b) => a.level - b.level)) {
      buckets[std.name] = { name: std.name, count: 0, color: std.color };
    }
    buckets['Below Minimum'] = { name: 'Below Min', count: 0, color: '#ff4757' };

    for (const cam of cameras) {
      const ach = classifyLevel(cam.measuredR, standards);
      if (!ach) continue;
      const key = ach.level === 0 ? 'Below Minimum' : ach.name;
      if (buckets[key]) {
        buckets[key].count++;
      }
    }
    return Object.values(buckets).filter(b => b.name !== '' );
  }, [cameras, standards]);

  // ── Zone table ───────────────────────────────────────────────────────────────
  const zoneData = useMemo(() => {
    const zones: Record<string, typeof cameras> = {};
    for (const cam of cameras) {
      const z = cam.zone || '(no zone)';
      if (!zones[z]) zones[z] = [];
      zones[z].push(cam);
    }
    return Object.entries(zones).map(([zone, cams]) => {
      const compliantCams = cams.filter(c => {
        if (!c.measuredR) return false;
        const ach = classifyLevel(c.measuredR, standards);
        const req = standards.find(s => s.name === c.requiredStandard);
        return ach && req && ach.level >= req.level;
      });
      const bestAch = cams.reduce<ReturnType<typeof classifyLevel>>(
        (best, c) => {
          const ach = classifyLevel(c.measuredR, standards);
          if (!ach) return best;
          if (!best) return ach;
          return ach.level > best.level ? ach : best;
        },
        null
      );
      const allCompliant = compliantCams.length === cams.length;
      const noneCompliant = compliantCams.length === 0;
      return {
        zone,
        total: cams.length,
        compliant: compliantCams.length,
        bestAchieved: bestAch,
        status: noneCompliant ? 'Non-Compliant' : allCompliant ? 'Compliant' : 'Partial',
      };
    });
  }, [cameras, standards]);

  // ── Non-compliance list ───────────────────────────────────────────────────────
  const nonCompliantCameras = useMemo(() => {
    return cameras
      .filter(c => {
        if (!c.measuredR) return false;
        const ach = classifyLevel(c.measuredR, standards);
        const req = standards.find(s => s.name === c.requiredStandard);
        return ach && req && ach.level < req.level;
      })
      .map(c => {
        const ach = classifyLevel(c.measuredR, standards);
        const req = standards.find(s => s.name === c.requiredStandard);
        const delta = req && c.measuredR !== null ? req.minR - c.measuredR : 0;
        return { camera: c, achieved: ach, required: req, delta };
      });
  }, [cameras, standards]);

  // ── Facial test summary ───────────────────────────────────────────────────────
  const faceData = useMemo(() => {
    const camsWithFace = cameras.filter(c =>
      c.faceLines.some(fl => fl.techRead && fl.obsRead)
    );
    if (camsWithFace.length === 0) return null;
    const scores = camsWithFace.map(c => {
      const matches = c.faceLines.filter(
        fl => fl.techRead && fl.obsRead &&
          fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase()
      ).length;
      return { ref: c.ref || c.id, score: Math.round((matches / 10) * 100) };
    });
    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    return { scores, avg };
  }, [cameras]);

  // Custom tooltip
  function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: '6px', padding: '8px 12px' }}>
          <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '2px' }}>{label}</div>
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>{payload[0].value} cameras</div>
        </div>
      );
    }
    return null;
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '20px',
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Dashboard</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Compliance overview and analytics</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total Cameras', value: kpis.total, color: 'var(--accent)' },
          { label: 'Compliant', value: kpis.compliant, color: 'var(--green)' },
          { label: 'Non-Compliant', value: kpis.nonCompliant, color: 'var(--red)' },
          { label: 'Pending', value: kpis.pending, color: 'var(--gold)' },
        ].map(kpi => (
          <div
            key={kpi.label}
            style={{
              ...cardStyle,
              borderTop: `3px solid ${kpi.color}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '36px', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ color: 'var(--text2)', fontSize: '12px', marginTop: '6px' }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Level Distribution Chart */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Level Distribution</div>
          {cameras.length === 0 ? (
            <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
              No cameras yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text2)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text2)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Facial Test Summary */}
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Facial Test Summary</div>
          {!faceData ? (
            <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
              No facial test data yet
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ color: 'var(--text2)', fontSize: '11px', marginBottom: '2px' }}>Average Score</div>
                  <div
                    style={{
                      fontSize: '36px',
                      fontWeight: 800,
                      color: faceData.avg >= 80 ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {faceData.avg}%
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                  <div style={{ color: 'var(--text2)', fontSize: '12px' }}>
                    {faceData.scores.filter(s => s.score >= 80).length} / {faceData.scores.length} cameras pass
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {faceData.scores.map(s => (
                  <div key={s.ref} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text2)' }}>{s.ref}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${s.score}%`, height: '100%', background: s.score >= 80 ? 'var(--green)' : 'var(--red)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ color: s.score >= 80 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{s.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone Compliance Table */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={sectionTitleStyle}>Zone Compliance</div>
        {zoneData.length === 0 ? (
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: '24px 0', fontSize: '13px' }}>
            No camera zones defined
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Zone', 'Cameras', 'Best Achieved', 'Compliant', 'Status'].map(h => (
                    <th
                      key={h}
                      style={{
                        color: 'var(--text2)',
                        fontWeight: 600,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '8px 12px',
                        textAlign: 'left',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {zoneData.map((row, i) => {
                  const statusColor =
                    row.status === 'Compliant' ? 'var(--green)' :
                    row.status === 'Non-Compliant' ? 'var(--red)' : 'var(--gold)';
                  return (
                    <tr
                      key={row.zone}
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--surface2)' : 'transparent' }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{row.zone}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>{row.total}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {row.bestAchieved ? (
                          <span style={{ color: row.bestAchieved.color, fontWeight: 600 }}>
                            {row.bestAchieved.name}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text2)' }}>
                        {row.compliant} / {row.total}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            color: statusColor,
                            background: statusColor + '18',
                            border: `1px solid ${statusColor}`,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Non-Compliance List */}
      <div style={cardStyle}>
        <div style={sectionTitleStyle}>Non-Compliance Details</div>
        {nonCompliantCameras.length === 0 ? (
          <div style={{ color: 'var(--green)', textAlign: 'center', padding: '24px 0', fontSize: '13px', fontWeight: 500 }}>
            {cameras.length === 0 ? 'No cameras yet' : 'All measured cameras are compliant'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Camera Ref', 'Zone', 'Required', 'Achieved', '%R', 'Deficit', 'Suggested Action'].map(h => (
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
                {nonCompliantCameras.map((row, i) => {
                  const suggestion =
                    row.delta > 50
                      ? 'Replace camera with higher resolution unit'
                      : row.delta > 20
                      ? 'Reposition camera or upgrade lens'
                      : `Increase %R by ${row.delta} points — adjust zoom/focus`;
                  return (
                    <tr
                      key={row.camera.id}
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 1 ? 'var(--surface2)' : 'transparent' }}
                    >
                      <td style={{ padding: '10px 10px', color: 'var(--text)', fontWeight: 600 }}>
                        {row.camera.ref || '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--text2)' }}>
                        {row.camera.zone || '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--text2)' }}>
                        {row.required?.name || '—'}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ color: row.achieved?.color ?? 'var(--text3)', fontWeight: 600 }}>
                          {row.achieved?.name || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--orange)', fontWeight: 700 }}>
                        {row.camera.measuredR}%
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--red)', fontWeight: 600 }}>
                        -{row.delta}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'var(--text2)', fontSize: '12px' }}>
                        {suggestion}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
