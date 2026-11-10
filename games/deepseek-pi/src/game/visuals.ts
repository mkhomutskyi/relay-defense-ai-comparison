import * as Phaser from 'phaser';
import { GAME_H, GAME_W, MAP_BOTTOM, MAP_TOP, PALETTE, mulberry32 } from './art';
import {
  ENEMIES, EnemyKind, PAD_SPECS, PATH_POINTS, RELAY, TOWERS, TowerKind,
} from './defs';

const OUTLINE = 0x352017;

function poly(g: Phaser.GameObjects.Graphics, pts: number[][], fill: number, alpha = 1): void {
  g.fillStyle(fill, alpha);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fillPath();
}

export function drawEnemyVisual(scene: Phaser.Scene, kind: EnemyKind): Phaser.GameObjects.Container {
  const def = ENEMIES[kind];
  const visual = scene.add.container(0, 0);
  const g = scene.add.graphics();
  visual.add(g);

  if (kind === 'crawler') {
    g.fillStyle(0x000000, 0.17);
    g.fillEllipse(-1, 6, 36, 15);
    g.lineStyle(3, 0x3c1d12, 1);
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(-8 + i * 9, -7);
      g.lineTo(-16 + i * 9, -17);
      g.lineTo(-11 + i * 9, -19);
      g.strokePath();
      g.beginPath();
      g.moveTo(-8 + i * 9, 7);
      g.lineTo(-16 + i * 9, 17);
      g.lineTo(-11 + i * 9, 19);
      g.strokePath();
    }
    g.fillStyle(def.color, 1);
    g.fillEllipse(-1, 0, 31, 19);
    g.lineStyle(2.5, OUTLINE, 1);
    g.strokeEllipse(-1, 0, 31, 19);
    g.fillStyle(0x6f2e1c, 1);
    for (let i = 0; i < 3; i++) {
      g.fillEllipse(-8 + i * 7, 0, 7, 15 - i);
    }
    g.fillStyle(def.accent, 1);
    g.fillCircle(10, -5, 2.4);
    g.fillCircle(10, 5, 2.4);
    g.lineStyle(2, 0x3c1d12, 1);
    g.beginPath();
    g.moveTo(14, -4);
    g.lineTo(20, -8);
    g.moveTo(14, 4);
    g.lineTo(20, 8);
    g.strokePath();
  } else if (kind === 'skimmer') {
    g.fillStyle(0x000000, 0.15);
    g.fillEllipse(0, 6, 36, 12);
    poly(g, [[-15, -2], [-3, -13], [17, 0], [-3, 13], [-15, 2]], def.color);
    g.lineStyle(2.5, OUTLINE, 1);
    g.beginPath();
    g.moveTo(-15, -2);
    g.lineTo(-3, -13);
    g.lineTo(17, 0);
    g.lineTo(-3, 13);
    g.lineTo(-15, 2);
    g.closePath();
    g.strokePath();
    poly(g, [[-11, -5], [-1, -11], [3, -5], [-7, -1]], 0x8ff2df, 0.8);
    poly(g, [[-11, 5], [-1, 11], [3, 5], [-7, 1]], 0x8ff2df, 0.8);
    g.fillStyle(0xe9fff8, 0.95);
    g.fillCircle(5, 0, 4);
    g.lineStyle(1.5, 0x18514e, 1);
    g.strokeCircle(5, 0, 4);
    g.lineStyle(2, 0xd8fff7, 0.7);
    g.beginPath();
    g.moveTo(-15, 0);
    g.lineTo(-24, 0);
    g.strokePath();
  } else if (kind === 'brute') {
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(0, 8, 56, 25);
    g.fillStyle(0x3c281e, 1);
    g.fillRoundedRect(-20, -17, 40, 8, 4);
    g.fillRoundedRect(-20, 9, 40, 8, 4);
    g.lineStyle(1.5, 0x1f130e, 1);
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * 7, -17);
      g.lineTo(i * 7, -9);
      g.moveTo(i * 7, 9);
      g.lineTo(i * 7, 17);
      g.strokePath();
    }
    poly(g, [[-20, -13], [-8, -21], [14, -18], [25, 0], [14, 18], [-8, 21], [-20, 13]], def.color);
    g.lineStyle(3, OUTLINE, 1);
    g.beginPath();
    g.moveTo(-20, -13);
    g.lineTo(-8, -21);
    g.lineTo(14, -18);
    g.lineTo(25, 0);
    g.lineTo(14, 18);
    g.lineTo(-8, 21);
    g.lineTo(-20, 13);
    g.closePath();
    g.strokePath();
    g.fillStyle(0x9a6a48, 1);
    g.fillRoundedRect(-13, -11, 11, 22, 3);
    g.fillRoundedRect(1, -9, 10, 18, 3);
    g.fillStyle(def.accent, 1);
    g.fillCircle(17, -6, 2.8);
    g.fillCircle(17, 6, 2.8);
    poly(g, [[24, -10], [34, -16], [30, -6]], 0xe8c68a);
    poly(g, [[24, 10], [34, 16], [30, 6]], 0xe8c68a);
  } else if (kind === 'wasp') {
    g.fillStyle(0x000000, 0.14);
    g.fillEllipse(-1, 6, 30, 11);
    g.fillStyle(0xf7f3d6, 0.58);
    g.fillEllipse(-3, -12, 18, 9);
    g.fillEllipse(-3, 12, 18, 9);
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(5, -12, 13, 6);
    g.fillEllipse(5, 12, 13, 6);
    g.fillStyle(def.color, 1);
    g.fillEllipse(0, 0, 28, 14);
    g.lineStyle(2, OUTLINE, 1);
    g.strokeEllipse(0, 0, 28, 14);
    g.lineStyle(2.5, 0x5d3c0b, 1);
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(i * 6, -6);
      g.lineTo(i * 6, 6);
      g.strokePath();
    }
    g.fillStyle(0x3a2a08, 1);
    g.fillCircle(9, -3.5, 2.2);
    g.fillCircle(9, 3.5, 2.2);
    g.lineStyle(2, 0x5d3c0b, 1);
    g.beginPath();
    g.moveTo(-14, 0);
    g.lineTo(-23, 0);
    g.strokePath();
  } else {
    // Boss: a segmented, plated dust colossus.
    g.fillStyle(0x000000, 0.24);
    g.fillEllipse(-4, 12, 110, 42);
    g.lineStyle(6, 0x2c1a13, 1);
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(-22 + i * 18, -22);
      g.lineTo(-34 + i * 18, -42);
      g.lineTo(-24 + i * 18, -45);
      g.strokePath();
      g.beginPath();
      g.moveTo(-22 + i * 18, 22);
      g.lineTo(-34 + i * 18, 42);
      g.lineTo(-24 + i * 18, 45);
      g.strokePath();
    }
    for (let i = 3; i >= 0; i--) {
      const x = -30 + i * 17;
      const r = 22 - i * 1.5;
      g.fillStyle(i % 2 === 0 ? def.color : 0x77513d, 1);
      g.fillCircle(x, 0, r);
      g.lineStyle(3, OUTLINE, 1);
      g.strokeCircle(x, 0, r);
      g.fillStyle(0x3a241b, 0.75);
      g.fillEllipse(x, -7, 18, 7);
    }
    g.fillStyle(0xb98a58, 1);
    for (let i = 0; i < 4; i++) {
      g.fillRoundedRect(-24 + i * 14, -17, 8, 34, 2);
    }
    g.fillStyle(def.accent, 1);
    g.fillCircle(6, 0, 7);
    g.fillStyle(0xffe3a8, 1);
    g.fillCircle(6, 0, 3);
    g.lineStyle(4, 0x2c1a13, 1);
    g.beginPath();
    g.moveTo(22, -16);
    g.lineTo(38, -30);
    g.moveTo(22, 16);
    g.lineTo(38, 30);
    g.strokePath();
    poly(g, [[28, -8], [42, -20], [36, -2]], 0xe0b47d);
    poly(g, [[28, 8], [42, 20], [36, 2]], 0xe0b47d);
    g.fillStyle(0xffc46b, 1);
    g.fillCircle(25, -7, 3);
    g.fillCircle(25, 7, 3);
  }

  return visual;
}

