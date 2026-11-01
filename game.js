// The game itself, drawn with Phaser (vendor/phaser.min.js).
// Scenes: 'boot' loads all pictures, 'world' is the scene selector, 'room' shows one room.
import {
  ROOMS, PLACES, CHARACTERS, SEATS, REACTIONS, HOLD_MAX, artPath, itemFile, itemLayer, itemScale, lookFile, body, hasArt,
} from './catalog.js';
import { play, setEnabled, setTrack, unlock } from './sound.js';

const W = 1920;
const H = 1080;
const UI_DEPTH = 200000;
const DRAG_DEPTH = 100000;
const LAYER_DEPTH = { floor: -10000, wall: -5000, stand: 0 };
const TAP_SLOP = 12;     // a finger can wobble this far and still count as a tap
const HOLD_MS = 2000;    // press and hold the gear this long to open the grown-up area
const BUTTON_R = 75;     // touch radius of the round buttons
const SIT_SQUASH = 0.4;  // sitting: the legs are drawn this much shorter, as if bent towards you
const HAND_REACH = 80;   // an item dropped this close to a hand is held
const SMALL_ITEM = 110;  // items smaller than this get a bigger touch area around them
const SMALL_PAD = 30;

// onGrownups: called when the gear has been held long enough.
export function startGame(saver, onGrownups) {
  window.addEventListener('pointerdown', unlock, true);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#3b2f6b',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 4 }, // several fingers can drag at once
    disableContextMenu: true,     // no long-press menu on the tablet
    scene: [new BootScene(saver), new WorldScene(saver, onGrownups), new RoomScene(saver, onGrownups)],
  });
}

// Go to the scene for a screen ('world' or a room id) and remember it in the save.
function goTo(scene, saver, screen) {
  saver.world.screen = screen;
  saver.changed();
  play('whoosh');
  scene.cameras.main.fadeOut(180, 59, 47, 107);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(ROOMS[screen] ? 'room' : 'world'));
}

// A round touch area that calls `onTap`. Used for buttons drawn in the room pictures.
function addButton(scene, x, y, onTap, texture) {
  const button = texture
    ? scene.add.image(x, y, texture).setDisplaySize(BUTTON_R * 1.8, BUTTON_R * 1.8)
    : scene.add.zone(x, y, BUTTON_R * 2, BUTTON_R * 2);
  button.setDepth(UI_DEPTH + 2).setInteractive(new Phaser.Geom.Circle(button.width / 2, button.height / 2, texture ? button.width / 2 : BUTTON_R), Phaser.Geom.Circle.Contains);
  button.setData('onTap', onTap);
  return button;
}

// The gear: a ring fills while it is held, then the grown-up area opens.
function addGear(scene, x, y, onGrownups, texture) {
  const ring = scene.add.graphics().setDepth(UI_DEPTH + 3);
  const gear = addButton(scene, x, y, null, texture);
  let timer = null;
  let progress = null;
  const stop = () => {
    if (timer) timer.remove();
    if (progress) progress.remove();
    timer = progress = null;
    ring.clear();
  };
  gear.on('pointerdown', () => {
    stop();
    const state = { t: 0 };
    progress = scene.tweens.add({
      targets: state, t: 1, duration: HOLD_MS,
      onUpdate: () => {
        ring.clear().lineStyle(12, 0x7b5cff).beginPath();
        ring.arc(x, y, BUTTON_R - 4, -Math.PI / 2, -Math.PI / 2 + state.t * Math.PI * 2).strokePath();
      },
    });
    timer = scene.time.delayedCall(HOLD_MS, () => { stop(); onGrownups(); });
  });
  gear.on('pointerup', stop);
  gear.on('pointerout', stop);
}

// Music and sound effect switches, side by side, always on screen.
function addSoundToggles(scene, saver, x, y) {
  const settings = () => saver.world.settings || (saver.world.settings = {});
  for (const [i, kind] of ['music', 'sfx'].entries()) {
    const icon = kind === 'music' ? 'music' : 'sound';
    const isOn = () => settings()[kind] !== false;
    const button = addButton(scene, x + i * 130, y, () => {
      settings()[kind] = !isOn();
      setEnabled({ [kind]: isOn() });
      button.setTexture('ui:' + icon + (isOn() ? '_on' : '_off'));
      saver.changed();
    }, 'ui:' + icon + (isOn() ? '_on' : '_off'));
  }
}

function lookKey(id, look) {
  return 'char:' + id + '_' + look;
}

function sitKey(id, look) {
  return 'sit:' + id + '_' + look;
}

function lieKey(id, look) {
  return 'lie:' + id + '_' + look;
}

function sparkle(scene, x, y) {
  const c = scene.add.circle(x, y, 20, 0xffffff, 0.8).setDepth(UI_DEPTH);
  scene.tweens.add({ targets: c, radius: 70, alpha: 0, duration: 350, onComplete: () => c.destroy() });
}

// --- Loading ---

class BootScene extends Phaser.Scene {
  constructor(saver) {
    super('boot');
    this.saver = saver;
  }

