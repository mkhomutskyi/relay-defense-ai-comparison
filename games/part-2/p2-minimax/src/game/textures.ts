/**
 * Procedural art. Everything in Relay Defense is drawn at runtime with the
 * Phaser Graphics API and baked into textures - no external asset files.
 */
import { Math as PhaserMath } from 'phaser';
import { C } from './config';

type Draw = (g: Phaser.GameObjects.Graphics, w: number, h: number) => void;

function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.clear();
    draw(g, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
}

function poly(g: Phaser.GameObjects.Graphics, pts: number[][], fill: number, stroke?: number, lw = 2): void {
    const p = pts.map(([x, y]) => new PhaserMath.Vector2(x, y));
    g.fillStyle(fill, 1);
    g.fillPoints(p, true);
    if (stroke !== undefined) {
        g.lineStyle(lw, stroke, 1);
        g.strokePoints(p, true);
    }
}

/** Points of a rotated ellipse, used for tilted shapes. */
function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot: number, steps = 28): PhaserMath.Vector2[] {
    const out: PhaserMath.Vector2[] = [];
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = Math.cos(a) * rx;
        const y = Math.sin(a) * ry;
        out.push(new PhaserMath.Vector2(cx + x * cos - y * sin, cy + x * sin + y * cos));
    }
    return out;
}