export interface TowerVisual {
  container: Phaser.GameObjects.Container;
  head: Phaser.GameObjects.Container;
  pips: Phaser.GameObjects.Graphics;
}

export function drawTower(scene: Phaser.Scene, kind: TowerKind, _level: number): TowerVisual {
  const def = TOWERS[kind];
  const container = scene.add.container(0, 0);
  const base = scene.add.graphics();
  base.fillStyle(0x000000, 0.2);
  base.fillEllipse(2, 7, 62, 34);
  base.fillStyle(0x4d4438, 1);
  base.fillCircle(0, 0, 27);
  base.lineStyle(3, 0x2a2119, 1);
  base.strokeCircle(0, 0, 27);
  base.fillStyle(kind === 'sunspear' ? 0x8d7457 : 0x5b7d77, 1);
  base.fillCircle(0, 0, 22);
  base.lineStyle(2, 0xefe1c2, 0.35);
  base.strokeCircle(0, 0, 17);
  base.fillStyle(0x2a2119, 1);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    base.fillCircle(Math.cos(a) * 23, Math.sin(a) * 23, 1.8);
  }
  container.add(base);

  const head = scene.add.container(0, 0);
  const h = scene.add.graphics();
  if (kind === 'sunspear') {
    h.fillStyle(0x3a2b1e, 1);
    h.fillCircle(0, 0, 14);
    h.lineStyle(3, 0x2a1a10, 1);
    h.strokeCircle(0, 0, 14);
    h.fillStyle(def.color, 1);
    h.fillRoundedRect(4, -7, 30, 14, 4);
    h.lineStyle(2, 0x4b2a12, 1);
    h.strokeRoundedRect(4, -7, 30, 14, 4);
    h.fillStyle(def.light, 1);
    h.fillCircle(35, 0, 5);
    h.fillStyle(0xffffff, 0.9);
    h.fillCircle(35, 0, 2.4);
    h.fillStyle(0xe7c28b, 1);
    h.fillRoundedRect(-11, -10, 9, 20, 3);
    h.lineStyle(2, 0x5e3b1e, 1);
    h.strokeRoundedRect(-11, -10, 9, 20, 3);
    h.fillStyle(0x6b4a2c, 1);
    h.fillCircle(-3, 0, 5);
  } else {
    h.fillStyle(0x274c49, 1);
    h.fillCircle(0, 0, 15);
    h.lineStyle(3, 0x17312f, 1);
    h.strokeCircle(0, 0, 15);
    h.lineStyle(3, def.light, 0.9);
    h.beginPath();
    h.arc(0, 0, 12, -0.2, 1.5);
    h.strokePath();
    h.beginPath();
    h.arc(0, 0, 12, 2.6, 4.3);
    h.strokePath();
    h.lineStyle(3, 0x9bded3, 0.7);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
      h.beginPath();
      h.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      h.lineTo(Math.cos(a) * 22, Math.sin(a) * 22);
      h.strokePath();
    }
    h.fillStyle(0x7fe8d9, 0.32);
    h.fillCircle(0, 0, 12);
    h.fillStyle(0xd6fff8, 1);
    h.fillCircle(0, 0, 6.5);
    h.fillStyle(0xffffff, 1);
    h.fillCircle(-1.5, -2, 2.4);
  }
  head.add(h);
  container.add(head);

  const pips = scene.add.graphics();
  container.add(pips);

  container.setDepth(6);
  return { container, head, pips };
}

