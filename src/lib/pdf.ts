import type { AuditState } from './types';
import { classifyLevel } from './standards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsPDFInstance = any;

const DARK_PALETTE = {
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
  altRow: [15, 22, 36],
};

const LIGHT_PALETTE = {
  bg: [255, 255, 255],
  surface: [248, 250, 252],
  surface2: [241, 245, 249],
  accent: [0, 136, 187],
  gold: [217, 119, 6],
  green: [5, 150, 105],
  red: [220, 38, 38],
  orange: [234, 88, 12],
  purple: [109, 40, 217],
  text: [15, 23, 42],
  text2: [71, 85, 105],
  text3: [148, 163, 184],
  border2: [203, 213, 225],
  white: [255, 255, 255],
  altRow: [241, 245, 249],
};

function getPalette(lightMode: boolean) {
  return lightMode ? LIGHT_PALETTE : DARK_PALETTE;
}

export async function generateSANSReport(auditData: AuditState, lightMode: boolean = false): Promise<void> {
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
  const C = getPalette(lightMode);

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
      fillColor: C.altRow,
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
      fillColor: C.altRow,
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
      alternateRowStyles: { fillColor: C.altRow },
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
        alternateRowStyles: { fillColor: C.altRow },
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
        alternateRowStyles: { fillColor: C.altRow },
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

    // Test Record section
    const tr = cam.testRecord;
    const hasTestData = tr && (
      tr.timeDay || tr.timeNight || tr.luxLevel || tr.verticalFOV || tr.distanceToObjective ||
      tr.facialTest.actual || tr.resolution.actual || tr.rotakinR.actual ||
      tr.depthOfFocus.actual || tr.colourSeparation.actual || tr.motionBlur.actual ||
      tr.problemsMST || tr.recommendationsMST || tr.problemsClient || tr.recommendationsClient
    );

    if (hasTestData) {
      const afterPrevY = (doc as JsPDFInstance).lastAutoTable.finalY + 8;

      setTextColor(C.accent);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TEST RECORD', margin, afterPrevY);

      const headerInfoRow = [
        `Day: ${tr.timeDay || '—'}`,
        `Night: ${tr.timeNight || '—'}`,
        `Lux: ${tr.luxLevel || '—'}`,
        `Distance: ${tr.distanceToObjective || '—'}`,
        `V-FOV: ${tr.verticalFOV || '—'}`,
      ].join('   ');

      setTextColor(C.text2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(headerInfoRow, margin, afterPrevY + 6);

      const testCategoryRows = [
        { label: 'Facial Test', cat: tr.facialTest },
        { label: 'Resolution', cat: tr.resolution },
        { label: '%R (Rotakin)', cat: tr.rotakinR },
        { label: 'Depth of Focus', cat: tr.depthOfFocus },
        { label: 'Colour Separation', cat: tr.colourSeparation },
        { label: 'Motion Blur', cat: tr.motionBlur },
      ].map(({ label, cat }) => {
        const matchFlag =
          cat.actual && cat.actual !== 'N/A'
            ? cat.actual.trim().toLowerCase() === cat.expected.trim().toLowerCase()
              ? 'Match'
              : 'No Match'
            : '—';
        return [label, cat.expected || '—', cat.actual || '—', matchFlag];
      });

      doc.autoTable({
        startY: afterPrevY + 11,
        head: [['Test', 'Expected', 'Actual', 'Match']],
        body: testCategoryRows,
        margin: { left: margin, right: margin },
        styles: {
          fillColor: C.surface,
          textColor: C.text,
          lineColor: C.surface2,
          lineWidth: 0.3,
          fontSize: 8,
        },
        headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: C.altRow },
        columnStyles: {
          0: { cellWidth: 45 },
          3: { cellWidth: 22, fontStyle: 'bold' },
        },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === 'body' && data.column.index === 3) {
            const v = data.row.raw[3];
            if (v === 'Match') data.cell.styles.textColor = C.green;
            else if (v === 'No Match') data.cell.styles.textColor = C.red;
          }
        },
      });

      const verdictY = (doc as JsPDFInstance).lastAutoTable.finalY + 6;
      const verdictColor = tr.verdict === 'pass' ? C.green : tr.verdict === 'fail' ? C.red : C.gold;
      setFill(verdictColor);
      doc.roundedRect(margin, verdictY, contentW, 12, 2, 2, 'F');
      setTextColor(C.bg);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`VERDICT: ${tr.verdict.toUpperCase()}`, margin + 5, verdictY + 8);

      let notesY = verdictY + 18;

      if (tr.problemsMST || tr.recommendationsMST) {
        setTextColor(C.text2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('MST Projects', margin, notesY);
        notesY += 5;
        if (tr.problemsMST) {
          setTextColor(C.text2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text('Problems:', margin, notesY);
          setTextColor(C.text);
          doc.setFont('helvetica', 'normal');
          const pLines = doc.splitTextToSize(tr.problemsMST, contentW - 10);
          doc.text(pLines, margin + 25, notesY);
          notesY += pLines.length * 4 + 3;
        }
        if (tr.recommendationsMST) {
          setTextColor(C.text2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text('Recommendations:', margin, notesY);
          setTextColor(C.text);
          doc.setFont('helvetica', 'normal');
          const rLines = doc.splitTextToSize(tr.recommendationsMST, contentW - 10);
          doc.text(rLines, margin + 35, notesY);
          notesY += rLines.length * 4 + 3;
        }
        notesY += 4;
      }

      if (tr.problemsClient || tr.recommendationsClient) {
        setTextColor(C.text2);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Client', margin, notesY);
        notesY += 5;
        if (tr.problemsClient) {
          setTextColor(C.text2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text('Problems:', margin, notesY);
          setTextColor(C.text);
          doc.setFont('helvetica', 'normal');
          const pLines = doc.splitTextToSize(tr.problemsClient, contentW - 10);
          doc.text(pLines, margin + 25, notesY);
          notesY += pLines.length * 4 + 3;
        }
        if (tr.recommendationsClient) {
          setTextColor(C.text2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text('Recommendations:', margin, notesY);
          setTextColor(C.text);
          doc.setFont('helvetica', 'normal');
          const rLines = doc.splitTextToSize(tr.recommendationsClient, contentW - 10);
          doc.text(rLines, margin + 35, notesY);
        }
      }
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

async function generateTestCertificatePage(
  doc: JsPDFInstance,
  auditData: AuditState,
  cam: { id: string } & Record<string, unknown>,
  isFirstPage: boolean,
  lightMode: boolean = false
): Promise<void> {
  const { audit } = auditData;
  const { site, standards } = audit;
  const camera = audit.cameras.find(c => c.id === (cam as { id: string }).id);
  if (!camera) return;

  const tr = camera.testRecord;
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  const C = getPalette(lightMode);

  function setFill(rgb: number[]) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setTextColor(rgb: number[]) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
  function setDrawColor(rgb: number[]) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

  if (!isFirstPage) doc.addPage();

  setFill(C.bg);
  doc.rect(0, 0, pageW, pageH, 'F');

  // 1. Top accent bar
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  // 2. Header row (y=8, height=20)
  const headerY = 8;
  if (audit.branding.orgLogo) {
    try { doc.addImage(audit.branding.orgLogo, 'PNG', margin, headerY, 35, 15, undefined, 'FAST'); } catch { /* skip */ }
  }
  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ROTAKIN CCTV TEST CERTIFICATE', pageW / 2, headerY + 9, { align: 'center' });
  if (audit.branding.clientLogo) {
    try { doc.addImage(audit.branding.clientLogo, 'PNG', pageW - margin - 35, headerY, 35, 15, undefined, 'FAST'); } catch { /* skip */ }
  }

  // 3. Camera info box (y=32, height=28)
  const camBoxY = 32;
  setFill(C.surface);
  doc.roundedRect(margin, camBoxY, contentW, 28, 3, 3, 'F');
  setTextColor(C.text2);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Camera Ref', margin + 4, camBoxY + 7);
  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(camera.ref || '—', margin + 4, camBoxY + 16);
  setTextColor(C.text2);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${camera.make} ${camera.model}`.trim() || '—', margin + 4, camBoxY + 23);

  const rightX = pageW - margin - 4;
  const infoItems = [
    ['Site', site.siteName || '—'],
    ['Date', site.auditDate || '—'],
    ['Engineer', site.engineerName || '—'],
  ];
  infoItems.forEach(([label, value], i) => {
    const iy = camBoxY + 8 + i * 8;
    setTextColor(C.text2);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label, rightX - 60, iy);
    setTextColor(C.text);
    doc.setFont('helvetica', 'normal');
    doc.text(value, rightX, iy, { align: 'right' });
  });

  // 4. Standard badge bar (y=64, height=12)
  const standardY = 64;
  setFill(C.surface2);
  doc.rect(margin, standardY, contentW, 12, 'F');
  setTextColor(C.text2);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const reqStandard = standards.find(s => s.name === camera.requiredStandard);
  doc.text(`Required: ${camera.requiredStandard || '—'}`, margin + 4, standardY + 8);
  doc.text(`Target: ${reqStandard ? `≥${reqStandard.minR}%R` : '—'}`, pageW / 2, standardY + 8, { align: 'center' });
  doc.text(`Distance: ${tr.distanceToObjective || '—'}`, pageW - margin - 4, standardY + 8, { align: 'right' });

  // 5. Test time/lux row (y=80, height=10)
  const timeY = 80;
  setFill(C.surface);
  doc.rect(margin, timeY, contentW, 10, 'F');
  setTextColor(C.text2);
  doc.setFontSize(7);
  const timeItems = [
    `Day: ${tr.timeDay || '—'}`,
    `Night: ${tr.timeNight || '—'}`,
    `Lux: ${tr.luxLevel || '—'}`,
    `FOV: ${tr.verticalFOV || '—'}`,
  ];
  const colW = contentW / timeItems.length;
  timeItems.forEach((item, i) => {
    doc.text(item, margin + i * colW + colW / 2, timeY + 7, { align: 'center' });
  });

  // 6. TEST RESULTS TABLE (y=94)
  const tableStartY = 94;
  const rowH = 10;
  const colWidths = [contentW * 0.4, contentW * 0.25, contentW * 0.25, contentW * 0.1];
  const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

  setFill(C.surface2);
  doc.rect(margin, tableStartY, contentW, rowH, 'F');
  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  ['TEST CATEGORY', 'EXPECTED', 'ACTUAL', 'RESULT'].forEach((h, i) => {
    doc.text(h, colX[i] + 2, tableStartY + 7);
  });

  const testCategories = [
    { label: 'Facial Test', cat: tr.facialTest },
    { label: 'Resolution', cat: tr.resolution },
    { label: '%R (Rotakin)', cat: tr.rotakinR },
    { label: 'Depth of Focus', cat: tr.depthOfFocus },
    { label: 'Colour Separation', cat: tr.colourSeparation },
    { label: 'Motion Blur', cat: tr.motionBlur },
  ];

  testCategories.forEach(({ label, cat }, i) => {
    const ry = tableStartY + rowH + i * rowH;
    setFill(i % 2 === 0 ? C.surface : C.surface2);
    doc.rect(margin, ry, contentW, rowH, 'F');
    setTextColor(C.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(label, colX[0] + 2, ry + 7);
    setTextColor(C.text2);
    doc.text(cat.expected || '—', colX[1] + 2, ry + 7);
    setTextColor(C.text2);
    doc.text(cat.actual || '—', colX[2] + 2, ry + 7);

    if (!cat.actual || cat.actual === 'N/A' || cat.actual.trim() === '') {
      setTextColor(C.text3);
      doc.setFont('helvetica', 'normal');
      doc.text('—', colX[3] + colWidths[3] / 2, ry + 7, { align: 'center' });
    } else if (cat.actual.trim().toLowerCase() === cat.expected.trim().toLowerCase()) {
      setTextColor(C.green);
      doc.setFont('helvetica', 'bold');
      doc.text('✓', colX[3] + colWidths[3] / 2, ry + 7, { align: 'center' });
    } else {
      setTextColor(C.red);
      doc.setFont('helvetica', 'bold');
      doc.text('✗', colX[3] + colWidths[3] / 2, ry + 7, { align: 'center' });
    }
  });

  const afterTableY = tableStartY + rowH + testCategories.length * rowH;

  // 7. OVERALL VERDICT box (y after table + 8, height=20)
  const verdictY = afterTableY + 8;
  const verdictH = 20;
  let verdictBg: number[], verdictBorderColor: number[], verdictTextColor: number[], verdictText: string;
  if (tr.verdict === 'pass') {
    verdictBg = [16, 217, 138]; verdictBorderColor = C.green; verdictTextColor = C.green; verdictText = 'PASS';
  } else if (tr.verdict === 'fail') {
    verdictBg = [255, 71, 87]; verdictBorderColor = C.red; verdictTextColor = C.red; verdictText = 'FAIL';
  } else {
    verdictBg = [240, 180, 41]; verdictBorderColor = C.gold; verdictTextColor = C.gold; verdictText = 'PENDING';
  }
  doc.setFillColor(verdictBg[0], verdictBg[1], verdictBg[2]);
  doc.setGState(new (doc as JsPDFInstance).GState({ opacity: 0.15 }));
  doc.roundedRect(margin, verdictY, contentW, verdictH, 3, 3, 'F');
  doc.setGState(new (doc as JsPDFInstance).GState({ opacity: 1 }));
  setDrawColor(verdictBorderColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, verdictY, contentW, verdictH, 3, 3, 'S');
  setTextColor(verdictTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(verdictText, pageW / 2, verdictY + 14, { align: 'center' });

  // 8. %R measurement bar (y after verdict + 6, height=16)
  const rBarY = verdictY + verdictH + 6;
  setFill(C.surface);
  doc.rect(margin, rBarY, contentW, 16, 'F');
  const achievedLevel = classifyLevel(camera.measuredR, standards);
  const levelColor = achievedLevel ? hexToRgb(achievedLevel.color) : C.text3;
  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Measured %R: ${camera.measuredR !== null ? camera.measuredR + '%' : '—'}`, margin + 4, rBarY + 7);
  setTextColor(levelColor);
  doc.text(`Achieved Level: ${achievedLevel ? achievedLevel.name : '—'}`, pageW - margin - 4, rBarY + 7, { align: 'right' });

  const progressY = rBarY + 10;
  const progressH = 3;
  setFill(C.surface2);
  doc.rect(margin, progressY, contentW, progressH, 'F');
  if (camera.measuredR !== null) {
    const fillW = Math.min(1, camera.measuredR / 120) * contentW;
    setFill(levelColor);
    doc.rect(margin, progressY, fillW, progressH, 'F');
  }

  // 9. Problems / Recommendations
  let currentY = rBarY + 16 + 6;
  const hasProblems = tr.problemsMST || tr.recommendationsMST || tr.problemsClient || tr.recommendationsClient;
  if (hasProblems) {
    const halfW = (contentW - 4) / 2;
    const sections = [
      { label: 'MST Projects', problems: tr.problemsMST, recommendations: tr.recommendationsMST },
      { label: 'Client', problems: tr.problemsClient, recommendations: tr.recommendationsClient },
    ];
    sections.forEach((section, si) => {
      if (!section.problems && !section.recommendations) return;
      const sx = margin + si * (halfW + 4);
      let sy = currentY;
      setTextColor(C.text2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(section.label, sx, sy);
      sy += 5;
      if (section.problems) {
        setTextColor(C.red);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Problems:', sx, sy);
        setTextColor(C.text);
        doc.setFont('helvetica', 'normal');
        const pLines = doc.splitTextToSize(section.problems, halfW - 4);
        doc.text(pLines, sx, sy + 4);
        sy += 4 + pLines.length * 4;
      }
      if (section.recommendations) {
        setTextColor(C.gold);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Recommendations:', sx, sy + 2);
        setTextColor(C.text);
        doc.setFont('helvetica', 'normal');
        const rLines = doc.splitTextToSize(section.recommendations, halfW - 4);
        doc.text(rLines, sx, sy + 6);
      }
    });
    currentY += 30;
  }

  // 10. Signature blocks (y=240 or after content + gap)
  const sigY = Math.max(currentY + 10, 240);
  const halfSigW = (contentW - 4) / 2;
  const sigBlocks = [
    { label: 'ENGINEER', name: site.engineerName, x: margin },
    { label: 'WITNESS', name: site.witnessName, x: margin + halfSigW + 4 },
  ];
  sigBlocks.forEach(({ label, name, x }) => {
    setFill(C.surface);
    doc.roundedRect(x, sigY, halfSigW, 30, 2, 2, 'F');
    setTextColor(C.text2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label, x + 4, sigY + 7);
    setTextColor(C.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(name || '___________________________', x + 4, sigY + 15);
    setDrawColor(C.border2);
    doc.setLineWidth(0.3);
    doc.line(x + 4, sigY + 26, x + halfSigW - 4, sigY + 26);
    setTextColor(C.text3);
    doc.setFontSize(6);
    doc.text('Signature', x + 4, sigY + 29);
  });

  // 11. Bottom accent bar
  setFill(C.accent);
  doc.rect(0, pageH - 3, pageW, 3, 'F');

  // 12. Footer text
  setTextColor(C.text2);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated by Rotakin v3 | ${new Date().toLocaleString()}`, pageW / 2, pageH - 6, { align: 'center' });
}

export async function generateTestResultCards(auditData: AuditState, lightMode: boolean = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { cameras } = auditData.audit;

  for (let i = 0; i < cameras.length; i++) {
    await generateTestCertificatePage(doc, auditData, cameras[i] as unknown as { id: string } & Record<string, unknown>, i === 0, lightMode);
  }

  const { site } = auditData.audit;
  const date = new Date().toISOString().slice(0, 10);
  const filename = `Rotakin_TestCertificates_${site.reportRef || site.siteName || 'report'}_${date}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}

export async function generateSingleTestResult(auditData: AuditState, cameraId: string, lightMode: boolean = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const camera = auditData.audit.cameras.find(c => c.id === cameraId);
  if (!camera) return;

  await generateTestCertificatePage(doc, auditData, camera as unknown as { id: string } & Record<string, unknown>, true, lightMode);

  const { site } = auditData.audit;
  const date = new Date().toISOString().slice(0, 10);
  const filename = `Rotakin_TestCert_${camera.ref || cameraId}_${date}.pdf`.replace(/\s+/g, '_');
  doc.save(filename);
}

function hexToRgb(hex: string): number[] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function makePdfHelpers(doc: JsPDFInstance, lightMode: boolean = false) {
  const C = getPalette(lightMode);
  const pageW: number = doc.internal.pageSize.getWidth();
  const pageH: number = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  function setFill(rgb: number[]) { doc.setFillColor(rgb[0], rgb[1], rgb[2]); }
  function setTextColor(rgb: number[]) { doc.setTextColor(rgb[0], rgb[1], rgb[2]); }
  function setDrawColor(rgb: number[]) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]); }

  function paintBackground() {
    setFill(C.bg);
    doc.rect(0, 0, pageW, pageH, 'F');
  }

  function topBar() {
    setFill(C.accent);
    doc.rect(0, 0, pageW, 3, 'F');
  }

  function bottomBar() {
    setFill(C.accent);
    doc.rect(0, pageH - 3, pageW, 3, 'F');
    setTextColor(C.text2);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated by Rotakin v3 | ${new Date().toLocaleString()}`, pageW / 2, pageH - 7, { align: 'center' });
  }

  function pageHeader(title: string) {
    paintBackground();
    topBar();
    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title, margin, 20);
    setDrawColor(C.accent);
    doc.setLineWidth(0.3);
    doc.line(margin, 23, pageW - margin, 23);
  }

  return { C, pageW, pageH, margin, contentW, setFill, setTextColor, setDrawColor, paintBackground, topBar, bottomBar, pageHeader };
}

export async function generateExecutiveSummary(auditData: AuditState, lightMode: boolean = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { audit } = auditData;
  const { site, cameras, standards } = audit;
  const { C, pageW, pageH, margin, contentW, setFill, setTextColor, setDrawColor, paintBackground, bottomBar } = makePdfHelpers(doc, lightMode);

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
  const compRate = totalCams > 0 ? Math.round((compliant / totalCams) * 100) : 0;

  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('EXECUTIVE SUMMARY', pageW / 2, 55, { align: 'center' });

  setTextColor(C.text2);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(site.siteName || 'Site', pageW / 2, 65, { align: 'center' });
  doc.text(`${site.auditDate || ''}  ·  ${site.engineerName || ''}`, pageW / 2, 73, { align: 'center' });

  const rateColor = compRate >= 80 ? C.green : compRate >= 50 ? C.gold : C.red;
  setTextColor(rateColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(64);
  doc.text(`${compRate}%`, pageW / 2, 110, { align: 'center' });

  setTextColor(C.text2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPLIANCE RATE', pageW / 2, 120, { align: 'center' });

  const kpiW = (contentW - 9) / 4;
  const kpiY = 130;
  const kpiData = [
    { label: 'Total', value: totalCams, color: C.accent },
    { label: 'Compliant', value: compliant, color: C.green },
    { label: 'Non-Compliant', value: nonCompliant, color: C.red },
    { label: 'Pending', value: pending, color: C.gold },
  ];
  kpiData.forEach((kpi, i) => {
    const kx = margin + i * (kpiW + 3);
    setFill(C.surface);
    doc.roundedRect(kx, kpiY, kpiW, 22, 2, 2, 'F');
    setTextColor(kpi.color as number[]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(String(kpi.value), kx + kpiW / 2, kpiY + 13, { align: 'center' });
    setTextColor(C.text2);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, kx + kpiW / 2, kpiY + 19, { align: 'center' });
  });

  const nonCompliantCams = cameras.filter(c => {
    if (!c.measuredR) return false;
    const ach = classifyLevel(c.measuredR, standards);
    const req = standards.find(s => s.name === c.requiredStandard);
    return ach && req && ach.level < req.level;
  }).slice(0, 3);

  if (nonCompliantCams.length > 0) {
    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOP NON-COMPLIANT CAMERAS', margin, kpiY + 32);

    const ncRows = nonCompliantCams.map(c => {
      const ach = classifyLevel(c.measuredR, standards);
      const req = standards.find(s => s.name === c.requiredStandard);
      return [c.ref || '—', c.zone || '—', req ? req.name : '—', ach ? ach.name : '—', c.measuredR !== null ? `${c.measuredR}%` : '—'];
    });

    doc.autoTable({
      startY: kpiY + 36,
      head: [['Ref', 'Zone', 'Required', 'Achieved', '%R']],
      body: ncRows,
      margin: { left: margin, right: margin },
      styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 8 },
      headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.altRow },
    });
  }

  const afterY = nonCompliantCams.length > 0 ? (doc as JsPDFInstance).lastAutoTable.finalY + 10 : kpiY + 32;

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RECOMMENDATIONS', margin, afterY);

  const recommendations: string[] = [];
  if (nonCompliant > 0) recommendations.push(`Review and reposition ${nonCompliant} non-compliant camera${nonCompliant > 1 ? 's' : ''} to achieve required %R thresholds.`);
  if (pending > 0) recommendations.push(`Complete %R measurement for ${pending} untested camera${pending > 1 ? 's' : ''}.`);
  if (compRate < 80) recommendations.push('Schedule follow-up audit within 30 days after remediation work is complete.');
  if (recommendations.length === 0) recommendations.push('All cameras are compliant. Schedule periodic re-audit to maintain certification.');

  setTextColor(C.text2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  recommendations.forEach((r, i) => {
    doc.text(`• ${r}`, margin + 3, afterY + 8 + i * 7);
  });

  bottomBar();

  doc.addPage();
  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LEVEL DISTRIBUTION', margin, 20);
  setDrawColor(C.accent);
  doc.setLineWidth(0.3);
  doc.line(margin, 23, pageW - margin, 23);

  const levelGroups: Record<string, number> = {};
  for (const cam of cameras) {
    const ach = classifyLevel(cam.measuredR, standards);
    const name = ach ? ach.name : 'Not Measured';
    levelGroups[name] = (levelGroups[name] ?? 0) + 1;
  }

  doc.autoTable({
    startY: 28,
    head: [['Level', 'Camera Count', 'Percentage']],
    body: Object.entries(levelGroups).map(([name, count]) => [
      name,
      String(count),
      `${Math.round((count / Math.max(totalCams, 1)) * 100)}%`,
    ]),
    margin: { left: margin, right: margin },
    styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 9 },
    headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.altRow },
  });

  const signY = (doc as JsPDFInstance).lastAutoTable.finalY + 30;
  setFill(C.surface);
  doc.roundedRect(margin, signY, contentW / 2 - 5, 40, 3, 3, 'F');
  setTextColor(C.text2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ENGINEER SIGN-OFF', margin + 5, signY + 10);
  setDrawColor(C.border2);
  doc.setLineWidth(0.5);
  doc.line(margin + 5, signY + 33, margin + contentW / 2 - 15, signY + 33);
  setTextColor(C.text3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature & Date', margin + 5, signY + 38);

  bottomBar();

  const fname = `Rotakin_Executive_${site.reportRef || site.siteName || 'report'}.pdf`.replace(/\s+/g, '_');
  doc.save(fname);
}

export async function generateTechnicalAppendix(auditData: AuditState, lightMode: boolean = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { audit } = auditData;
  const { site, cameras, standards } = audit;
  const { C, pageW, margin, setFill, setTextColor, setDrawColor, bottomBar, pageHeader } = makePdfHelpers(doc, lightMode);

  pageHeader('TECHNICAL APPENDIX');

  setTextColor(C.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Methodology', margin, 32);

  setTextColor(C.text2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const methodLines = [
    'This appendix documents raw technical measurements obtained during the Rotakin CCTV compliance audit.',
    '%R (Rotakin figure height as percentage of frame height) was calculated using Canvas-based Sobel edge',
    'detection applied to each captured image. The Rotakin figure bounding box was detected via contour',
    'analysis, and %R = (figure height / frame height) × 100. A confidence score was assigned based on',
    'edge strength, figure aspect ratio, and detection consistency. Measurements with confidence ≥ 70% were',
    'auto-accepted; 40–69% flagged for review; < 40% require manual override.',
  ];
  methodLines.forEach((line, i) => {
    doc.text(line, margin, 40 + i * 6);
  });

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Site: ${site.siteName || '—'}  ·  Ref: ${site.reportRef || '—'}  ·  Date: ${site.auditDate || '—'}`, margin, 82);

  bottomBar();

  for (const cam of cameras) {
    doc.addPage();
    const { paintBackground, topBar } = makePdfHelpers(doc, lightMode);
    paintBackground();
    topBar();

    setFill(C.surface);
    doc.roundedRect(margin, 8, doc.internal.pageSize.getWidth() - margin * 2, 20, 3, 3, 'F');
    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`${cam.ref || '(no ref)'}  —  ${cam.make} ${cam.model}`, margin + 5, 17);
    setTextColor(C.text2);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Zone: ${cam.zone || '—'}  ·  Location: ${cam.location || '—'}`, margin + 5, 24);

    const ar = cam.images.static?.analysisResult;
    const measureRows = [
      ['Measured %R', cam.measuredR !== null ? `${cam.measuredR}%` : '—'],
      ['Confidence', ar ? `${ar.confidence}%` : '—'],
      ['Blur Index (Laplacian)', ar?.blurIndex !== null && ar?.blurIndex !== undefined ? String(ar.blurIndex) : '—'],
      ['Bounding Box', ar?.bbox ? `x:${ar.bbox.x} y:${ar.bbox.y} w:${ar.bbox.width} h:${ar.bbox.height}` : '—'],
      ['Frame Size', ar?.bbox ? `${ar.bbox.frameWidth} × ${ar.bbox.frameHeight} px` : '—'],
      ['Source', ar?.source ?? '—'],
      ['Processed At', ar?.processedAt ? new Date(ar.processedAt).toLocaleString() : '—'],
    ];

    doc.autoTable({
      startY: 32,
      head: [['Measurement Field', 'Value']],
      body: measureRows,
      margin: { left: margin, right: margin },
      styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 8 },
      headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: { 0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 55 } },
    });

    if (cam.auditSteps.length > 0) {
      const afterY = (doc as JsPDFInstance).lastAutoTable.finalY + 8;
      setTextColor(C.accent);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('AUDIT STEPS', margin, afterY);

      const stepRows = cam.auditSteps.map(step => {
        const def = audit.auditStepDefs.find(d => d.id === step.stepId);
        const passLabel = step.passed === true ? 'PASS' : step.passed === false ? 'FAIL' : 'N/A';
        return [def ? def.name : `Step ${step.stepId}`, step.result || '—', passLabel, step.notes || '—'];
      });

      doc.autoTable({
        startY: afterY + 5,
        head: [['Step', 'Result', 'Status', 'Notes']],
        body: stepRows,
        margin: { left: margin, right: margin },
        styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 8 },
        headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: C.altRow },
        columnStyles: { 0: { cellWidth: 45 }, 2: { cellWidth: 18, fontStyle: 'bold' } },
        didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
          if (data.section === 'body' && data.column.index === 2) {
            const v = data.row.raw[2];
            if (v === 'PASS') data.cell.styles.textColor = C.green;
            else if (v === 'FAIL') data.cell.styles.textColor = C.red;
          }
        },
      });
    }

    setDrawColor(C.border2);
    doc.setLineWidth(0.3);
    const bY = doc.internal.pageSize.getHeight() - 12;
    doc.line(margin, bY, pageW - margin, bY);
    setTextColor(C.text3);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rotakin v3 Technical Appendix — ${site.reportRef || ''}`, margin, bY + 5);
    doc.text(String(doc.getNumberOfPages()), pageW - margin, bY + 5, { align: 'right' });
  }

  const fname = `Rotakin_Technical_${site.reportRef || site.siteName || 'report'}.pdf`.replace(/\s+/g, '_');
  doc.save(fname);
}

export async function generateSAPSForensicReport(auditData: AuditState, lightMode: boolean = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { audit } = auditData;
  const { site, cameras, standards } = audit;
  const { C, pageW, pageH, margin, contentW, setFill, setTextColor, setDrawColor, paintBackground, bottomBar } = makePdfHelpers(doc, lightMode);

  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, pageW, 3, 'F');
  setFill(C.red);
  doc.rect(0, pageH - 3, pageW, 3, 'F');

  setTextColor(C.red);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONFIDENTIAL — LAW ENFORCEMENT USE ONLY', pageW / 2, 16, { align: 'center' });

  setTextColor(C.accent);
  doc.setFontSize(22);
  doc.text('FORENSIC EXHIBIT REPORT', pageW / 2, 40, { align: 'center' });

  setTextColor(C.text2);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CCTV System Compliance Assessment', pageW / 2, 49, { align: 'center' });

  setDrawColor(C.accent);
  doc.setLineWidth(0.5);
  doc.line(margin + 20, 55, pageW - margin - 20, 55);

  const custodyRows = [
    ['Exhibit Reference', site.reportRef || 'N/A'],
    ['Examiner', site.engineerName || 'N/A'],
    ['Date Examined', site.auditDate || 'N/A'],
    ['Location', site.siteAddress || 'N/A'],
    ['Description', 'CCTV system compliance assessment'],
    ['Standard Applied', site.activeStandard || 'SANS 10222-5-1-4'],
    ['Total Items', String(cameras.length)],
  ];

  doc.autoTable({
    startY: 60,
    head: [['Chain of Custody Field', 'Value']],
    body: custodyRows,
    margin: { left: margin, right: margin },
    styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 9 },
    headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: { 0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 65 } },
  });

  const confY = (doc as JsPDFInstance).lastAutoTable.finalY + 15;
  setFill(C.surface);
  doc.roundedRect(margin, confY, contentW, 28, 3, 3, 'F');
  setTextColor(C.red);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CONFIDENTIALITY NOTICE', margin + 5, confY + 8);
  setTextColor(C.text2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const confLines = [
    'This report contains information prepared for law enforcement purposes. It is confidential and intended',
    'solely for the South African Police Service. Unauthorised disclosure, reproduction, or distribution',
    'is prohibited. Recipients must handle this document in accordance with applicable legislation.',
  ];
  confLines.forEach((line, i) => {
    doc.text(line, margin + 5, confY + 15 + i * 5);
  });

  bottomBar();

  for (let idx = 0; idx < cameras.length; idx++) {
    const cam = cameras[idx];
    doc.addPage();
    const { paintBackground: pb, topBar } = makePdfHelpers(doc, lightMode);
    pb();
    topBar();

    const exhibitNum = `EX-${String(idx + 1).padStart(3, '0')}`;
    setFill(C.surface);
    doc.roundedRect(margin, 8, doc.internal.pageSize.getWidth() - margin * 2, 20, 3, 3, 'F');
    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${exhibitNum}  —  ${cam.ref || '(no ref)'}`, margin + 5, 17);
    setTextColor(C.text2);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cam.make} ${cam.model}  ·  Zone: ${cam.zone || '—'}`, margin + 5, 24);

    const ach = classifyLevel(cam.measuredR, standards);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const compliantStr = ach && req ? (ach.level >= req.level ? 'COMPLIANT' : 'NON-COMPLIANT') : 'NOT ASSESSED';

    const itemRows = [
      ['Exhibit Item', exhibitNum],
      ['Camera Reference', cam.ref || '—'],
      ['Make / Model', `${cam.make} ${cam.model}`],
      ['Zone', cam.zone || '—'],
      ['Location', cam.location || '—'],
      ['Required Standard', cam.requiredStandard || '—'],
      ['Measured %R', cam.measuredR !== null ? `${cam.measuredR}%` : 'Not measured'],
      ['Achieved Level', ach ? ach.name : '—'],
      ['Compliance Status', compliantStr],
      ['Mounting Height', cam.mountingHeight || '—'],
      ['Target Distance', cam.targetDistance || '—'],
    ];

    doc.autoTable({
      startY: 32,
      head: [['Field', 'Value']],
      body: itemRows,
      margin: { left: margin, right: margin },
      styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 8 },
      headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: { 0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 55 } },
    });

    const concY = (doc as JsPDFInstance).lastAutoTable.finalY + 10;
    setFill(C.surface2);
    doc.roundedRect(margin, concY, contentW, 20, 3, 3, 'F');
    setTextColor(C.text2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CONCLUSION', margin + 5, concY + 8);
    const concText = ach && req
      ? `Camera ${cam.ref || exhibitNum} ${ach.level >= req.level ? 'meets' : 'does not meet'} the required ${cam.requiredStandard} standard with a measured %R of ${cam.measuredR ?? '—'}% (achieved: ${ach.name}).`
      : `Camera ${cam.ref || exhibitNum} has not been assessed — manual measurement required.`;
    setTextColor(C.text);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(concText, margin + 5, concY + 15, { maxWidth: contentW - 10 });

    setDrawColor(C.border2);
    doc.setLineWidth(0.3);
    const bY = doc.internal.pageSize.getHeight() - 12;
    doc.line(margin, bY, pageW - margin, bY);
    setTextColor(C.text3);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`SAPS Forensic Exhibit — ${site.reportRef || ''}  ·  ${exhibitNum}`, margin, bY + 5);
    doc.text(String(doc.getNumberOfPages()), pageW - margin, bY + 5, { align: 'right' });
  }

  const fname = `Rotakin_SAPS_Forensic_${site.reportRef || site.siteName || 'report'}.pdf`.replace(/\s+/g, '_');
  doc.save(fname);
}

