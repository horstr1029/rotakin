import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { mkdirSync } from 'fs';

const DB_PATH = process.env.AUTH_DB_PATH ?? path.join(process.cwd(), 'data', 'rotakin-auth.db');

export type UserRole = 'admin' | 'user';

export interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  is_active: number;
  created_at: string;
  last_login: string | null;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  seedAdmin(_db);
  return _db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name          TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL,
      last_login    TEXT
    )
  `);
}

function seedAdmin(db: Database.Database): void {
  const { c } = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (c > 0) return;
  const email = process.env.ADMIN_EMAIL ?? 'admin@rotakin.local';
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? 'RotakinAdmin2024!';
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at)
     VALUES (?, ?, 'Administrator', ?, 'admin', 1, ?)`
  ).run(crypto.randomUUID(), email.toLowerCase(), hash, new Date().toISOString());
  console.log(`[rotakin] Seeded default admin: ${email}`);
}

function toSafeUser(u: DbUser): SafeUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.is_active === 1, createdAt: u.created_at, lastLogin: u.last_login };
}

export function findUserByEmail(email: string): DbUser | null {
  return (getDb().prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as DbUser) ?? null;
}

export function findUserById(id: string): DbUser | null {
  return (getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser) ?? null;
}

export function listUsers(): SafeUser[] {
  return (getDb().prepare('SELECT * FROM users ORDER BY created_at ASC').all() as DbUser[]).map(toSafeUser);
}

export function createUser(email: string, name: string, password: string, role: UserRole): SafeUser {
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 12);
  const now = new Date().toISOString();
  getDb().prepare(
    `INSERT INTO users (id, email, name, password_hash, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`
  ).run(id, email.toLowerCase(), name, hash, role, now);
  return toSafeUser(findUserById(id)!);
}

export function updateUser(id: string, fields: Partial<{ name: string; role: UserRole; isActive: boolean }>): SafeUser | null {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (fields.name !== undefined) { sets.push('name = ?'); values.push(fields.name); }
  if (fields.role !== undefined) { sets.push('role = ?'); values.push(fields.role); }
  if (fields.isActive !== undefined) { sets.push('is_active = ?'); values.push(fields.isActive ? 1 : 0); }
  if (sets.length === 0) { const u = findUserById(id); return u ? toSafeUser(u) : null; }
  values.push(id);
  getDb().prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...(values as Parameters<Database.Statement['run']>));
  const updated = findUserById(id);
  return updated ? toSafeUser(updated) : null;
}

export function resetPassword(id: string, newPassword: string): boolean {
  const hash = bcrypt.hashSync(newPassword, 12);
  return getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id).changes > 0;
}

export function deleteUser(id: string): boolean {
  return getDb().prepare('DELETE FROM users WHERE id = ?').run(id).changes > 0;
}

export function touchLastLogin(id: string): void {
  getDb().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), id);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}