export function updateTowerPips(pips: Phaser.GameObjects.Graphics, level: number, color: number): void {
  pips.clear();
  for (let i = 0; i < 3; i++) {
    const x = -10 + i * 10;
    pips.fillStyle(i < level ? color : 0x3b3329, 1);
    pips.fillCircle(x, 21, 2.6);
    pips.lineStyle(1, 0x1e1711, 0.9);
    pips.strokeCircle(x, 21, 2.6);
  }
}

export function drawPad(
  g: Phaser.GameObjects.Graphics,
  hover: boolean,
  occupied: boolean,
  selected: boolean,
): void {
  g.clear();
  const ring = selected ? 0xfff0b8 : hover ? PALETTE.orange : 0x6e5b3d;
  g.fillStyle(0x2b2419, 0.18);
  g.fillCircle(0, 4, 34);
  g.fillStyle(occupied ? 0x5c5140 : 0x7d6c50, occupied ? 0.5 : 0.34);
  g.fillCircle(0, 0, 29);
  g.lineStyle(2.5, 0x403323, 0.7);
  g.strokeCircle(0, 0, 29);
  g.lineStyle(2.5, ring, hover || selected ? 1 : 0.7);
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2 + 0.08;
    const a1 = a0 + 0.27;
    g.beginPath();
    g.arc(0, 0, 24, a0, a1);
    g.strokePath();
  }
  if (!occupied) {
    g.lineStyle(2.5, hover ? 0xffe2a6 : 0xcfb98e, 0.9);
    g.beginPath();
    g.moveTo(-7, 0);
    g.lineTo(7, 0);
    g.moveTo(0, -7);
    g.lineTo(0, 7);
    g.strokePath();
  } else {
    g.fillStyle(0x2b2419, 0.35);
    g.fillCircle(0, 0, 21);
  }
}

