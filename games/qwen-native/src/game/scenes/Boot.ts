// Boot: bake all original procedural art into textures (no external assets).
import { Scene, GameObjects } from 'phaser';
import { TILE, COLS, ROWS, COLORS, PATH, HUB_CELL } from '../config';

const pathSet = new Set<string>();
const segDirs: Record<string, [number, number][]> = {};

function key(c: number, r: number) { return `${c},${r}`; }

function buildPathSets() {
  for (const [c, r] of PATH) pathSet.add(key(c, r));
  // Every cell along each segment is road, not just the corner waypoints.
  for (let i = 0; i < PATH.length - 1; i++) {
    const [c1, r1] = PATH[i];
    const [c2, r2] = PATH[i + 1];
    const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
    let c = c1, r = r1;
    while (c !== c2 || r !== r2) { c += dc; r += dr; pathSet.add(key(c, r)); }
  }
  for (let i = 0; i < PATH.length - 1; i++) {
    const [c1, r1] = PATH[i];
    const [c2, r2] = PATH[i + 1];
    const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
    addDir(c1, r1, dc, dr);
    addDir(c2, r2, -dc, -dr);
  }
  for (let i = 1; i < PATH.length - 1; i++) {
    const [c, r] = PATH[i];
    const [pc, pr] = PATH[i - 1];
    const [nc, nr] = PATH[i + 1];
    addDir(c, r, Math.sign(pc - c), Math.sign(pr - r));
    addDir(c, r, Math.sign(nc - c), Math.sign(nr - r));
  }
}

function addDir(c: number, r: number, dc: number, dr: number) {
  const k = key(c, r);
  const list = segDirs[k] || (segDirs[k] = []);
  if (!list.some(d => d[0] === dc && d[1] === dr)) list.push([dc, dr]);
}

export function isPath(c: number, r: number) { return pathSet.has(key(c, r)); }

export function isPad(c: number, r: number) {
  if (isPath(c, r)) return false;
  if (c === HUB_CELL[0] && r === HUB_CELL[1]) return false;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dc, dr] of dirs) {
    if (pathSet.has(key(c + dc, r + dr))) {
      // avoid corner-only pads touching diagonals
      if (pathSet.has(key(c + dc, r)) || pathSet.has(key(c, r + dr))) return true;
    }
  }
  return false;
}

export class Boot extends Scene {
  constructor() { super('Boot'); }

  preload() {
    buildPathSets();
    this.makeTextures();

  }

