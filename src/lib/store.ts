'use client';

import { create } from 'zustand';
import type { AuditState, SiteInfo, Camera, Standard, StepDef, AuditStep, FaceLine, ImageSlot, QueueItem, ImageStepType, HistorySnapshot } from './types';
import { DEFAULT_STANDARDS, DEFAULT_STEP_DEFS } from './standards';
import { loadAuditFromDB, saveAuditToDB, saveHistorySnapshot, deleteHistorySnapshot } from './storage';
import { classifyLevel } from './standards';

function createBlankAudit(): AuditState {
  return {
    schemaVersion: '3.0',
    audit: {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      site: {
        reportRef: '',
        auditDate: new Date().toISOString().split('T')[0],
        siteName: '',
        siteAddress: '',
        client: '',
        contractNo: '',
        engineerId: '',
        engineerName: '',
        witnessName: '',
        certNumber: '',
        nvrRef: '',
        weather: '',
        lux: '',
        notes: '',
        gpsLat: '',
        gpsLng: '',
        siteType: 'retail',
        certBody: '',
        activeStandard: 'SANS 10222-5-1-4',
      },
      branding: { orgLogo: '', clientLogo: '' },
      cameras: [],
      standards: DEFAULT_STANDARDS,
      auditStepDefs: DEFAULT_STEP_DEFS,
      aiReports: { fullAudit: '', executive: '', generatedAt: '' },
    },
  };
}

function createBlankCamera(stepDefs: StepDef[]): Camera {
  return {
    id: crypto.randomUUID(),
    ref: '',
    make: '',
    model: '',
    lens: '',
    zone: '',
    resolution: '',
    location: '',
    purpose: '',
    requiredStandard: 'Observation',
    measuredR: null,
    mountingHeight: '',
    targetDistance: '',
    lighting: '',
    notes: '',
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
    faceLines: Array.from({ length: 10 }, (_, i) => ({
      lineNo: i + 1,
      expected: '',
      techRead: '',
      obsRead: '',
    })),
  };
}

interface StoreState {
  state: AuditState;
  initialized: boolean;
  _saveTimer: ReturnType<typeof setTimeout> | null;

  // Phase 2: image queue (in-memory only, not persisted)
  imageQueue: QueueItem[];
  isProcessingQueue: boolean;

  initialize: () => Promise<void>;
  scheduleSave: () => void;

  updateSite: (fields: Partial<SiteInfo>) => void;
  updateBranding: (fields: Partial<{ orgLogo: string; clientLogo: string }>) => void;
  addCamera: () => void;
  updateCamera: (id: string, fields: Partial<Camera>) => void;
  updateCameraImage: (cameraId: string, slot: keyof Camera['images'], image: ImageSlot | null) => void;
  updateAuditStep: (cameraId: string, stepId: number, fields: Partial<AuditStep>) => void;
  updateFaceLine: (cameraId: string, lineNo: number, fields: Partial<FaceLine>) => void;
  deleteCamera: (id: string) => void;
  duplicateCamera: (id: string) => void;
  reorderCameras: (cameras: Camera[]) => void;
  updateStandards: (standards: Standard[]) => void;
  updateStepDefs: (stepDefs: StepDef[]) => void;
  updateAiReports: (fields: Partial<AuditState['audit']['aiReports']>) => void;
  newAudit: () => void;
  loadAudit: (data: AuditState) => void;
  importCameras: (cameras: Camera[]) => void;
  addCameraWithRef: (ref: string) => string;

  // Queue actions
  setImageQueue: (queue: QueueItem[]) => void;
  addQueueItems: (items: QueueItem[]) => void;
  updateQueueItem: (id: string, fields: Partial<QueueItem>) => void;
  assignQueueItem: (id: string, cameraId: string, stepType: ImageStepType) => void;
  removeQueueItem: (id: string) => void;
  clearQueue: () => void;
  setProcessingQueue: (v: boolean) => void;
  applyQueueItemToCamera: (queueItemId: string) => void;

  // History actions
  saveSnapshot: (label: string) => Promise<void>;
  deleteSnapshot: (id: string) => Promise<void>;
  restoreSnapshot: (snapshot: HistorySnapshot) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  state: createBlankAudit(),
  initialized: false,
  _saveTimer: null,

  // Phase 2 queue state
  imageQueue: [],
  isProcessingQueue: false,

  initialize: async () => {
    const saved = await loadAuditFromDB();
    if (saved && saved.schemaVersion === '3.0') {
      set({ state: saved, initialized: true });
    } else {
      set({ initialized: true });
    }
  },

