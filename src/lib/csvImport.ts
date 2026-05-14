import type { Camera, StepDef } from './types';
import { DEFAULT_STEP_DEFS } from './standards';

export const CSV_HEADERS = [
  'ref', 'make', 'model', 'lens', 'zone', 'resolution',
  'location', 'purpose', 'requiredStandard', 'mountingHeight',
  'targetDistance', 'lighting', 'notes',
] as const;

export const CSV_TEMPLATE = CSV_HEADERS.join(',') + '\n' +
  'CAM-01,Hikvision,DS-2CD2143G2-I,2.8mm,Zone A,4MP,Main Entrance,Identification,Observation,3m,5m,Artificial,Example camera\n';

export function parseCSV(content: string, stepDefs: StepDef[] = DEFAULT_STEP_DEFS): Camera[] {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase().split(',').map(h => h.trim());
  const cameras: Camera[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headerLine.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });

    cameras.push({
      id: crypto.randomUUID(),
      ref: row['ref'] ?? '',
      make: row['make'] ?? '',
      model: row['model'] ?? '',
      lens: row['lens'] ?? '',
      zone: row['zone'] ?? '',
      resolution: row['resolution'] ?? '',
      location: row['location'] ?? '',
      purpose: row['purpose'] ?? '',
      requiredStandard: row['requiredstandard'] ?? 'Observation',
      measuredR: null,
      mountingHeight: row['mountingheight'] ?? '',
      targetDistance: row['targetdistance'] ?? '',
      lighting: row['lighting'] ?? '',
      notes: row['notes'] ?? '',
      images: {
        static: null,
        smear: null,
        colour: null,
        face: null,
        extra1: null,
        extra2: null,
      },
      auditSteps: stepDefs.map(sd => ({
        stepId: sd.id,
        result: '',
        notes: '',
        passed: null,
      })),
      faceLines: Array.from({ length: 10 }, (_, idx) => ({
        lineNo: idx + 1,
        expected: '',
        techRead: '',
        obsRead: '',
      })),
    });
  }

  return cameras;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
