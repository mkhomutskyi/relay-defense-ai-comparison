// Relay Defense — procedural sprite & background textures, generated at boot
// with Phaser Graphics (no image assets). Each generator draws into a temp
// Graphics and bakes a texture.
import { GameObjects } from 'phaser';
type Graphics = GameObjects.Graphics;
import { ENEMIES, TOWERS, PATH, VIEW_W, VIEW_H, PLAY_TOP, CELL, GRID_COLS, GRID_ROWS } from './data';

function tmp(scene: Phaser.Scene): Graphics {
    const g = scene.add.graphics();
    g.setDepth(-999).setVisible(false);
    return g;
}

function bake(g: Graphics, key: string, w: number, h: number, ox: number, oy: number) {
    g.generateTexture(key, w, h);
    g.destroy();
    // ox/oy reserved for future origin tweaks; textures are centered by size.
    void ox; void oy;
}

function poly(g: Graphics, pts: number[], color: number, alpha = 1) {
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fillPath();
}

// ---- Towers -------------------------------------------------------------
export function makeTowerTextures(scene: Phaser.Scene) {
    // Pulse cannon: warm orange barrel turret on dark hex base.
    let g = tmp(scene);
    g.fillStyle(0x241a2e, 1); g.fillCircle(24, 24, 18);
    g.fillStyle(0x3a2b46, 1); g.fillCircle(24, 24, 15);
    g.lineStyle(2, TOWERS.pulse.color, 1); g.strokeCircle(24, 24, 17);
    g.fillStyle(0x555061, 1); g.fillRect(21, 4, 8, 22);          // barrel
    g.fillStyle(TOWERS.pulse.color, 1); g.fillCircle(25, 6, 4);  // muzzle glow
    g.fillStyle(0xffd9b0, 1); g.fillCircle(24, 24, 5);
    bake(g, 'tower_pulse', 48, 48, 24, 24);

    // Arc coil: cyan tesla ring with prongs.
    g = tmp(scene);
    g.fillStyle(0x122a33, 1); g.fillCircle(24, 24, 18);
    g.lineStyle(3, TOWERS.arc.color, 1); g.strokeCircle(24, 24, 15);
    g.lineStyle(2, 0x7ff0ff, 0.9); g.strokeCircle(24, 24, 9);
    for (let a = 0; a < 4; a++) {
        const ang = a * Math.PI / 2;
        g.fillStyle(0x9beeff, 1);
        g.fillCircle(24 + Math.cos(ang) * 16, 24 + Math.sin(ang) * 16, 3);
    }
    g.fillStyle(0xffffff, 1); g.fillCircle(24, 24, 4);
    bake(g, 'tower_arc', 48, 48, 24, 24);
}

// ---- Enemies ------------------------------------------------------------
export function makeEnemyTextures(scene: Phaser.Scene) {
    (Object.keys(ENEMIES) as (keyof typeof ENEMIES)[]).forEach((k) => {
        const e = ENEMIES[k];
        const r = e.radius;
        const s = r * 2 + 10;
        const c = s / 2;
        const g = tmp(scene);
        // shadow
        g.fillStyle(0x000000, 0.18); g.fillEllipse(c, c + r * 0.6, r * 1.9, r * 0.7);
        if (e.boss) {
            // spiky colossus with dark aura + menacing outline
            g.fillStyle(0x3a0010, 0.35); g.fillCircle(c, c, r * 1.12);
            g.fillStyle(e.color, 1);
            const spikes = 12, outer = r, inner = r * 0.6;
            const pts: number[] = [];
            for (let i = 0; i < spikes * 2; i++) {
                const rad = i % 2 ? inner : outer;
                const a = (i / (spikes * 2)) * Math.PI * 2;
                pts.push(c + Math.cos(a) * rad, c + Math.sin(a) * rad);
            }
            poly(g, pts, e.color);
            g.lineStyle(3, 0x5a0016, 1); g.strokePath();
            g.fillStyle(0x1a0008, 1); g.fillCircle(c, c, r * 0.52);
            g.fillStyle(0xffffff, 0.18); g.fillCircle(c, c - r * 0.1, r * 0.4);
            // glowing eyes
            g.fillStyle(0xffe23f, 1); g.fillCircle(c - r * 0.24, c - r * 0.06, r * 0.13); g.fillCircle(c + r * 0.24, c - r * 0.06, r * 0.13);
            g.fillStyle(0x220008, 1); g.fillCircle(c - r * 0.24, c - r * 0.06, r * 0.06); g.fillCircle(c + r * 0.24, c - r * 0.06, r * 0.06);
            // angry brow
            g.lineStyle(4, 0x220008, 1); g.lineBetween(c - r * 0.42, c - r * 0.28, c - r * 0.08, c - r * 0.14); g.lineBetween(c + r * 0.42, c - r * 0.28, c + r * 0.08, c - r * 0.14);
        } else if (k === 'hauler') {
            // armored block with plating
            g.fillStyle(0x1a1420, 1); g.fillRoundedRect(c - r, c - r, r * 2, r * 2, 5);
            g.fillStyle(e.color, 1); g.fillRoundedRect(c - r + 2, c - r + 2, r * 2 - 4, r * 2 - 4, 4);
            g.fillStyle(0x000000, 0.25); g.fillRect(c - r + 3, c - 2, r * 2 - 6, 4);
            g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(c - r + 3, c - r + 3, r * 2 - 6, 4, 2);
            g.lineStyle(2, 0x7a4b00, 1); g.strokeRoundedRect(c - r, c - r, r * 2, r * 2, 5);
        } else if (k === 'runner') {
            // fast dart / triangle
            poly(g, [c + r, c, c - r * 0.7, c - r * 0.8, c - r * 0.3, c, c - r * 0.7, c + r * 0.8], e.color);
            g.fillStyle(0xffffff, 0.5); g.fillCircle(c + r * 0.3, c, r * 0.2);
        } else {
            // drifter: hovering hex drone
            const pts: number[] = [];
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * Math.PI * 2 + Math.PI / 6;
                pts.push(c + Math.cos(a) * r, c + Math.sin(a) * r);
            }
            poly(g, pts, e.color);
            g.fillStyle(0x000000, 0.3); g.fillCircle(c, c, r * 0.4);
            g.fillStyle(0xff5aff, 1); g.fillCircle(c, c, r * 0.22);
            g.lineStyle(2, 0xffffff, 0.25); g.strokeCircle(c, c, r);
        }
        bake(g, 'enemy_' + k, s, s, c, c);
    });
}