  private tex(key: string, w: number, h: number, draw: (g: GameObjects.Graphics) => void) {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeTextures() {
    const C = COLORS;

    // ---- tiles ----
    this.tex('tile', TILE, TILE, (g) => {
      g.fillStyle(C.sand).fillRect(0, 0, TILE, TILE);
      g.fillStyle(C.sandDeep).fillRect(0, TILE - 6, TILE, 6);
      g.fillStyle(0xf6e6c8).fillRect(0, 0, TILE, 4);
      g.fillStyle(0xcbb08a).fillCircle(7, 12, 2);
      g.fillCircle(22, 21, 1.5);
      g.fillStyle(0xb9a077).fillCircle(15, 27, 1.2);
    });

    this.tex('road', TILE, TILE, (g) => {
      g.fillStyle(C.road).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0xb98f60).fillRect(0, 0, TILE, 3);
      g.fillStyle(0xb98f60).fillRect(0, TILE - 3, TILE, 3);
      g.fillStyle(0xd9b181).fillRect(6, 12, TILE - 12, 8);
      g.fillStyle(0xa87f52).fillCircle(11, 11, 1.4);
      g.fillCircle(21, 20, 1.4);
    });

    this.tex('pad', TILE, TILE, (g) => {
      g.fillStyle(C.sand).fillRect(0, 0, TILE, TILE);
      g.fillStyle(0xdfc79c).fillRect(2, 2, TILE - 4, TILE - 4);
      g.lineStyle(1.5, 0x9c8b6f, 0.9);
      g.strokeRect(3, 3, TILE - 6, TILE - 6);
      g.fillStyle(0xb79f7d).fillCircle(TILE / 2, TILE / 2, 3);
      g.fillStyle(C.pad).fillCircle(TILE / 2, TILE / 2, 1.6);
    });



    this.tex('shadow', 30, 12, (g) => {
      g.fillStyle(0x6b5230, 0.35).fillEllipse(15, 6, 26, 8);
    });

    // ---- tower sprites (drawn facing up, origin at base) ----
    for (let lvl = 1; lvl <= 3; lvl++) {
      const w = 40, h = 40 + lvl * 8;
      this.tex(`t_mirror${lvl}`, w, h, (g) => this.drawMirror(g, lvl, w, h));
      this.tex(`t_driver${lvl}`, w, h, (g) => this.drawDriver(g, lvl, w, h));
    }

    // ---- enemies ----
    this.tex('e_scavenger', 24, 24, (g) => {
      g.fillStyle(0xf3e2c4).fillEllipse(12, 12, 16, 12);
      g.fillStyle(0xe6cfab).fillEllipse(6, 12, 8, 8);
      g.lineStyle(1.5, 0x8c7350, 1);
      g.lineBetween(18, 10, 23, 6); g.lineBetween(18, 14, 23, 18);
      g.fillStyle(0x3b3f46).fillCircle(16, 12, 2.2);
      g.fillStyle(0xbfa87f).fillEllipse(10, 6, 9, 4);
    });

    this.tex('e_swarm', 18, 18, (g) => {
      g.fillStyle(0xd7664b).fillEllipse(9, 9, 11, 9);
      g.fillStyle(0xa94a34).fillEllipse(5, 9, 6, 6);
      g.lineStyle(1.2, 0x6f3425, 1);
      g.lineBetween(13, 7, 17, 4); g.lineBetween(13, 11, 17, 14);
      g.fillStyle(0x2f2a26).fillCircle(12, 9, 1.6);
    });

    this.tex('e_hauler', 28, 28, (g) => {
      g.fillStyle(0x5d7185).fillRoundedRect(3, 8, 22, 12, 3);
      g.fillStyle(0x778d9f).fillRect(4, 9, 20, 4);
      g.fillStyle(0x46566a).fillRect(20, 7, 6, 14);
      g.lineStyle(1.5, 0x33404f, 1);
      g.lineBetween(6, 8, 6, 20); g.lineBetween(12, 8, 12, 20);
      g.fillStyle(0x2f3743).fillRect(5, 20, 4, 4); g.fillRect(15, 20, 4, 4);
      g.fillStyle(0xffd35c).fillCircle(24, 14, 2.2);
    });

    this.tex('e_bulky', 36, 36, (g) => {
      g.fillStyle(0x9b5f41).fillEllipse(18, 18, 26, 22);
      g.fillStyle(0x8a5036).fillRoundedRect(8, 10, 20, 16, 5);
      g.lineStyle(2, 0x633827, 1);
      g.lineBetween(12, 9, 26, 9);
      g.fillStyle(0x4a3226).fillRect(8, 24, 6, 6); g.fillRect(22, 24, 6, 6);
      g.fillStyle(0x7d4732).fillEllipse(30, 18, 8, 12);
      g.fillStyle(0xff9c4a).fillCircle(28, 18, 2.6);
    });

    this.tex('e_boss', 60, 60, (g) => {
      g.fillStyle(0x7a4a3a).fillEllipse(30, 30, 44, 34);
      g.fillStyle(0x5d382c).fillRoundedRect(16, 18, 28, 24, 8);
      g.fillStyle(0x8f6045).fillEllipse(14, 30, 12, 20);
      g.lineStyle(2.5, 0x40271e, 1);
      g.lineBetween(20, 14, 34, 14); g.lineBetween(22, 46, 36, 46);
      g.fillStyle(0x40271e).fillRect(14, 42, 8, 8); g.fillRect(34, 42, 8, 8);
      g.fillStyle(0xff5d47).fillCircle(44, 30, 5);
      g.fillStyle(0xffe9c0).fillCircle(44, 30, 2);
      // shoulder plates
      g.fillStyle(0x9c6a4c).fillEllipse(26, 16, 14, 8);
      g.fillStyle(0x9c6a4c).fillEllipse(26, 44, 14, 8);
    });

    this.tex('slug', 9, 9, (g) => {
      g.fillStyle(0x3a3f47).fillCircle(4.5, 4.5, 4);
      g.fillStyle(0xff8f4d).fillCircle(4.5, 4.5, 2);
    });

    this.tex('dot', 6, 6, (g) => {
      g.fillStyle(0xffffff).fillCircle(3, 3, 3);
    });
  }

