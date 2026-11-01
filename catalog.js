// Everything that can appear in the game: places, rooms and the items in them.
// To add an item: cut it with tools/cut_sheet.py, then add its id to a room's `items`.
import { ART } from './assets.js';

// Real art from art/ when it exists, otherwise the placeholder with the same name.
export function artPath(file) {
  return ART.has('art/' + file) ? 'art/' + file : 'placeholder/' + file;
}

export function itemFile(kind) {
  return 'props/' + kind + '.webp';
}

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
};

export function itemLayer(kind) {
  return (ITEM_SETTINGS[kind] && ITEM_SETTINGS[kind].layer) || 'stand';
}

export function itemScale(kind) {
  return (ITEM_SETTINGS[kind] && ITEM_SETTINGS[kind].scale) || 1;
}

// The scene selector. hotspot: the part of the picture you tap to go to a place.
export const PLACES = {
  castle: { hotspot: [0, 0, 640, 1080], rooms: [] },  // rooms come after characters (build step 6)
  cafe: { hotspot: [640, 0, 1280, 1080], rooms: [] },
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
};