// ---- Bullet / orb -------------------------------------------------------
export function makeFxTextures(scene: Phaser.Scene) {
    let g = tmp(scene);
    g.fillStyle(0xffd7a0, 1); g.fillCircle(6, 6, 5);
    g.fillStyle(TOWERS.pulse.color, 1); g.fillCircle(6, 6, 3);
    bake(g, 'bullet', 12, 12, 6, 6);

    // Relay core (goal) — solar receiver tower.
    g = tmp(scene);
    g.fillStyle(0x000000, 0.22); g.fillEllipse(28, 50, 44, 14);
    g.fillStyle(0x2b3a55, 1); g.fillRoundedRect(16, 22, 24, 30, 4);
    g.lineStyle(2, 0x6ea8ff, 1); g.strokeRoundedRect(16, 22, 24, 30, 4);
    g.fillStyle(0x0b1220, 1); g.fillCircle(28, 18, 12);
    g.fillStyle(0x7fdcff, 1); g.fillCircle(28, 18, 9);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(28, 18, 4);
    for (let a = 0; a < 8; a++) {
        const ang = a / 8 * Math.PI * 2;
        g.lineStyle(2, 0x6ea8ff, 0.7);
        g.lineBetween(28 + Math.cos(ang) * 11, 18 + Math.sin(ang) * 11, 28 + Math.cos(ang) * 16, 18 + Math.sin(ang) * 16);
    }
    bake(g, 'relay', 56, 56, 28, 28);
}

// ---- Background: desert + path, baked to one texture --------------------
export function makeBackground(scene: Phaser.Scene) {
    const g = tmp(scene);
    // warm desert base
    g.fillStyle(0xd7a86a, 1); g.fillRect(0, PLAY_TOP, VIEW_W, VIEW_H - PLAY_TOP);
    // subtle sand mottling (deterministic pseudo-random)
    let seed = 1337;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 240; i++) {
        const x = rnd() * VIEW_W; const y = PLAY_TOP + rnd() * (VIEW_H - PLAY_TOP);
        const rr = 6 + rnd() * 26;
        g.fillStyle(rnd() > 0.5 ? 0xc9965a : 0xe3b877, 0.25); g.fillCircle(x, y, rr);
    }
    // dune stripes near top edge (distant sand)
    for (let i = 0; i < 5; i++) {
        g.fillStyle(0xbf8b52, 0.12);
        g.fillRect(0, PLAY_TOP + i * 8, VIEW_W, 4);
    }
    // path: wide tan road with darker border, drawn along segments
    const border = 40, road = 30;
    for (let i = 0; i < PATH.length - 1; i++) {
        const a = PATH[i], b = PATH[i + 1];
        thickLine(g, a.x, a.y, b.x, b.y, border, 0x6b5136);
    }
    for (let i = 0; i < PATH.length - 1; i++) {
        const a = PATH[i], b = PATH[i + 1];
        thickLine(g, a.x, a.y, b.x, b.y, road, 0x8a6a45);
    }
    // path center dashes
    for (let i = 0; i < PATH.length - 1; i++) {
        const a = PATH[i], b = PATH[i + 1];
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.floor(seg / 28);
        for (let s = 0; s < steps; s++) {
            const t = (s + 0.5) / steps;
            const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
            g.fillStyle(0xb98c5c, 0.6); g.fillCircle(x, y, 3);
        }
    }
    // buildable faint grid overlay
    g.lineStyle(1, 0xffffff, 0.06);
    for (let cx = 0; cx <= GRID_COLS; cx++) g.lineBetween(cx * CELL, PLAY_TOP, cx * CELL, VIEW_H);
    for (let cy = 0; cy <= GRID_ROWS; cy++) g.lineBetween(0, PLAY_TOP + cy * CELL, VIEW_W, PLAY_TOP + cy * CELL);

    // HUD bar background (top)
    g.fillStyle(0x1a1030, 1); g.fillRect(0, 0, VIEW_W, PLAY_TOP);
    g.fillStyle(0x2a1c47, 1); g.fillRect(0, PLAY_TOP - 3, VIEW_W, 3);

    g.generateTexture('bg', VIEW_W, VIEW_H);
    g.destroy();
}

function thickLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, w: number, color: number) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * (w / 2), ny = dx / len * (w / 2);
    poly(g, [x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny], color);
}
