import type { AuditState } from './types';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(auditData: AuditState): void {
  const { site } = auditData.audit;
  const date = new Date().toISOString().split('T')[0];
  const ref = site.reportRef || 'audit';
  const json = JSON.stringify(auditData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, `rotakin_audit_${ref}_${date}.json`);
}

export function exportCSV(auditData: AuditState): void {
  const { site, cameras, standards } = auditData.audit;
  const ref = site.reportRef || 'audit';

  const headers = [
    'Ref', 'Zone', 'Make', 'Model', 'Lens', 'Resolution',
    'Required Standard', 'Measured %R', 'Achieved Level', 'Compliant',
    'Mounting Height', 'Target Distance', 'Lighting', 'Notes',
  ];

  function classifyLevel(rValue: number | null) {
    if (rValue === null) return null;
    const sorted = [...standards].sort((a, b) => b.minR - a.minR);
    for (const std of sorted) {
      if (rValue >= std.minR) return std;
    }
    return { level: 0, name: 'Below Minimum', minR: 0, color: '' };
  }

  function csvCell(v: string | number | null | undefined): string {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const rows = cameras.map(cam => {
    const ach = classifyLevel(cam.measuredR);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const compliant = ach && req ? (ach.level >= req.level ? 'Yes' : 'No') : '';
    return [
      cam.ref, cam.zone, cam.make, cam.model, cam.lens, cam.resolution,
      cam.requiredStandard,
      cam.measuredR !== null ? String(cam.measuredR) : '',
      ach ? ach.name : '',
      compliant,
      cam.mountingHeight, cam.targetDistance, cam.lighting, cam.notes,
    ].map(csvCell).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `rotakin_cameras_${ref}.csv`);
}

export async function exportZIP(auditData: AuditState): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const { site, cameras, standards } = auditData.audit;
  const date = new Date().toISOString().split('T')[0];
  const siteName = (site.siteName || 'audit').replace(/\s+/g, '_');

  zip.file('rotakin_audit.json', JSON.stringify(auditData, null, 2));

  const headers = [
    'Ref', 'Zone', 'Make', 'Model', 'Lens', 'Resolution',
    'Required Standard', 'Measured %R', 'Achieved Level', 'Compliant',
    'Mounting Height', 'Target Distance', 'Lighting', 'Notes',
  ];

  function classifyLevel(rValue: number | null) {
    if (rValue === null) return null;
    const sorted = [...standards].sort((a, b) => b.minR - a.minR);
    for (const std of sorted) {
      if (rValue >= std.minR) return std;
    }
    return { level: 0, name: 'Below Minimum', minR: 0, color: '' };
  }

  function csvCell(v: string | number | null | undefined): string {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const rows = cameras.map(cam => {
    const ach = classifyLevel(cam.measuredR);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const compliant = ach && req ? (ach.level >= req.level ? 'Yes' : 'No') : '';
    return [
      cam.ref, cam.zone, cam.make, cam.model, cam.lens, cam.resolution,
      cam.requiredStandard,
      cam.measuredR !== null ? String(cam.measuredR) : '',
      ach ? ach.name : '',
      compliant,
      cam.mountingHeight, cam.targetDistance, cam.lighting, cam.notes,
    ].map(csvCell).join(',');
  });
  zip.file('cameras.csv', [headers.join(','), ...rows].join('\r\n'));

  const imgFolder = zip.folder('images');
  if (imgFolder) {
    const slotKeys = ['static', 'smear', 'colour', 'face', 'extra1', 'extra2'] as const;
    for (const cam of cameras) {
      for (const slotType of slotKeys) {
        const slot = cam.images[slotType];
        if (!slot) continue;
        const ref = (cam.ref || cam.id).replace(/\s+/g, '_');

        if (slot.original) {
          const base64 = slot.original.replace(/^data:[^;]+;base64,/, '');
          imgFolder.file(`${ref}_${slotType}_original.jpg`, base64, { base64: true });
        }
        if (slot.annotated) {
          const base64 = slot.annotated.replace(/^data:[^;]+;base64,/, '');
          imgFolder.file(`${ref}_${slotType}_annotated.jpg`, base64, { base64: true });
        }
      }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rotakin_${siteName}_${date}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
