import type { ImageStepType } from './types';

const STEP_ALIASES: Record<string, ImageStepType> = {
  static: 'static', stat: 'static', position: 'static',
  smear: 'smear', motion: 'smear', blur: 'smear',
  colour: 'colour', color: 'colour', chart: 'colour', tpiece: 'colour',
  face: 'face', facial: 'face', faces: 'face',
  extra1: 'extra1', extra: 'extra1',
  extra2: 'extra2',
};

export function parseFilename(filename: string): { cameraRef: string | null; stepType: ImageStepType | null } {
  const base = filename.replace(/\.[^.]+$/, ''); // strip extension
  // Try pattern: <ref>_<step>
  const match = base.match(/^(.+?)_([^_]+)$/);
  if (match) {
    const [, ref, step] = match;
    const stepType = STEP_ALIASES[step.toLowerCase()] ?? null;
    return { cameraRef: ref.toUpperCase(), stepType };
  }
  return { cameraRef: null, stepType: null };
}

export function isImageFile(filename: string): boolean {
  return /\.(jpe?g|png|bmp|tiff?|webp)$/i.test(filename);
}
