// Everything that can appear in the game: people, places, rooms and the items in them.
// To add an item: cut it with tools/cut_sheet.py, then add its id to a room's `items`.
import { ART } from './assets.js';

// Real art from art/ when it exists, otherwise the placeholder with the same name.
export function artPath(file) {
  return ART.has('art/' + file) ? 'art/' + file : 'placeholder/' + file;
}

export function itemFile(kind) {
  return 'props/' + kind + '.webp';
}

// The people. Each look is a whole picture: art/characters/<id>_<look>.webp,
// made by tools/prepare_characters.py. The first look is the one they start in.
export const CHARACTERS = {
  izzy: { looks: ['main', 'hiphop', 'mustache', 'princess'] },
  mom: { looks: ['default'] },
  dad: { looks: ['default'] },
  ollie: { looks: ['default'] },
  caden: { looks: ['default'] },
  jane: { looks: ['default'] },
  syd: { looks: ['default'] },
};

export function lookFile(id, look) {
  return 'characters/' + id + '_' + look + '.webp';
}

// Where each look's free hand is, and where the legs start (for sitting), as fractions
// of the picture from its top-left corner. Looks not listed use DEFAULT_BODY.
const DEFAULT_BODY = { hand: [0.86, 0.61], hip: 0.58 };
const BODIES = {
  izzy_hiphop: { hand: [0.75, 0.33], hip: 0.55 },
  izzy_princess: { hand: [0.33, 0.53], hip: 0.55 },
  dad_default: { hand: [0.9, 0.6], hip: 0.56 },
};

export function body(id, look) {
  return BODIES[id + '_' + look] || DEFAULT_BODY;
}

// Furniture people can sit or lie on.
// [pose, seat height as a fraction of the item's height from the bottom, number of spots]
export const SEATS = {
  living_sofa: ['sit', 0.38, 3], living_armchair: ['sit', 0.4], living_beanbag: ['sit', 0.5], living_footstool: ['sit', 0.9],
  bedroom_bed: ['lie', 0.45], bedroom_bed_small: ['lie', 0.45], bedroom_bunk_bed: ['lie', 0.28], bedroom_stool: ['sit', 0.9],
  kitchen_bar_stool: ['sit', 0.92], kitchen_bar_stool_pink: ['sit', 0.92], kitchen_bench: ['sit', 0.85, 2],
  kitchen_chair_blue: ['sit', 0.45], kitchen_chair_pink: ['sit', 0.45], kitchen_chair_yellow: ['sit', 0.45],
  kitchen_footstool: ['sit', 0.85], kitchen_stool_mint: ['sit', 0.9], kitchen_stool_pink: ['sit', 0.9],
  cafe_armchair: ['sit', 0.4], cafe_bench: ['sit', 0.7, 2], cafe_chair_blue: ['sit', 0.42], cafe_chair_pink: ['sit', 0.42],
  cafe_chair_purple: ['sit', 0.42], cafe_stool_dark: ['sit', 0.95], cafe_stool_mint: ['sit', 0.95], cafe_stool_wood: ['sit', 0.95],
  castle_lobby_sofa: ['sit', 0.42, 2], castle_lobby_throne: ['sit', 0.33], castle_lobby_chair_crown: ['sit', 0.38],
  castle_lobby_chair_pink: ['sit', 0.36], castle_lobby_chair_purple: ['sit', 0.42], castle_lobby_chair_star: ['sit', 0.36],
  castle_bedroom_canopy_bed: ['lie', 0.3], castle_bedroom_chair: ['sit', 0.4], castle_bedroom_daybed: ['lie', 0.5],
  castle_bedroom_stool: ['sit', 0.9], castle_bedroom_throne: ['sit', 0.33],
  castle_dining_chair_2: ['sit', 0.4], castle_dining_chair_3: ['sit', 0.4], castle_dining_chair_pink: ['sit', 0.4],
  castle_dining_chair_purple: ['sit', 0.4], castle_dining_throne_lilac: ['sit', 0.33], castle_dining_throne_pink: ['sit', 0.33],
};

// Items smaller than this (in room pixels) can be held by dropping them on a hand.
export const HOLD_MAX = 170;

