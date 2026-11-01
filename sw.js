// Set the version with: python tools/release.py 1.2.3 (also updates app.js).
// That is what tells tablets there is an update to download.
const VERSION = '0.3.0';
const CACHE = 'izzys-world-' + VERSION;

// Every file the game needs to run offline. Filled in by tools/release.py.
const FILES = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "app.js",
  "assets.js",
  "catalog.js",
  "game.js",
  "save.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "vendor/phaser.min.js",
  "placeholder/places/house_bg.png",
  "placeholder/props/house_bed.png",
  "placeholder/props/house_chair.png",
  "placeholder/props/house_couch.png",
  "placeholder/props/house_fridge.png",
  "placeholder/props/house_lamp.png",
  "placeholder/props/house_picture.png",
  "placeholder/props/house_rug.png",
  "placeholder/props/house_table.png",
  "placeholder/props/house_tv.png",
  "placeholder/ui/drawer.png",
  "placeholder/ui/trash.png",
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('izzys-world-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Cache first: the game always loads from the tablet, never waits on the network.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request))
  );
});
