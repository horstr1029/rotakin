'use client';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Camera, CheckCircle2, XCircle, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStore } from '@/lib/store';
import { classifyLevel } from '@/lib/standards';

export default function M4_Dashboard() {
  const { state } = useStore();
  const { cameras, standards } = state.audit;

  const kpis = useMemo(() => {
    const total = cameras.length;
    const pending = cameras.filter(c => c.measuredR === null).length;
    const compliant = cameras.filter(c => {
      if (!c.measuredR) return false;
      const ach = classifyLevel(c.measuredR, standards);
      const req = standards.find(s => s.name === c.requiredStandard);
      return ach && req && ach.level >= req.level;
    }).length;
    const nonCompliant = total - compliant - pending;
    return { total, compliant, nonCompliant, pending };
  }, [cameras, standards]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const sorted = [...standards].sort((a, b) => a.level - b.level);
    sorted.forEach(s => { counts[s.name] = 0; });
    counts['Below Min'] = 0;
    cameras.forEach(c => {
      if (c.measuredR === null) return;
      const lvl = classifyLevel(c.measuredR, standards);
      if (!lvl) return;
      const key = lvl.level === 0 ? 'Below Min' : lvl.name;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => {
      const std = standards.find(s => s.name === name);
      return { name, count, color: std?.color ?? '#ff4757' };
    });
  }, [cameras, standards]);

  const zoneData = useMemo(() => {
    const zones: Record<string, { cameras: typeof cameras; zone: string }> = {};
    cameras.forEach(c => {
      const z = c.zone || 'Unzoned';
      if (!zones[z]) zones[z] = { cameras: [], zone: z };
      zones[z].cameras.push(c);
    });
    return Object.values(zones).map(({ zone, cameras: cams }) => {
      const compliant = cams.filter(c => {
        if (!c.measuredR) return false;
        const ach = classifyLevel(c.measuredR, standards);
        const req = standards.find(s => s.name === c.requiredStandard);
        return ach && req && ach.level >= req.level;
      }).length;
      return { zone, total: cams.length, compliant, nonCompliant: cams.length - compliant };
    });
  }, [cameras, standards]);

  const nonCompliantCams = useMemo(() => cameras.filter(c => {
    if (!c.measuredR) return false;
    const ach = classifyLevel(c.measuredR, standards);
    const req = standards.find(s => s.name === c.requiredStandard);
    return ach && req && ach.level < req.level;
  }), [cameras, standards]);

  type AnomalySeverity = 'high' | 'medium' | 'low';
  interface Anomaly { cameraRef: string; issue: string; severity: AnomalySeverity; }

  const anomalies = useMemo<Anomaly[]>(() => {
    const result: Anomaly[] = [];
    for (const cam of cameras) {
      if (cam.measuredR === null) {
        result.push({ cameraRef: cam.ref || cam.id, issue: 'No measurement recorded', severity: 'medium' });
      }
      for (const slot of Object.values(cam.images)) {
        if (!slot?.analysisResult) continue;
        const ar = slot.analysisResult;
        if (ar.confidence < 40) {
          result.push({ cameraRef: cam.ref || cam.id, issue: 'Low confidence measurement', severity: 'medium' });
          break;
        }
        if (ar.blurIndex !== null && ar.blurIndex < 50) {
          result.push({ cameraRef: cam.ref || cam.id, issue: `High blur detected (blurIndex: ${ar.blurIndex})`, severity: 'high' });
          break;
        }
      }
      if (cam.measuredR !== null && cam.requiredStandard) {
        const ach = classifyLevel(cam.measuredR, standards);
        const req = standards.find(s => s.name === cam.requiredStandard);
        if (ach && req && req.level - ach.level >= 2) {
          result.push({ cameraRef: cam.ref || cam.id, issue: 'Severely non-compliant', severity: 'high' });
        }
      }
    }
    return result;
  }, [cameras, standards]);

  const KPI_CARDS = [
    { label: 'Total Cameras', value: kpis.total, icon: Camera, color: 'var(--rk-accent)', bg: 'rgba(0,194,255,0.08)' },
    { label: 'Compliant', value: kpis.compliant, icon: CheckCircle2, color: 'var(--rk-green)', bg: 'rgba(16,217,138,0.08)' },
    { label: 'Non-Compliant', value: kpis.nonCompliant, icon: XCircle, color: 'var(--rk-red)', bg: 'rgba(255,71,87,0.08)' },
    { label: 'Pending', value: kpis.pending, icon: Clock, color: 'var(--rk-gold)', bg: 'rgba(240,180,41,0.08)' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: color }} />
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--rk-text3)' }}>{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--rk-accent)' }} />
              Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cameras.length === 0 ? (
              <div className="h-40 flex items-center justify-center" style={{ color: 'var(--rk-text3)' }}>
                <p className="text-sm">No cameras yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--rk-surface2)', border: '1px solid var(--rk-border)', borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: 'var(--rk-text)' }}
                    itemStyle={{ color: 'var(--rk-text2)' }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Zone Compliance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Zone Compliance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {zoneData.length === 0 ? (
              <div className="h-40 flex items-center justify-center" style={{ color: 'var(--rk-text3)' }}>
                <p className="text-sm">No zone data</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Zone</TableHead>
                    <TableHead className="text-center">Cameras</TableHead>
                    <TableHead className="text-center">Compliant</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zoneData.map(z => (
                    <TableRow key={z.zone}>
                      <TableCell className="font-medium text-sm">{z.zone}</TableCell>
                      <TableCell className="text-center text-sm">{z.total}</TableCell>
                      <TableCell className="text-center text-sm">{z.compliant}/{z.total}</TableCell>
                      <TableCell className="text-right">
                        <Badge className="text-xs" style={z.nonCompliant === 0
                          ? { background: 'rgba(16,217,138,0.1)', color: 'var(--rk-green)', border: '1px solid rgba(16,217,138,0.2)' }
                          : { background: 'rgba(255,71,87,0.1)', color: 'var(--rk-red)', border: '1px solid rgba(255,71,87,0.2)' }
                        }>
                          {z.nonCompliant === 0 ? 'Pass' : `${z.nonCompliant} fail`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--rk-gold)' }} />
              Anomalies ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {anomalies.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-semibold min-w-[80px]" style={{ color: 'var(--rk-text)' }}>{a.cameraRef}</span>
                <span style={{ color: 'var(--rk-text2)' }} className="flex-1">{a.issue}</span>
                <Badge
                  className="text-[10px] shrink-0"
                  style={
                    a.severity === 'high'
                      ? { background: 'rgba(255,71,87,0.15)', color: 'var(--rk-red)', border: '1px solid rgba(255,71,87,0.3)' }
                      : a.severity === 'medium'
                      ? { background: 'rgba(240,180,41,0.15)', color: 'var(--rk-gold)', border: '1px solid rgba(240,180,41,0.3)' }
                      : { background: 'rgba(0,194,255,0.1)', color: 'var(--rk-accent)', border: '1px solid rgba(0,194,255,0.2)' }
                  }
                >
                  {a.severity}
                </Badge>
              </div>
            ))}
            {anomalies.length > 10 && (
              <p className="text-xs pt-1" style={{ color: 'var(--rk-text3)' }}>{anomalies.length - 10} more…</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Non-Compliance List */}
      {nonCompliantCams.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4" style={{ color: 'var(--rk-red)' }} />
              Non-Compliant Cameras
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camera</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Achieved</TableHead>
                  <TableHead className="text-right">%R</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonCompliantCams.map(c => {
                  const ach = classifyLevel(c.measuredR, standards);
                  const req = standards.find(s => s.name === c.requiredStandard);
                  const delta = req && c.measuredR ? (req.minR - c.measuredR).toFixed(1) : '—';
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.ref || '—'}</TableCell>
                      <TableCell className="text-sm" style={{ color: 'var(--rk-text2)' }}>{c.zone || '—'}</TableCell>
                      <TableCell>
                        <Badge className="text-xs" style={{ background: `${req?.color}18`, color: req?.color, border: `1px solid ${req?.color}30` }}>
                          {c.requiredStandard}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="text-xs" style={{ background: `${ach?.color}18`, color: ach?.color, border: `1px solid ${ach?.color}30` }}>
                          {ach?.name ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{c.measuredR}%</TableCell>
                      <TableCell className="text-xs" style={{ color: 'var(--rk-text2)' }}>Increase %R by +{delta}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