export function drawTowerIcon(g: Phaser.GameObjects.Graphics, kind: TowerKind, x: number, y: number, s: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.scaleCanvas(s, s);
  if (kind === 'sunspear') {
    g.fillStyle(0x4d4438, 1);
    g.fillCircle(0, 0, 16);
    g.fillStyle(0x8d7457, 1);
    g.fillCircle(0, 0, 12);
    g.fillStyle(PALETTE.orangeDeep, 1);
    g.fillRoundedRect(-2, -5, 22, 10, 3);
    g.fillStyle(0xffe0a3, 1);
    g.fillCircle(21, 0, 4);
    g.fillStyle(0xe7c28b, 1);
    g.fillRoundedRect(-11, -8, 7, 16, 2);
  } else {
    g.fillStyle(0x274c49, 1);
    g.fillCircle(0, 0, 16);
    g.lineStyle(2.5, 0xa9fff0, 0.95);
    g.beginPath();
    g.arc(0, 0, 11, -0.2, 1.6);
    g.strokePath();
    g.beginPath();
    g.arc(0, 0, 11, 2.5, 4.3);
    g.strokePath();
    g.fillStyle(0xd6fff8, 1);
    g.fillCircle(0, 0, 6);
  }
  g.restore();
}

export function drawScrapIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.scaleCanvas(s, s);
  g.fillStyle(PALETTE.orange, 1);
  g.fillCircle(0, 0, 7);
  g.lineStyle(2, PALETTE.orange, 0.9);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.beginPath();
    g.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
    g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
    g.strokePath();
  }
  g.fillStyle(0x7c4a1d, 1);
  g.fillCircle(0, 0, 3);
  g.restore();
}

function isClear(x: number, y: number, pathPts: Phaser.Math.Vector2[], margin: number): boolean {
  for (const p of pathPts) {
    if (Phaser.Math.Distance.Between(x, y, p.x, p.y) < margin) return false;
  }
  for (const pad of PAD_SPECS) {
    if (Phaser.Math.Distance.Between(x, y, pad.x, pad.y) < 58) return false;
  }
  if (Phaser.Math.Distance.Between(x, y, RELAY.x, RELAY.y) < 92) return false;
  if (y < MAP_TOP + 16 || y > MAP_BOTTOM - 10) return false;
  return true;
}

