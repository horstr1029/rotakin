import type { AuditState } from './types';
import { classifyLevel } from './standards';

function esc(s: string | number | null | undefined): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusDot(color: string): string {
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>`;
}

export function generateHTMLReport(auditData: AuditState): void {
  const { site, cameras, standards, branding } = auditData.audit;
  const signatures = auditData.audit.signatures ?? { engineer: '', witness: '' };
  const date = new Date().toISOString().split('T')[0];
  const ref = site.reportRef || 'audit';

  const compliantCameras = cameras.filter(c => {
    const ach = classifyLevel(c.measuredR, standards);
    const req = standards.find(s => s.name === c.requiredStandard);
    return ach && req && ach.level >= req.level;
  });
  const complianceRate = cameras.length > 0 ? Math.round((compliantCameras.length / cameras.length) * 100) : 0;
  const nonCompliant = cameras.length - compliantCameras.length;
  const avgR = cameras.filter(c => c.measuredR !== null).length > 0
    ? Math.round(cameras.filter(c => c.measuredR !== null).reduce((a, c) => a + (c.measuredR ?? 0), 0) / cameras.filter(c => c.measuredR !== null).length)
    : 0;

  const compColor = complianceRate >= 90 ? '#10d98a' : complianceRate >= 70 ? '#f0b429' : '#ff4757';

  const cameraRows = cameras.map(cam => {
    const ach = classifyLevel(cam.measuredR, standards);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const compliant = ach && req && ach.level >= req.level;
    const verdictColor = compliant ? '#10d98a' : cam.measuredR === null ? '#8899b4' : '#ff4757';
    const verdictText = cam.measuredR === null ? 'Not Measured' : compliant ? 'Compliant' : 'Non-Compliant';

    const img = cam.images.static?.annotated || cam.images.static?.original || '';
    const imgTag = img ? `<img src="${img}" alt="${esc(cam.ref)}" style="width:100%;height:140px;object-fit:cover;border-radius:6px;margin-bottom:10px;">` : `<div style="width:100%;height:140px;background:#1a2235;border-radius:6px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;color:#4a5f7a;font-size:12px;">No Image</div>`;

    return `
    <div style="background:#111827;border:1px solid #1e2d45;border-radius:10px;padding:16px;break-inside:avoid;">
      ${imgTag}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:15px;font-weight:700;color:#e8edf5;">${esc(cam.ref || 'Unknown')}</span>
        <span style="font-size:11px;font-weight:600;color:${verdictColor};background:${verdictColor}22;border:1px solid ${verdictColor}44;border-radius:4px;padding:2px 8px;">${verdictText}</span>
      </div>
      <div style="font-size:12px;color:#8899b4;margin-bottom:6px;">${esc(cam.zone || '—')} · ${esc(cam.location || '—')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
        <div style="color:#4a5f7a;">Required</div><div style="color:#e8edf5;">${esc(cam.requiredStandard)}</div>
        <div style="color:#4a5f7a;">Achieved</div><div style="color:${ach?.color || '#8899b4'};">${esc(ach?.name || '—')}</div>
        <div style="color:#4a5f7a;">%R</div><div style="color:#00c2ff;font-weight:600;">${cam.measuredR !== null ? cam.measuredR + '%' : '—'}</div>
        <div style="color:#4a5f7a;">Make/Model</div><div style="color:#e8edf5;">${esc(cam.make)} ${esc(cam.model)}</div>
      </div>
      ${cam.notes ? `<div style="margin-top:8px;font-size:11px;color:#8899b4;border-top:1px solid #1e2d45;padding-top:8px;">${esc(cam.notes)}</div>` : ''}
    </div>`;
  }).join('\n');

  const orgLogoTag = branding.orgLogo ? `<img src="${branding.orgLogo}" alt="Logo" style="height:48px;object-fit:contain;">` : '';
  const clientLogoTag = branding.clientLogo ? `<img src="${branding.clientLogo}" alt="Client Logo" style="height:40px;object-fit:contain;">` : '';
  const engSigTag = signatures.engineer ? `<img src="${signatures.engineer}" alt="Signature" style="height:50px;object-fit:contain;margin-top:4px;">` : '<div style="height:50px;border-bottom:1px solid #243352;width:200px;"></div>';
  const witSigTag = signatures.witness ? `<img src="${signatures.witness}" alt="Signature" style="height:50px;object-fit:contain;margin-top:4px;">` : '<div style="height:50px;border-bottom:1px solid #243352;width:200px;"></div>';

  const companyBlock = branding.companyName ? `
    <div style="font-size:13px;color:#8899b4;margin-top:4px;">${esc(branding.companyName)}</div>
    ${branding.companyAddress ? `<div style="font-size:12px;color:#4a5f7a;">${esc(branding.companyAddress)}</div>` : ''}
    ${branding.companyPhone ? `<div style="font-size:12px;color:#4a5f7a;">${esc(branding.companyPhone)}</div>` : ''}
    ${branding.companyEmail ? `<div style="font-size:12px;color:#4a5f7a;">${esc(branding.companyEmail)}</div>` : ''}
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rotakin Audit Report — ${esc(site.siteName || ref)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0b0f1a; color: #e8edf5; }
  @media print {
    .no-print { display: none !important; }
    body { background: white; color: black; }
  }
</style>
</head>
<body>

<!-- Top bar -->
<div style="background:#00c2ff;height:4px;"></div>

<!-- Header -->
<div style="background:#111827;border-bottom:1px solid #1e2d45;padding:24px 40px;">
  <div style="max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:16px;">
      ${orgLogoTag}
      <div>
        <div style="font-size:22px;font-weight:800;color:#e8edf5;">CCTV Compliance Audit Report</div>
        <div style="font-size:13px;color:#8899b4;margin-top:2px;">${esc(site.activeStandard)} · ${esc(site.auditDate)} · Ref: ${esc(ref)}</div>
        ${companyBlock}
      </div>
    </div>
    <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
      ${clientLogoTag}
      <div style="font-size:13px;color:#8899b4;">${esc(site.client)}</div>
    </div>
  </div>
</div>

<!-- KPI bar -->
<div style="background:#111827;border-bottom:1px solid #1e2d45;padding:20px 40px;">
  <div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;">
    <div style="text-align:center;">
      <div style="font-size:36px;font-weight:800;color:${compColor};">${complianceRate}%</div>
      <div style="font-size:12px;color:#8899b4;margin-top:4px;">Compliance Rate</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:36px;font-weight:800;color:#e8edf5;">${cameras.length}</div>
      <div style="font-size:12px;color:#8899b4;margin-top:4px;">Total Cameras</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:36px;font-weight:800;color:#ff4757;">${nonCompliant}</div>
      <div style="font-size:12px;color:#8899b4;margin-top:4px;">Non-Compliant</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:36px;font-weight:800;color:#00c2ff;">${avgR > 0 ? avgR + '%' : '—'}</div>
      <div style="font-size:12px;color:#8899b4;margin-top:4px;">Average %R</div>
    </div>
  </div>
</div>

<!-- Site Info -->
<div style="max-width:1100px;margin:32px auto;padding:0 40px;">
  <div style="background:#111827;border:1px solid #1e2d45;border-radius:10px;padding:20px;">
    <div style="font-size:13px;font-weight:700;color:#00c2ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;">Site Information</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;font-size:13px;">
      <div><span style="color:#4a5f7a;">Site Name</span><br><strong style="color:#e8edf5;">${esc(site.siteName || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Address</span><br><strong style="color:#e8edf5;">${esc(site.siteAddress || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Client</span><br><strong style="color:#e8edf5;">${esc(site.client || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Engineer</span><br><strong style="color:#e8edf5;">${esc(site.engineerName || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Engineer ID</span><br><strong style="color:#e8edf5;">${esc(site.engineerId || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Cert. Number</span><br><strong style="color:#e8edf5;">${esc(site.certNumber || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Weather</span><br><strong style="color:#e8edf5;">${esc(site.weather || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Lux Level</span><br><strong style="color:#e8edf5;">${esc(site.lux || '—')}</strong></div>
      <div><span style="color:#4a5f7a;">Contract No</span><br><strong style="color:#e8edf5;">${esc(site.contractNo || '—')}</strong></div>
    </div>
    ${site.notes ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #1e2d45;font-size:13px;color:#8899b4;">${esc(site.notes)}</div>` : ''}
  </div>
</div>

<!-- Camera grid -->
<div style="max-width:1100px;margin:0 auto 32px;padding:0 40px;">
  <div style="font-size:13px;font-weight:700;color:#00c2ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;">Camera Records (${cameras.length})</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">
    ${cameraRows || '<div style="color:#4a5f7a;font-size:13px;">No cameras recorded.</div>'}
  </div>
</div>

<!-- Signatures -->
<div style="max-width:1100px;margin:0 auto 40px;padding:0 40px;">
  <div style="background:#111827;border:1px solid #1e2d45;border-radius:10px;padding:20px;">
    <div style="font-size:13px;font-weight:700;color:#00c2ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:20px;">Sign-off</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
      <div>
        <div style="font-size:12px;color:#4a5f7a;margin-bottom:8px;">Auditing Engineer</div>
        ${engSigTag}
        <div style="font-size:13px;font-weight:600;color:#e8edf5;margin-top:6px;">${esc(site.engineerName || '—')}</div>
        <div style="font-size:12px;color:#4a5f7a;">${esc(site.engineerId || '')}${site.certBody ? ' · ' + esc(site.certBody) : ''}</div>
      </div>
      <div>
        <div style="font-size:12px;color:#4a5f7a;margin-bottom:8px;">Witness / Client Representative</div>
        ${witSigTag}
        <div style="font-size:13px;font-weight:600;color:#e8edf5;margin-top:6px;">${esc(site.witnessName || '—')}</div>
        <div style="font-size:12px;color:#4a5f7a;">${esc(site.client || '')}</div>
      </div>
    </div>
  </div>
</div>

<!-- Footer -->
<div style="background:#111827;border-top:1px solid #1e2d45;padding:16px 40px;text-align:center;">
  <div style="font-size:12px;color:#4a5f7a;">Generated by Rotakin v3 · ${date} · ${esc(site.activeStandard)}</div>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `rotakin_report_${ref}_${date}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}