  private drawMirror(g: GameObjects.Graphics, lvl: number, w: number, h: number) {
    const C = COLORS;
    // shadowed base plate
    g.fillStyle(0x3b4a5c).fillRoundedRect(w / 2 - 11, h - 10, 22, 10, 2);
    g.fillStyle(0x556778).fillRect(w / 2 - 10, h - 9, 20, 3);
    // mast
    const mastH = 10 + lvl * 4;
    g.fillStyle(0x4e6070).fillRect(w / 2 - 3, h - 10 - mastH, 6, mastH);
    // dish fan
    const cy = h - 10 - mastH;
    g.fillStyle(C.mirror).fillRoundedRect(w / 2 - 9 - lvl * 2, cy - 8 - lvl * 2, 18 + lvl * 4, 12 + lvl * 2, 4);
    g.fillStyle(0xe9f6f6).fillRoundedRect(w / 2 - 7 - lvl * 2, cy - 6 - lvl * 2, 14 + lvl * 4, 8 + lvl * 2, 3);
    g.fillStyle(0x2f3d57).fillCircle(w / 2, cy - 2 - lvl, 2.5);
    // focusing facet lines
    g.lineStyle(1, 0x2f3d57, 0.8);
    for (let i = -1; i <= 1; i++) g.lineBetween(w / 2 + i * 5, cy - 7 - lvl * 2, w / 2 + i * 5, cy + 3);
    if (lvl >= 2) { g.fillStyle(0x53e3d8).fillCircle(w / 2, cy - 12, 3); }
    if (lvl >= 3) {
      g.lineStyle(2, 0x53e3d8, 1);
      g.strokeCircle(w / 2, cy - 2, 12);
      g.fillStyle(0xbdf5ee).fillTriangle(w / 2 - 6, cy - 14, w / 2 + 6, cy - 14, w / 2, cy - 22);
    }
  }

  private drawDriver(g: GameObjects.Graphics, lvl: number, w: number, h: number) {
    const C = COLORS;
    g.fillStyle(0x4a3f38).fillRoundedRect(w / 2 - 12, h - 10, 24, 10, 2);
    g.fillStyle(0x635549).fillRect(w / 2 - 11, h - 9, 22, 3);
    g.fillStyle(0x5b5349).fillRect(w / 2 - 5, h - 16 - lvl * 3, 10, 6 + lvl * 3);
    // barrel
    const top = h - 16 - lvl * 4;
    g.fillStyle(0x7d766c).fillRoundedRect(w / 2 - 4, top, 8, 16 + lvl * 4, 3);
    g.fillStyle(0xff8f4d).fillRoundedRect(w / 2 - 5, top, 10, 4, 2);
    if (lvl >= 2) {
      g.fillStyle(0x6a6157).fillRect(w / 2 - 9, top + 8, 5, 10);
      g.lineStyle(1.5, 0x3d3630, 1);
      g.lineBetween(w / 2 - 9, top + 12, w / 2 + 9, top + 12);
    }
    if (lvl >= 3) {
      g.fillStyle(0x8b8479).fillRoundedRect(w / 2 - 10, top - 2, 20, 6, 2);
      g.fillStyle(0xffb06a).fillCircle(w / 2, top + 2, 3.5);
    }
    g.fillStyle(C.mirror).fillCircle(w / 2, h - 5, 2.5);
  }