function drawSolarFarm(g: Phaser.GameObjects.Graphics, x: number, y: number, cols: number, rows: number, rot: number): void {
  g.save();
  g.translateCanvas(x, y);
  g.rotateCanvas(rot);
  const pw = 34;
  const ph = 19;
  const gap = 7;
  const w = cols * pw + (cols - 1) * gap;
  const h = rows * ph + (rows - 1) * gap;
  g.fillStyle(0x000000, 0.14);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 7, w, h, 4);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = -w / 2 + c * (pw + gap);
      const py = -h / 2 + r * (ph + gap);
      g.fillStyle(0x4f4b3b, 1);
      g.fillRoundedRect(px - 2, py - 2, pw + 4, ph + 4, 3);
      g.fillStyle(0x2f777a, 1);
      g.fillRoundedRect(px, py, pw, ph, 2);
      g.fillStyle(0x74c4bd, 0.7);
      g.fillRoundedRect(px + 3, py + 3, pw - 6, ph - 6, 1);
      g.lineStyle(1, 0x1d4b4d, 0.9);
      g.beginPath();
      g.moveTo(px + pw / 2, py + 1);
      g.lineTo(px + pw / 2, py + ph - 1);
      g.moveTo(px + 1, py + ph / 2);
      g.lineTo(px + pw - 1, py + ph / 2);
      g.strokePath();
    }
  }
  g.restore();
}

function drawRock(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, seed: number): void {
  const rng = mulberry32(seed);
  const pts: number[][] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.72 + rng() * 0.45);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75]);
  }
  g.fillStyle(0x000000, 0.15);
  g.fillEllipse(x + 3, y + r * 0.55, r * 2.2, r * 0.8);
  poly(g, pts, 0x8e7757);
  g.lineStyle(2, 0x59442e, 0.85);
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < n; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.strokePath();
  g.fillStyle(0xc7ab7f, 0.55);
  g.fillEllipse(x - r * 0.2, y - r * 0.24, r * 0.9, r * 0.45);
}

function drawCactus(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
  g.fillStyle(0x000000, 0.13);
  g.fillEllipse(x + 3, y + 4, 26 * s, 8 * s);
  g.lineStyle(7 * s, 0x3e6b42, 1);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x, y - 28 * s);
  g.strokePath();
  g.beginPath();
  g.moveTo(x, y - 15 * s);
  g.lineTo(x - 9 * s, y - 15 * s);
  g.lineTo(x - 9 * s, y - 24 * s);
  g.strokePath();
  g.beginPath();
  g.moveTo(x, y - 10 * s);
  g.lineTo(x + 8 * s, y - 10 * s);
  g.lineTo(x + 8 * s, y - 18 * s);
  g.strokePath();
  g.lineStyle(2, 0x7fa36d, 0.8);
  g.beginPath();
  g.moveTo(x - 1, y - 2);
  g.lineTo(x - 1, y - 26 * s);
  g.strokePath();
}

export interface RelayVisual {
  container: Phaser.GameObjects.Container;
  core: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
}

