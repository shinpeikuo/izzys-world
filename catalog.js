// Everything that can appear in the game: places and the items in them.
// To add an item: draw it, add a line to ITEMS, and add its id to a place's drawer.
import { ART } from './assets.js';

// Art is drawn large (characters on a 1024 x 2048 canvas) and shown at this size.
export const ART_SCALE = 0.3;

// Real art from art/ when it exists, otherwise the placeholder with the same name.
export function artPath(file) {
  return ART.has('art/' + file) ? 'art/' + file : 'placeholder/' + file;
}

// layer: 'floor' = always underneath (rugs), 'wall' = hangs on the wall,
//        'stand' = stands in the room; things lower on the screen are in front.
export const ITEMS = {
  house_bed:     { file: 'props/house_bed.png', layer: 'stand' },
  house_couch:   { file: 'props/house_couch.png', layer: 'stand' },
  house_table:   { file: 'props/house_table.png', layer: 'stand' },
  house_chair:   { file: 'props/house_chair.png', layer: 'stand' },
  house_tv:      { file: 'props/house_tv.png', layer: 'stand' },
  house_lamp:    { file: 'props/house_lamp.png', layer: 'stand' },
  house_fridge:  { file: 'props/house_fridge.png', layer: 'stand' },
  house_picture: { file: 'props/house_picture.png', layer: 'wall' },
  house_rug:     { file: 'props/house_rug.png', layer: 'floor' },
};

// start: the furniture a place has the first time it is opened.
// x, y is the bottom-middle of each item in room pixels (1920 x 1080).
export const PLACES = {
  house: {
    background: 'places/house_bg.png',
    drawer: ['house_bed', 'house_couch', 'house_table', 'house_chair', 'house_tv', 'house_lamp', 'house_fridge', 'house_picture', 'house_rug'],
    start: [
      { kind: 'house_picture', x: 760, y: 360 },
      { kind: 'house_fridge', x: 120, y: 780 },
      { kind: 'house_bed', x: 470, y: 830 },
      { kind: 'house_rug', x: 1200, y: 930 },
      { kind: 'house_tv', x: 1525, y: 740 },
      { kind: 'house_lamp', x: 1840, y: 790 },
      { kind: 'house_couch', x: 1200, y: 900 },
      { kind: 'house_table', x: 760, y: 1010 },
      { kind: 'house_chair', x: 600, y: 1020 },
      { kind: 'house_chair', x: 920, y: 1020 },
    ],
  },
};
