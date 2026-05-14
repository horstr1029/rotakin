/// <reference lib="webworker" />

// This file runs in a WebWorker context
// Receives: { id, arrayBuffer, mimeType, filename, stepType }
// Sends back: { id, type: 'thumbnail' | 'done' | 'error', ... }

import type { AnalysisResult } from '../lib/types';

// ── Grayscale conversion ─────────────────────────────────────────────────────
function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

// ── Sobel edge detection ─────────────────────────────────────────────────────
function sobelEdges(gray: Float32Array, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)]
        - 2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)]
        - gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)]
        + gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];
      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

// ── Rotakin bounding box detection ───────────────────────────────────────────
interface DetectionResult {
  bbox: { x: number; y: number; width: number; height: number } | null;
  confidence: number;
}

function detectRotakin(gray: Float32Array, edges: Float32Array, width: number, height: number): DetectionResult {
  const threshold = 40;

  const hProj = new Float32Array(height);
  const vProj = new Float32Array(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > threshold) {
        hProj[y]++;
        vProj[x]++;
      }
    }
  }

  // Smooth projections (3-tap moving average)
  const smoothH = hProj.map((v, i) =>
    (hProj[Math.max(0, i - 1)] + v + hProj[Math.min(height - 1, i + 1)]) / 3
  );
  const smoothV = vProj.map((v, i) =>
    (vProj[Math.max(0, i - 1)] + v + vProj[Math.min(width - 1, i + 1)]) / 3
  );

  const avgH = smoothH.reduce((a, b) => a + b, 0) / height;
  const edgeThreshH = avgH * 0.8;

  let bestTop = 0, bestBot = 0, bestHeight = 0;
  let runStart = -1;
  for (let y = 0; y < height; y++) {
    if (smoothH[y] > edgeThreshH) {
      if (runStart < 0) runStart = y;
    } else {
      if (runStart >= 0) {
        const runH = y - runStart;
        if (runH > bestHeight) { bestHeight = runH; bestTop = runStart; bestBot = y; }
        runStart = -1;
      }
    }
  }
  if (runStart >= 0 && height - runStart > bestHeight) {
    bestTop = runStart; bestBot = height; bestHeight = height - runStart;
  }

  if (bestHeight < height * 0.1) {
    return { bbox: null, confidence: 0 };
  }

  const avgV = smoothV.reduce((a, b) => a + b, 0) / width;
  const edgeThreshV = avgV * 0.5;

  let bestLeft = 0, bestRight = width, bestColRun = 0;
  let colRunStart = -1;
  for (let x = 0; x < width; x++) {
    if (smoothV[x] > edgeThreshV) {
      if (colRunStart < 0) colRunStart = x;
    } else {
      if (colRunStart >= 0) {
        const runW = x - colRunStart;
        if (runW > bestColRun) { bestColRun = runW; bestLeft = colRunStart; bestRight = x; }
        colRunStart = -1;
      }
    }
  }
  if (colRunStart >= 0 && width - colRunStart > bestColRun) {
    bestLeft = colRunStart; bestRight = width;
  }

  const bboxW = bestRight - bestLeft;
  const bboxH = bestBot - bestTop;

  let confidence = 50;

  const aspectRatio = bboxH / Math.max(bboxW, 1);
  if (aspectRatio >= 3 && aspectRatio <= 8) confidence += 25;
  else if (aspectRatio >= 2 && aspectRatio < 3) confidence += 10;
  else if (aspectRatio > 8) confidence -= 10;
  else confidence -= 20;

  const rValue = (bboxH / height) * 100;
  if (rValue >= 5 && rValue <= 90) confidence += 15;
  else confidence -= 20;

  let insideSum = 0, outsideSum = 0, insideCount = 0, outsideCount = 0;
  const sampleStep = 4;
  for (let y = 0; y < height; y += sampleStep) {
    for (let x = 0; x < width; x += sampleStep) {
      const val = gray[y * width + x];
      if (x >= bestLeft && x < bestRight && y >= bestTop && y < bestBot) {
        insideSum += val; insideCount++;
      } else {
        outsideSum += val; outsideCount++;
      }
    }
  }
  if (insideCount > 0 && outsideCount > 0) {
    const insideMean = insideSum / insideCount;
    const outsideMean = outsideSum / outsideCount;
    const contrast = Math.abs(outsideMean - insideMean);
    if (contrast > 40) confidence += 10;
    else if (contrast < 15) confidence -= 15;
  }

  confidence = Math.max(0, Math.min(100, confidence));

  return {
    bbox: { x: bestLeft, y: bestTop, width: bboxW, height: bboxH },
    confidence,
  };
}

// ── Blur / smear detection (Laplacian variance) ───────────────────────────────
function calcBlurIndex(gray: Float32Array, width: number, height: number): number {
  let sumSq = 0;
  let mean = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const lap =
        gray[(y - 1) * width + x] + gray[(y + 1) * width + x] +
        gray[y * width + (x - 1)] + gray[y * width + (x + 1)] -
        4 * gray[y * width + x];
      sumSq += lap * lap;
      mean += lap;
      count++;
    }
  }
  if (count === 0) return 0;
  mean /= count;
  return Math.round(sumSq / count - mean * mean);
}