  preload() {
    const bar = this.add.rectangle(W / 2 - 400, H / 2, 0, 40, 0xffd23f).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 808, 48).setStrokeStyle(6, 0xffffff);
    this.load.on('progress', (p) => { bar.width = 800 * p; });

    this.load.image('bg:world', artPath('places/world_bg.webp'));
    for (const [id, room] of Object.entries(ROOMS)) {
      this.load.image('bg:' + id, artPath(room.background));
      for (const kind of room.items) this.load.image(kind, artPath(itemFile(kind)));
    }
    for (const [id, character] of Object.entries(CHARACTERS)) {
      for (const look of character.looks) {
        this.load.image(lookKey(id, look), artPath(lookFile(id, look)));
        if (character.pet) continue;
        if (hasArt(lookFile(id, look, 'sit'))) this.load.image(sitKey(id, look), artPath(lookFile(id, look, 'sit')));
        if (hasArt(lookFile(id, look, 'lie'))) this.load.image(lieKey(id, look), artPath(lookFile(id, look, 'lie')));
      }
    }
    const ui = ['gear', 'arrow_left', 'arrow_right', 'map', 'people', 'music_on', 'music_off', 'sound_on', 'sound_off'];
    for (const name of ui) this.load.image('ui:' + name, artPath('ui/' + name + '.webp'));
  }

  create() {
    const settings = this.saver.world.settings || {};
    setEnabled({ music: settings.music !== false, sfx: settings.sfx !== false });

    // Looks without a sitting picture yet: the standing drawing with the legs squashed.
    for (const [id, character] of Object.entries(CHARACTERS)) {
      for (const look of character.looks) {
        if (character.pet || !this.textures.exists(lookKey(id, look)) || this.textures.exists(sitKey(id, look))) continue;
        const src = this.textures.get(lookKey(id, look)).getSourceImage();
        const top = Math.round(src.height * body(id, look).hip);
        const legs = src.height - top;
        const canvas = this.textures.createCanvas(sitKey(id, look), src.width, top + Math.round(legs * SIT_SQUASH));
        canvas.context.drawImage(src, 0, 0, src.width, top, 0, 0, src.width, top);
        canvas.context.drawImage(src, 0, top, src.width, legs, 0, top, src.width, Math.round(legs * SIT_SQUASH));
        canvas.refresh();
      }
    }
    // A soft round glow for lamps.
    const glow = this.textures.createCanvas('fx:glow', 256, 256);
    const gradient = glow.context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 236, 150, 0.95)');
    gradient.addColorStop(0.4, 'rgba(255, 214, 110, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 200, 90, 0)');
    glow.context.fillStyle = gradient;
    glow.context.fillRect(0, 0, 256, 256);
    glow.refresh();

    this.scene.start(ROOMS[this.saver.world.screen] ? 'room' : 'world');
  }
}

// --- Scene selector ---

class WorldScene extends Phaser.Scene {
  constructor(saver, onGrownups) {
    super('world');
    this.saver = saver;
    this.onGrownups = onGrownups;
  }

  create() {
    this.cameras.main.fadeIn(180, 59, 47, 107);
    this.add.image(0, 0, 'bg:world').setOrigin(0).setDisplaySize(W, H);
    addGear(this, 88, 88, this.onGrownups, 'ui:gear');
    addSoundToggles(this, this.saver, 218, 88);
    setTrack('world');

    this.input.on('pointerup', (pointer, over) => {
      const button = over.find((o) => o.getData('onTap'));
      if (button) {
        play('tap');
        button.getData('onTap')();
        return;
      }
      if (over.length) return; // the gear
      sparkle(this, pointer.worldX, pointer.worldY);
      play('tap');
      for (const place of Object.values(PLACES)) {
        const [x0, y0, x1, y1] = place.hotspot;
        const inside = pointer.worldX >= x0 && pointer.worldX < x1 && pointer.worldY >= y0 && pointer.worldY < y1;
        if (inside && place.rooms.length) {
          goTo(this, this.saver, place.rooms[0]);
          return;
        }
      }
    });
  }
}

// --- A room: background, items, people, drawers, trash can, arrows ---

class RoomScene extends Phaser.Scene {
  constructor(saver, onGrownups) {
    super('room');
    this.saver = saver;
    this.onGrownups = onGrownups;
  }