// What happens when an item is tapped (anything not listed gives a little wiggle).
// light: switches a glow on and off at `at` (fractions of the item from its top-left).
// screen: switches a screen on and off; `rect` is [left, top, right, bottom] fractions.
// steam: puffs of steam rise from `at`.
export const REACTIONS = {
  living_cloud_lamp: { light: true, at: [0.5, 0.1], r: 110 },
  bedroom_cloud_lamp: { light: true, at: [0.5, 0.25], r: 90 },
  bedroom_string_lights: { light: true, at: [0.5, 0.45], r: 140 },
  castle_bedroom_lantern: { light: true, at: [0.5, 0.6], r: 70 },
  castle_lobby_candelabra: { light: true, at: [0.5, 0.2], r: 90 },
  castle_lobby_candelabra_small: { light: true, at: [0.5, 0.2], r: 80 },
  castle_dining_candelabra: { light: true, at: [0.5, 0.2], r: 80 },
  castle_lobby_torch: { light: true, at: [0.5, 0.1], r: 70 },
  castle_lobby_torch_2: { light: true, at: [0.5, 0.1], r: 70 },
  castle_lobby_chandelier: { light: true, at: [0.5, 0.7], r: 170 },
  living_tv: { screen: true, rect: [0.12, 0.03, 0.88, 0.47] },
  bedroom_computer: { screen: true, rect: [0.08, 0.04, 0.92, 0.5] },
  cafe_coffee_machine: { steam: true, at: [0.33, 0.68] },
  cafe_coffee_pot: { steam: true, at: [0.5, 0.1] },
  kitchen_stove: { steam: true, at: [0.5, 0.05] },
};

// Items are cut from the sheets at room size, so most need no settings.
// layer: 'stand' (default) = stands in the room; things lower on screen are in front.
//        'floor' = always underneath (rugs). 'wall' = hangs on the wall.
// scale: makes an item bigger or smaller than it was drawn on its sheet.
const FLOOR = { layer: 'floor' };
const WALL = { layer: 'wall' };
export const ITEM_SETTINGS = {
  living_rug: FLOOR, bedroom_star_rug: FLOOR, kitchen_rug: FLOOR,
  living_clock: WALL, living_picture: WALL, living_frame: WALL, living_mirror: WALL,
  living_hanging_plant: WALL, living_hanging_plant_small: WALL,
  bedroom_bear_shelf: WALL, bedroom_posters: WALL, bedroom_string_lights: WALL, bedroom_star_garland: WALL,
  kitchen_hanging_plant: WALL, kitchen_hanging_plants: WALL, kitchen_shelf_hooks: WALL, kitchen_hanging_rack: WALL,
  cafe_welcome_mat: FLOOR, cafe_big_mat: FLOOR, cafe_star_garland: WALL,
  castle_lobby_heart_rug: FLOOR, castle_lobby_chandelier: WALL, castle_lobby_banner_shield: WALL, castle_lobby_banner_knight: WALL,
  castle_lobby_banner_ribbon: WALL, castle_lobby_banner_hanging: WALL, castle_lobby_key_board: WALL, castle_lobby_portrait: WALL,
  castle_lobby_shield_yellow: WALL, castle_lobby_shield_red: WALL, castle_lobby_shield_white: WALL, castle_lobby_shield_crown: WALL,
  castle_lobby_torch: WALL, castle_lobby_torch_2: WALL, castle_lobby_tapestry: WALL, castle_lobby_tapestry_purple: WALL,
  castle_bedroom_heart_rug: FLOOR, castle_bedroom_oval_rug: FLOOR, castle_bedroom_banners: WALL, castle_bedroom_moon_garland: WALL,
  castle_bedroom_bunting: WALL, castle_bedroom_frame: WALL, castle_bedroom_mirror: WALL, castle_bedroom_star_garland: WALL,
  castle_dining_rug_purple: FLOOR, castle_dining_rug_pink: FLOOR, castle_dining_banner_heart: WALL, castle_dining_shield: WALL,
  castle_dining_banner_pink: WALL, castle_dining_banner_star: WALL,
};

