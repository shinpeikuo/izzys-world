// Save system: keeps Izzy's one world in IndexedDB on the tablet, and turns it
// into a backup file and back.
//
// Every save is wrapped in an "envelope" that records which save version it is.
// When the shape of the world changes in an update, bump SAVE_VERSION and add a
// migration that upgrades the old shape, so existing worlds keep working.

export const SAVE_VERSION = 2;
const FORMAT = 'izzys-world-save';
const DB_NAME = 'izzys-world';
const STORE = 'kv';
const WORLD_KEY = 'world';
const META_KEY = 'meta';

// A brand new world. A place that is not in `places` yet gets its starting
// furniture the first time it is shown, so adding a new place needs no migration.
//
// places.<id>.items: [{ id, kind, x, y }] where kind is a catalog id and x, y
// are the item's bottom-middle point in room pixels (1920 x 1080).
export function newWorld() {
  return {
    place: 'house',
    places: {},
  };
}

// MIGRATIONS[n] turns a version-n world into a version n+1 world.
// Never change or remove a migration after it has been published.
export const MIGRATIONS = {
  // v1 (hello page: a draggable star) -> v2 (places with furniture)
  1: () => ({ place: 'house', places: {} }),
};

export class NewerSaveError extends Error {}
export class NotABackupError extends Error {}

export function migrate(save, migrations = MIGRATIONS, target = SAVE_VERSION) {
  let version = save.saveVersion;
  let world = save.world;
  if (version > target) throw new NewerSaveError('Save is from a newer version of the game');
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new Error('No migration from save version ' + version);
    world = step(structuredClone(world));
    version++;
  }
  return { ...save, saveVersion: version, world };
}

function envelope(world, appVersion) {
  return { format: FORMAT, saveVersion: SAVE_VERSION, appVersion, savedAt: new Date().toISOString(), world };
}

function isEnvelope(data) {
  return data && data.format === FORMAT && Number.isInteger(data.saveVersion) && data.world && typeof data.world === 'object';
}

// --- IndexedDB (a tiny key/value store) ---

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function get(key) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(key, value) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- The save system used by the game ---

export function createSaver(appVersion) {
  let current = null;   // the world being played
  let readOnly = false; // true if the stored save is newer than this app: never overwrite it
  let timer = null;

  async function load() {
    let stored;
    try {
      stored = await get(WORLD_KEY);
    } catch (err) {
      console.error('Could not open saved world', err);
      readOnly = true; // storage is broken: play, but don't risk writing
      return (current = newWorld());
    }
    if (!isEnvelope(stored)) return (current = newWorld());
    try {
      const upgraded = migrate(stored);
      if (upgraded.saveVersion !== stored.saveVersion) {
        // Keep the untouched old save, just in case a migration has a bug.
        await put('pre-migration-v' + stored.saveVersion, stored);
        await put(WORLD_KEY, envelope(upgraded.world, appVersion));
      }
      return (current = upgraded.world);
    } catch (err) {
      console.error('Saved world could not be upgraded; leaving it untouched', err);
      readOnly = true;
      return (current = structuredClone(stored.world));
    }
  }

  async function saveNow() {
    clearTimeout(timer);
    timer = null;
    if (readOnly || !current) return;
    try {
      await put(WORLD_KEY, envelope(current, appVersion));
    } catch (err) {
      console.error('Save failed', err);
    }
  }

  // Call after every change. Saves shortly after things stop moving.
  function changed() {
    clearTimeout(timer);
    timer = setTimeout(saveNow, 400);
  }

  // Save straight away when the app is hidden or closed.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && timer) saveNow();
  });
  window.addEventListener('pagehide', () => { if (timer) saveNow(); });

  async function requestPersist() {
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return navigator.storage.persist();
  }

  async function meta() {
    try { return (await get(META_KEY)) || {}; } catch { return {}; }
  }

  function backupFileName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `izzys-world-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  }

  async function exportBackup() {
    await saveNow();
    const blob = new Blob([JSON.stringify(envelope(current, appVersion), null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    try { await put(META_KEY, { ...(await meta()), lastBackupAt: new Date().toISOString() }); } catch { /* not critical */ }
  }

  // Reads and checks a backup file. Throws NotABackupError or NewerSaveError.
  // Does not change anything until replaceWorld() is called.
  async function readBackup(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch { throw new NotABackupError('Not a backup file'); }
    if (!isEnvelope(data)) throw new NotABackupError('Not a backup file');
    return migrate(data).world;
  }

  async function replaceWorld(world) {
    if (readOnly) throw new Error('Saved world is read-only');
    current = world;
    await saveNow();
  }

  return {
    load,
    changed,
    saveNow,
    requestPersist,
    meta,
    exportBackup,
    readBackup,
    replaceWorld,
    get world() { return current; },
    get readOnly() { return readOnly; },
  };
}