  create() {
    const world = this.saver.world;
    this.roomId = world.screen;
    const room = ROOMS[this.roomId];

    // First visit: fill the room with its starter furniture.
    if (!world.rooms[this.roomId]) {
      world.rooms[this.roomId] = { items: room.start.map(([kind, x, y]) => ({ id: crypto.randomUUID(), kind, x, y })) };
      this.saver.changed();
    }
    this.items = world.rooms[this.roomId].items;

    this.cameras.main.fadeIn(180, 59, 47, 107);
    this.add.image(0, 0, 'bg:' + this.roomId).setOrigin(0).setDisplaySize(W, H).setDepth(-20000);
    this.itemSprites = {}; // item id -> sprite, for things standing in this room
    this.heldSprites = {}; // character id -> the item they are holding
    this.effects = {};     // item id -> a lamp glow or a TV picture
    for (const item of this.items) {
      if (this.textures.exists(item.kind)) this.addItemSprite(item); // unknown kinds stay in the save, just not shown
    }
    this.characters = world.characters;
    this.characterSprites = {};
    for (const [id, c] of Object.entries(this.characters)) {
      if (c.room === this.roomId && this.textures.exists(lookKey(id, c.look))) this.addCharacterSprite(id);
    }

    addGear(this, ...room.ui.gear, this.onGrownups);
    addSoundToggles(this, this.saver, room.ui.gear[0] + 130, room.ui.gear[1]);
    setTrack(room.place);
    this.createTrash(room.ui.trash);
    this.drawers = [];
    this.createDrawer(room.items.map((kind) => ({ texture: kind, kind })), room.ui.box);
    this.peopleThumbs = {};
    const people = Object.keys(CHARACTERS).map((id) => ({ texture: lookKey(id, this.lookOf(id)), character: id }));
    this.createDrawer(people, [W - 250, 88], 'ui:people');
    this.createArrows(room);
    this.picker = null;

    this.drags = new Map(); // pointer id -> what that finger is doing
    this.input.on('gameobjectdown', (pointer, obj) => this.onDown(pointer, obj));
    this.input.on('pointermove', (pointer) => this.onMove(pointer));
    this.input.on('pointerup', (pointer) => this.onUp(pointer));
    this.input.on('pointerupoutside', (pointer) => this.onUp(pointer));
    this.input.on('pointerdown', (pointer, over) => {
      if (this.picker && !over.some((o) => o.getData('picker'))) this.closePicker();
    });
  }

  addItemSprite(item) {
    const sprite = this.add.image(item.x, item.y, item.kind).setOrigin(0.5, 1).setScale(itemScale(item.kind));
    if (Math.max(sprite.displayWidth, sprite.displayHeight) < SMALL_ITEM) {
      // Tiny things (a cup, a fork) are hard for small fingers: touch anywhere close by.
      const pad = SMALL_PAD / sprite.scaleX;
      const area = new Phaser.Geom.Rectangle(-pad, -pad, sprite.width + 2 * pad, sprite.height + 2 * pad);
      sprite.setInteractive(area, Phaser.Geom.Rectangle.Contains);
    } else {
      sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
    }
    sprite.setData('item', item);
    this.restDepth(sprite);
    this.itemSprites[item.id] = sprite;
    if (item.on) this.showEffect(sprite);
    return sprite;
  }

  // A person in their current look, standing with their feet at x, y.
  addCharacterSprite(id) {
    const c = this.characters[id];
    const sprite = this.add.image(c.x, c.y, lookKey(id, c.look)).setOrigin(0.5, 1);
    sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
    sprite.setData('character', id);
    this.characterSprites[id] = sprite;
    this.applyPose(sprite);
    this.restDepth(sprite);
    if (c.holding && this.textures.exists(c.holding.kind)) this.makeHeldSprite(id);
    return sprite;
  }

  // Standing, sitting on a seat or lying on a bed, depending on what they are on.
  applyPose(sprite) {
    const id = sprite.getData('character');
    const c = this.characters[id];
    const seat = c.seat && this.itemSprites[c.seat.item];
    const pose = seat ? SEATS[seat.getData('item').kind][0] : 'stand';
    sprite.setData('pose', pose);
    if (CHARACTERS[id].pet) {
      sprite.setTexture(lookKey(id, c.look)).setAngle(0).setOrigin(0.5, 1); // pets just stand on the seat or bed
    } else if (pose === 'sit') {
      const b = body(id, c.look);
      const origin = this.hasPicture(id, c.look, 'sit') ? b.seat : b.hip / (b.hip + (1 - b.hip) * SIT_SQUASH);
      sprite.setTexture(sitKey(id, c.look)).setAngle(0).setOrigin(0.5, origin);
    } else if (pose === 'lie' && this.hasPicture(id, c.look, 'lie')) {
      sprite.setTexture(lieKey(id, c.look)).setAngle(0).setOrigin(0.5, body(id, c.look).back);
    } else if (pose === 'lie') {
      sprite.setTexture(lookKey(id, c.look)).setAngle(-90).setOrigin(0.5, 0.5);
    } else {
      sprite.setTexture(lookKey(id, c.look)).setAngle(0).setOrigin(0.5, 1);
    }
  }

  // Where someone sits on spot number `spot` of a seat (their hips go here).
  seatPoint(seat, spot, sprite) {
    const [pose, height, spots = 1] = SEATS[seat.getData('item').kind];
    const spacing = (seat.displayWidth * 0.9) / spots;
    const x = seat.x + (spot - (spots - 1) / 2) * spacing;
    let y = seat.y - height * seat.displayHeight;
    // Lying down without a lying picture: the standing one turned, its middle just above the mattress.
    if (pose === 'lie' && sprite.angle !== 0) y -= sprite.width * 0.15;
    return { x, y };
  }

