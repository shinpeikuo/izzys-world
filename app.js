import { createSaver, NewerSaveError, NotABackupError } from './save.js';
import { startGame } from './game.js';

// Set with: python tools/release.py 1.2.3 (keeps sw.js in step).
const VERSION = '0.3.0';

const $ = (id) => document.getElementById(id);
$('version').textContent = 'v' + VERSION;
$('panel-version').textContent = VERSION;

const saver = createSaver(VERSION);
let game = null;

// --- Grown-up area: press and hold the gear for 2 seconds ---

const gear = $('gear');
let holdTimer = null;
gear.addEventListener('pointerdown', (e) => {
  gear.setPointerCapture(e.pointerId);
  gear.classList.add('holding');
  holdTimer = setTimeout(() => { stopHold(); openPanel(); }, 2000);
});
function stopHold() {
  clearTimeout(holdTimer);
  gear.classList.remove('holding');
}
gear.addEventListener('pointerup', stopHold);
gear.addEventListener('pointercancel', stopHold);
gear.addEventListener('contextmenu', (e) => e.preventDefault());

function showMessage(text, kind = '') {
  const el = $('panel-message');
  el.textContent = text;
  el.className = 'panel-message ' + kind;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function openPanel() {
  showMessage(saver.readOnly ? 'Saving is paused: this world came from a newer version. Update the app.' : '', saver.readOnly ? 'error' : '');
  const meta = await saver.meta();
  $('last-backup').textContent = meta.lastBackupAt ? formatDate(meta.lastBackupAt) : 'never';
  const kept = navigator.storage && navigator.storage.persisted && (await navigator.storage.persisted());
  $('storage-status').textContent = kept ? 'kept safe by Chrome' : 'Chrome may clear it if the tablet runs low on space';
  $('grownups').hidden = false;
}

$('close-panel').addEventListener('click', () => { $('grownups').hidden = true; });

$('save-backup').addEventListener('click', async () => {
  await saver.exportBackup();
  const meta = await saver.meta();
  if (meta.lastBackupAt) $('last-backup').textContent = formatDate(meta.lastBackupAt);
  showMessage('Backup saved to Downloads ✓', 'ok');
});

let pendingWorld = null;
$('load-backup').addEventListener('click', () => $('backup-file').click());
$('backup-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    pendingWorld = await saver.readBackup(file);
    $('confirm').hidden = false;
  } catch (err) {
    if (err instanceof NewerSaveError) showMessage('This backup is from a newer version. Update the app first.', 'error');
    else if (err instanceof NotABackupError) showMessage('That file is not an Izzy\'s World backup.', 'error');
    else showMessage('Could not read that backup.', 'error');
  }
});
$('confirm-no').addEventListener('click', () => { pendingWorld = null; $('confirm').hidden = true; });
$('confirm-yes').addEventListener('click', async () => {
  $('confirm').hidden = true;
  try {
    await saver.replaceWorld(pendingWorld);
    game.scene.getScene('place').scene.restart();
    showMessage('Backup loaded ✓', 'ok');
  } catch {
    showMessage('Could not load the backup. The world was not changed.', 'error');
  }
  pendingWorld = null;
});

// --- Start up ---

await saver.load();
game = startGame(saver);
saver.requestPersist();

// --- Service worker: makes the app work offline and handles updates ---
//
// Update rule: a new version only takes over right after the app opens, never
// in the middle of play. If it is found later, it waits until the next launch.
const pageOpenedAt = performance.timeOrigin;
const FRESH_LAUNCH_MS = 10000;

function showOfflineReady() {
  $('offline').textContent = '✓ offline';
}

if ('serviceWorker' in navigator) {
  try {
    const reg = await navigator.serviceWorker.register('sw.js');

    const applyIfFresh = (worker) => {
      if (worker && Date.now() - pageOpenedAt < FRESH_LAUNCH_MS && navigator.serviceWorker.controller) {
        worker.postMessage('SKIP_WAITING');
      }
    };

    if (reg.waiting) applyIfFresh(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') applyIfFresh(worker);
        if (worker.state === 'activated') showOfflineReady();
      });
    });

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
      if (reloading) return;
      reloading = true;
      await saver.saveNow(); // never lose a change when the update reloads the page
      window.location.reload();
    });

    if (reg.active) showOfflineReady();
  } catch (err) {
    console.error('Service worker failed to register', err);
  }
}