export function drawRelay(scene: Phaser.Scene): RelayVisual {
  const c = scene.add.container(RELAY.x, RELAY.y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.22);
  g.fillEllipse(0, 10, 128, 46);
  g.fillStyle(0x6d5a40, 1);
  g.fillCircle(0, 0, 51);
  g.lineStyle(4, 0x40301e, 1);
  g.strokeCircle(0, 0, 51);
  g.fillStyle(0xb39566, 1);
  g.fillCircle(0, 0, 44);
  g.lineStyle(2, 0xf3dda8, 0.5);
  g.strokeCircle(0, 0, 38);
  // Hazard wedges around the platform.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.fillStyle(i % 2 === 0 ? 0xe2a13e : 0x3d3222, 0.9);
    g.beginPath();
    g.arc(0, 0, 48, a, a + 0.2);
    g.arc(0, 0, 42, a + 0.2, a, true);
    g.closePath();
    g.fillPath();
  }
  // Mirror wings.
  poly(g, [[-38, -18], [-88, -44], [-96, -30], [-44, -6]], 0x2f6f74);
  poly(g, [[-40, 6], [-92, 2], [-94, 16], [-42, 20]], 0x3a8b8c);
  poly(g, [[38, -18], [88, -44], [96, -30], [44, -6]], 0x2f6f74);
  poly(g, [[40, 6], [92, 2], [94, 16], [42, 20]], 0x3a8b8c);
  g.lineStyle(2, 0x9fe4d7, 0.65);
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(-40, i * 5);
    g.lineTo(-88 + Math.abs(i) * 4, -36 + i * 7);
    g.strokePath();
    g.beginPath();
    g.moveTo(40, i * 5);
    g.lineTo(88 - Math.abs(i) * 4, -36 + i * 7);
    g.strokePath();
  }
  // Central mast.
  g.fillStyle(0x3a3128, 1);
  g.fillRoundedRect(-7, -58, 14, 68, 4);
  g.fillStyle(0xcfb98e, 1);
  g.fillRoundedRect(-3, -56, 6, 64, 2);
  g.fillStyle(0x3a3128, 1);
  g.fillRoundedRect(-22, -48, 44, 6, 2);
  g.fillStyle(0xe7c28b, 1);
  g.fillCircle(-22, -45, 4);
  g.fillCircle(22, -45, 4);
  g.fillStyle(0x3a3128, 1);
  g.fillRoundedRect(-16, -66, 32, 8, 3);
  g.fillStyle(0xffd37c, 1);
  g.fillCircle(0, -68, 5);
  c.add(g);

  const glow = scene.add.circle(0, -76, 28, 0xffc46b, 0.18);
  const core = scene.add.circle(0, -76, 10, 0xffcf7a, 1);
  c.add(glow);
  c.add(core);
  c.setDepth(5);
  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.12, to: 0.32 },
    scale: { from: 0.85, to: 1.18 },
    duration: 1700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });
  return { container: c, core, glow };
}