// ── base64 from Blob ──────────────────────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  const mimeType = blob.type || 'image/jpeg';
  return `data:${mimeType};base64,${btoa(binary)}`;
}

// ── Draw annotation overlay ───────────────────────────────────────────────────
async function drawAnnotation(
  bitmap: ImageBitmap,
  bbox: { x: number; y: number; width: number; height: number } | null,
  rValue: number | null,
  confidence: number
): Promise<string> {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);

  if (bbox) {
    const { x, y, width, height } = bbox;
    ctx.strokeStyle = confidence >= 70 ? '#10d98a' : confidence >= 40 ? '#f0b429' : '#ff4757';
    ctx.lineWidth = Math.max(2, bitmap.width / 300);
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = confidence >= 70 ? 'rgba(16,217,138,0.08)' : confidence >= 40 ? 'rgba(240,180,41,0.08)' : 'rgba(255,71,87,0.08)';
    ctx.fillRect(x, y, width, height);

    const rx = x + width + 8;
    ctx.strokeStyle = '#00c2ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(rx, y); ctx.lineTo(rx, y + height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - 5, y); ctx.lineTo(rx + 5, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx - 5, y + height); ctx.lineTo(rx + 5, y + height); ctx.stroke();

    const fontSize = Math.max(14, bitmap.width / 40);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#00c2ff';
    ctx.fillText(`%R: ${rValue?.toFixed(1)}%`, x, Math.max(y - 8, fontSize + 4));
    const confColor = confidence >= 70 ? '#10d98a' : confidence >= 40 ? '#f0b429' : '#ff4757';
    ctx.fillStyle = confColor;
    ctx.font = `${fontSize * 0.8}px sans-serif`;
    ctx.fillText(`Conf: ${confidence}%`, x, Math.max(y - 8 + fontSize + 4, fontSize * 2 + 4));
  } else {
    ctx.fillStyle = 'rgba(255,71,87,0.15)';
    ctx.fillRect(0, 0, bitmap.width, bitmap.height);
    const fontSize = Math.max(16, bitmap.width / 30);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = '#ff4757';
    ctx.textAlign = 'center';
    ctx.fillText('No Rotakin detected', bitmap.width / 2, bitmap.height / 2);
  }

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return blobToBase64(blob);
}

// ── Generate thumbnail ────────────────────────────────────────────────────────
async function generateThumbnail(bitmap: ImageBitmap): Promise<string> {
  const maxW = 200;
  const scale = Math.min(1, maxW / bitmap.width);
  const tW = Math.round(bitmap.width * scale);
  const tH = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(tW, tH);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, tW, tH);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  return blobToBase64(blob);
}

// ── Main worker message handler ───────────────────────────────────────────────
self.onmessage = async (e: MessageEvent) => {
  const { id, arrayBuffer, mimeType, stepType } = e.data as {
    id: string;
    arrayBuffer: ArrayBuffer;
    mimeType: string;
    stepType: string | null;
  };

  try {
    const blob = new Blob([arrayBuffer], { type: mimeType || 'image/jpeg' });
    const bitmap = await createImageBitmap(blob);

    const thumbnail = await generateThumbnail(bitmap);
    self.postMessage({ id, type: 'thumbnail', thumbnail });

    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const { data, width, height } = imageData;

    const gray = toGrayscale(data, width, height);
    const edges = sobelEdges(gray, width, height);

    let measuredR: number | null = null;
    let bbox: { x: number; y: number; width: number; height: number } | null = null;
    let confidence = 0;
    let blurIndex: number | null = null;
    let annotatedImage = '';

    if (stepType === 'smear') {
      blurIndex = calcBlurIndex(gray, width, height);
      const det = detectRotakin(gray, edges, width, height);
      bbox = det.bbox;
      confidence = det.confidence;
      if (bbox) measuredR = parseFloat(((bbox.height / height) * 100).toFixed(1));
      annotatedImage = await drawAnnotation(bitmap, bbox, measuredR, confidence);
    } else {
      const det = detectRotakin(gray, edges, width, height);
      bbox = det.bbox;
      confidence = det.confidence;
      if (bbox) {
        measuredR = parseFloat(((bbox.height / height) * 100).toFixed(1));
        blurIndex = calcBlurIndex(gray, width, height);
      }
      annotatedImage = await drawAnnotation(bitmap, bbox, measuredR, confidence);
    }

    const result: AnalysisResult = {
      measuredR,
      confidence,
      bbox: bbox ? { ...bbox, frameWidth: width, frameHeight: height } : null,
      blurIndex,
      annotatedImage,
      source: 'canvas-analysis',
      processedAt: new Date().toISOString(),
    };

    self.postMessage({ id, type: 'done', result });
    bitmap.close();
  } catch (err: unknown) {
    self.postMessage({ id, type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export {};
