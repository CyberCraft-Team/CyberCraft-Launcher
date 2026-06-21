import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface CachedServer {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  status: string;
  current_players: number;
  max_players: number;
  minecraft_version: string;
  loader: string;
  loader_version: string | null;
  icon_url: string | null;
  background_image_url: string | null;
  description: string;
  modpack_id: string | null;
  modpack_name: string | null;
  modpack_version: string | null;
  is_managed: boolean;
  server_type: string;
  cached_at: number;
}

export interface CachedManifest {
  server_id: string;
  manifest: any;
  cached_at: number;
}

export interface CachedVersion {
  id: string;
  version: string;
  loader: string;
  loader_version: string | null;
  release_type: string;
  cached_at: number;
}

let db: Database.Database | null = null;

function getDbPath(): string {
  const userData = app.getPath('userData');
  const cybercraftDir = path.join(userData, 'CyberCraft');
  if (!fs.existsSync(cybercraftDir)) {
    fs.mkdirSync(cybercraftDir, { recursive: true });
  }
  return path.join(cybercraftDir, 'launcher.db');
}

function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath());
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manifests (
      server_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_servers_cached_at ON servers(cached_at);
    CREATE INDEX IF NOT EXISTS idx_manifests_cached_at ON manifests(cached_at);
  `);
}

export function cacheServers(servers: any[]): void {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare('INSERT OR REPLACE INTO servers (id, data, cached_at) VALUES (?, ?, ?)');
  const transaction = db.transaction((servers: any[]) => {
    for (const server of servers) {
      stmt.run(server.id, JSON.stringify(server), now);
    }
  });
  transaction(servers);
}

export function getCachedServers(maxAgeMs = 24 * 60 * 60 * 1000): CachedServer[] {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  const rows = db.prepare('SELECT id, data, cached_at FROM servers WHERE cached_at > ?').all(cutoff) as any[];
  return rows.map(row => ({
    ...JSON.parse(row.data),
    cached_at: row.cached_at,
  }));
}

export function hasValidCache(maxAgeMs = 24 * 60 * 60 * 1000): boolean {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  const count = db.prepare('SELECT COUNT(*) as cnt FROM servers WHERE cached_at > ?').get(cutoff) as { cnt: number };
  return count.cnt > 0;
}

export function cacheManifest(serverId: string, manifest: any): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO manifests (server_id, data, cached_at) VALUES (?, ?, ?)')
    .run(serverId, JSON.stringify(manifest), Date.now());
}

export function getCachedManifest(serverId: string, maxAgeMs = 7 * 24 * 60 * 60 * 1000): any | null {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  const row = db.prepare('SELECT data, cached_at FROM manifests WHERE server_id = ? AND cached_at > ?').get(serverId, cutoff) as any;
  return row ? JSON.parse(row.data) : null;
}

export function cacheVersions(versions: any[]): void {
  const db = getDb();
  const now = Date.now();
  const stmt = db.prepare('INSERT OR REPLACE INTO versions (id, data, cached_at) VALUES (?, ?, ?)');
  const transaction = db.transaction((versions: any[]) => {
    for (const v of versions) {
      stmt.run(v.id, JSON.stringify(v), now);
    }
  });
  transaction(versions);
}

export function getCachedVersions(): any[] {
  const db = getDb();
  const rows = db.prepare('SELECT data FROM versions').all() as any[];
  return rows.map(row => JSON.parse(row.data));
}

export function setSetting(key: string, value: any): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .run(key, JSON.stringify(value));
}

export function getSetting(key: string, defaultValue: any = null): any {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
  return row ? JSON.parse(row.value) : defaultValue;
}

export function clearOldCache(maxAgeMs = 30 * 24 * 60 * 60 * 1000): void {
  const db = getDb();
  const cutoff = Date.now() - maxAgeMs;
  db.prepare('DELETE FROM servers WHERE cached_at < ?').run(cutoff);
  db.prepare('DELETE FROM manifests WHERE cached_at < ?').run(cutoff);
}

export function closeCache(): void {
  if (db) {
    db.close();
    db = null;
  }
}