export function drawMap(scene: Phaser.Scene, curve: Phaser.Curves.Spline): void {
  const bg = scene.add.image(0, 0, 'sand-floor').setOrigin(0, 0);
  bg.setDepth(-10);

  const g = scene.add.graphics();
  g.setDepth(-5);
  const pts = curve.getSpacedPoints(240);
  const rng = mulberry32(4412);

  // Soft dune shadow under the trail.
  g.lineStyle(94, 0x7b4828, 0.16);
  g.strokePoints(pts.map((p) => new Phaser.Math.Vector2(p.x + 2, p.y + 8)), false);
  // Track shoulder, bed, then sun-bleached center.
  g.lineStyle(88, 0x8f5a35, 0.95);
  g.strokePoints(pts, false);
  g.lineStyle(74, 0xb0794b, 1);
  g.strokePoints(pts, false);
  g.lineStyle(58, 0xc08b57, 1);
  g.strokePoints(pts, false);
  // Tire ruts.
  for (const side of [-16, 16]) {
    const rut: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const len = Math.max(1, Math.hypot(tx, ty));
      rut.push(new Phaser.Math.Vector2(pts[i].x + (-ty / len) * side, pts[i].y + (tx / len) * side));
    }
    g.lineStyle(2, 0x6b3d22, 0.22);
    g.strokePoints(rut, false);
  }
  // Dashed center markers.
  g.lineStyle(2.5, 0xf0cd91, 0.38);
  for (let i = 0; i < pts.length - 1; i += 5) {
    if (i % 10 < 5) {
      g.beginPath();
      g.moveTo(pts[i].x, pts[i].y);
      g.lineTo(pts[i + 1].x, pts[i + 1].y);
      g.strokePath();
    }
  }

  // Solar arrays around the outpost.
  drawSolarFarm(g, 88, 128, 3, 2, -0.1);
  drawSolarFarm(g, 230, 100, 2, 2, 0.06);
  drawSolarFarm(g, 462, 118, 3, 2, -0.04);
  drawSolarFarm(g, 810, 112, 3, 2, 0.08);
  drawSolarFarm(g, 930, 138, 2, 2, -0.06);
  drawSolarFarm(g, 870, 578, 3, 2, 0.02);

  // Rocks, scrub and cacti, avoiding trail and build pads.
  for (let i = 0; i < 34; i++) {
    let x = 30 + rng() * (GAME_W - 60);
    let y = MAP_TOP + 26 + rng() * (MAP_BOTTOM - MAP_TOP - 50);
    for (let tries = 0; tries < 20 && !isClear(x, y, pts, 54); tries++) {
      x = 30 + rng() * (GAME_W - 60);
      y = MAP_TOP + 26 + rng() * (MAP_BOTTOM - MAP_TOP - 50);
    }
    if (!isClear(x, y, pts, 54)) continue;
    if (rng() > 0.58) drawRock(g, x, y, 5 + rng() * 9, 700 + i);
    else {
      g.fillStyle(0x8b7a4f, 0.4);
      g.fillEllipse(x, y, 10 + rng() * 8, 3);
      g.lineStyle(1, 0x756332, 0.55);
      for (let j = 0; j < 3; j++) {
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rng() - 0.5) * 12, y - 3 - rng() * 7);
        g.strokePath();
      }
    }
  }
  const cactusSpots = [[70, 330], [620, 105], [1000, 570], [1180, 620], [300, 580], [1180, 155]];
  for (const [x, y] of cactusSpots) drawCactus(g, x, y, 0.9 + rng() * 0.4);

  // Entry gate.
  g.fillStyle(0x3d2a1d, 1);
  g.fillRoundedRect(-8, 480, 12, 84, 3);
  g.fillRoundedRect(24, 480, 12, 84, 3);
  g.fillStyle(0xd88532, 1);
  g.fillRoundedRect(0, 474, 30, 16, 3);
  g.fillStyle(0x2f2017, 1);
  for (let i = 0; i < 3; i++) g.fillRect(4 + i * 9, 478, 4, 8);
  g.lineStyle(2, 0xf2c37b, 0.8);
  g.beginPath();
  g.moveTo(36, 522);
  g.lineTo(56, 522);
  g.lineTo(50, 516);
  g.moveTo(56, 522);
  g.lineTo(50, 528);
  g.strokePath();

  // Stenciled sector label near the lower edge.
  g.fillStyle(0x5c4127, 0.45);
  g.fillRoundedRect(46, 590, 196, 24, 4);
  g.lineStyle(1, 0xf0cd91, 0.25);
  g.strokeRoundedRect(46, 590, 196, 24, 4);
}

export function drawMapLabels(scene: Phaser.Scene): void {
  scene.add.text(56, 596, 'SECTOR 12  ·  SOLAR RELAY 07', {
    fontFamily: '"Trebuchet MS", sans-serif',
    fontSize: '10px',
    color: '#4c3822',
    fontStyle: 'bold',
  }).setDepth(-4).setAlpha(0.8).setLetterSpacing(1);
  scene.add.text(RELAY.x, RELAY.y + 62, 'RELAY', {
    fontFamily: '"Trebuchet MS", sans-serif',
    fontSize: '11px',
    color: '#4b3320',
    fontStyle: 'bold',
  }).setOrigin(0.5).setDepth(5).setLetterSpacing(3).setAlpha(0.8);
}

export const PATH_POINT_COUNT = PATH_POINTS.length;
export const MAP_WIDTH = GAME_W;
export const MAP_HEIGHT = GAME_H;