export function itemLayer(kind) {
  return (ITEM_SETTINGS[kind] && ITEM_SETTINGS[kind].layer) || 'stand';
}

export function itemScale(kind) {
  return (ITEM_SETTINGS[kind] && ITEM_SETTINGS[kind].scale) || 1;
}

// The scene selector. hotspot: the part of the picture you tap to go to a place.
export const PLACES = {
  castle: { hotspot: [0, 0, 640, 1080], rooms: ['castle_lobby', 'castle_bedroom', 'castle_dining'] },
  cafe: { hotspot: [640, 0, 1280, 1080], rooms: ['cafe'] },
  house: { hotspot: [1280, 0, 1920, 1080], rooms: ['house_living', 'house_bedroom', 'house_kitchen'] },
};

// ui: where the gear, trash can and item box are drawn in each room picture.
// start: the furniture a room has the first time it is opened, as [kind, x, y]
// with x, y the bottom-middle of the item in room pixels (1920 x 1080).
export const ROOMS = {
  house_living: {
    place: 'house',
    background: 'places/house_living_bg.webp',
    ui: { gear: [88, 85], trash: [95, 985], box: [1835, 985] },
    items: [
      'living_sofa', 'living_armchair', 'living_beanbag', 'living_footstool', 'living_tv', 'living_side_table',
      'living_bookshelf', 'living_cabinet', 'living_desk', 'living_cloud_lamp', 'living_fern', 'living_potted_plant',
      'living_hanging_plant', 'living_hanging_plant_small', 'living_guitar', 'living_cushions', 'living_rug',
      'living_toy_basket', 'living_clock', 'living_picture', 'living_frame', 'living_mirror', 'living_tissues',
      'living_game_console', 'living_controller', 'living_board_games', 'living_books',
    ],
    start: [
      ['living_rug', 1000, 840],
      ['living_sofa', 560, 830],
      ['living_armchair', 1420, 820],
      ['living_fern', 1700, 760],
      ['living_clock', 960, 250],
    ],
  },
  house_bedroom: {
    place: 'house',
    background: 'places/house_bedroom_bg.webp',
    ui: { gear: [90, 85], trash: [95, 985], box: [1830, 985] },
    items: [
      'bedroom_bed', 'bedroom_bed_small', 'bedroom_bunk_bed', 'bedroom_wardrobe', 'bedroom_bookshelf', 'bedroom_vanity',
      'bedroom_stool', 'bedroom_desk', 'bedroom_nightstand', 'bedroom_toy_chest', 'bedroom_toy_box', 'bedroom_star_rug',
      'bedroom_cloud_lamp', 'bedroom_computer', 'bedroom_dollhouse', 'bedroom_teddy', 'bedroom_dino', 'bedroom_unicorn',
      'bedroom_unicorn_big', 'bedroom_bear_shelf', 'bedroom_posters', 'bedroom_string_lights', 'bedroom_star_garland',
      'bedroom_board_games', 'bedroom_books', 'bedroom_pencils', 'bedroom_notebooks',
    ],
    start: [
      ['bedroom_star_rug', 980, 850],
      ['bedroom_bed', 560, 820],
      ['bedroom_nightstand', 1000, 720],
      ['bedroom_wardrobe', 1500, 760],
      ['bedroom_teddy', 1150, 860],
    ],
  },
  house_kitchen: {
    place: 'house',
    background: 'places/house_kitchen_bg.webp',
    ui: { gear: [92, 85], trash: [90, 1000], box: [1830, 1000] },
    items: [
      'kitchen_stove', 'kitchen_microwave', 'kitchen_toaster', 'kitchen_blender', 'kitchen_fridge', 'kitchen_pantry',
      'kitchen_cupboard', 'kitchen_table', 'kitchen_round_table', 'kitchen_bench', 'kitchen_chair_blue',
      'kitchen_chair_yellow', 'kitchen_chair_pink', 'kitchen_stool_mint', 'kitchen_stool_pink', 'kitchen_bar_stool',
      'kitchen_bar_stool_pink', 'kitchen_footstool', 'kitchen_cart', 'kitchen_rug', 'kitchen_pot', 'kitchen_pan',
      'kitchen_mugs', 'kitchen_bowls', 'kitchen_bowl_stack', 'kitchen_plate', 'kitchen_cup_saucer', 'kitchen_cutlery',
      'kitchen_spoon_fork', 'kitchen_cooking_tools', 'kitchen_utensil_jar', 'kitchen_bread', 'kitchen_bread_bag',
      'kitchen_coffee_bag', 'kitchen_cereal_green', 'kitchen_cereal_red', 'kitchen_milk', 'kitchen_eggs',
      'kitchen_fruit_veg', 'kitchen_pet_bowl', 'kitchen_hanging_plant', 'kitchen_hanging_plants',
      'kitchen_shelf_hooks', 'kitchen_hanging_rack',
    ],
    start: [
      ['kitchen_stove', 735, 690],
      ['kitchen_rug', 1000, 880],
      ['kitchen_table', 1000, 860],
      ['kitchen_chair_yellow', 760, 870],
      ['kitchen_chair_pink', 1240, 870],
    ],
  },
  cafe: {
    place: 'cafe',
    background: 'places/cafe_bg.webp',
    ui: { gear: [80, 88], trash: [78, 995], box: [1845, 1008] },
    items: [
      'cafe_round_table', 'cafe_long_table', 'cafe_coffee_machine', 'cafe_register', 'cafe_grinder',
      'cafe_blender', 'cafe_chair_pink', 'cafe_chair_purple', 'cafe_chair_blue', 'cafe_welcome_mat',
      'cafe_coffee_pot', 'cafe_teapot_pink', 'cafe_teapot_green', 'cafe_mug_pink', 'cafe_mug_yellow',
      'cafe_cup_blue', 'cafe_cup_cream', 'cafe_cup_red', 'cafe_cup_white', 'cafe_cup_small', 'cafe_plates',
      'cafe_water_jug', 'cafe_toaster', 'cafe_stool_dark', 'cafe_stool_wood', 'cafe_stool_mint',
      'cafe_armchair', 'cafe_cake_stand', 'cafe_cake', 'cafe_cupcakes', 'cafe_cookies', 'cafe_menu_board',
      'cafe_croissants', 'cafe_big_mat', 'cafe_bench', 'cafe_cart', 'cafe_plant', 'cafe_star_garland',
      'cafe_bread_basket', 'cafe_menu_sign'
    ],
    start: [
      ['cafe_round_table', 700, 920],
      ['cafe_chair_pink', 540, 930],
      ['cafe_chair_blue', 860, 930],
      ['cafe_coffee_machine', 1250, 690],
      ['cafe_register', 1560, 690],
      ['cafe_plant', 1820, 760],
    ],
  },
  castle_lobby: {
    place: 'castle',
    background: 'places/castle_lobby_bg.webp',
    ui: { gear: [85, 88], trash: [90, 985], box: [1850, 1010] },
    items: [
      'castle_lobby_throne', 'castle_lobby_sofa', 'castle_lobby_chair_crown', 'castle_lobby_chair_pink',
      'castle_lobby_chair_star', 'castle_lobby_chair_purple', 'castle_lobby_chandelier',
      'castle_lobby_banner_shield', 'castle_lobby_banner_knight', 'castle_lobby_banner_ribbon',
      'castle_lobby_guest_book', 'castle_lobby_key_board', 'castle_lobby_desk', 'castle_lobby_box',
      'castle_lobby_knight', 'castle_lobby_shield_yellow', 'castle_lobby_shield_red',
      'castle_lobby_shield_white', 'castle_lobby_shield_crown', 'castle_lobby_grandfather_clock',
      'castle_lobby_banner_hanging', 'castle_lobby_portrait', 'castle_lobby_candelabra',
      'castle_lobby_candelabra_small', 'castle_lobby_torch', 'castle_lobby_torch_2',
      'castle_lobby_treasure_chest', 'castle_lobby_crown', 'castle_lobby_crown_heart', 'castle_lobby_tiara',
      'castle_lobby_tiara_purple', 'castle_lobby_heart_rug', 'castle_lobby_tapestry',
      'castle_lobby_tapestry_purple', 'castle_lobby_plant', 'castle_lobby_plant_2', 'castle_lobby_flower_vase'
    ],
    start: [
      ['castle_lobby_heart_rug', 960, 1010],
      ['castle_lobby_throne', 420, 920],
      ['castle_lobby_knight', 700, 860],
      ['castle_lobby_grandfather_clock', 1250, 820],
      ['castle_lobby_plant', 1350, 900],
    ],
  },
  castle_bedroom: {
    place: 'castle',
    background: 'places/castle_bedroom_bg.webp',
    ui: { gear: [90, 85], trash: [90, 990], box: [1850, 1005] },
    items: [
      'castle_bedroom_canopy_bed', 'castle_bedroom_wardrobe', 'castle_bedroom_throne',
      'castle_bedroom_vanity', 'castle_bedroom_chair', 'castle_bedroom_daybed', 'castle_bedroom_desk',
      'castle_bedroom_stool', 'castle_bedroom_nightstand', 'castle_bedroom_chest', 'castle_bedroom_bookshelf',
      'castle_bedroom_banners', 'castle_bedroom_moon_garland', 'castle_bedroom_bunting',
      'castle_bedroom_plant', 'castle_bedroom_frame', 'castle_bedroom_mirror', 'castle_bedroom_star_garland',
      'castle_bedroom_heart_rug', 'castle_bedroom_oval_rug', 'castle_bedroom_tulips',
      'castle_bedroom_flower_vase', 'castle_bedroom_pet_bed', 'castle_bedroom_book', 'castle_bedroom_scroll',
      'castle_bedroom_quill', 'castle_bedroom_lantern', 'castle_bedroom_tiara', 'castle_bedroom_crown',
      'castle_bedroom_tiara_gold', 'castle_bedroom_crown_2', 'castle_bedroom_map',
      'castle_bedroom_knight_toy', 'castle_bedroom_dragon', 'castle_bedroom_unicorn'
    ],
    start: [
      ['castle_bedroom_oval_rug', 980, 990],
      ['castle_bedroom_canopy_bed', 740, 880],
      ['castle_bedroom_chest', 1150, 930],
      ['castle_bedroom_chair', 420, 900],
      ['castle_bedroom_dragon', 1000, 1000],
    ],
  },
  castle_dining: {
    place: 'castle',
    background: 'places/castle_dining_bg.webp',
    ui: { gear: [85, 88], trash: [90, 990], box: [1850, 1010] },
    items: [
      'castle_dining_long_table', 'castle_dining_throne_pink', 'castle_dining_throne_lilac',
      'castle_dining_chair_pink', 'castle_dining_chair_purple', 'castle_dining_sideboard',
      'castle_dining_cart', 'castle_dining_harp', 'castle_dining_music_stand', 'castle_dining_cake_stand',
      'castle_dining_plates', 'castle_dining_roses', 'castle_dining_goblet', 'castle_dining_teapot',
      'castle_dining_rose_bowl', 'castle_dining_candelabra', 'castle_dining_bowl',
      'castle_dining_goblet_purple', 'castle_dining_tea_set', 'castle_dining_cutlery', 'castle_dining_teacup',
      'castle_dining_spoons', 'castle_dining_lute', 'castle_dining_cabinet', 'castle_dining_chair_2',
      'castle_dining_chair_3', 'castle_dining_cupcake', 'castle_dining_feast', 'castle_dining_cake',
      'castle_dining_pie', 'castle_dining_banner_heart', 'castle_dining_shield', 'castle_dining_banner_pink',
      'castle_dining_banner_star', 'castle_dining_jelly', 'castle_dining_cakes', 'castle_dining_fruit_bowl',
      'castle_dining_bread', 'castle_dining_rug_purple', 'castle_dining_rug_pink'
    ],
    start: [
      ['castle_dining_rug_purple', 960, 990],
      ['castle_dining_throne_pink', 960, 860],
      ['castle_dining_long_table', 960, 960],
      ['castle_dining_chair_pink', 560, 980],
      ['castle_dining_chair_purple', 1360, 980],
    ],
  },
};