  // A free seat under the finger, or null.
  findSeat(pointer, id) {
    const seats = Object.values(this.itemSprites)
      .filter((sp) => SEATS[sp.getData('item').kind] && sp.getBounds().contains(pointer.worldX, pointer.worldY))
      .sort((a, b) => b.depth - a.depth);
    for (const seat of seats) {
      const itemId = seat.getData('item').id;
      const taken = Object.entries(this.characters)
        .filter(([other, c]) => other !== id && c.room === this.roomId && c.seat && c.seat.item === itemId)
        .map(([, c]) => c.seat.spot);
      const spots = SEATS[seat.getData('item').kind][2] || 1;
      let best = null;
      for (let spot = 0; spot < spots; spot++) {
        if (taken.includes(spot)) continue;
        const dist = Math.abs(this.seatPoint(seat, spot, this.characterSprites[id]).x - pointer.worldX);
        if (!best || dist < best.dist) best = { item: itemId, spot, dist };
      }
      if (best) return { item: best.item, spot: best.spot };
    }
    return null;
  }

  // A real sitting or lying picture, rather than one made from the standing picture.
  hasPicture(id, look, pose) {
    return hasArt(lookFile(id, look, pose));
  }

  // Where a person's free hand is in the room right now.
  handPoint(sprite) {
    const id = sprite.getData('character');
    const look = this.characters[id].look;
    const b = body(id, look);
    const fullHeight = this.textures.get(lookKey(id, look)).getSourceImage().height;
    let px = b.hand[0] * sprite.width;
    let py = b.hand[1] * fullHeight;
    const pose = sprite.getData('pose');
    if (pose === 'sit') {
      if (this.hasPicture(id, look, 'sit')) [px, py] = [b.sitHand[0] * sprite.width, b.sitHand[1] * sprite.height];
      else if (b.hand[1] > b.hip) py = (b.hip + (b.hand[1] - b.hip) * SIT_SQUASH) * fullHeight;
    } else if (pose === 'lie' && this.hasPicture(id, look, 'lie')) {
      [px, py] = [b.lieHand[0] * sprite.width, b.lieHand[1] * sprite.height];
    }
    const lx = px - sprite.originX * sprite.width;
    const ly = py - sprite.originY * sprite.height;
    const cos = Math.cos(sprite.rotation);
    const sin = Math.sin(sprite.rotation);
    return { x: sprite.x + (lx * cos - ly * sin) * sprite.scaleX, y: sprite.y + (lx * sin + ly * cos) * sprite.scaleY };
  }

  canHold(sprite) {
    const kind = sprite.getData('item').kind;
    const size = Math.max(sprite.width, sprite.height) * itemScale(kind);
    return !SEATS[kind] && itemLayer(kind) === 'stand' && size <= HOLD_MAX;
  }

  // The person whose hand is closest to an item being dropped, if one is close enough.
  handNear(sprite) {
    let best = null;
    for (const [id, person] of Object.entries(this.characterSprites)) {
      if (CHARACTERS[id].pet) continue;
      const hand = this.handPoint(person);
      const dist = Phaser.Math.Distance.Between(hand.x, hand.y, sprite.x, sprite.y - sprite.displayHeight / 2);
      if (dist < HAND_REACH && (!best || dist < best.dist)) best = { id, dist };
    }
    return best && best.id;
  }

  makeHeldSprite(id) {
    const sprite = this.addItemSprite({ id: crypto.randomUUID(), kind: this.characters[id].holding.kind, x: 0, y: 0 });
    delete this.itemSprites[sprite.getData('item').id];
    sprite.setData('heldBy', id);
    this.heldSprites[id] = sprite;
    return sprite;
  }

  // Put an item in someone's hand. Whatever they held before drops to the floor.
  hold(id, sprite, isNew) {
    const person = this.characterSprites[id];
    const c = this.characters[id];
    const old = this.heldSprites[id];
    if (old) {
      const seat = c.seat && this.itemSprites[c.seat.item];
      const dropped = { id: crypto.randomUUID(), kind: c.holding.kind, x: Math.round(person.x + 90), y: Math.round(seat ? seat.y + 10 : person.y) };
      dropped.x = Phaser.Math.Clamp(dropped.x, 0, W);
      dropped.y = Phaser.Math.Clamp(dropped.y, 0, H);
      this.items.push(dropped);
      this.addItemSprite(dropped);
      old.destroy();
    }
    const item = sprite.getData('item');
    if (!isNew) {
      const i = this.items.indexOf(item);
      if (i >= 0) this.items.splice(i, 1);
    }
    delete this.itemSprites[item.id];
    this.hideEffect(item.id);
    c.holding = { kind: item.kind };
    sprite.setData('heldBy', id);
    this.heldSprites[id] = sprite;
    this.tweens.add({ targets: sprite, scale: itemScale(item.kind), duration: 120 });
    sparkle(this, sprite.x, sprite.y - sprite.displayHeight / 2);
    play('sparkle');
    this.saver.changed();
  }