/** Soft elliptical shadow used under units. */
export function makeTextures(scene: Phaser.Scene): void {
    /* ---------------------------------------------------------- particles */
    bake(scene, 'spark', 12, 12, (g, w, h) => {
        g.fillStyle(0xffffff, 0.25);
        g.fillCircle(w / 2, h / 2, 5.5);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(w / 2, h / 2, 2.6);
    });

    /* ------------------------------------------------------------- shadow */
    bake(scene, 'shadow', 64, 32, (g, w, h) => {
        g.fillStyle(0x000000, 0.22);
        g.fillEllipse(w / 2, h / 2, w - 4, h - 4);
    });

    /* ------------------------------------------------------------- scrapper */
    bake(scene, 'en-scrapper', 40, 34, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        // legs
        g.lineStyle(3, 0x6d2413, 1);
        g.lineBetween(cx - 6, cy - 6, cx - 12, cy + 8);
        g.lineBetween(cx + 4, cy - 6, cx + 10, cy + 8);
        // hull
        poly(g, [[cx - 12, cy], [cx - 2, cy - 9], [cx + 14, cy - 2], [cx + 14, cy + 4], [cx - 2, cy + 10]],
            0xe2593a, 0x6d2413, 2);
        // crest
        poly(g, [[cx - 4, cy - 7], [cx + 2, cy - 13], [cx + 8, cy - 5]], 0xffa24d, 0x6d2413, 2);
        // eye
        g.fillStyle(0xffe27a, 1);
        g.fillCircle(cx + 7, cy - 2, 2.4);
    });

    /* --------------------------------------------------------------- duster */
    bake(scene, 'en-duster', 26, 24, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        poly(g, [[cx - 8, cy + 6], [cx + 10, cy], [cx - 8, cy - 6]], 0xf2c53d, 0x8a5f10, 2);
        poly(g, [[cx - 2, cy + 4], [cx + 8, cy], [cx - 2, cy - 4]], 0xfff0a8, 0x8a5f10, 1);
        g.fillStyle(0x8a5f10, 1);
        g.fillCircle(cx - 5, cy, 1.6);
    });

    /* -------------------------------------------------------------- skimmer */
    bake(scene, 'en-skimmer', 40, 30, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        poly(g, [[cx - 14, cy + 4], [cx + 2, cy - 8], [cx + 16, cy], [cx + 2, cy + 8]], 0x2aa5a8, 0x0d4f55, 2);
        poly(g, [[cx - 10, cy + 2], [cx + 2, cy - 5], [cx + 6, cy], [cx + 2, cy + 5]], 0x9ef4ef, 0x0d4f55, 1);
        g.fillStyle(0x0d4f55, 1);
        g.fillCircle(cx + 9, cy, 1.8);
    });

    /* ------------------------------------------------------------- bulwark */
    bake(scene, 'en-bulwark', 54, 50, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        poly(g, [[cx - 20, cy], [cx - 10, cy - 15], [cx + 12, cy - 14], [cx + 21, cy], [cx + 12, cy + 15], [cx - 10, cy + 16]],
            0x9a86c9, 0x3b2f5e, 3);
        poly(g, [[cx - 12, cy - 8], [cx + 8, cy - 9], [cx + 12, cy], [cx + 8, cy + 9], [cx - 12, cy + 8]],
            0x6f5fa0, 0x3b2f5e, 2);
        // spikes
        poly(g, [[cx + 16, cy - 10], [cx + 26, cy - 14], [cx + 20, cy - 4]], 0xcbb9f0, 0x3b2f5e, 2);
        poly(g, [[cx + 16, cy + 10], [cx + 26, cy + 14], [cx + 20, cy + 4]], 0xcbb9f0, 0x3b2f5e, 2);
        g.fillStyle(0xffd166, 1);
        g.fillCircle(cx - 2, cy, 3.6);
    });

    /* ----------------------------------------------------------------- boss */
    bake(scene, 'en-boss', 120, 110, (g, w, h) => {
        const cx = w / 2, cy = h / 2;
        // spiky crown
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + 0.2;
            const r0 = 40, r1 = 54;
            poly(g, [
                [cx + Math.cos(a - 0.16) * r0, cy + Math.sin(a - 0.16) * r0],
                [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1],
                [cx + Math.cos(a + 0.16) * r0, cy + Math.sin(a + 0.16) * r0]
            ], 0x8e2b58, 0x3d0f28, 2);
        }
        poly(g, [[cx - 40, cy], [cx - 26, cy - 32], [cx + 26, cy - 32], [cx + 40, cy], [cx + 26, cy + 32], [cx - 26, cy + 32]],
            0xd4457f, 0x3d0f28, 4);
        poly(g, [[cx - 26, cy], [cx - 16, cy - 20], [cx + 16, cy - 20], [cx + 26, cy], [cx + 16, cy + 20], [cx - 16, cy + 20]],
            0x6d1f47, 0x3d0f28, 2);
        g.fillStyle(0xffd166, 1);
        g.fillCircle(cx, cy, 11);
        g.fillStyle(0xfff6d0, 1);
        g.fillCircle(cx, cy, 6);
        // cannon stubs
        g.fillStyle(0x41203a, 1);
        g.fillRect(cx - 44, cy - 6, 12, 12);
        g.fillRect(cx + 32, cy - 6, 12, 12);
    });

    /* ------------------------------------------------------- prism tower x3 */
    const hexPlate = (g: Phaser.GameObjects.Graphics, cx: number, baseY: number): void => {
        const hex: number[][] = [];
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
            hex.push([cx + Math.cos(a) * 15, baseY + Math.sin(a) * 7]);
        }
        poly(g, hex, 0x39465a, 0x1d2734, 2);
        g.fillStyle(0x2b3646, 1);
        g.fillEllipse(cx, baseY - 2, 22, 9);
    };

    const levelPips = (g: Phaser.GameObjects.Graphics, cx: number, baseY: number, level: number): void => {
        for (let i = 0; i < level; i++) {
            g.fillStyle(C.amber, 1);
            g.fillCircle(cx - 6 + i * 6, baseY - 2, 1.8);
        }
    };

    /** Static tower body: hex base + column. The head is a separate sprite. */
    const prismBody = (g: Phaser.GameObjects.Graphics, w: number, h: number, level: number): void => {
        const cx = w / 2;
        const baseY = h - 6;
        hexPlate(g, cx, baseY);
        // column
        g.fillStyle(0xd6dde6, 1);
        g.fillRect(cx - 5, baseY - 26, 10, 24);
        g.fillStyle(0x9aa6b4, 1);
        g.fillRect(cx + 2, baseY - 26, 3, 24);
        // collar
        g.fillStyle(0x2a3442, 1);
        g.fillRoundedRect(cx - 8, baseY - 30, 16, 6, 3);
        g.fillStyle(0x4b5a6e, 1);
        g.fillRect(cx - 7, baseY - 28, 14, 2);
        levelPips(g, cx, baseY, level);
    };
    bake(scene, 'twp-1', 40, 62, (g, w, h) => prismBody(g, w, h, 1));
    bake(scene, 'twp-2', 40, 66, (g, w, h) => prismBody(g, w, h, 2));
    bake(scene, 'twp-3', 40, 70, (g, w, h) => prismBody(g, w, h, 3));

    /** Rotating prism head: housing + crystal. Pivots around its bottom. */
    const prismHead = (g: Phaser.GameObjects.Graphics, w: number, h: number, level: number): void => {
        const cx = w / 2;
        const anchorY = h * 0.9;
        // housing
        poly(g, [[cx - 9, anchorY - 2], [cx - 6, anchorY - 11], [cx + 6, anchorY - 11], [cx + 9, anchorY - 2]],
            0x2a3442, 0x141c26, 2);
        g.fillStyle(0x4b5a6e, 1);
        g.fillRect(cx - 6, anchorY - 10, 12, 2);
        // crystal
        const cy = anchorY - 24;
        const s = 8 + level * 2;
        poly(g, [[cx, cy - s], [cx + s * 0.72, cy], [cx, cy + s], [cx - s * 0.72, cy]], 0x5ce1d6, 0x0f5f68, 2);
        poly(g, [[cx, cy - s * 0.55], [cx + s * 0.3, cy], [cx, cy + s * 0.3], [cx - s * 0.3, cy]], 0xd9fffb, 0x0f5f68, 1);
    };
    bake(scene, 'twph-1', 40, 40, (g, w, h) => prismHead(g, w, h, 1));
    bake(scene, 'twph-2', 40, 42, (g, w, h) => prismHead(g, w, h, 2));
    bake(scene, 'twph-3', 40, 44, (g, w, h) => prismHead(g, w, h, 3));

    /* -------------------------------------------------------- arc coil x3 */
    /** Static coil body: hex base + copper rod. */
    const coilBody = (g: Phaser.GameObjects.Graphics, w: number, h: number, level: number): void => {
        const cx = w / 2;
        const baseY = h - 6;
        hexPlate(g, cx, baseY);
        // rod up to the emitter
        g.fillStyle(0xb9c3cf, 1);
        g.fillRect(cx - 3, 16, 6, baseY - 16);
        g.fillStyle(0x8e9aa8, 1);
        g.fillRect(cx + 1, 16, 2, baseY - 16);
        levelPips(g, cx, baseY, level);
    };
    bake(scene, 'twc-1', 40, 60, (g, w, h) => coilBody(g, w, h, 1));
    bake(scene, 'twc-2', 40, 64, (g, w, h) => coilBody(g, w, h, 2));
    bake(scene, 'twc-3', 40, 72, (g, w, h) => coilBody(g, w, h, 3));

    /** Rotating coil head: copper rings + charged orb. The ring stack is centred on the pivot. */
    const coilHead = (g: Phaser.GameObjects.Graphics, w: number, h: number, level: number): void => {
        const cx = w / 2;
        const pivotY = h * 0.62;
        const coils = 2 + level;
        // hub the rings spin around
        g.fillStyle(0x3a2a52, 1);
        g.fillCircle(cx, pivotY, 6);
        for (let i = 0; i < coils; i++) {
            const y = pivotY + (i - (coils - 1) / 2) * 7;
            const rx = 15 - i * 1.4;
            g.fillStyle(0x8f5216, 1);
            g.fillEllipse(cx, y, rx * 2, 8);
            g.fillStyle(0xc9772f, 1);
            g.fillEllipse(cx, y - 1, rx * 2 - 2, 6);
            g.fillStyle(0xf0a95a, 1);
            g.fillEllipse(cx, y - 1.5, rx - 2, 2.6);
        }
        const oy = pivotY - 16 - level * 1.5;
        g.fillStyle(0x6b4bb0, 1);
        g.fillCircle(cx, oy, 7 + level * 0.8);
        g.fillStyle(0xd9c8ff, 1);
        g.fillCircle(cx - 2, oy - 2.5, 3.2 + level * 0.4);
    };
    bake(scene, 'twch-1', 40, 55, (g, w, h) => coilHead(g, w, h, 1));
    bake(scene, 'twch-2', 40, 62, (g, w, h) => coilHead(g, w, h, 2));
    bake(scene, 'twch-3', 40, 69, (g, w, h) => coilHead(g, w, h, 3));

    /* ---------------------------------------------------------- relay core */
    bake(scene, 'core-base', 150, 110, (g, w, h) => {
        const cx = w / 2, cy = h - 12;
        // sand berm
        g.fillStyle(0xbf9153, 1);
        g.fillEllipse(cx, cy, 128, 34);
        // platform
        poly(g, [[cx - 56, cy], [cx - 38, cy - 16], [cx + 38, cy - 16], [cx + 56, cy], [cx + 38, cy + 12], [cx - 38, cy + 12]],
            0x4b5a6e, 0x27313d, 3);
        poly(g, [[cx - 38, cy - 14], [cx + 38, cy - 14], [cx + 30, cy - 4], [cx - 30, cy - 4]], 0x374456, 0x27313d, 2);
        // pylons
        g.fillStyle(0xdfe6ee, 1);
        g.fillRect(cx - 34, cy - 44, 7, 30);
        g.fillRect(cx + 27, cy - 44, 7, 30);
        g.fillStyle(0xb3bec9, 1);
        g.fillRect(cx - 30, cy - 44, 2, 30);
        g.fillRect(cx + 31, cy - 44, 2, 30);
        // mast
        g.fillStyle(0x9aa6b4, 1);
        g.fillRect(cx - 4, cy - 74, 8, 34);
        // energy band
        g.fillStyle(C.cyan, 0.55);
        g.fillRect(cx - 46, cy - 12, 92, 3);
    });

    bake(scene, 'core-dish', 84, 84, (g, w, h) => {
        const cx = w / 2, cy = h / 2 + 6;
        // mast
        g.fillStyle(0x93a0b0, 1);
        g.fillRect(cx - 3, cy - 6, 6, 26);
        g.fillStyle(0x6c7887, 1);
        g.fillRect(cx + 1, cy - 6, 2, 26);
        // parabolic bowl, tilted towards the sky
        const bowl = (rx: number, ry: number, dy: number, fill: number, stroke?: number) => {
            const pts = ellipsePts(cx, cy - 12 + dy, rx, ry, -0.45);
            g.fillStyle(fill, 1);
            g.fillPoints(pts, true);
            if (stroke !== undefined) {
                g.lineStyle(2, stroke, 1);
                g.strokePoints(pts, true);
            }
        };
        bowl(44, 26, 0, 0xdfe7f0, 0x64758a);
        bowl(33, 18, -2, 0xa9b7c6);
        bowl(19, 10, -3, 0x7f8fa0);
        // feed arm + horn
        g.lineStyle(3, 0x8b99a9, 1);
        g.lineBetween(cx + 2, cy - 16, cx + 20, cy - 40);
        g.fillStyle(C.amber, 1);
        g.fillCircle(cx + 20, cy - 40, 4);
        g.fillStyle(0xffe6a8, 0.85);
        g.fillCircle(cx + 20, cy - 40, 2);
    });

    /* ------------------------------------------------------- solar panel decor */
    bake(scene, 'decor-panel', 72, 44, (g, w, h) => {
        g.fillStyle(0x2f4a6b, 1);
        g.fillRect(4, 6, w - 8, h - 14);
        g.fillStyle(0x4f7cb0, 1);
        g.fillRect(7, 9, w - 14, h - 20);
        g.lineStyle(1, 0x2a3f5c, 1);
        for (let x = 12; x < w - 10; x += 12) g.lineBetween(x, 9, x, h - 11);
        g.lineBetween(7, (h - 11) / 2 + 4, w - 7, (h - 11) / 2 + 4);
        g.fillStyle(0x8a7457, 1);
        g.fillRect(w / 2 - 3, h - 8, 6, 8);
    });

    bake(scene, 'decor-cactus', 40, 66, (g, w, h) => {
        g.fillStyle(C.cactusDark, 1);
        g.fillRect(w / 2 - 5, 10, 10, h - 14);
        g.fillRect(w / 2 - 18, 26, 8, 24);
        g.fillRect(w / 2 - 18, 26, 12, 8);
        g.fillRect(w / 2 + 10, 34, 8, 20);
        g.fillRect(w / 2 + 4, 34, 14, 8);
        g.fillStyle(C.cactus, 1);
        g.fillRect(w / 2 - 4, 12, 4, h - 16);
    });

    bake(scene, 'decor-rock', 40, 30, (g, w, h) => {
        g.fillStyle(C.rockDark, 1);
        g.fillEllipse(w / 2, h - 6, w - 6, 18);
        g.fillStyle(C.rock, 1);
        g.fillEllipse(w / 2 - 2, h - 9, w - 14, 13);
        g.fillStyle(0xc2a077, 1);
        g.fillEllipse(w / 2 - 6, h - 12, 8, 5);
    });
}
