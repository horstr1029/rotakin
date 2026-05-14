import type { Standard, StepDef, Camera } from './types';

export const DEFAULT_STANDARDS: Standard[] = [
  { level: 5, name: 'Identification', minR: 120, color: '#10d98a' },
  { level: 4, name: 'Recognition',    minR: 50,  color: '#00c2ff' },
  { level: 3, name: 'Observation',    minR: 25,  color: '#f0b429' },
  { level: 2, name: 'Detection',      minR: 10,  color: '#ff6b35' },
  { level: 1, name: 'Monitoring',     minR: 5,   color: '#a78bfa' },
];

export const BS_EN_STANDARDS: Standard[] = [
  { level: 5, name: 'Identification', minR: 100, color: '#10d98a' },
  { level: 4, name: 'Recognition',    minR: 40,  color: '#00c2ff' },
  { level: 3, name: 'Observation',    minR: 20,  color: '#f0b429' },
  { level: 2, name: 'Detection',      minR: 8,   color: '#ff6b35' },
  { level: 1, name: 'Monitoring',     minR: 4,   color: '#a78bfa' },
];

export const DEFAULT_STEP_DEFS: StepDef[] = [
  { id: 1, name: 'Target Setup',       desc: 'Position Rotakin target at specified distance in camera field of view' },
  { id: 2, name: 'Focus Check',        desc: 'Verify camera is in focus; check image clarity and sharpness' },
  { id: 3, name: 'Resolution Reading', desc: 'Read %R value from monitor; record Rotakin figure height as percentage of frame' },
  { id: 4, name: 'Colour Separation',  desc: 'Verify colour separation is acceptable on Rotakin colour chart' },
  { id: 5, name: 'Motion Smear Test',  desc: 'Pan Rotakin slowly; check for excessive motion blur/smear' },
  { id: 6, name: 'T-piece Colour Chart', desc: 'Display T-piece colour chart; verify colour accuracy and brightness' },
  { id: 7, name: 'Face Display Test',  desc: 'Display Rotakin face cards; record recognition accuracy per line' },
];

export function classifyLevel(rValue: number | null, standards: Standard[]): Standard | { level: number; name: string; minR: number; color: string } | null {
  if (rValue === null) return null;
  const sorted = [...standards].sort((a, b) => b.minR - a.minR);
  for (const std of sorted) {
    if (rValue >= std.minR) return std;
  }
  return { level: 0, name: 'Below Minimum', minR: 0, color: '#ff4757' };
}

export function getCameraHealth(camera: Camera, standards: Standard[]): 'green' | 'yellow' | 'red' {
  const achieved = classifyLevel(camera.measuredR, standards);
  const required = standards.find(s => s.name === camera.requiredStandard);
  const stepsComplete = camera.auditSteps.every(s => s.result.trim() !== '');

  if (!camera.measuredR) return 'yellow';
  if (!achieved || !required) return 'yellow';
  if (achieved.level < required.level) return 'red';
  if (!stepsComplete) return 'yellow';
  return 'green';
}
