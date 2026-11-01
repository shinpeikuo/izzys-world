// Set the version with: python tools/release.py 1.2.3 (also updates app.js).
// That is what tells tablets there is an update to download.
const VERSION = '0.4.0';
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
  "art/places/Main World scene selector/main scene selector.jpg",
  "art/places/cafe_bg.webp",
  "art/places/castle_bedroom_bg.webp",
  "art/places/castle_dining_bg.webp",
  "art/places/castle_lobby_bg.webp",
  "art/places/house_bedroom_bg.webp",
  "art/places/house_kitchen_bg.webp",
  "art/places/house_living_bg.webp",
  "art/places/world_bg.webp",
  "art/props/bedroom_bear_shelf.webp",
  "art/props/bedroom_bed.webp",
  "art/props/bedroom_bed_small.webp",
  "art/props/bedroom_board_games.webp",
  "art/props/bedroom_books.webp",
  "art/props/bedroom_bookshelf.webp",
  "art/props/bedroom_bunk_bed.webp",
  "art/props/bedroom_cloud_lamp.webp",
  "art/props/bedroom_computer.webp",
  "art/props/bedroom_desk.webp",
  "art/props/bedroom_dino.webp",
  "art/props/bedroom_dollhouse.webp",
  "art/props/bedroom_nightstand.webp",
  "art/props/bedroom_notebooks.webp",
  "art/props/bedroom_pencils.webp",
  "art/props/bedroom_posters.webp",
  "art/props/bedroom_star_garland.webp",
  "art/props/bedroom_star_rug.webp",
  "art/props/bedroom_stool.webp",
  "art/props/bedroom_string_lights.webp",
  "art/props/bedroom_teddy.webp",
  "art/props/bedroom_toy_box.webp",
  "art/props/bedroom_toy_chest.webp",
  "art/props/bedroom_unicorn.webp",
  "art/props/bedroom_unicorn_big.webp",
  "art/props/bedroom_vanity.webp",
  "art/props/bedroom_wardrobe.webp",
  "art/props/kitchen_bar_stool.webp",
  "art/props/kitchen_bar_stool_pink.webp",
  "art/props/kitchen_bench.webp",
  "art/props/kitchen_blender.webp",
  "art/props/kitchen_bowl_stack.webp",
  "art/props/kitchen_bowls.webp",
  "art/props/kitchen_bread.webp",
  "art/props/kitchen_bread_bag.webp",
  "art/props/kitchen_cart.webp",
  "art/props/kitchen_cereal_green.webp",
  "art/props/kitchen_cereal_red.webp",
  "art/props/kitchen_chair_blue.webp",
  "art/props/kitchen_chair_pink.webp",
  "art/props/kitchen_chair_yellow.webp",
  "art/props/kitchen_coffee_bag.webp",
  "art/props/kitchen_cooking_tools.webp",
  "art/props/kitchen_cup_saucer.webp",
  "art/props/kitchen_cupboard.webp",
  "art/props/kitchen_cutlery.webp",
  "art/props/kitchen_eggs.webp",
  "art/props/kitchen_footstool.webp",
  "art/props/kitchen_fridge.webp",
  "art/props/kitchen_fruit_veg.webp",
  "art/props/kitchen_hanging_plant.webp",
  "art/props/kitchen_hanging_plants.webp",
  "art/props/kitchen_hanging_rack.webp",
  "art/props/kitchen_microwave.webp",
  "art/props/kitchen_milk.webp",
  "art/props/kitchen_mugs.webp",
  "art/props/kitchen_pan.webp",
  "art/props/kitchen_pantry.webp",
  "art/props/kitchen_pet_bowl.webp",
  "art/props/kitchen_plate.webp",
  "art/props/kitchen_pot.webp",
  "art/props/kitchen_round_table.webp",
  "art/props/kitchen_rug.webp",
  "art/props/kitchen_shelf_hooks.webp",
  "art/props/kitchen_spoon_fork.webp",
  "art/props/kitchen_stool_mint.webp",
  "art/props/kitchen_stool_pink.webp",
  "art/props/kitchen_stove.webp",
  "art/props/kitchen_table.webp",
  "art/props/kitchen_toaster.webp",
  "art/props/kitchen_utensil_jar.webp",
  "art/props/living_armchair.webp",
  "art/props/living_beanbag.webp",
  "art/props/living_board_games.webp",
  "art/props/living_books.webp",
  "art/props/living_bookshelf.webp",
  "art/props/living_cabinet.webp",
  "art/props/living_clock.webp",
  "art/props/living_cloud_lamp.webp",
  "art/props/living_controller.webp",
  "art/props/living_cushions.webp",
  "art/props/living_desk.webp",
  "art/props/living_fern.webp",
  "art/props/living_footstool.webp",
  "art/props/living_frame.webp",
  "art/props/living_game_console.webp",
  "art/props/living_guitar.webp",
  "art/props/living_hanging_plant.webp",
  "art/props/living_hanging_plant_small.webp",
  "art/props/living_mirror.webp",
  "art/props/living_picture.webp",
  "art/props/living_potted_plant.webp",
  "art/props/living_rug.webp",
  "art/props/living_side_table.webp",
  "art/props/living_sofa.webp",
  "art/props/living_tissues.webp",
  "art/props/living_toy_basket.webp",
  "art/props/living_tv.webp",
  "art/ui/arrow_left.webp",
  "art/ui/arrow_right.webp",
  "art/ui/gear.webp",
  "art/ui/map.webp",
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
  if (self.location.hostname === 'localhost') return; // testing on the computer: always use the latest files
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request))
  );
});
