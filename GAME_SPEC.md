# Izzy's World — Game Spec (V1)

*Owner: Shinpei Kuo · Drafted: 2026-11-01 · Status: Draft for review before build*

## 1. Concept
Izzy's World is an open-ended, creative play game inspired by Toca Boca. Players pick characters, change their outfits, place them in rooms, decorate, and play. There is no score, no levels, and no way to "lose." It is built for Izzy's Android tablet, and friends and family can install it too.

## 2. Platform and technical requirements
| Item | Decision |
|---|---|
| App type | Progressive Web App (PWA), installable from Chrome on Android ("Install app" / "Add to Home screen") |
| Orientation | **Landscape**, locked in the web manifest |
| Data | **All game data stays on the device.** No accounts, no server, no analytics, no ads, no network calls after install. |
| Offline | Fully playable offline after the first load (service worker caches all code, art, and audio) |
| Storage | IndexedDB, with a request for persistent storage (`navigator.storage.persist()`) |
| Backup | **"Save backup" / "Load backup"** buttons in a grown-up settings area that export and import the world as a file, because clearing Chrome data or uninstalling the app erases saves |
| Saves | **One world per device.** Everything auto-saves and reopens exactly where it was left. |
| Hosting | GitHub Pages (free, HTTPS). See open decision D1 about privacy. |
| Updates | When a new version is published, the app updates the next time it opens online. Saved worlds must survive updates (versioned save format with migrations). |

## 3. Players and reading level
- Shared tablet, one world. Anyone playing uses the same world.
- **Short labels only.** Icons and pictures first, with one- or two-word labels. No instructions that require reading.
- Large touch targets for small fingers. Everything works with tap and drag. No pinch gestures are required.

## 4. V1 content

### 4.1 Characters
**Family characters** (art already started by Shinpei):

| Character | Looks available now | Source file | Art prep needed |
|---|---|---|---|
| Izzy | Main (white top, jeans, boots), Hip-hop (sequin-stripe tracksuit), Mustache (red tee, fake mustache), Princess (pink gown, tiara) | `Izzy Main Character.jpg`, `hiphop Izzy.jpg`, `mustache Izzy.jpg`, `princess Izzy.jpg` | Remove backgrounds. Separate the peacock from the main image. Hip-hop has a photo background to remove. |
| Mom | Default (yellow tank, denim shorts) | `mom.jpg` | Remove background |
| Dad | Default (tan blazer) | `dad.jpg` | Remove background |
| Ollie | Default (navy hoodie) | `Ollie's Character.jpg` | Remove background |

**Friend characters with art started** (confirmed by Shinpei 2026-11-01): Caden (`Caden.jpg`), Jane (`Jane.jpg`), Syd (`syd.jpg`). Each needs its background removed. Source photos live in `_source-photos/`.

**Preset friend characters:** 4–6 generic kids with a variety of looks, made in the same cartoon style. Players can rename them using a short name field.

**Dress-up = outfit swaps.** Each look is a complete full-body image. A character's outfit picker shows that character's looks as thumbnails, and tapping one switches the look. (Mix-and-match layered clothing is deferred to V2.)

