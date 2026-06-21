const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let cache = { servers: {}, manifests: {}, settings: {} };
let cachePath = null;

function getCachePath() {
  if (!cachePath) {
    const userData = app.getPath('userData');
    const dir = path.join(userData, 'CyberCraft');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cachePath = path.join(dir, 'launcher-cache.json');
  }
  return cachePath;
}

function loadCache() {
  try {
    const p = getCachePath();
    if (fs.existsSync(p)) {
      cache = JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch (error) {
    console.error('Failed to load cache:', error.message);
    cache = { servers: {}, manifests: {}, settings: {} };
  }
}

function saveCache() {
  try {
    fs.writeFileSync(getCachePath(), JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save cache:', error.message);
  }
}

function cacheServers(servers) {
  const now = Date.now();
  for (const server of servers) {
    cache.servers[server.id] = { data: server, cached_at: now };
  }
  saveCache();
}

function getCachedServers(maxAgeMs) {
  if (maxAgeMs === undefined) maxAgeMs = 24 * 60 * 60 * 1000;
  loadCache();
  const cutoff = Date.now() - maxAgeMs;
  return Object.values(cache.servers)
    .filter(s => s.cached_at > cutoff)
    .map(s => ({ ...s.data, cached_at: s.cached_at }));
}

function hasValidCache(maxAgeMs) {
  if (maxAgeMs === undefined) maxAgeMs = 24 * 60 * 60 * 1000;
  loadCache();
  const cutoff = Date.now() - maxAgeMs;
  return Object.values(cache.servers).some(s => s.cached_at > cutoff);
}

function cacheManifest(serverId, manifest) {
  cache.manifests[serverId] = { data: manifest, cached_at: Date.now() };
  saveCache();
}

function getCachedManifest(serverId, maxAgeMs) {
  if (maxAgeMs === undefined) maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  loadCache();
  const entry = cache.manifests[serverId];
  if (entry && (Date.now() - entry.cached_at) < maxAgeMs) {
    return entry.data;
  }
  return null;
}

function setSetting(key, value) {
  cache.settings[key] = value;
  saveCache();
}

function getSetting(key, defaultValue) {
  loadCache();
  return cache.settings[key] !== undefined ? cache.settings[key] : (defaultValue !== undefined ? defaultValue : null);
}

function clearOldCache(maxAgeMs) {
  if (maxAgeMs === undefined) maxAgeMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - maxAgeMs;
  for (const id of Object.keys(cache.servers)) {
    if (cache.servers[id].cached_at < cutoff) delete cache.servers[id];
  }
  for (const id of Object.keys(cache.manifests)) {
    if (cache.manifests[id].cached_at < cutoff) delete cache.manifests[id];
  }
  saveCache();
}

function closeCache() {
  saveCache();
}

module.exports = { cacheServers, getCachedServers, hasValidCache, cacheManifest, getCachedManifest, setSetting, getSetting, clearOldCache, closeCache };
