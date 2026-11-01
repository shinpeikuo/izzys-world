// The game itself, drawn with Phaser (vendor/phaser.min.js).
// Scenes: 'boot' loads all pictures, 'world' is the scene selector, 'room' shows one room.
import { ROOMS, PLACES, artPath, itemFile, itemLayer, itemScale } from './catalog.js';

const W = 1920;
const H = 1080;
const UI_DEPTH = 200000;
const DRAG_DEPTH = 100000;
const LAYER_DEPTH = { floor: -10000, wall: -5000, stand: 0 };
const TAP_SLOP = 12;     // a finger can wobble this far and still count as a tap
const HOLD_MS = 2000;    // press and hold the gear this long to open the grown-up area
const BUTTON_R = 75;     // touch radius of the round buttons

// onGrownups: called when the gear has been held long enough.
export function startGame(saver, onGrownups) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#3b2f6b',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 4 }, // several fingers can drag at once
    scene: [new BootScene(saver), new WorldScene(saver, onGrownups), new RoomScene(saver, onGrownups)],
  });
}

// Go to the scene for a screen ('world' or a room id) and remember it in the save.
function goTo(scene, saver, screen) {
  saver.world.screen = screen;
  saver.changed();
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
    for (const name of ['gear', 'arrow_left', 'arrow_right', 'map']) this.load.image('ui:' + name, artPath('ui/' + name + '.webp'));
  }

  create() {
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

    this.input.on('pointerup', (pointer, over) => {
      if (over.length) return; // the gear
      sparkle(this, pointer.worldX, pointer.worldY);
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

// --- A room: background, items, item drawer, trash can, arrows ---

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
    for (const item of this.items) {
      if (this.textures.exists(item.kind)) this.addItemSprite(item); // unknown kinds stay in the save, just not shown
    }

    addGear(this, ...room.ui.gear, this.onGrownups);
    this.createTrash(room.ui.trash);
    this.createDrawer(room.items, room.ui);
    this.createArrows(room);

    this.drags = new Map(); // pointer id -> what that finger is doing
    this.input.on('gameobjectdown', (pointer, obj) => this.onDown(pointer, obj));
    this.input.on('pointermove', (pointer) => this.onMove(pointer));
    this.input.on('pointerup', (pointer) => this.onUp(pointer));
    this.input.on('pointerupoutside', (pointer) => this.onUp(pointer));
  }

  addItemSprite(item) {
    const sprite = this.add.image(item.x, item.y, item.kind).setOrigin(0.5, 1).setScale(itemScale(item.kind));
    sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
    sprite.setData('item', item);
    this.restDepth(sprite);
    return sprite;
  }

  restDepth(sprite) {
    sprite.setDepth(LAYER_DEPTH[itemLayer(sprite.getData('item').kind)] + sprite.y);
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

  // --- Item drawer: the box button opens a row of items you can scroll sideways ---

  createDrawer(kinds, ui) {
    const left = 200;
    const width = W - 2 * left;
    const height = 200;
    const top = H - height - 10;
    this.drawerOpen = false;
    this.drawerBounds = new Phaser.Geom.Rectangle(left, top, width, height);

    this.drawer = this.add.container(0, 0).setDepth(UI_DEPTH).setVisible(false).setAlpha(0);
    const panel = this.add.rectangle(left, top, width, height, 0xffffff, 0.94).setOrigin(0).setStrokeStyle(6, 0x7b5cff);
    panel.setInteractive(); // stops touches on the panel from reaching items behind it
    panel.setData('drawerPanel', true);
    this.drawer.add(panel);

    const slot = 180;
    this.shelf = this.add.container(left, 0).setDepth(UI_DEPTH + 1).setVisible(false).setAlpha(0);
    kinds.forEach((kind, i) => {
      const thumb = this.add.image(slot * (i + 0.5), top + height / 2, kind);
      const tex = this.textures.get(kind).getSourceImage();
      thumb.setScale(Math.min((slot - 30) / tex.width, (height - 30) / tex.height));
      thumb.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
      thumb.setData('thumbKind', kind);
      this.shelf.add(thumb);
    });
    this.shelfMinX = Math.min(left, left + width - slot * kinds.length);
    this.shelfMaxX = left;
    const maskShape = this.make.graphics().fillRect(left + 4, top, width - 8, height);
    this.shelf.setMask(maskShape.createGeometryMask());

    // While the drawer is closed, its touch areas are switched off so they don't block items.
    this.drawerTouch = [panel, ...this.shelf.list];
    this.drawerTouch.forEach((o) => { o.input.enabled = false; });

    const box = addButton(this, ...ui.box, () => this.toggleDrawer());
    this.boxPos = { x: ui.box[0], y: ui.box[1] };
    box.setData('box', true);
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
    const parts = [this.drawer, this.shelf];
    this.drawerTouch.forEach((o) => { o.input.enabled = this.drawerOpen; });
    if (this.drawerOpen) parts.forEach((p) => p.setVisible(true));
    this.tweens.add({
      targets: parts, alpha: this.drawerOpen ? 1 : 0, duration: 180,
      onComplete: () => parts.forEach((p) => p.setVisible(this.drawerOpen)),
    });
  }

  overDrawer(pointer) {
    return this.drawerOpen && this.drawerBounds.contains(pointer.worldX, pointer.worldY);
  }

  // --- Touch handling ---

  onDown(pointer, obj) {
    if (this.drags.has(pointer.id)) return;
    const onTap = obj.getData('onTap');
    if (onTap) return this.drags.set(pointer.id, { button: obj, onTap });

    const fromDrawer = obj.getData('thumbKind') || obj.getData('drawerPanel');
    if (fromDrawer) {
      if (!this.overDrawer(pointer)) return; // a thumbnail scrolled out of view
      return this.drags.set(pointer.id, {
        shelf: true, kind: obj.getData('thumbKind'), startX: pointer.worldX, startY: pointer.worldY, shelfX: this.shelf.x,
      });
    }

    if (obj.getData('item') && ![...this.drags.values()].some((d) => d.sprite === obj)) {
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
    if (opts.moved) this.lift(sprite);
  }

  lift(sprite) {
    sprite.setDepth(DRAG_DEPTH);
    this.tweens.add({ targets: sprite, scale: itemScale(sprite.getData('item').kind) * 1.08, duration: 120 });
    this.tweens.add({ targets: this.trashGlow, alpha: 0.5, duration: 150 });
  }

  onMove(pointer) {
    const drag = this.drags.get(pointer.id);
    if (!drag || drag.button) return;
    const dx = pointer.worldX - drag.startX;
    const dy = pointer.worldY - drag.startY;

    if (drag.shelf) {
      if (!drag.mode && Math.hypot(dx, dy) >= TAP_SLOP) {
        // Sideways scrolls the drawer; upwards pulls the item out into the room.
        drag.mode = drag.kind && -dy > Math.abs(dx) ? 'pull' : 'scroll';
      }
      if (drag.mode === 'scroll') {
        this.shelf.x = Phaser.Math.Clamp(drag.shelfX + dx, this.shelfMinX, this.shelfMaxX);
      } else if (drag.mode === 'pull') {
        const item = { id: crypto.randomUUID(), kind: drag.kind, x: pointer.worldX, y: pointer.worldY };
        const sprite = this.addItemSprite(item);
        sprite.y += sprite.displayHeight / 2; // held by its middle
        this.drags.delete(pointer.id);
        this.beginDrag(pointer, sprite, { isNew: true, moved: true });
      }
      return;
    }

    if (!drag.moved) {
      if (Math.hypot(dx, dy) < TAP_SLOP) return;
      drag.moved = true;
      this.lift(drag.sprite);
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
      if (drag.button.getBounds().contains(pointer.worldX, pointer.worldY)) drag.onTap();
      return;
    }
    if (drag.shelf) return;

    const s = drag.sprite;
    const item = s.getData('item');
    if (!drag.moved) {
      this.wiggle(s); // a tap: tap reactions come in a later step
    } else if (this.overTrash(pointer) || this.overDrawer(pointer)) {
      this.removeItem(s, drag.isNew);
    } else {
      item.x = Math.round(s.x);
      item.y = Math.round(s.y);
      if (drag.isNew) this.items.push(item);
      this.tweens.add({ targets: s, scale: itemScale(item.kind), duration: 120 });
      this.restDepth(s);
      this.saver.changed();
    }

    if (![...this.drags.values()].some((d) => d.sprite)) {
      this.tweens.add({ targets: this.trashGlow, alpha: 0, duration: 200 });
    }
  }

  removeItem(sprite, isNew) {
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
