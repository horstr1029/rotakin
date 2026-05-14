import { openDB } from 'idb';
import type { AuditState, HistorySnapshot } from './types';

const DB_NAME = 'rotakin-v3';
const STORE_NAME = 'audits';
const HISTORY_STORE = 'history';
const AUDIT_KEY = 'rotakin-audit-current';

async function getDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE);
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

export async function saveAuditToDB(state: AuditState): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, state, AUDIT_KEY);
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
