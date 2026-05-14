export interface AuditState {
  schemaVersion: '3.0';
  audit: {
    id: string;
    createdAt: string;
    lastModified: string;
    site: SiteInfo;
    branding: { orgLogo: string; clientLogo: string };
    cameras: Camera[];
    standards: Standard[];
    auditStepDefs: StepDef[];
    aiReports: { fullAudit: string; executive: string; generatedAt: string };
  };
}

export interface SiteInfo {
  reportRef: string;
  auditDate: string;
  siteName: string;
  siteAddress: string;
  client: string;
  contractNo: string;
  engineerId: string;
  engineerName: string;
  witnessName: string;
  certNumber: string;
  nvrRef: string;
  weather: string;
  lux: string;
  notes: string;
  gpsLat: string;
  gpsLng: string;
  siteType: string;
  certBody: string;
  activeStandard: string;
}

export interface Standard {
  level: number;
  name: string;
  minR: number;
  color: string;
}

export interface StepDef {
  id: number;
  name: string;
  desc: string;
}

export interface Camera {
  id: string;
  ref: string;
  make: string;
  model: string;
  lens: string;
  zone: string;
  resolution: string;
  location: string;
  purpose: string;
  requiredStandard: string;
  measuredR: number | null;
  mountingHeight: string;
  targetDistance: string;
  lighting: string;
  notes: string;
  images: {
    static: ImageSlot | null;
    smear: ImageSlot | null;
    colour: ImageSlot | null;
    face: ImageSlot | null;
    extra1: ImageSlot | null;
    extra2: ImageSlot | null;
  };
  auditSteps: AuditStep[];
  faceLines: FaceLine[];
}

export interface ImageSlot {
  original: string;
  annotated?: string;
  filename: string;
  uploadedAt: string;
  analysisResult?: AnalysisResult;
}

export interface AuditStep {
  stepId: number;
  result: string;
  notes: string;
  passed: boolean | null;
}

export interface FaceLine {
  lineNo: number;
  expected: string;
  techRead: string;
  obsRead: string;
}

export type ImageStepType = 'static' | 'smear' | 'colour' | 'face' | 'extra1' | 'extra2';

export type QueueStatus = 'pending' | 'processing' | 'done' | 'review' | 'error' | 'unassigned';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
}

export interface AnalysisResult {
  measuredR: number | null;
  confidence: number;
  bbox: BoundingBox | null;
  blurIndex: number | null;
  annotatedImage: string;
  source: 'canvas-analysis';
  processedAt: string;
}

export interface QueueItem {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  thumbnail: string;
  detectedCameraRef: string | null;
  detectedStepType: ImageStepType | null;
  assignedCameraId: string | null;
  assignedStepType: ImageStepType | null;
  status: QueueStatus;
  error: string | null;
  result: AnalysisResult | null;
}

export interface HistorySnapshot {
  id: string;
  auditId: string;
  label: string;
  savedAt: string;
  cameraCount: number;
  complianceRate: number;
  data: AuditState;
}
