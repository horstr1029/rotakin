import type { QueueItem } from './types';

type UpdateFn = (id: string, fields: Partial<QueueItem>) => void;

const MAX_WORKERS =
  typeof navigator !== 'undefined'
    ? Math.min(navigator.hardwareConcurrency || 2, 4)
    : 2;

export class ImagePipeline {
  private workers: Worker[] = [];
  private busyWorkers = new Set<Worker>();
  private queue: QueueItem[] = [];
  private fileMap = new Map<string, File>();
  private running = false;
  private onUpdate: UpdateFn;
  private onComplete?: () => void;

  constructor(onUpdate: UpdateFn, onComplete?: () => void) {
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
  }

  private getWorker(): Worker | null {
    for (const w of this.workers) {
      if (!this.busyWorkers.has(w)) return w;
    }
    if (this.workers.length < MAX_WORKERS) {
      const w = new Worker(new URL('../workers/imageWorker.ts', import.meta.url));
      this.workers.push(w);
      return w;
    }
    return null;
  }

  addFile(item: QueueItem, file: File) {
    this.queue.push(item);
    this.fileMap.set(item.id, file);
  }

  start() {
    this.running = true;
    this.processNext();
  }

  stop() {
    this.running = false;
  }

  private processNext() {
    if (!this.running) return;
    const pending = this.queue.find(i => i.status === 'pending');
    if (!pending) {
      if (this.busyWorkers.size === 0) this.onComplete?.();
      return;
    }

    const worker = this.getWorker();
    if (!worker) {
      setTimeout(() => this.processNext(), 100);
      return;
    }

    const file = this.fileMap.get(pending.id);
    if (!file) return;

    pending.status = 'processing';
    this.onUpdate(pending.id, { status: 'processing' });
    this.busyWorkers.add(worker);

    file.arrayBuffer().then(buf => {
      worker.onmessage = (e: MessageEvent) => {
        const { id, type, result, thumbnail, error } = e.data as {
          id: string;
          type: 'thumbnail' | 'done' | 'error';
          result?: QueueItem['result'];
          thumbnail?: string;
          error?: string;
        };
        if (id !== pending.id) return;

        if (type === 'thumbnail') {
          this.onUpdate(id, { thumbnail });
        } else if (type === 'done' && result) {
          this.busyWorkers.delete(worker);
          const status: QueueItem['status'] =
            result.confidence >= 70 ? 'done' : 'review';
          this.onUpdate(id, { status, result });
          this.fileMap.delete(id);
          this.processNext();
        } else if (type === 'error') {
          this.busyWorkers.delete(worker);
          this.onUpdate(id, { status: 'error', error: error ?? 'Unknown error' });
          this.fileMap.delete(id);
          this.processNext();
        }
      };

      worker.postMessage(
        { id: pending.id, arrayBuffer: buf, mimeType: file.type, stepType: pending.assignedStepType },
        [buf]
      );
    });

    setTimeout(() => this.processNext(), 10);
  }

  terminate() {
    this.running = false;
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.busyWorkers.clear();
  }
}