  // Taking an item out of someone's hand turns it back into an item in the room.
  letGo(sprite, drag) {
    const id = sprite.getData('heldBy');
    delete this.characters[id].holding;
    delete this.heldSprites[id];
    sprite.setData('heldBy', null);
    const item = sprite.getData('item');
    this.itemSprites[item.id] = sprite;
    drag.isNew = true; // it is added to the room when it is dropped
    this.saver.changed();
  }

  // Things that ride along with something else: people on seats, items in hands,
  // lamp glows and TV pictures. Placed again every frame so they follow while dragged.
  update() {
    const carried = new Set([...this.drags.values()].map((d) => d.sprite));
    for (const [id, sprite] of Object.entries(this.characterSprites)) {
      const c = this.characters[id];
      if (c.seat && !carried.has(sprite)) {
        const seat = this.itemSprites[c.seat.item];
        if (!seat) {
          // The seat was taken away: stand up where they were.
          delete c.seat;
          this.applyPose(sprite);
          c.x = Math.round(sprite.x);
          c.y = Math.round(Phaser.Math.Clamp(sprite.y, sprite.displayHeight * 0.6, H));
          sprite.y = c.y;
          this.restDepth(sprite);
          this.saver.changed();
        } else {
          const at = this.seatPoint(seat, c.seat.spot, sprite);
          sprite.setPosition(at.x, at.y).setDepth(seat.depth + 1);
        }
      }
      const held = this.heldSprites[id];
      if (held && !carried.has(held)) {
        const hand = this.handPoint(sprite);
        held.setPosition(hand.x, hand.y + held.displayHeight / 2).setDepth(sprite.depth + 0.5);
      }
    }
    for (const [itemId, effect] of Object.entries(this.effects)) {
      const sprite = this.itemSprites[itemId];
      if (sprite) effect.follow(sprite);
    }
  }

  // --- Tap reactions ---

  // A point on an item, from fractions of its picture (0, 0 = top-left).
  itemPoint(sprite, [fx, fy]) {
    return { x: sprite.x + (fx - 0.5) * sprite.displayWidth, y: sprite.y - (1 - fy) * sprite.displayHeight };
  }

  showEffect(sprite) {
    const item = sprite.getData('item');
    const r = REACTIONS[item.kind];
    if (!r || this.effects[item.id]) return;
    if (r.light) {
      const glow = this.add.image(0, 0, 'fx:glow').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(r.r * 2, r.r * 2);
      this.tweens.add({ targets: glow, alpha: { from: 0.85, to: 1 }, duration: 600, yoyo: true, repeat: -1 });
      this.effects[item.id] = {
        obj: glow,
        follow: (sp) => {
          const at = this.itemPoint(sp, r.at);
          glow.setPosition(at.x, at.y).setDepth(sp.depth + 0.2);
        },
      };
    } else if (r.screen) {
      const g = this.add.graphics();
      this.effects[item.id] = {
        obj: g,
        follow: (sp) => {
          // A simple cartoon: the colour slowly changes and two balls bounce around.
          const a = this.itemPoint(sp, r.rect.slice(0, 2));
          const b = this.itemPoint(sp, r.rect.slice(2));
          const w = b.x - a.x;
          const h = b.y - a.y;
          const t = this.time.now / 1000;
          g.clear().setDepth(sp.depth + 0.2);
          g.fillStyle(Phaser.Display.Color.HSVToRGB((t * 0.08) % 1, 0.45, 1).color).fillRect(a.x, a.y, w, h);
          g.fillStyle(0xffffff).fillCircle(a.x + w * (0.5 + 0.38 * Math.sin(t * 2.3)), a.y + h * (0.5 + 0.32 * Math.sin(t * 3.1)), h * 0.13);
          g.fillStyle(0xffd23f).fillCircle(a.x + w * (0.5 + 0.38 * Math.cos(t * 1.7)), a.y + h * (0.5 + 0.32 * Math.sin(t * 2.6 + 1)), h * 0.1);
        },
      };
    }
    if (this.effects[item.id]) this.effects[item.id].follow(sprite);
  }

  hideEffect(itemId) {
    const effect = this.effects[itemId];
    if (!effect) return;
    effect.obj.destroy();
    delete this.effects[itemId];
  }

  steam(sprite, at) {
    const p = this.itemPoint(sprite, at);
    for (let i = 0; i < 6; i++) {
      const puff = this.add.circle(p.x + Phaser.Math.Between(-10, 10), p.y, 14, 0xffffff, 0.8).setDepth(sprite.depth + 0.3);
      this.tweens.add({
        targets: puff, y: p.y - 110, x: puff.x + Phaser.Math.Between(-25, 25), scale: 2.2, alpha: 0,
        delay: i * 130, duration: 900, onComplete: () => puff.destroy(),
      });
    }
  }

  tapItem(sprite) {
    const item = sprite.getData('item');
    const r = REACTIONS[item.kind];
    if (r && (r.light || r.screen) && !sprite.getData('heldBy')) {
      play('click');
      item.on = !item.on;
      if (item.on) this.showEffect(sprite);
      else this.hideEffect(item.id);
      this.saver.changed();
    } else if (r && r.steam) {
      play('steam');
      this.steam(sprite, r.at);
      this.wiggle(sprite);
    } else {
      play('tap');
      this.wiggle(sprite);
    }
  }

