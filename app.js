import { createSaver, NewerSaveError, NotABackupError } from './save.js';

// Bump this together with VERSION in sw.js whenever you publish a change.
const VERSION = '0.2.0';

const $ = (id) => document.getElementById(id);
$('version').textContent = 'v' + VERSION;
$('panel-version').textContent = VERSION;

const saver = createSaver(VERSION);

// --- Placeholder play: drag the star anywhere, tap it to spin ---
// Its position is saved, so it is a quick way to check the save system works.

const star = $('star');

function placeStar() {
  const { x, y } = saver.world.star;
  star.style.left = x * 100 + '%';
  star.style.top = y * 100 + '%';
}

function spin() {
  star.classList.remove('spin');
  void star.offsetWidth; // restart the animation
  star.classList.add('spin');
}

let drag = null;
star.addEventListener('pointerdown', (e) => {
  star.setPointerCapture(e.pointerId);
  drag = { startX: e.clientX, startY: e.clientY, moved: false };
});
star.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 10) return;
  drag.moved = true;
  star.classList.add('dragging');
  const clamp = (v) => Math.min(0.95, Math.max(0.05, v));
  saver.world.star = { x: clamp(e.clientX / innerWidth), y: clamp(e.clientY / innerHeight) };
  placeStar();
});
star.addEventListener('pointerup', () => {
  if (!drag) return;
  star.classList.remove('dragging');
  if (drag.moved) saver.changed();
  else spin();
  drag = null;
});
star.addEventListener('pointercancel', () => { star.classList.remove('dragging'); drag = null; });

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
    placeStar();
    showMessage('Backup loaded ✓', 'ok');
  } catch {
    showMessage('Could not load the backup. The world was not changed.', 'error');
  }
  pendingWorld = null;
});

// --- Start up ---

await saver.load();
placeStar();
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
