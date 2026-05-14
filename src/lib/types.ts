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
  filename: string;
  uploadedAt: string;
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