  lookOf(id) {
    const c = this.characters[id];
    return c && CHARACTERS[id].looks.includes(c.look) ? c.look : CHARACTERS[id].looks[0];
  }

  // How big a sprite is when it is not being carried.
  restScale(sprite) {
    const item = sprite.getData('item');
    return item ? itemScale(item.kind) : 1;
  }

  restDepth(sprite) {
    const item = sprite.getData('item');
    sprite.setDepth(LAYER_DEPTH[item ? itemLayer(item.kind) : 'stand'] + sprite.y);
  }

  // --- Arrows to the other rooms of this place, and the map button ---

  createArrows(room) {
    const rooms = PLACES[room.place].rooms;
    const i = rooms.indexOf(this.roomId);
    if (rooms.length > 1) {
      addButton(this, 85, H / 2 - 40, () => goTo(this, this.saver, rooms[(i - 1 + rooms.length) % rooms.length]), 'ui:arrow_left');
      addButton(this, W - 85, H / 2 - 40, () => goTo(this, this.saver, rooms[(i + 1) % rooms.length]), 'ui:arrow_right');
    }
    addButton(this, W - 88, 88, () => goTo(this, this.saver, 'world'), 'ui:map');
  }

  // --- Trash can (drawn in the room picture): drop an item on it to remove it ---

  createTrash([x, y]) {
    this.trashPos = { x, y };
    this.trashGlow = this.add.circle(x, y, BUTTON_R + 10).setStrokeStyle(10, 0xffffff, 0.9).setDepth(UI_DEPTH).setAlpha(0);
  }