  scheduleSave: () => {
    const existing = get()._saveTimer;
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      saveAuditToDB(get().state);
    }, 1000);
    set({ _saveTimer: timer });
  },

  updateSite: (fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          site: { ...s.state.audit.site, ...fields },
        },
      },
    }));
    get().scheduleSave();
  },

  updateBranding: (fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          branding: { ...s.state.audit.branding, ...fields },
        },
      },
    }));
    get().scheduleSave();
  },

  addCamera: () => {
    const stepDefs = get().state.audit.auditStepDefs;
    const cam = createBlankCamera(stepDefs);
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: [...s.state.audit.cameras, cam],
        },
      },
    }));
    get().scheduleSave();
  },

  updateCamera: (id, fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === id ? { ...c, ...fields } : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  updateCameraImage: (cameraId, slot, image) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === cameraId
              ? { ...c, images: { ...c.images, [slot]: image } }
              : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  updateAuditStep: (cameraId, stepId, fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === cameraId
              ? {
                  ...c,
                  auditSteps: c.auditSteps.map(step =>
                    step.stepId === stepId ? { ...step, ...fields } : step
                  ),
                }
              : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  updateFaceLine: (cameraId, lineNo, fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === cameraId
              ? {
                  ...c,
                  faceLines: c.faceLines.map(fl =>
                    fl.lineNo === lineNo ? { ...fl, ...fields } : fl
                  ),
                }
              : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  deleteCamera: (id) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.filter(c => c.id !== id),
        },
      },
    }));
    get().scheduleSave();
  },

  duplicateCamera: (id) => {
    const cam = get().state.audit.cameras.find(c => c.id === id);
    if (!cam) return;
    const duped: Camera = {
      ...cam,
      id: crypto.randomUUID(),
      ref: cam.ref ? `${cam.ref}-copy` : '',
    };
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: [...s.state.audit.cameras, duped],
        },
      },
    }));
    get().scheduleSave();
  },

  reorderCameras: (cameras) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras,
        },
      },
    }));
    get().scheduleSave();
  },

  updateStandards: (standards) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          standards,
        },
      },
    }));
    get().scheduleSave();
  },

  updateStepDefs: (stepDefs) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          auditStepDefs: stepDefs,
        },
      },
    }));
    get().scheduleSave();
  },

  updateAiReports: (fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          aiReports: { ...s.state.audit.aiReports, ...fields },
        },
      },
    }));
    get().scheduleSave();
  },

  newAudit: () => {
    set({ state: createBlankAudit() });
    get().scheduleSave();
  },

  loadAudit: (data) => {
    set({ state: data });
    get().scheduleSave();
  },

  importCameras: (cameras) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: [...s.state.audit.cameras, ...cameras],
        },
      },
    }));
    get().scheduleSave();
  },

  addCameraWithRef: (ref) => {
    const stepDefs = get().state.audit.auditStepDefs;
    const cam = createBlankCamera(stepDefs);
    cam.ref = ref;
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: [...s.state.audit.cameras, cam],
        },
      },
    }));
    get().scheduleSave();
    return cam.id;
  },

  // ── Queue actions ────────────────────────────────────────────────────────
  setImageQueue: (queue) => set({ imageQueue: queue }),

  addQueueItems: (items) =>
    set(s => ({ imageQueue: [...s.imageQueue, ...items] })),

  updateQueueItem: (id, fields) =>
    set(s => ({
      imageQueue: s.imageQueue.map(item =>
        item.id === id ? { ...item, ...fields } : item
      ),
    })),

  assignQueueItem: (id, cameraId, stepType) =>
    set(s => ({
      imageQueue: s.imageQueue.map(item =>
        item.id === id
          ? { ...item, assignedCameraId: cameraId, assignedStepType: stepType, status: 'pending' as const }
          : item
      ),
    })),

  removeQueueItem: (id) =>
    set(s => ({ imageQueue: s.imageQueue.filter(item => item.id !== id) })),

  clearQueue: () => set({ imageQueue: [] }),

  setProcessingQueue: (v) => set({ isProcessingQueue: v }),

  saveSnapshot: async (label) => {
    const { state } = get();
    const { cameras, standards } = state.audit;
    const compliant = cameras.filter(c => {
      const ach = classifyLevel(c.measuredR, standards);
      const req = standards.find(s => s.name === c.requiredStandard);
      return ach && req && ach.level >= req.level;
    }).length;
    const complianceRate = cameras.length > 0 ? Math.round((compliant / cameras.length) * 100) : 0;
    const snapshot: HistorySnapshot = {
      id: crypto.randomUUID(),
      auditId: state.audit.id,
      label,
      savedAt: new Date().toISOString(),
      cameraCount: cameras.length,
      complianceRate,
      data: state,
    };
    await saveHistorySnapshot(snapshot);
  },

  deleteSnapshot: async (id) => {
    await deleteHistorySnapshot(id);
  },

  restoreSnapshot: (snapshot) => {
    get().loadAudit(snapshot.data);
  },

  applyQueueItemToCamera: (queueItemId) => {
    const { imageQueue } = get();
    const qItem = imageQueue.find(i => i.id === queueItemId);
    if (!qItem || !qItem.assignedCameraId || !qItem.assignedStepType || !qItem.result) return;

    const { result, thumbnail, filename, assignedCameraId, assignedStepType } = qItem;

    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(cam => {
            if (cam.id !== assignedCameraId) return cam;

            // Update measuredR if result is better or camera has none
            const existingResult = cam.images[assignedStepType]?.analysisResult;
            const shouldUpdateR =
              result.measuredR !== null &&
              (cam.measuredR === null || result.confidence > (existingResult?.confidence ?? 0));

            return {
              ...cam,
              measuredR: shouldUpdateR ? result.measuredR : cam.measuredR,
              images: {
                ...cam.images,
                [assignedStepType]: {
                  original: thumbnail || result.annotatedImage,
                  annotated: result.annotatedImage,
                  filename,
                  uploadedAt: result.processedAt,
                  analysisResult: result,
                } satisfies ImageSlot,
              },
            };
          }),
        },
      },
    }));
    get().scheduleSave();
  },
}));
