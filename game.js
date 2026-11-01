// The game itself, drawn with Phaser (vendor/phaser.min.js).
// Scenes: 'boot' loads all pictures, 'world' is the scene selector, 'room' shows one room.
import { ROOMS, PLACES, CHARACTERS, artPath, itemFile, itemLayer, itemScale, lookFile } from './catalog.js';

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

function lookKey(id, look) {
  return 'char:' + id + '_' + look;
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
      for (const look of character.looks) this.load.image(lookKey(id, look), artPath(lookFile(id, look)));
    }
    for (const name of ['gear', 'arrow_left', 'arrow_right', 'map', 'people']) this.load.image('ui:' + name, artPath('ui/' + name + '.webp'));
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
    for (const item of this.items) {
      if (this.textures.exists(item.kind)) this.addItemSprite(item); // unknown kinds stay in the save, just not shown
    }
    this.characters = world.characters;
    this.characterSprites = {};
    for (const [id, c] of Object.entries(this.characters)) {
      if (c.room === this.roomId && this.textures.exists(lookKey(id, c.look))) this.addCharacterSprite(id);
    }

    addGear(this, ...room.ui.gear, this.onGrownups);
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
    sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
    sprite.setData('item', item);
    this.restDepth(sprite);
    return sprite;
  }

  // A person in their current look, standing with their feet at x, y.
  addCharacterSprite(id) {
    const c = this.characters[id];
    const sprite = this.add.image(c.x, c.y, lookKey(id, c.look)).setOrigin(0.5, 1);
    sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
    sprite.setData('character', id);
    this.characterSprites[id] = sprite;
    this.restDepth(sprite);
    return sprite;
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
    sprite.setTexture(lookKey(id, look));
    this.peopleThumbs[id].setTexture(lookKey(id, look));
    sparkle(this, sprite.x, sprite.y - sprite.displayHeight / 2);
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
    if (opts.moved) this.lift(sprite);
  }

  lift(sprite) {
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
    if (drag.drawer) return;

    const s = drag.sprite;
    const item = s.getData('item');
    const id = s.getData('character');
    if (!drag.moved) {
      if (!id) this.wiggle(s); // a tap: tap reactions come in a later step
      else if (CHARACTERS[id].looks.length > 1) this.openPicker(s);
      else this.hop(s);
    } else if (this.overTrash(pointer) || this.overDrawer(pointer)) {
      if (id) this.sendHome(s);
      else this.removeItem(s, drag.isNew);
    } else {
      const target = item || this.characters[id];
      target.x = Math.round(s.x);
      target.y = Math.round(s.y);
      if (id) target.room = this.roomId;
      if (item && drag.isNew) this.items.push(item);
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
    const old = this.characterSprites[id];
    if (old) {
      for (const [pid, d] of this.drags) if (d.sprite === old) this.drags.delete(pid);
      old.destroy();
    }
    if (!this.characters[id]) this.characters[id] = { look: this.lookOf(id), room: null, x: 0, y: 0 };
    this.characters[id].look = this.lookOf(id);
    const sprite = this.addCharacterSprite(id);
    sprite.setPosition(pointer.worldX, pointer.worldY);
    return sprite;
  }

  // Dropped on the trash can or a drawer: the person goes back to the people drawer.
  sendHome(sprite) {
    const id = sprite.getData('character');
    this.characters[id].room = null;
    this.saver.changed();
    delete this.characterSprites[id];
    sprite.disableInteractive();
    this.tweens.add({ targets: sprite, scale: 0, duration: 200, onComplete: () => sprite.destroy() });
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
