// The game itself, drawn with Phaser (vendor/phaser.min.js).
// One scene shows the current place: its background, its items, the item
// drawer and the trash can.
import { ITEMS, PLACES, ART_SCALE, artPath } from './catalog.js';

const W = 1920;
const H = 1080;
const DRAWER_H = 220;
const UI_DEPTH = 200000;
const DRAG_DEPTH = 100000;
const LAYER_DEPTH = { floor: -10000, wall: -5000, stand: 0 };
const TAP_SLOP = 12; // a finger can wobble this far and still count as a tap

export function startGame(saver) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W,
    height: H,
    backgroundColor: '#3b2f6b',
    banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 4 }, // several fingers can drag at once
    scene: [new PlaceScene(saver)],
  });
}

class PlaceScene extends Phaser.Scene {
  constructor(saver) {
    super('place');
    this.saver = saver;
  }

  preload() {
    for (const [id, place] of Object.entries(PLACES)) this.load.image('bg:' + id, artPath(place.background));
    for (const [kind, def] of Object.entries(ITEMS)) this.load.image(kind, artPath(def.file));
    this.load.image('ui:drawer', artPath('ui/drawer.png'));
    this.load.image('ui:trash', artPath('ui/trash.png'));
  }

  create() {
    const world = this.saver.world;
    this.placeId = PLACES[world.place] ? world.place : 'house';
    const place = PLACES[this.placeId];

    // First visit: fill the place with its starting furniture.
    if (!world.places[this.placeId]) {
      world.places[this.placeId] = { items: place.start.map((it) => ({ id: crypto.randomUUID(), ...it })) };
      this.saver.changed();
    }
    this.items = world.places[this.placeId].items;

    this.add.image(0, 0, 'bg:' + this.placeId).setOrigin(0).setDisplaySize(W, H).setDepth(-20000);
    for (const item of this.items) {
      if (ITEMS[item.kind]) this.addItemSprite(item); // unknown kinds are kept in the save, just not shown
    }

    this.createTrash();
    this.createDrawer(place.drawer);

    this.drags = new Map(); // pointer id -> what that finger is dragging
    this.input.on('gameobjectdown', (pointer, obj) => this.onDown(pointer, obj));
    this.input.on('pointermove', (pointer) => this.onMove(pointer));
    this.input.on('pointerup', (pointer) => this.onUp(pointer));
    this.input.on('pointerupoutside', (pointer) => this.onUp(pointer));
  }

  addItemSprite(item) {
    const sprite = this.add.image(item.x, item.y, item.kind).setOrigin(0.5, 1).setScale(ART_SCALE);
    sprite.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
    sprite.setData('item', item);
    this.restDepth(sprite);
    return sprite;
  }

  restDepth(sprite) {
    sprite.setDepth(LAYER_DEPTH[ITEMS[sprite.getData('item').kind].layer] + sprite.y);
  }

  // --- Trash can: appears while dragging; drop an item on it to remove it ---

  createTrash() {
    this.trash = this.add.image(120, H - 120, 'ui:trash').setDisplaySize(180, 180).setDepth(UI_DEPTH).setAlpha(0);
  }

  overTrash(pointer) {
    return Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.trash.x, this.trash.y) < 110;
  }

  // --- Item drawer: a box button that slides out a row of items ---

  createDrawer(kinds) {
    const left = 250;
    const width = W - 2 * left;
    this.drawerOpen = false;
    this.drawerTop = H - DRAWER_H - 10;

    this.drawer = this.add.container(0, DRAWER_H + 40).setDepth(UI_DEPTH);
    const panel = this.add.rectangle(left, this.drawerTop, width, DRAWER_H, 0xffffff, 0.92).setOrigin(0).setStrokeStyle(6, 0x7b5cff);
    panel.setInteractive(); // stops taps on the panel from reaching items behind it
    this.drawer.add(panel);
    this.drawerBounds = new Phaser.Geom.Rectangle(left, this.drawerTop, width, DRAWER_H);

    // If a place ever has more items than fit, this needs paging or scrolling.
    const slot = Math.min(220, width / kinds.length);
    const box = slot - 24;
    kinds.forEach((kind, i) => {
      const thumb = this.add.image(left + slot * (i + 0.5), this.drawerTop + DRAWER_H / 2, kind);
      const tex = this.textures.get(kind).getSourceImage();
      thumb.setScale(Math.min(box / tex.width, (DRAWER_H - 40) / tex.height));
      thumb.setInteractive({ pixelPerfect: true, alphaTolerance: 1 });
      thumb.setData('thumbKind', kind);
      this.drawer.add(thumb);
    });

    this.drawerButton = this.add.image(W - 120, H - 120, 'ui:drawer').setDisplaySize(190, 190).setDepth(UI_DEPTH + 1);
    this.drawerButton.setInteractive();
    this.drawerButton.setData('button', 'drawer');
  }

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
    this.tweens.add({ targets: this.drawer, y: this.drawerOpen ? 0 : DRAWER_H + 40, duration: 250, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this.drawerButton, angle: this.drawerOpen ? -12 : 0, duration: 250 });
  }

  overDrawer(pointer) {
    return this.drawerOpen && this.drawerBounds.contains(pointer.worldX, pointer.worldY);
  }

  // --- Dragging ---

  onDown(pointer, obj) {
    if (obj.getData('button') === 'drawer') return this.toggleDrawer();

    const kind = obj.getData('thumbKind');
    if (kind) {
      // Pull a new item out of the drawer, held by its middle.
      const item = { id: crypto.randomUUID(), kind, x: pointer.worldX, y: pointer.worldY };
      const sprite = this.addItemSprite(item);
      sprite.y += sprite.displayHeight / 2;
      return this.beginDrag(pointer, sprite, { isNew: true, moved: true });
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
    this.tweens.add({ targets: sprite, scale: ART_SCALE * 1.08, duration: 120 });
    this.tweens.add({ targets: this.trash, alpha: 1, duration: 150 });
  }

  onMove(pointer) {
    const drag = this.drags.get(pointer.id);
    if (!drag) return;
    if (!drag.moved) {
      if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, drag.startX, drag.startY) < TAP_SLOP) return;
      drag.moved = true;
      this.lift(drag.sprite);
    }
    const s = drag.sprite;
    s.x = Phaser.Math.Clamp(pointer.worldX + drag.dx, 0, W);
    s.y = Phaser.Math.Clamp(pointer.worldY + drag.dy, s.displayHeight * 0.6, H);
    this.trash.setDisplaySize(this.overTrash(pointer) ? 220 : 180, this.overTrash(pointer) ? 220 : 180);
  }

  onUp(pointer) {
    const drag = this.drags.get(pointer.id);
    if (!drag) return;
    this.drags.delete(pointer.id);
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
      this.tweens.add({ targets: s, scale: ART_SCALE, duration: 120 });
      this.restDepth(s);
      this.saver.changed();
    }

    if (this.drags.size === 0) {
      this.tweens.add({ targets: this.trash, alpha: 0, duration: 200 });
      this.trash.setDisplaySize(180, 180);
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
    this.tweens.add({ targets: sprite, angle: { from: -5, to: 5 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => sprite.setAngle(0) });
  }
}
