import { openDB } from 'idb';
import type { AuditState } from './types';

const DB_NAME = 'rotakin-v3';
const STORE_NAME = 'audits';
const AUDIT_KEY = 'rotakin-audit-current';

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
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
