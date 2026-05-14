import type { AuditState } from './types';
import { classifyLevel } from './standards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsPDFInstance = any;

export async function generateSANSReport(auditData: AuditState): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { audit } = auditData;
  const { site, cameras, standards } = audit;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // Color palette
  const C = {
    bg: [11, 15, 26],
    surface: [17, 24, 39],
    surface2: [26, 34, 53],
    accent: [0, 194, 255],
    gold: [240, 180, 41],
    green: [16, 217, 138],
    red: [255, 71, 87],
    orange: [255, 107, 53],
    purple: [167, 139, 250],
    text: [232, 237, 245],
    text2: [136, 153, 180],
    text3: [74, 95, 122],
    border2: [36, 51, 82],
    white: [255, 255, 255],
  };

  // Helper: set fill color
  function setFill(rgb: number[]) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setTextColor(rgb: number[]) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
  function setDrawColor(rgb: number[]) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

  // Page background
  function paintBackground() {
    setFill(C.bg);
    doc.rect(0, 0, pageW, pageH, 'F');
  }

  // ─── PAGE 1: Cover ──────────────────────────────────────────────────────────
  paintBackground();

  // Top accent bar
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  // Logos
  let logoY = 20;
  if (audit.branding.orgLogo) {
    try {
      doc.addImage(audit.branding.orgLogo, 'PNG', margin, logoY, 40, 20, undefined, 'FAST');
    } catch { /* skip bad image */ }
  }
  if (audit.branding.clientLogo) {
    try {
      doc.addImage(audit.branding.clientLogo, 'PNG', pageW - margin - 40, logoY, 40, 20, undefined, 'FAST');
    } catch { /* skip bad image */ }
  }

  // Title block
  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('ROTAKIN', pageW / 2, 70, { align: 'center' });

  setTextColor(C.text2);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('CCTV AUDIT REPORT', pageW / 2, 80, { align: 'center' });

  // Divider
  setDrawColor(C.accent);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, 88, pageW - margin - 20, 88);

  // Report info
  setFill(C.surface);
  doc.roundedRect(margin, 95, contentW, 80, 3, 3, 'F');

  setTextColor(C.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(site.siteName || 'Site Name Not Set', pageW / 2, 113, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setTextColor(C.text2);

  const infoLines = [
    [`Report Reference:`, site.reportRef || 'N/A'],
    [`Audit Date:`, site.auditDate || 'N/A'],
    [`Engineer:`, `${site.engineerName || 'N/A'} (${site.engineerId || 'N/A'})`],
    [`Certificate No:`, site.certNumber || 'N/A'],
    [`Client:`, site.client || 'N/A'],
    [`Standard:`, site.activeStandard || 'SANS 10222-5-1-4'],
  ];

  let iy = 124;
  for (const [label, value] of infoLines) {
    setTextColor(C.text2);
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin + 15, iy);
    setTextColor(C.text);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 70, iy);
    iy += 10;
  }

  // Standard badge
  setFill(C.surface2);
  doc.roundedRect(margin, 185, contentW, 18, 3, 3, 'F');
  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${site.activeStandard || 'SANS 10222-5-1-4'} COMPLIANCE ASSESSMENT`, pageW / 2, 196, { align: 'center' });

  // Confidential notice
  setTextColor(C.text2);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('CONFIDENTIAL — This report is intended solely for the named client. Unauthorised distribution is prohibited.', pageW / 2, 240, { align: 'center' });

  // Bottom bar
  setFill(C.accent);
  doc.rect(0, pageH - 3, pageW, 3, 'F');

  logoY = logoY; // suppress unused warning

  // ─── PAGE 2: Site & Audit Details ───────────────────────────────────────────
  doc.addPage();
  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SITE & AUDIT DETAILS', margin, 20);

  setDrawColor(C.accent);
  doc.setLineWidth(0.3);
  doc.line(margin, 23, pageW - margin, 23);

  const siteRows = [
    ['Report Reference', site.reportRef],
    ['Audit Date', site.auditDate],
    ['Site Name', site.siteName],
    ['Site Address', site.siteAddress],
    ['Client', site.client],
    ['Contract No', site.contractNo],
    ['Engineer ID', site.engineerId],
    ['Engineer Name', site.engineerName],
    ['Witness Name', site.witnessName],
    ['Certificate No', site.certNumber],
    ['NVR Reference', site.nvrRef],
    ['Site Type', site.siteType],
    ['Weather', site.weather],
    ['Lux Level', site.lux],
    ['GPS Latitude', site.gpsLat],
    ['GPS Longitude', site.gpsLng],
    ['Certification Body', site.certBody],
    ['Active Standard', site.activeStandard],
    ['Notes', site.notes],
  ];

  doc.autoTable({
    startY: 28,
    head: [['Field', 'Value']],
    body: siteRows,
    margin: { left: margin, right: margin },
    styles: {
      fillColor: C.surface,
      textColor: C.text,
      lineColor: C.surface2,
      lineWidth: 0.3,
      fontSize: 9,
    },
    headStyles: {
      fillColor: C.surface2,
      textColor: C.accent,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [15, 22, 36],
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 55 },
    },
  });

  // ─── PAGE 3: Compliance Overview ────────────────────────────────────────────
  doc.addPage();
  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COMPLIANCE OVERVIEW', margin, 20);

  setDrawColor(C.accent);
  doc.setLineWidth(0.3);
  doc.line(margin, 23, pageW - margin, 23);

  // KPI row
  const totalCams = cameras.length;
  const compliant = cameras.filter(c => {
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
  const pending = cameras.filter(c => !c.measuredR).length;

  const kpiY = 30;
  const kpiW = (contentW - 9) / 4;
  const kpiData = [
    { label: 'Total', value: totalCams, color: C.accent },
    { label: 'Compliant', value: compliant, color: C.green },
    { label: 'Non-Compliant', value: nonCompliant, color: C.red },
    { label: 'Pending', value: pending, color: C.gold },
  ];
  kpiData.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 3);
    setFill(C.surface);
    doc.roundedRect(kx, kpiY, kpiW, 20, 2, 2, 'F');
    setTextColor(kpi.color as number[]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(kpi.value), kx + kpiW / 2, kpiY + 12, { align: 'center' });
    setTextColor(C.text2);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, kx + kpiW / 2, kpiY + 18, { align: 'center' });
  });

  const camRows = cameras.map(cam => {
    const ach = classifyLevel(cam.measuredR, standards);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const status = !cam.measuredR ? 'Pending' : (ach && req && ach.level >= req.level ? 'COMPLIANT' : 'NON-COMPLIANT');
    return [
      cam.ref || '—',
      cam.zone || '—',
      cam.requiredStandard || '—',
      ach ? ach.name : '—',
      cam.measuredR !== null ? `${cam.measuredR}%` : '—',
      status,
    ];
  });

  doc.autoTable({
    startY: kpiY + 28,
    head: [['Ref', 'Zone', 'Required', 'Achieved', '%R', 'Status']],
    body: camRows,
    margin: { left: margin, right: margin },
    styles: {
      fillColor: C.surface,
      textColor: C.text,
      lineColor: C.surface2,
      lineWidth: 0.3,
      fontSize: 8,
    },
    headStyles: {
      fillColor: C.surface2,
      textColor: C.accent,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [15, 22, 36],
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.row.raw[5];
        if (val === 'COMPLIANT') data.cell.styles.textColor = C.green;
        else if (val === 'NON-COMPLIANT') data.cell.styles.textColor = C.red;
        else data.cell.styles.textColor = C.gold;
      }
    },
  });

  // ─── PAGES 4+: Per-camera sections ──────────────────────────────────────────
  for (const cam of cameras) {
    doc.addPage();
    paintBackground();
    setFill(C.accent);
    doc.rect(0, 0, pageW, 3, 'F');

    const ach = classifyLevel(cam.measuredR, standards);
    const req = standards.find(s => s.name === cam.requiredStandard);

    // Camera header
    setFill(C.surface);
    doc.roundedRect(margin, 8, contentW, 22, 3, 3, 'F');

    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Camera: ${cam.ref || '(no ref)'}`, margin + 5, 18);

    setTextColor(C.text2);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cam.make} ${cam.model} | Zone: ${cam.zone || '—'} | ${cam.location || '—'}`, margin + 5, 26);

    // Level badge
    const achColor = ach ? (ach.color ? hexToRgb(ach.color) : C.green) : C.text2;
    setFill(achColor);
    const badgeText = ach ? ach.name : 'Not Measured';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const badgeW = doc.getTextWidth(badgeText) + 10;
    doc.roundedRect(pageW - margin - badgeW - 5, 10, badgeW + 5, 10, 2, 2, 'F');
    setTextColor(C.bg);
    doc.text(badgeText, pageW - margin - badgeW / 2 - 2.5, 17, { align: 'center' });

    // Details table
    const detailRows = [
      ['Make / Model', `${cam.make} ${cam.model}`],
      ['Lens', cam.lens],
      ['Zone', cam.zone],
      ['Resolution', cam.resolution],
      ['Location', cam.location],
      ['Purpose', cam.purpose],
      ['Required Standard', cam.requiredStandard],
      ['Measured %R', cam.measuredR !== null ? `${cam.measuredR}%` : 'Not measured'],
      ['Achieved Level', ach ? ach.name : '—'],
      ['Compliant', req && ach ? (ach.level >= req.level ? 'YES' : 'NO') : '—'],
      ['Mounting Height', cam.mountingHeight],
      ['Target Distance', cam.targetDistance],
      ['Lighting', cam.lighting],
      ['Notes', cam.notes],
    ];

    doc.autoTable({
      startY: 35,
      head: [['Field', 'Value']],
      body: detailRows,
      margin: { left: margin, right: margin },
      styles: {
        fillColor: C.surface,
        textColor: C.text,
        lineColor: C.surface2,
        lineWidth: 0.3,
        fontSize: 8,
      },
      headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 22, 36] },
      columnStyles: { 0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 50 } },
    });

    const afterDetailsY = (doc as JsPDFInstance).lastAutoTable.finalY + 8;

    // Audit steps
    if (cam.auditSteps.length > 0) {
      setTextColor(C.accent);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('AUDIT STEPS', margin, afterDetailsY);

      const stepRows = cam.auditSteps.map(step => {
        const def = audit.auditStepDefs.find(d => d.id === step.stepId);
        const passLabel = step.passed === true ? 'PASS' : step.passed === false ? 'FAIL' : 'N/A';
        return [def ? def.name : `Step ${step.stepId}`, step.result || '—', passLabel, step.notes || '—'];
      });

      doc.autoTable({
        startY: afterDetailsY + 5,
        head: [['Step', 'Result', 'Status', 'Notes']],
        body: stepRows,
        margin: { left: margin, right: margin },
        styles: {
          fillColor: C.surface,
          textColor: C.text,
          lineColor: C.surface2,
          lineWidth: 0.3,
          fontSize: 8,
        },
        headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [15, 22, 36] },
        columnStyles: {
          0: { cellWidth: 45 },
          2: { cellWidth: 18, fontStyle: 'bold' },
        },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === 'body' && data.column.index === 2) {
            const v = data.row.raw[2];
            if (v === 'PASS') data.cell.styles.textColor = C.green;
            else if (v === 'FAIL') data.cell.styles.textColor = C.red;
          }
        },
      });
    }

    // Face scoring
    const hasAnyFaceData = cam.faceLines.some(fl => fl.expected || fl.techRead || fl.obsRead);
    if (hasAnyFaceData) {
      const afterStepsY = (doc as JsPDFInstance).lastAutoTable.finalY + 8;
      setTextColor(C.accent);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('FACIAL SCORING', margin, afterStepsY);

      const faceRows = cam.faceLines.map(fl => {
        const match = fl.techRead && fl.obsRead &&
          fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase()
          ? 'Yes' : 'No';
        return [String(fl.lineNo), fl.expected || '—', fl.techRead || '—', fl.obsRead || '—', match];
      });

      doc.autoTable({
        startY: afterStepsY + 5,
        head: [['Line', 'Expected', 'Tech Read', 'Observer Read', 'Match']],
        body: faceRows,
        margin: { left: margin, right: margin },
        styles: {
          fillColor: C.surface,
          textColor: C.text,
          lineColor: C.surface2,
          lineWidth: 0.3,
          fontSize: 8,
        },
        headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [15, 22, 36] },
        columnStyles: { 0: { cellWidth: 15 } },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === 'body' && data.column.index === 4) {
            data.cell.styles.textColor = data.row.raw[4] === 'Yes' ? C.green : C.red;
          }
        },
      });

      const matches = cam.faceLines.filter(fl =>
        fl.techRead && fl.obsRead &&
        fl.techRead.trim().toLowerCase() === fl.obsRead.trim().toLowerCase()
      ).length;
      const score = Math.round((matches / 10) * 100);
      const scoreY = (doc as JsPDFInstance).lastAutoTable.finalY + 8;
      setFill(score >= 80 ? C.green : C.red);
      doc.roundedRect(margin, scoreY, contentW, 12, 2, 2, 'F');
      setTextColor(C.bg);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Facial Score: ${score}% (${matches}/10 matches) — ${score >= 80 ? 'PASS' : 'FAIL'}`, margin + 5, scoreY + 8);
    }
  }

  // ─── LAST PAGE: Declarations ─────────────────────────────────────────────────
  doc.addPage();
  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DECLARATIONS', margin, 20);

  setDrawColor(C.accent);
  doc.setLineWidth(0.3);
  doc.line(margin, 23, pageW - margin, 23);

  setTextColor(C.text);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const declText = [
    'I hereby certify that the audit contained in this report was conducted in accordance with the requirements of',
    `${site.activeStandard || 'SANS 10222-5-1-4'} and that the findings are true and accurate to the best of my knowledge.`,
  ];
  declText.forEach((line, i) => {
    doc.text(line, margin, 33 + i * 7);
  });

  const declData = [
    ['Engineer Name', site.engineerName || ''],
    ['Engineer ID', site.engineerId || ''],
    ['Certificate No', site.certNumber || ''],
    ['Certification Body', site.certBody || ''],
    ['Audit Date', site.auditDate || ''],
    ['Site', site.siteName || ''],
    ['Report Ref', site.reportRef || ''],
  ];

  doc.autoTable({
    startY: 52,
    body: declData,
    margin: { left: margin, right: margin },
    styles: {
      fillColor: C.surface,
      textColor: C.text,
      lineColor: C.surface2,
      lineWidth: 0.3,
      fontSize: 9,
    },
    columnStyles: { 0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 55 } },
  });

  const sigY = (doc as JsPDFInstance).lastAutoTable.finalY + 20;

  // Engineer signature block
  setFill(C.surface);
  doc.roundedRect(margin, sigY, (contentW / 2) - 5, 45, 3, 3, 'F');
  setTextColor(C.text2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ENGINEER SIGNATURE', margin + 5, sigY + 10);
  setTextColor(C.text);
  doc.setFont('helvetica', 'normal');
  doc.text(site.engineerName || '___________________________', margin + 5, sigY + 22);
  setTextColor(C.text3);
  doc.setFontSize(8);
  doc.text('Name (print)', margin + 5, sigY + 29);
  setDrawColor(C.border2);
  doc.setLineWidth(0.5);
  doc.line(margin + 5, sigY + 40, margin + (contentW / 2) - 15, sigY + 40);
  setTextColor(C.text3);
  doc.text('Signature', margin + 5, sigY + 44);

  // Witness signature block
  const wx = margin + (contentW / 2) + 5;
  setFill(C.surface);
  doc.roundedRect(wx, sigY, (contentW / 2) - 5, 45, 3, 3, 'F');
  setTextColor(C.text2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('WITNESS SIGNATURE', wx + 5, sigY + 10);
  setTextColor(C.text);
  doc.setFont('helvetica', 'normal');
  doc.text(site.witnessName || '___________________________', wx + 5, sigY + 22);
  setTextColor(C.text3);
  doc.setFontSize(8);
  doc.text('Name (print)', wx + 5, sigY + 29);
  setDrawColor(C.border2);
  doc.line(wx + 5, sigY + 40, wx + (contentW / 2) - 15, sigY + 40);
  doc.text('Signature', wx + 5, sigY + 44);

  // Footer
  setFill(C.accent);
  doc.rect(0, pageH - 3, pageW, 3, 'F');
  setTextColor(C.text2);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated by Rotakin v3 | ${new Date().toLocaleString()}`, pageW / 2, pageH - 7, { align: 'center' });

  // Save
  const filename = `Rotakin_Audit_${site.reportRef || site.siteName || 'report'}_${site.auditDate || 'date'}.pdf`
    .replace(/\s+/g, '_');
  doc.save(filename);
}

function hexToRgb(hex: string): number[] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}