  private bakeBackground() {
    const C = COLORS;
    const W = COLS * TILE, H = ROWS * TILE;
    const hash = (c: number, r: number) => ((c * 73856093) ^ (r * 19349153)) % 997;

    this.tex('bg', W, H, (g) => {
      g.fillStyle(C.sand).fillRect(0, 0, W, H);

      // dune bands + scattered pebbles (scenery only, gameplay cells drawn after)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (isPath(c, r)) continue;
          const h = hash(c, r);
          g.fillStyle(h % 6 === 0 ? C.sandDeep : C.sand).fillRect(c * TILE, r * TILE, TILE, TILE);
          g.fillStyle(0xf7e7c9, 0.55).fillRect(c * TILE, r * TILE, TILE, 3);
          if (h % 4 === 0) g.fillStyle(0xcbb08a, 0.8).fillCircle(c * TILE + 8 + (h % 13), r * TILE + 12 + (h % 11), 1.6);
          if (h % 17 === 0) {
            g.fillStyle(0xa98f6a).fillEllipse(c * TILE + 16, r * TILE + 18, 14, 8);
            g.fillStyle(0xc4ab85).fillEllipse(c * TILE + 15, r * TILE + 16, 10, 5);
          }
          if (h % 23 === 0) {
            // small solar panel array (outpost scenery)
            g.fillStyle(0x2f4258).fillRect(c * TILE + 6, r * TILE + 8, 20, 14);
            g.lineStyle(1, 0x6d86a3, 0.9); g.strokeRect(c * TILE + 6, r * TILE + 8, 20, 14);
            g.lineStyle(1, 0x516a85, 0.8);
            g.lineBetween(c * TILE + 16, r * TILE + 8, c * TILE + 16, r * TILE + 22);
            g.fillStyle(0x8d7a55).fillRect(c * TILE + 15, r * TILE + 22, 2, 6);
          }
        }
      }

      // continuous road: full tile per path cell, arms toward neighbours, centre dashes
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!isPath(c, r)) continue;
          const x = c * TILE, y = r * TILE;
          g.fillStyle(C.road).fillRect(x, y, TILE, TILE);
          g.fillStyle(0xd9b181).fillRect(x + 6, y + 12, TILE - 12, 8);
          const dirs = segDirs[key(c, r)] || [];
          for (const [dc, dr] of dirs) {
            if (dc > 0) g.fillStyle(0xd9b181).fillRect(x + TILE - 12, y + 12, 12, 8);
            if (dc < 0) g.fillStyle(0xd9b181).fillRect(x, y + 12, 12, 8);
            if (dr > 0) g.fillStyle(0xd9b181).fillRect(x + 12, y + TILE - 12, 8, 12);
            if (dr < 0) g.fillStyle(0xd9b181).fillRect(x + 12, y, 8, 12);
            if (dirs.length > 1) { g.fillStyle(0xc7a071).fillCircle(x + TILE / 2, y + TILE / 2, 5); }
          }
          g.fillStyle(0xb98f60, 0.55).fillRect(x, y, TILE, 2);
          g.fillStyle(0xb98f60, 0.55).fillRect(x, y + TILE - 2, TILE, 2);
        }
      }

      // build pads
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!isPad(c, r)) continue;
          const x = c * TILE, y = r * TILE;
          g.fillStyle(0xdfc79c).fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          g.lineStyle(1.5, 0x9c8b6f, 0.95); g.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
          g.fillStyle(C.pad).fillCircle(x + TILE / 2, y + TILE / 2, 2.2);
        }
      }

      // relay hub (core) at the path end
      const hx = HUB_CELL[0] * TILE, hy = HUB_CELL[1] * TILE;
      g.fillStyle(0xd9c7a5).fillRect(hx - 6, hy - 6, TILE + 12, TILE + 12);
      g.lineStyle(2, 0x7f8f9c, 1); g.strokeRect(hx - 5, hy - 5, TILE + 10, TILE + 10);
      g.fillStyle(0x36424d).fillRoundedRect(hx + 4, hy + 4, TILE - 8, TILE - 8, 4);
      g.fillStyle(C.mirror).fillCircle(hx + TILE / 2, hy + TILE / 2, 6);
      g.fillStyle(0xe8fff8).fillCircle(hx + TILE / 2, hy + TILE / 2, 2.5);
      g.lineStyle(1.5, C.mirror, 0.8);
      g.beginPath(); g.arc(hx + TILE / 2, hy + TILE / 2, 11, 0, Math.PI * 2); g.strokePath();
      g.lineStyle(1, 0x6f7f8c, 0.9);
      g.lineBetween(hx + TILE / 2, hy + TILE / 2, hx + TILE / 2 + 12, hy + 4);
      g.fillStyle(0x8d7a55).fillRect(hx + TILE / 2 - 1, hy + TILE - 10, 2, 8);

      // frame edge shading so the map reads as one plate
      g.fillStyle(0x000000, 0.06).fillRect(0, 0, W, H);
      g.fillStyle(C.ink, 0.35).fillRect(0, 0, W, 3);
      g.fillStyle(C.ink, 0.35).fillRect(0, H - 3, W, 3);
    });
  }

  create() {
    this.scene.start('MainMenu');
  }
}
