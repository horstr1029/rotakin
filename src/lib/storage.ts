import { openDB } from 'idb';
import type { AuditState, HistorySnapshot, AuditMeta, Standard, StepDef } from './types';

const DB_NAME = 'rotakin-v3';
const STORE_NAME = 'audits';
const HISTORY_STORE = 'history';
const TEMPLATES_STORE = 'templates';
const AUDIT_KEY = 'rotakin-audit-current';
const AUDIT_INDEX_KEY = 'audit-index';

export interface AuditTemplate {
  id: string;
  name: string;
  savedAt: string;
  standards: Standard[];
  auditStepDefs: StepDef[];
}

async function getDB() {
  return openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE);
      }
      if (oldVersion < 3 && !db.objectStoreNames.contains(TEMPLATES_STORE)) {
        db.createObjectStore(TEMPLATES_STORE);
      }
    },
  });
}

export async function loadAuditFromDB(): Promise<AuditState | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORE_NAME, AUDIT_KEY) as AuditState | undefined;
    return data ?? null;
  } catch (err) {
    console.error('Failed to load audit from IndexedDB:', err);
    return null;
  }
}

export async function loadAuditIndex(): Promise<AuditMeta[]> {
  try {
    const db = await getDB();
    const data = await db.get(STORE_NAME, AUDIT_INDEX_KEY) as AuditMeta[] | undefined;
    return data ?? [];
  } catch (err) {
    console.error('Failed to load audit index:', err);
    return [];
  }
}

export async function saveAuditIndex(index: AuditMeta[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, index, AUDIT_INDEX_KEY);
  } catch (err) {
    console.error('Failed to save audit index:', err);
  }
}

export async function saveAuditById(id: string, state: AuditState): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, state, `audit-${id}`);
  } catch (err) {
    console.error('Failed to save audit by id:', err);
  }
}

export async function loadAuditById(id: string): Promise<AuditState | null> {
  try {
    const db = await getDB();
    const data = await db.get(STORE_NAME, `audit-${id}`) as AuditState | undefined;
    return data ?? null;
  } catch (err) {
    console.error('Failed to load audit by id:', err);
    return null;
  }
}

export async function deleteAuditById(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, `audit-${id}`);
    const index = await db.get(STORE_NAME, AUDIT_INDEX_KEY) as AuditMeta[] | undefined;
    if (index && Array.isArray(index)) {
      const next = index.filter(a => a.id !== id);
      await db.put(STORE_NAME, next, AUDIT_INDEX_KEY);
    }
  } catch (err) {
    console.error('Failed to delete audit by id:', err);
  }
}

export async function saveAuditToDB(state: AuditState): Promise<void> {
  try {
    await saveAuditById(state.audit.id, state);
    const db = await getDB();
    const index = (await db.get(STORE_NAME, AUDIT_INDEX_KEY) as AuditMeta[] | undefined) ?? [];
    const meta: AuditMeta = {
      id: state.audit.id,
      siteName: state.audit.site.siteName,
      client: state.audit.site.client,
      auditDate: state.audit.site.auditDate,
      cameraCount: state.audit.cameras.length,
      lastModified: state.audit.lastModified,
    };
    const existing = index.findIndex(a => a.id === meta.id);
    if (existing >= 0) {
      index[existing] = meta;
    } else {
      index.push(meta);
    }
    await db.put(STORE_NAME, index, AUDIT_INDEX_KEY);
  } catch (err) {
    console.error('Failed to save audit to IndexedDB:', err);
  }
}

export async function clearAuditDB(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, AUDIT_KEY);
  } catch (err) {
    console.error('Failed to clear audit from IndexedDB:', err);
  }
}

export async function saveHistorySnapshot(snapshot: HistorySnapshot): Promise<void> {
  try {
    const db = await getDB();
    await db.put(HISTORY_STORE, snapshot, snapshot.id);
  } catch (err) {
    console.error('Failed to save history snapshot:', err);
  }
}

export async function loadHistorySnapshots(auditId: string): Promise<HistorySnapshot[]> {
  try {
    const db = await getDB();
    const all = await db.getAll(HISTORY_STORE) as HistorySnapshot[];
    return all
      .filter(s => s.auditId === auditId)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch (err) {
    console.error('Failed to load history snapshots:', err);
    return [];
  }
}

export async function deleteHistorySnapshot(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(HISTORY_STORE, id);
  } catch (err) {
    console.error('Failed to delete history snapshot:', err);
  }
}

export async function clearHistoryDB(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(HISTORY_STORE);
  } catch (err) {
    console.error('Failed to clear history store:', err);
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, key, 'claude-api-key');
  } catch (err) {
    console.error('Failed to save API key:', err);
  }
}

export async function loadApiKey(): Promise<string> {
  try {
    const db = await getDB();
    const key = await db.get(STORE_NAME, 'claude-api-key') as string | undefined;
    return key ?? '';
  } catch {
    return '';
  }
}

export async function saveTemplate(template: AuditTemplate): Promise<void> {
  try {
    const db = await getDB();
    await db.put(TEMPLATES_STORE, template, template.id);
  } catch (err) {
    console.error('Failed to save template:', err);
  }
}

export async function loadTemplates(): Promise<AuditTemplate[]> {
  try {
    const db = await getDB();
    const all = await db.getAll(TEMPLATES_STORE) as AuditTemplate[];
    return all.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } catch (err) {
    console.error('Failed to load templates:', err);
    return [];
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(TEMPLATES_STORE, id);
  } catch (err) {
    console.error('Failed to delete template:', err);
  }
}