export async function generateRemediationPlan(auditData: AuditState, lightMode: boolean = false): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc: JsPDFInstance = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { audit } = auditData;
  const { site, cameras, standards } = audit;
  const { C, pageW, margin, contentW, setFill, setTextColor, setDrawColor, paintBackground, bottomBar, pageHeader } = makePdfHelpers(doc, lightMode);

  const nonCompliantCams = cameras.filter(c => {
    if (!c.measuredR) return false;
    const ach = classifyLevel(c.measuredR, standards);
    const req = standards.find(s => s.name === c.requiredStandard);
    return ach && req && ach.level < req.level;
  });

  pageHeader('REMEDIATION ACTION PLAN');

  setFill(C.surface);
  doc.roundedRect(margin, 28, contentW, 28, 3, 3, 'F');
  setTextColor(C.text);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(site.siteName || 'Site', margin + 5, 38);
  setTextColor(C.text2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Ref: ${site.reportRef || '—'}  ·  Date: ${site.auditDate || '—'}  ·  Engineer: ${site.engineerName || '—'}`, margin + 5, 46);
  setTextColor(C.red);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`${nonCompliantCams.length} non-compliant camera${nonCompliantCams.length !== 1 ? 's' : ''} require remediation`, margin + 5, 52);

  bottomBar();

  for (const cam of nonCompliantCams) {
    doc.addPage();
    const { paintBackground: pb, topBar } = makePdfHelpers(doc, lightMode);
    pb();
    topBar();

    const ach = classifyLevel(cam.measuredR, standards);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const delta = req && ach ? req.level - ach.level : 0;
    const priority = delta >= 3 || ach?.level === 0 ? 'HIGH' : delta === 2 ? 'MEDIUM' : 'LOW';
    const priorityColor = priority === 'HIGH' ? C.red : priority === 'MEDIUM' ? C.orange : C.gold;

    setFill(C.surface);
    doc.roundedRect(margin, 8, doc.internal.pageSize.getWidth() - margin * 2, 20, 3, 3, 'F');
    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(cam.ref || '(no ref)', margin + 5, 17);
    setFill(priorityColor);
    const pLabel = ` ${priority} PRIORITY `;
    const pW = doc.getTextWidth(pLabel) + 4;
    doc.roundedRect(doc.internal.pageSize.getWidth() - margin - pW - 5, 10, pW + 5, 10, 2, 2, 'F');
    setTextColor(C.bg);
    doc.setFontSize(8);
    doc.text(pLabel, doc.internal.pageSize.getWidth() - margin - pW / 2 - 2.5, 17, { align: 'center' });
    setTextColor(C.text2);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cam.make} ${cam.model}  ·  Zone: ${cam.zone || '—'}  ·  Location: ${cam.location || '—'}`, margin + 5, 24);

    const requiredMinR = req ? Math.min(...standards.filter(s => s.name === req.name).map(s => s.minR)) : 0;
    const currentR = cam.measuredR ?? 0;

    const remRows = [
      ['Camera Reference', cam.ref || '—'],
      ['Zone', cam.zone || '—'],
      ['Current Measured %R', `${currentR}%`],
      ['Achieved Level', ach ? ach.name : '—'],
      ['Required Level', req ? req.name : '—'],
      ['Required Min %R', `${requiredMinR}%`],
      ['Gap (levels below)', String(delta)],
      ['Priority', priority],
      ['Mounting Height', cam.mountingHeight || '—'],
      ['Target Distance', cam.targetDistance || '—'],
      ['Lighting', cam.lighting || '—'],
    ];

    doc.autoTable({
      startY: 32,
      head: [['Field', 'Value']],
      body: remRows,
      margin: { left: margin, right: margin },
      styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 8 },
      headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: { 0: { fontStyle: 'bold', textColor: C.text2, cellWidth: 55 } },
    });

    const recY = (doc as JsPDFInstance).lastAutoTable.finalY + 10;
    setFill(C.surface2);
    doc.roundedRect(margin, recY, contentW, 28, 3, 3, 'F');
    setTextColor(C.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('RECOMMENDED ACTION', margin + 5, recY + 8);
    setTextColor(C.text2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const action = delta >= 3
      ? 'Replace camera with higher resolution/focal length unit. Reduce target distance or increase sensor size. Consider varifocal lens upgrade.'
      : delta === 2
      ? 'Reposition camera to reduce target distance. Increase focal length or adjust zoom. Clean lens and verify focus.'
      : 'Fine-tune focal length or reposition slightly. Verify mounting angle and target alignment. Clean lens if dirty.';
    doc.text(action, margin + 5, recY + 15, { maxWidth: contentW - 10 });

    const impY = recY + 32;
    setTextColor(C.text3);
    doc.setFontSize(7);
    doc.text(`Estimated impact: Achieving ${req ? req.name : 'required'} level requires %R ≥ ${requiredMinR}% (currently ${currentR}%). Gap of ${requiredMinR - currentR}% must be closed.`, margin, impY, { maxWidth: contentW });

    setDrawColor(C.border2);
    doc.setLineWidth(0.3);
    const bY = doc.internal.pageSize.getHeight() - 12;
    doc.line(margin, bY, pageW - margin, bY);
    setTextColor(C.text3);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Remediation Plan — ${site.reportRef || ''}`, margin, bY + 5);
    doc.text(String(doc.getNumberOfPages()), pageW - margin, bY + 5, { align: 'right' });
  }

  doc.addPage();
  paintBackground();
  setFill(C.accent);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 3, 'F');

  setTextColor(C.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('SUMMARY TABLE', margin, 20);
  setDrawColor(C.accent);
  doc.setLineWidth(0.3);
  doc.line(margin, 23, doc.internal.pageSize.getWidth() - margin, 23);

  const summaryRows = nonCompliantCams.map((cam, i) => {
    const ach = classifyLevel(cam.measuredR, standards);
    const req = standards.find(s => s.name === cam.requiredStandard);
    const delta = req && ach ? req.level - ach.level : 0;
    const priority = delta >= 3 || ach?.level === 0 ? 'HIGH' : delta === 2 ? 'MEDIUM' : 'LOW';
    return [
      String(i + 1),
      cam.ref || '—',
      cam.zone || '—',
      cam.measuredR !== null ? `${cam.measuredR}%` : '—',
      req ? req.name : '—',
      ach ? ach.name : '—',
      priority,
    ];
  });

  doc.autoTable({
    startY: 28,
    head: [['#', 'Ref', 'Zone', '%R', 'Required', 'Achieved', 'Priority']],
    body: summaryRows,
    margin: { left: margin, right: margin },
    styles: { fillColor: C.surface, textColor: C.text, lineColor: C.surface2, lineWidth: 0.3, fontSize: 8 },
    headStyles: { fillColor: C.surface2, textColor: C.accent, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: C.altRow },
    columnStyles: { 0: { cellWidth: 12 }, 6: { fontStyle: 'bold' } },
    didParseCell: (data: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } }; row: { raw: string[] } }) => {
      if (data.section === 'body' && data.column.index === 6) {
        const v = data.row.raw[6];
        if (v === 'HIGH') data.cell.styles.textColor = C.red;
        else if (v === 'MEDIUM') data.cell.styles.textColor = C.orange;
        else data.cell.styles.textColor = C.gold;
      }
    },
  });

  bottomBar();

  const fname = `Rotakin_Remediation_${site.reportRef || site.siteName || 'report'}.pdf`.replace(/\s+/g, '_');
  doc.save(fname);
}
