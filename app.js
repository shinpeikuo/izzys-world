// Bump this together with VERSION in sw.js whenever you publish a change.
const VERSION = '0.1.0';

document.getElementById('version').textContent = 'v' + VERSION;

// Placeholder interaction so there is something to tap on the hello page.
const star = document.getElementById('star');
star.addEventListener('click', () => {
  star.classList.remove('spin');
  void star.offsetWidth; // restart the animation
  star.classList.add('spin');
});

// --- Service worker: makes the app work offline and handles updates ---
//
// Update rule: a new version only takes over right after the app opens, never
// in the middle of play. If it is found later, it waits until the next launch.
const pageOpenedAt = Date.now();
const FRESH_LAUNCH_MS = 10000;

function showOfflineReady() {
  document.getElementById('offline').textContent = '✓ offline';
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
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
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });

      if (reg.active) showOfflineReady();
    } catch (err) {
      console.error('Service worker failed to register', err);
    }
  });
}