**Getting characters into a room** (built 2026-11-01): a round people button (Izzy's face, top right next to the map) opens a drawer of everyone. Pull a person up out of it to bring them into the room you're in. Each person is in one place at a time. Dropping a person on the trash can or the drawer sends them back to the drawer. Izzy starts in the living room.

### 4.2 Pets
- **Peacock** (from Izzy's main character art, separated out)
- **Dog**
- **Cat**

Pets can be dragged, placed, and tapped for a sound and reaction.

### 4.3 Places (3) and rooms (7)
*Updated 2026-11-01 to match Shinpei's art: places now contain rooms.*

| Place | Rooms | Setting type | Suggested props |
|---|---|---|---|
| **House** | Living room, bedroom, kitchen | Family home | Bed, couch, table and chairs, TV, lamp, fridge, pictures, rug |
| **Café** | Café (one room) | Town | Counter, café tables and chairs, cups, pastries, menu board, coffee machine |
| **Castle** | Lobby, bedroom, dining hall | Fantasy | Throne, banners, chandelier, chest, crowns, torches |

**Getting around:** the game opens on the **scene selector** (the main world picture with the castle, café and house). Tapping a building goes into that place. Inside a place, **arrows at the left and right edges** move between its rooms, and a map button goes back to the scene selector. Characters and items can be carried from one room or place to another.

Each room starts with a few starter pieces of furniture. Everything else comes from that room's item box. Room art and item sheets are in `art-source/`.

### 4.4 Interactions (all in V1)
1. **Drag and place:** move characters, pets, and items anywhere in a room.
2. **Sit or lie on furniture:** dropping a character on a chair, couch, bed, or throne snaps them into a seat spot.
3. **Hold items:** dropping a small item (cup, pastry, crown, toy) on a character's hand attaches it so it moves with them.
4. **Tap for reactions:** lights switch on and off, the TV turns on, pets make sounds, the coffee machine animates.
5. **Decorate:** an item drawer for each place lets players add, move, and remove furniture and decorations.

*Built 2026-11-01:* sitting uses the standing art with the legs drawn shorter, as if bent towards you; beds lay the person down with their head on the pillow. A person holds one item at a time; dropping a new one on their hand swaps it and the old one falls to the floor. Lamps, candles, torches and the chandelier glow when switched on; the TV and computer show a simple moving picture; the coffee machine, coffee pot and stove puff steam. Lights and screens stay on in the save.

### 4.5 Sound
- Sound effects for taps, pickup and drop, pet sounds, and object reactions.
- Background music for each place.
- **Separate on/off toggles for music and sound effects**, always visible.

## 5. Out of scope for V1 (later versions)
- Character builder with layered parts (V2)
- Mix-and-match clothing layers
- Multiplayer or sharing worlds between devices
- Goals, quests, or unlocks (V1 is pure free play)
- In-app photo-to-character conversion
- More places (town and fantasy places get added in updates)

## 6. Art production guide (for Shinpei)
All art goes in the `art/` folder using the names below, so Claude Code can find it.

| Asset type | Format | Size guidance | Notes |
|---|---|---|---|
| Character looks | PNG, **transparent background** | Same canvas for every character (e.g., 1024 × 2048), feet at the same bottom line | Neutral standing poses work best for sitting and holding. One file per look. |
| Room backgrounds | PNG or WebP | 1920 × 1080 (landscape, 16:9) | No furniture baked in if the player should be able to move it. Leave the floor clear. |
| Furniture and props | PNG, **transparent background** | Drawn to scale against the characters | One object per file |
| Pets | PNG, transparent | Same scale as characters | |
| Sounds and music | MP3 or OGG | Keep music loops short (under 1 MB each) | Use royalty-free sources and keep a note of where each came from |

**Naming convention:** `characters/izzy_main.png`, `characters/izzy_hiphop.png`, `characters/mom_default.png`, `places/cafe_bg.png`, `props/cafe_table.png`, `pets/peacock.png`.

**Keep original photos out of the game.** Any original photos used as references should go in a `_source-photos/` folder, which is excluded from the build and the website.

### 6.1 Sitting pictures (requested 2026-11-01)
Every look needs a matching sitting picture. They replace the squashed-legs sitting that step 5 uses for now.

**Prompt** (give the image tool the standing picture as the reference):
> Same character, same outfit, same cartoon style and colors. Full body, sitting on an invisible seat, facing forward, knees bent, feet flat on the floor, one hand resting on a knee and the other on the lap. Plain white background. No chair, no shadow, nothing else in the picture.

**Checklist for each picture**
- Facing forward, like the standing picture (not turned sideways).
- **No chair or stool drawn.** They sit on the game's furniture.
- Plain white background, whole body in frame with a little white space around it.
- Same outfit details as the standing look (the princess dress can spread over the knees).
- At least one hand easy to see on the knee, so they can still hold things while sitting.
- Portrait image like the standing ones (e.g. 1792 × 2400). Size doesn't have to match exactly; Claude scales them to fit.

**File names** (all in `_source-photos/`):

| Look | Standing file (existing) | Sitting file (new) |
|---|---|---|
| Izzy main | `Izzy Main Character.jpg` | `Izzy Main Character sitting.jpg` |
| Izzy hip-hop | `hiphop izzy.jpg` | `hiphop izzy sitting.jpg` |
| Izzy mustache | `mustache Izzy.jpg` | `mustache Izzy sitting.jpg` |
| Izzy princess | `princess Izzy.jpg` | `princess Izzy sitting.jpg` |
| Mom | `mom.jpg` | `mom sitting.jpg` |
| Dad | `dad.jpg` | `dad sitting.jpg` |
| Ollie | `Ollie's Character.jpg` | `Ollie's Character sitting.jpg` |
| Caden | `Caden.jpg` | `Caden sitting.jpg` |
| Jane | `Jane.jpg` | `Jane sitting.jpg` |
| Syd | `syd.jpg` | `syd sitting.jpg` |

Any new look added later needs a standing, a sitting and a lying picture.

### 6.2 Lying pictures (requested 2026-11-01)
Every look also needs a lying-down picture for beds. They replace the standing picture turned sideways that step 5 uses for now.

**Prompt** (give the image tool the standing picture as the reference):
> Same character, same outfit, same cartoon style and colors. Full body, lying flat on their back on an invisible bed, seen from the side, head on the left, face turned towards the viewer with a happy expression and eyes open, legs straight, one arm along the side and the other hand resting on the tummy. Plain white background, wide landscape image. No bed, no pillow, no blanket, no shadow, nothing else in the picture.

**Checklist for each picture**
- **Head on the left, feet on the right**, for every picture. The game can flip them if a bed needs it.
- Lying flat and straight, not curled up, seen from the side, with the face turned to the viewer.
- **No bed, pillow or blanket drawn.** They lie on the game's beds.
- Plain white background, with the whole body in frame and a little white space around it.
- Same outfit details as the standing look. The princess dress can drape down.
- One hand easy to see on the tummy, so they can hold a teddy in bed.
- **Wide (landscape) picture**, about 2400 × 1792: the standing size turned on its side.

**File names** (all in `_source-photos/`): the standing file name plus "lying", for example `Izzy Main Character lying.jpg`, `hiphop izzy lying.jpg`, `mustache Izzy lying.jpg`, `princess Izzy lying.jpg`, `mom lying.jpg`, `dad lying.jpg`, `Ollie's Character lying.jpg`, `Caden lying.jpg`, `Jane lying.jpg`, `syd lying.jpg`.

## 7. Open decisions
| # | Decision | Options / notes |
|---|---|---|
| D1 | **Privacy of family art on the hosting site** | Anyone with the website link can download the game's images, including the family characters. A free GitHub Pages site requires a **public** code repository, which means the family art would also be visible on GitHub. Options: (a) accept this, since it's cartoon art and not photos; (b) pay for GitHub Pro to host from a private repository (the site is still reachable by its link); (c) use Netlify deployed from a private repository. Decide before the first deploy. **Decided 2026-11-01: (a) GitHub Pages from a public repository.** |
| D2 | Tech framework | Claude Code to recommend. A 2D game framework with touch drag-and-drop, scenes, and audio support (such as Phaser) is the likely fit. |
| D3 | Friend character looks | Shinpei to generate 4–6 kids in the same style |
| D4 | Music and sound sources | To be chosen (royalty-free) |
| D5 | Ask Izzy | Confirm the places, pets, and any must-have items with her before the art push |

## 8. Suggested build order (Claude Code)
1. Project setup, PWA manifest (landscape), service worker, deploy a "hello" page to the tablet and confirm it installs.
2. Save system (IndexedDB, persistent storage, backup export/import), built before content.
3. House scene with placeholder art: drag-and-drop, item drawer.
4. Characters and outfit swapping using the real family art.
5. Sit and hold mechanics, tap reactions.
6. Café and castle rooms (scene selector, house rooms and room arrows were done early, before step 4).
7. Pets, sound, music, mute toggles.
8. Polish and test on Izzy's tablet: touch target sizes, performance, offline mode, update without losing the save.