  overTrash(pointer) {
    return Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.trashPos.x, this.trashPos.y) < BUTTON_R + 30;
  }

  // --- Drawers: the item box and the people button each open a row you can scroll
  // sideways. Pull something upwards out of the row to put it in the room. ---

  createDrawer(entries, [bx, by], buttonTexture) {
    const left = 200;
    const width = W - 2 * left;
    const height = 200;
    const top = H - height - 10;
    this.drawerBounds = new Phaser.Geom.Rectangle(left, top, width, height);
    const drawer = { open: false };

    drawer.panel = this.add.container(0, 0).setDepth(UI_DEPTH).setVisible(false).setAlpha(0);
    const panel = this.add.rectangle(left, top, width, height, 0xffffff, 0.94).setOrigin(0).setStrokeStyle(6, 0x7b5cff);
    panel.setInteractive(); // stops touches on the panel from reaching items behind it
    panel.setData('drawer', drawer);
    drawer.panel.add(panel);

    const slot = 180;
    drawer.shelf = this.add.container(left, 0).setDepth(UI_DEPTH + 1).setVisible(false).setAlpha(0);
    entries.forEach((entry, i) => {
      const thumb = this.add.image(slot * (i + 0.5), top + height / 2, entry.texture);
      const tex = this.textures.get(entry.texture).getSourceImage();
      thumb.setScale(Math.min((slot - 30) / tex.width, (height - 30) / tex.height));
      thumb.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
      thumb.setData('drawer', drawer);
      thumb.setData('thumb', entry);
      if (entry.character) this.peopleThumbs[entry.character] = thumb;
      drawer.shelf.add(thumb);
    });
    drawer.minX = Math.min(left, left + width - slot * entries.length);
    drawer.maxX = left;
    const maskShape = this.make.graphics().fillRect(left + 4, top, width - 8, height);
    drawer.shelf.setMask(maskShape.createGeometryMask());

    // While the drawer is closed, its touch areas are switched off so they don't block the room.
    drawer.touch = [panel, ...drawer.shelf.list];
    drawer.touch.forEach((o) => { o.input.enabled = false; });

    addButton(this, bx, by, () => this.toggleDrawer(drawer), buttonTexture);
    this.drawers.push(drawer);
  }

  toggleDrawer(drawer) {
    play('open');
    for (const other of this.drawers) {
      if (other !== drawer && other.open) this.showDrawer(other, false);
    }
    this.showDrawer(drawer, !drawer.open);
  }

  showDrawer(drawer, open) {
    drawer.open = open;
    const parts = [drawer.panel, drawer.shelf];
    drawer.touch.forEach((o) => { o.input.enabled = open; });
    if (open) parts.forEach((p) => p.setVisible(true));
    this.tweens.add({
      targets: parts, alpha: open ? 1 : 0, duration: 180,
      onComplete: () => parts.forEach((p) => p.setVisible(drawer.open)),
    });
  }

  overDrawer(pointer) {
    return this.drawers.some((d) => d.open) && this.drawerBounds.contains(pointer.worldX, pointer.worldY);
  }

  // --- Outfit picker: tap a person who has more than one look ---

  openPicker(sprite) {
    const id = sprite.getData('character');
    const looks = CHARACTERS[id].looks;
    const slot = 130;
    const height = 170;
    const width = slot * looks.length + 20;
    const x = Phaser.Math.Clamp(sprite.x, width / 2 + 10, W - width / 2 - 10);
    const above = sprite.y - sprite.displayHeight - height / 2 - 20;
    const y = above > height / 2 + 10 ? above : Math.min(sprite.y + height / 2 + 20, H - height / 2 - 10);

    this.picker = this.add.container(x, y).setDepth(UI_DEPTH + 5).setScale(0.6).setAlpha(0);
    const bg = this.add.rectangle(0, 0, width, height, 0xffffff, 0.96).setStrokeStyle(6, 0x7b5cff);
    bg.setInteractive().setData('picker', true);
    this.picker.add(bg);
    looks.forEach((look, i) => {
      const cx = -width / 2 + 10 + slot * (i + 0.5);
      if (look === this.characters[id].look) this.picker.add(this.add.circle(cx, 0, 66, 0xffd23f, 0.6));
      const thumb = this.add.image(cx, 0, lookKey(id, look));
      thumb.setScale((height - 24) / thumb.height);
      thumb.setInteractive().setData('picker', true).setData('onTap', () => this.setLook(sprite, look));
      this.picker.add(thumb);
    });
    this.tweens.add({ targets: this.picker, scale: 1, alpha: 1, duration: 150, ease: 'Back.Out' });
  }

  closePicker() {
    const picker = this.picker;
    this.picker = null;
    picker.list.forEach((o) => o.disableInteractive());
    this.tweens.add({ targets: picker, scale: 0.6, alpha: 0, duration: 120, onComplete: () => picker.destroy() });
  }

  setLook(sprite, look) {
    const id = sprite.getData('character');
    this.characters[id].look = look;
    this.saver.changed();
    this.applyPose(sprite);
    this.peopleThumbs[id].setTexture(lookKey(id, look));
    sparkle(this, sprite.x, sprite.y - sprite.displayHeight / 2);
    play('sparkle');
    if (this.picker) this.closePicker();
    this.hop(sprite);
  }

  hop(sprite) {
    this.tweens.add({ targets: sprite, y: sprite.y - 30, duration: 140, yoyo: true, ease: 'Quad.Out' });
  }

  // --- Touch handling ---

  onDown(pointer, obj) {
    if (this.drags.has(pointer.id)) return;
    const onTap = obj.getData('onTap');
    if (onTap) return this.drags.set(pointer.id, { button: obj, onTap });

    const drawer = obj.getData('drawer');
    if (drawer) {
      if (!this.overDrawer(pointer)) return; // a thumbnail scrolled out of view
      return this.drags.set(pointer.id, {
        drawer, thumb: obj.getData('thumb'), startX: pointer.worldX, startY: pointer.worldY, shelfX: drawer.shelf.x,
      });
    }

    const movable = obj.getData('item') || obj.getData('character');
    if (movable && ![...this.drags.values()].some((d) => d.sprite === obj)) {
      this.beginDrag(pointer, obj, { isNew: false, moved: false });
    }
  }

  beginDrag(pointer, sprite, opts) {
    this.drags.set(pointer.id, {
      sprite,
      dx: sprite.x - pointer.worldX,
      dy: sprite.y - pointer.worldY,
      startX: pointer.worldX,
      startY: pointer.worldY,
      ...opts,
    });
    if (opts.moved) this.lift(sprite, this.drags.get(pointer.id));
  }

  lift(sprite, drag) {
    const id = sprite.getData('character');
    if (id && this.characters[id].seat) {
      // Getting up from a seat: stand, held by the middle.
      delete this.characters[id].seat;
      this.applyPose(sprite);
      drag.dx = 0;
      drag.dy = sprite.displayHeight / 2;
    }
    if (sprite.getData('heldBy')) this.letGo(sprite, drag);
    play('pickup');
    sprite.setDepth(DRAG_DEPTH);
    if (this.picker) this.closePicker();
    this.tweens.add({ targets: sprite, scale: this.restScale(sprite) * 1.08, duration: 120 });
    this.tweens.add({ targets: this.trashGlow, alpha: 0.5, duration: 150 });
  }

  onMove(pointer) {
    const drag = this.drags.get(pointer.id);
    if (!drag || drag.button) return;
    const dx = pointer.worldX - drag.startX;
    const dy = pointer.worldY - drag.startY;

    if (drag.drawer) {
      if (!drag.mode && Math.hypot(dx, dy) >= TAP_SLOP) {
        // Sideways scrolls the drawer; upwards pulls the thing out into the room.
        drag.mode = drag.thumb && -dy > Math.abs(dx) ? 'pull' : 'scroll';
      }
      if (drag.mode === 'scroll') {
        drag.drawer.shelf.x = Phaser.Math.Clamp(drag.shelfX + dx, drag.drawer.minX, drag.drawer.maxX);
      } else if (drag.mode === 'pull') {
        const t = drag.thumb;
        const sprite = t.character ? this.pullCharacter(t.character, pointer) : this.pullItem(t.kind, pointer);
        sprite.y += sprite.displayHeight / 2; // held by its middle
        this.drags.delete(pointer.id);
        this.beginDrag(pointer, sprite, { isNew: true, moved: true });
      }
      return;
    }

    if (!drag.moved) {
      if (Math.hypot(dx, dy) < TAP_SLOP) return;
      drag.moved = true;
      this.lift(drag.sprite, drag);
    }
    const s = drag.sprite;
    s.x = Phaser.Math.Clamp(pointer.worldX + drag.dx, 0, W);
    s.y = Phaser.Math.Clamp(pointer.worldY + drag.dy, s.displayHeight * 0.6, H);
    this.trashGlow.setAlpha(this.overTrash(pointer) ? 1 : 0.5);
  }

  onUp(pointer) {
    const drag = this.drags.get(pointer.id);
    if (!drag) return;
    this.drags.delete(pointer.id);

    if (drag.button) {
      if (drag.button.getBounds().contains(pointer.worldX, pointer.worldY)) {
        if (!drag.button.getData('picker')) play('tap'); // picking a look plays its own sparkle
        drag.onTap();
      }
      return;
    }
    if (drag.drawer) return;

    const s = drag.sprite;
    const item = s.getData('item');
    const id = s.getData('character');
    let holder;
    if (!drag.moved) {
      if (!id) this.tapItem(s);
      else if (CHARACTERS[id].pet) { play(CHARACTERS[id].sound); this.hop(s); }
      else if (CHARACTERS[id].looks.length > 1) { play('tap'); this.openPicker(s); }
      else { play('boing'); this.hop(s); }
    } else if (this.overTrash(pointer) || this.overDrawer(pointer)) {
      play('trash');
      if (id) this.sendHome(s);
      else this.removeItem(s, drag.isNew);
    } else if (id) {
      const c = this.characters[id];
      c.room = this.roomId;
      const seat = this.findSeat(pointer, id);
      if (seat) {
        c.seat = seat;
        this.applyPose(s);
        const at = this.seatPoint(this.itemSprites[seat.item], seat.spot, s);
        s.setPosition(at.x, at.y);
        sparkle(this, at.x, at.y);
        play('sparkle');
      } else {
        this.restDepth(s);
        play('drop');
      }
      c.x = Math.round(s.x);
      c.y = Math.round(s.y);
      this.tweens.add({ targets: s, scale: 1, duration: 120 });
      this.saver.changed();
    } else if (this.canHold(s) && (holder = this.handNear(s))) {
      this.hold(holder, s, drag.isNew);
    } else {
      play('drop');
      item.x = Math.round(s.x);
      item.y = Math.round(s.y);
      if (drag.isNew) this.items.push(item);
      this.tweens.add({ targets: s, scale: this.restScale(s), duration: 120 });
      this.restDepth(s);
      this.saver.changed();
    }

    if (![...this.drags.values()].some((d) => d.sprite)) {
      this.tweens.add({ targets: this.trashGlow, alpha: 0, duration: 200 });
    }
  }

  pullItem(kind, pointer) {
    return this.addItemSprite({ id: crypto.randomUUID(), kind, x: pointer.worldX, y: pointer.worldY });
  }

  // A person can only be in one place, so pulling them out of the drawer brings them
  // here from wherever they were. They are saved here once they are dropped.
  pullCharacter(id, pointer) {
    for (const old of [this.characterSprites[id], this.heldSprites[id]]) {
      if (!old) continue;
      for (const [pid, d] of this.drags) if (d.sprite === old) this.drags.delete(pid);
      old.destroy();
    }
    delete this.heldSprites[id];
    if (!this.characters[id]) this.characters[id] = { look: this.lookOf(id), room: null, x: 0, y: 0 };
    this.characters[id].look = this.lookOf(id);
    delete this.characters[id].seat;
    const sprite = this.addCharacterSprite(id);
    sprite.setPosition(pointer.worldX, pointer.worldY);
    return sprite;
  }

  // Dropped on the trash can or a drawer: the person goes back to the people drawer.
  sendHome(sprite) {
    const id = sprite.getData('character');
    this.characters[id].room = null;
    delete this.characters[id].seat;
    this.saver.changed();
    delete this.characterSprites[id];
    if (this.heldSprites[id]) {
      this.heldSprites[id].destroy(); // they keep holding it in the drawer
      delete this.heldSprites[id];
    }
    sprite.disableInteractive();
    this.tweens.add({ targets: sprite, scale: 0, duration: 200, onComplete: () => sprite.destroy() });
  }

  removeItem(sprite, isNew) {
    const itemId = sprite.getData('item').id;
    delete this.itemSprites[itemId];
    this.hideEffect(itemId);
    if (!isNew) {
      const i = this.items.indexOf(sprite.getData('item'));
      if (i >= 0) this.items.splice(i, 1);
      this.saver.changed();
    }
    sprite.disableInteractive();
    this.tweens.add({ targets: sprite, scale: 0, angle: 90, duration: 200, onComplete: () => sprite.destroy() });
  }

  wiggle(sprite) {
    this.tweens.add({ targets: sprite, angle: { from: -4, to: 4 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => sprite.setAngle(0) });
  }
}
