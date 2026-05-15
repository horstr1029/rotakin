'use client';

import { create } from 'zustand';
import type { AuditState, SiteInfo, Camera, Standard, StepDef, AuditStep, FaceLine, ImageSlot, QueueItem, ImageStepType, HistorySnapshot, CameraTestRecord, TestCategory, AuditMeta, AuditBranding, AuditSignatures } from './types';
import { DEFAULT_STANDARDS, DEFAULT_STEP_DEFS, STANDARD_EXPECTED } from './standards';
import { loadAuditFromDB, saveAuditToDB, saveHistorySnapshot, deleteHistorySnapshot, loadAuditIndex, saveAuditIndex, saveAuditById, loadAuditById, deleteAuditById, clearAuditDB } from './storage';
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
      branding: { orgLogo: '', clientLogo: '', companyName: '', companyAddress: '', companyPhone: '', companyEmail: '', companyWebsite: '' },
      signatures: { engineer: '', witness: '' },
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
    testRecord: {
      timeDay: '',
      timeNight: '',
      luxLevel: '',
      verticalFOV: '',
      distanceToObjective: '',
      facialTest: { expected: '2 of 4', actual: '' },
      resolution: { expected: 'Band G', actual: '' },
      rotakinR: { expected: '75%+', actual: '' },
      depthOfFocus: { expected: '6 of 7', actual: '' },
      colourSeparation: { expected: '9 of 12', actual: '' },
      motionBlur: { expected: 'Pass', actual: '' },
      verdict: 'pending',
      problemsMST: '',
      recommendationsMST: '',
      problemsClient: '',
      recommendationsClient: '',
    },
  };
}

interface StoreState {
  state: AuditState;
  initialized: boolean;
  _saveTimer: ReturnType<typeof setTimeout> | null;

  // Phase 2: image queue (in-memory only, not persisted)
  imageQueue: QueueItem[];
  isProcessingQueue: boolean;

  auditList: AuditMeta[];
  loadAuditList: () => Promise<void>;
  openAuditById: (id: string) => Promise<void>;
  deleteAuditFromList: (id: string) => Promise<void>;
  updateCameraPin: (cameraId: string, pinX: number, pinY: number) => void;

  initialize: () => Promise<void>;
  scheduleSave: () => void;

  updateSite: (fields: Partial<SiteInfo>) => void;
  updateBranding: (fields: Partial<AuditBranding>) => void;
  updateSignatures: (fields: Partial<AuditSignatures>) => void;
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

  updateCameraTestRecord: (cameraId: string, fields: Partial<CameraTestRecord>) => void;
  updateTestCategory: (cameraId: string, category: keyof Pick<CameraTestRecord, 'facialTest'|'resolution'|'rotakinR'|'depthOfFocus'|'colourSeparation'|'motionBlur'>, fields: Partial<TestCategory>) => void;
  applyStandardExpected: (cameraId: string, standardName: string) => void;

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

  auditList: [],

  loadAuditList: async () => {
    const list = await loadAuditIndex();
    set({ auditList: list });
  },

  openAuditById: async (id) => {
    const loaded = await loadAuditById(id);
    if (loaded && loaded.schemaVersion === '3.0') {
      set({ state: loaded, initialized: true });
    }
  },

  deleteAuditFromList: async (id) => {
    await deleteAuditById(id);
    const list = await loadAuditIndex();
    set({ auditList: list });
  },

  updateCameraPin: (cameraId, pinX, pinY) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === cameraId ? { ...c, pinX, pinY } : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  initialize: async () => {
    const oldAudit = await loadAuditFromDB();
    if (oldAudit && oldAudit.schemaVersion === '3.0') {
      await saveAuditById(oldAudit.audit.id, oldAudit);
      const index = await loadAuditIndex();
      const meta: AuditMeta = {
        id: oldAudit.audit.id,
        siteName: oldAudit.audit.site.siteName,
        client: oldAudit.audit.site.client,
        auditDate: oldAudit.audit.site.auditDate,
        cameraCount: oldAudit.audit.cameras.length,
        lastModified: oldAudit.audit.lastModified,
      };
      if (!index.find(a => a.id === meta.id)) {
        index.push(meta);
        await saveAuditIndex(index);
      }
      await clearAuditDB();
    }
    const list = await loadAuditIndex();
    set({ auditList: list, initialized: true });
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

  updateSignatures: (fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          signatures: { ...(s.state.audit.signatures ?? { engineer: '', witness: '' }), ...fields },
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
    const current = get().state;
    const hasData = current.audit.site.siteName.trim() !== '' || current.audit.cameras.length > 0;
    if (hasData) {
      saveAuditToDB(current);
    }
    const blank = createBlankAudit();
    set({ state: blank });
    saveAuditToDB(blank).then(() => {
      get().loadAuditList();
    });
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

  updateCameraTestRecord: (cameraId, fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === cameraId
              ? { ...c, testRecord: { ...c.testRecord, ...fields } }
              : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  updateTestCategory: (cameraId, category, fields) => {
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c =>
            c.id === cameraId
              ? { ...c, testRecord: { ...c.testRecord, [category]: { ...c.testRecord[category], ...fields } } }
              : c
          ),
        },
      },
    }));
    get().scheduleSave();
  },

  applyStandardExpected: (cameraId, standardName) => {
    const expected = STANDARD_EXPECTED[standardName];
    if (!expected) return;
    set(s => ({
      state: {
        ...s.state,
        audit: {
          ...s.state.audit,
          lastModified: new Date().toISOString(),
          cameras: s.state.audit.cameras.map(c => {
            if (c.id !== cameraId) return c;
            return {
              ...c,
              testRecord: {
                ...c.testRecord,
                facialTest: { ...c.testRecord.facialTest, expected: expected.facialTest.expected },
                resolution: { ...c.testRecord.resolution, expected: expected.resolution.expected },
                rotakinR: { ...c.testRecord.rotakinR, expected: expected.rotakinR.expected },
                depthOfFocus: { ...c.testRecord.depthOfFocus, expected: expected.depthOfFocus.expected },
                colourSeparation: { ...c.testRecord.colourSeparation, expected: expected.colourSeparation.expected },
                motionBlur: { ...c.testRecord.motionBlur, expected: expected.motionBlur.expected },
              },
            };
          }),
        },
      },
    }));
    get().scheduleSave();
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
