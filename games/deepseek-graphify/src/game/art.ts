import { Enemy, Pad, PATH, RELAY, Tower, Vec } from './types';

let seed = 90210;
function rnd(): number {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
}

function lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
}

function octagon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, rot = Math.PI / 8): void {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = rot + (i * Math.PI) / 4;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
    }
    g.closePath();
}

function poly(g: Phaser.GameObjects.Graphics, pts: Vec[]): void {
    g.beginPath();
    pts.forEach((p, i) => (i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y)));
    g.closePath();
}

function drawPanelArray(g: Phaser.GameObjects.Graphics, x: number, y: number, cols: number, rows: number): void {
    const cw = 54, ch = 30, gap = 5;
    // ground shadow
    g.fillStyle(0x7c5b36, 0.16);
    g.fillRoundedRect(x - 10, y - 6, cols * (cw + gap) + 10, rows * (ch + gap) + 12, 12);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const px = x + c * (cw + gap);
            const py = y + r * (ch + gap);
            g.fillStyle(0x8f6a3e, 0.55);
            g.fillRect(px + 2, py + 5, cw, ch);
            g.fillStyle(0x2f5966, 1);
            g.fillRect(px, py, cw, ch);
            g.fillStyle(0x3f7c8a, 1);
            g.fillRect(px + 3, py + 3, cw - 6, ch - 6);
            g.fillStyle(0x9ed7d4, 0.28);
            g.fillTriangle(px + 4, py + 4, px + 26, py + 4, px + 4, py + ch - 5);
            g.lineStyle(1, 0x1d3b42, 0.75);
            g.lineBetween(px + cw / 2, py, px + cw / 2, py + ch);
            g.lineBetween(px, py + ch / 2, px + cw, py + ch / 2);
        }
    }
}

function drawRock(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    g.fillStyle(0x8a6740, 0.22);
    g.fillEllipse(x + s * 0.18, y + s * 0.28, s * 1.5, s * 0.7);
    poly(g, [
        { x: x - s, y: y + s * 0.4 },
        { x: x - s * 0.7, y: y - s * 0.35 },
        { x: x - s * 0.1, y: y - s * 0.75 },
        { x: x + s * 0.65, y: y - s * 0.4 },
        { x: x + s, y: y + s * 0.35 },
        { x: x + s * 0.25, y: y + s * 0.65 },
    ]);
    g.fillStyle(0x9b7a55, 1);
    g.fillPath();
    poly(g, [
        { x: x - s * 0.7, y: y - s * 0.35 },
        { x: x - s * 0.1, y: y - s * 0.75 },
        { x: x + s * 0.2, y: y - s * 0.05 },
        { x: x - s * 0.45, y: y + s * 0.2 },
    ]);
    g.fillStyle(0xbf9d70, 0.9);
    g.fillPath();
    g.lineStyle(2, 0x6f5235, 0.4);
    g.lineBetween(x - s * 0.7, y + s * 0.05, x + s * 0.55, y + s * 0.2);
}

function drawScrub(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    g.lineStyle(2, 0x8a7a42, 0.75);
    for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.3;
        g.lineBetween(x, y, x + Math.cos(a) * s, y + Math.sin(a) * s);
    }
    g.fillStyle(0xb09b55, 0.7);
    g.fillCircle(x, y - s * 0.35, s * 0.22);
}

function drawCactus(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    g.fillStyle(0x7b5c38, 0.2);
    g.fillEllipse(x + 5, y + 4, s * 1.1, s * 0.35);
    g.fillStyle(0x5f7d45, 1);
    g.fillRoundedRect(x - s * 0.13, y - s * 1.1, s * 0.26, s * 1.15, s * 0.13);
    g.fillRoundedRect(x - s * 0.55, y - s * 0.55, s * 0.42, s * 0.18, s * 0.09);
    g.fillRoundedRect(x - s * 0.55, y - s * 0.9, s * 0.16, s * 0.55, s * 0.08);
    g.fillRoundedRect(x + s * 0.18, y - s * 0.4, s * 0.38, s * 0.16, s * 0.08);
    g.fillRoundedRect(x + s * 0.4, y - s * 0.7, s * 0.16, s * 0.45, s * 0.08);
    g.lineStyle(1, 0x91ab6c, 0.5);
    g.lineBetween(x - s * 0.05, y - s * 1.02, x - s * 0.05, y - s * 0.2);
}

export function drawBackground(g: Phaser.GameObjects.Graphics): void {
    seed = 90210;
    const top = 0xf5dda4;
    const bottom = 0xdfb26d;
    const bands = 40;
    for (let i = 0; i < bands; i++) {
        g.fillStyle(lerpColor(top, bottom, i / (bands - 1)), 1);
        g.fillRect(0, (800 / bands) * i, 1280, 800 / bands + 1);
    }

    // Broad dune sweeps.
    for (let i = 0; i < 9; i++) {
        g.fillStyle(i % 2 ? 0xf8e6b8 : 0xc9985c, 0.07 + rnd() * 0.05);
        g.fillEllipse(120 + rnd() * 1100, 90 + rnd() * 660, 380 + rnd() * 520, 90 + rnd() * 150);
    }
    g.lineStyle(2, 0xf9e9bd, 0.13);
    for (let i = 0; i < 7; i++) {
        const y = 120 + i * 94;
        g.beginPath();
        for (let x = -40; x <= 1320; x += 20) {
            const yy = y + Math.sin(x * 0.004 + i) * 24;
            if (x === -40) g.moveTo(x, yy);
            else g.lineTo(x, yy);
        }
        g.strokePath();
    }

    // Sand grain.
    for (let i = 0; i < 900; i++) {
        const x = rnd() * 1280;
        const y = rnd() * 800;
        g.fillStyle(rnd() > 0.5 ? 0x8a6638 : 0xfff1c7, 0.05 + rnd() * 0.08);
        g.fillCircle(x, y, 0.7 + rnd() * 1.5);
    }

    // Outpost solar fields.
    drawPanelArray(g, 34, 104, 3, 2);
    drawPanelArray(g, 48, 704, 3, 2);
    drawPanelArray(g, 1082, 690, 3, 2);
    drawPanelArray(g, 26, 356, 2, 2);

    // Rocks and desert planting.
    drawRock(g, 298, 110, 30);
    drawRock(g, 1020, 92, 24);
    drawRock(g, 112, 570, 18);
    drawRock(g, 900, 704, 26);
    drawRock(g, 640, 126, 14);
    drawCactus(g, 512, 172, 26);
    drawCactus(g, 1102, 596, 20);
    drawCactus(g, 92, 268, 17);
    drawScrub(g, 238, 262, 16);
    drawScrub(g, 716, 700, 14);
    drawScrub(g, 984, 330, 13);
    drawScrub(g, 388, 640, 12);
    drawScrub(g, 1196, 452, 15);
    drawScrub(g, 770, 130, 12);

    // Relay apron and trail to the core.
    g.fillStyle(0x6f5a3f, 0.18);
    g.fillEllipse(RELAY.x + 10, RELAY.y + 18, 210, 170);
    g.fillStyle(0xd2bd91, 1);
    g.fillCircle(RELAY.x, RELAY.y, 82);
    g.lineStyle(3, 0xb59a6d, 0.9);
    g.strokeCircle(RELAY.x, RELAY.y, 82);
    g.lineStyle(1, 0xf6e6bc, 0.7);
    g.strokeCircle(RELAY.x, RELAY.y, 70);
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.lineStyle(2, 0x9f855c, 0.55);
        g.lineBetween(
            RELAY.x + Math.cos(a) * 70, RELAY.y + Math.sin(a) * 70,
            RELAY.x + Math.cos(a) * 82, RELAY.y + Math.sin(a) * 82
        );
    }

    // Winding supply road.
    const drawRoad = (width: number, color: number, alpha: number) => {
        g.lineStyle(width, color, alpha);
        g.beginPath();
        g.moveTo(PATH[0].x, PATH[0].y);
        for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
        g.strokePath();
        for (let i = 1; i < PATH.length - 1; i++) {
            g.fillStyle(color, alpha);
            g.fillCircle(PATH[i].x, PATH[i].y, width / 2);
        }
    };
    drawRoad(86, 0xb98a51, 0.55);
    drawRoad(72, 0xd9ae6d, 1);
    drawRoad(58, 0xe7c489, 1);
    g.lineStyle(2, 0xf6dda9, 0.5);
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y);
    g.strokePath();

    // Road pebbles.
    for (let i = 0; i < 130; i++) {
        const d = rnd() * 2050;
        const p = pointOnPath(d);
        const off = (rnd() - 0.5) * 48;
        g.fillStyle(rnd() > 0.5 ? 0xc49a5f : 0xf3d69d, 0.4);
        g.fillCircle(p.x + Math.cos(p.angle + Math.PI / 2) * off, p.y + Math.sin(p.angle + Math.PI / 2) * off, 1 + rnd() * 2);
    }

    // Direction chevrons.
    for (let d = 110; d < 1980; d += 96) {
        const p = pointOnPath(d);
        const c = Math.cos(p.angle), s = Math.sin(p.angle);
        const nx = -s, ny = c;
        g.fillStyle(0xa97b45, 0.33);
        g.fillTriangle(
            p.x + c * 12, p.y + s * 12,
            p.x - c * 7 + nx * 10, p.y - s * 7 + ny * 10,
            p.x - c * 7 - nx * 10, p.y - s * 7 - ny * 10
        );
    }
}

export function pointOnPath(dist: number): { x: number; y: number; angle: number } {
    let remaining = dist;
    for (let i = 1; i < PATH.length; i++) {
        const a = PATH[i - 1], b = PATH[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (remaining <= len || i === PATH.length - 1) {
            const t = Math.max(0, Math.min(1, remaining / len));
            return {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                angle: Math.atan2(b.y - a.y, b.x - a.x),
            };
        }
        remaining -= len;
    }
    return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y, angle: 0 };
}

export function drawRelay(g: Phaser.GameObjects.Graphics, time: number, integrity: number): void {
    const { x, y } = RELAY;
    const pulse = 0.5 + Math.sin(time * 2.4) * 0.5;
    const danger = 1 - Math.max(0, Math.min(1, integrity / 100));

    // shadow
    g.fillStyle(0x5d4327, 0.25);
    g.fillEllipse(x + 9, y + 14, 130, 70);
    // base
    octagon(g, x, y, 58, Math.PI / 8);
    g.fillStyle(0x5b5447, 1);
    g.fillPath();
    octagon(g, x, y, 50, Math.PI / 8);
    g.fillStyle(0x8f7a5c, 1);
    g.fillPath();
    octagon(g, x, y, 38, Math.PI / 8);
    g.fillStyle(0x3f4a46, 1);
    g.fillPath();

    // solar petals
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const px = x + Math.cos(a) * 48;
        const py = y + Math.sin(a) * 48;
        g.save();
        g.translateCanvas(px, py);
        g.rotateCanvas(a);
        g.fillStyle(0x7a5a33, 0.5);
        g.fillRect(-9, -6, 30, 22);
        g.fillStyle(0x2e5964, 1);
        g.fillRect(-11, -8, 28, 18);
        g.fillStyle(0x4d8c95, 1);
        g.fillRect(-8, -5, 22, 12);
        g.fillStyle(0xb8e3da, 0.35);
        g.fillTriangle(-8, -5, 3, -5, -8, 6);
        g.restore();
    }

    // pylon
    g.fillStyle(0x2d3532, 1);
    g.fillCircle(x, y, 26);
    g.lineStyle(4, 0xb99a64, 1);
    g.strokeCircle(x, y, 26);
    g.lineStyle(2, 0xf2c96c, 0.9);
    g.strokeCircle(x, y, 20);
    // central collector
    g.fillStyle(0xf2b64b, 0.18 + pulse * 0.1);
    g.fillCircle(x, y, 30 + pulse * 7);
    g.fillStyle(0xffe9a8, 0.9);
    g.fillCircle(x, y, 12);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(x - 3, y - 3, 5);

    // beams from petals toward core
    g.lineStyle(2, 0xffd678, 0.35 + pulse * 0.2);
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.lineBetween(x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a) * 14, y + Math.sin(a) * 14);
    }

    // integrity arc
    g.lineStyle(4, 0x3b2f23, 0.5);
    g.strokeCircle(x, y, 66);
    g.lineStyle(4, danger > 0.55 ? 0xd75b45 : 0x7fd6c9, 0.95);
    g.beginPath();
    g.arc(x, y, 66, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(0, integrity)) / 100, false);
    g.strokePath();
}

export function drawPad(g: Phaser.GameObjects.Graphics, pad: Pad, hover: boolean, selected: boolean, time: number): void {
    const r = 31;
    g.fillStyle(0x6a5235, 0.25);
    g.fillEllipse(pad.x + 3, pad.y + 7, 66, 30);
    octagon(g, pad.x, pad.y, r, Math.PI / 8);
    g.fillStyle(pad.tower ? 0x9e8a66 : 0xc8b58f, 1);
    g.fillPath();
    octagon(g, pad.x, pad.y, r - 5, Math.PI / 8);
    g.fillStyle(pad.tower ? 0x88795d : 0xdac9a3, 1);
    g.fillPath();
    g.lineStyle(2, 0x7c6544, 0.8);
    octagon(g, pad.x, pad.y, r, Math.PI / 8);
    g.strokePath();
    g.lineStyle(1, 0xf3e4bd, 0.7);
    octagon(g, pad.x, pad.y, r - 5, Math.PI / 8);
    g.strokePath();

    if (!pad.tower) {
        const glow = 0.45 + Math.sin(time * 3 + pad.index) * 0.2;
        g.lineStyle(2, 0xffd678, glow);
        g.lineBetween(pad.x - 8, pad.y, pad.x + 8, pad.y);
        g.lineBetween(pad.x, pad.y - 8, pad.x, pad.y + 8);
        g.fillStyle(0xffd678, glow * 0.12);
        g.fillCircle(pad.x, pad.y, 20);
    }
    if (hover || selected) {
        const color = selected ? 0xffd166 : 0xffedb0;
        g.lineStyle(selected ? 3 : 2, color, 0.95);
        octagon(g, pad.x, pad.y, r + 5, Math.PI / 8);
        g.strokePath();
        g.fillStyle(color, 0.08);
        g.fillCircle(pad.x, pad.y, r + 9);
    }
}

export function drawTower(g: Phaser.GameObjects.Graphics, tower: Tower, time: number): void {
    const { x, y } = tower.pad;
    const lvl = tower.level;
    const aim = tower.angle;
    const flash = tower.flash;

    g.fillStyle(0x4d3b26, 0.28);
    g.fillEllipse(x + 5, y + 9, 52, 22);

    if (tower.type === 'sunspear') {
        // dark plinth with brass trim
        octagon(g, x, y, 24, Math.PI / 8);
        g.fillStyle(0x34433f, 1);
        g.fillPath();
        octagon(g, x, y, 19, Math.PI / 8);
        g.fillStyle(0x7e6b4c, 1);
        g.fillPath();
        g.lineStyle(2, 0xe0b05b, 0.9);
        octagon(g, x, y, 24, Math.PI / 8);
        g.strokePath();

        // rotor and mirror-lance
        const dx = Math.cos(aim), dy = Math.sin(aim);
        g.lineStyle(9, 0x2b3634, 1);
        g.lineBetween(x, y, x + dx * 27, y + dy * 27);
        g.lineStyle(4, 0xf0b64c, 1);
        g.lineBetween(x, y, x + dx * 30, y + dy * 30);
        if (lvl >= 3) {
            const nx = -dy, ny = dx;
            g.lineStyle(3, 0xffd678, 1);
            g.lineBetween(x + nx * 4, y + ny * 4, x + dx * 30 + nx * 4, y + dy * 30 + ny * 4);
            g.lineBetween(x - nx * 4, y - ny * 4, x + dx * 30 - nx * 4, y + dy * 30 - ny * 4);
        }
        // dish at the tip
        g.fillStyle(0x3a4642, 1);
        g.fillCircle(x + dx * 30, y + dy * 30, 10 + lvl);
        g.fillStyle(0xffd166, 1);
        g.fillCircle(x + dx * 30, y + dy * 30, 6 + lvl * 0.7);
        g.fillStyle(0xfff3c4, 0.95);
        g.fillCircle(x + dx * 30 - 2, y + dy * 30 - 2, 2.5);
        // collector fins
        g.fillStyle(0xb78c45, 0.9);
        for (let i = 0; i < 3; i++) {
            const a = aim + Math.PI * 0.55 + i * 0.22;
            g.fillTriangle(
                x + Math.cos(a) * 8, y + Math.sin(a) * 8,
                x + Math.cos(a) * 19, y + Math.sin(a) * 19,
                x + Math.cos(a + 0.16) * 19, y + Math.sin(a + 0.16) * 19
            );
        }
        g.fillStyle(0xfff0b0, 0.5 + Math.sin(time * 6) * 0.2 + flash);
        g.fillCircle(x + dx * 30, y + dy * 30, 10 + lvl * 1.5);
        // level dots
        for (let i = 0; i < lvl; i++) {
            g.fillStyle(0xffe08a, 1);
            g.fillCircle(x - 8 + i * 8, y + 17, 2.5);
        }
    } else {
        // Arc pylon: square teal keep with two prongs
        g.save();
        g.translateCanvas(x, y);
        g.rotateCanvas(0.78);
        g.fillStyle(0x273f3c, 1);
        g.fillRect(-20, -20, 40, 40);
        g.fillStyle(0x35625b, 1);
        g.fillRect(-15, -15, 30, 30);
        g.lineStyle(2, 0x6ec9bb, 0.9);
        g.strokeRect(-20, -20, 40, 40);
        g.restore();

        const wobble = Math.sin(time * 9) * 0.08;
        const a1 = -1.15 + wobble, a2 = -1.99 - wobble;
        g.lineStyle(5, 0x1f302e, 1);
        g.lineBetween(x - 7, y - 4, x + Math.cos(a1) * 26, y + Math.sin(a1) * 26);
        g.lineBetween(x + 7, y - 4, x + Math.cos(a2) * 26, y + Math.sin(a2) * 26);
        g.lineStyle(2, 0x75d9c9, 1);
        g.lineBetween(x - 7, y - 4, x + Math.cos(a1) * 26, y + Math.sin(a1) * 26);
        g.lineBetween(x + 7, y - 4, x + Math.cos(a2) * 26, y + Math.sin(a2) * 26);
        g.fillStyle(0x8ff0df, 0.9);
        g.fillCircle(x + Math.cos(a1) * 26, y + Math.sin(a1) * 26, 3.5);
        g.fillCircle(x + Math.cos(a2) * 26, y + Math.sin(a2) * 26, 3.5);

        // coil rings and orb
        g.lineStyle(2, 0x6ec9bb, 0.6);
        g.strokeCircle(x, y, 17);
        g.strokeCircle(x, y, 12);
        g.fillStyle(0x0e2422, 1);
        g.fillCircle(x, y, 11);
        g.fillStyle(0x52e0ce, 0.25 + flash);
        g.fillCircle(x, y, 18 + lvl * 2);
        g.fillStyle(0xbffcf1, 1);
        g.fillCircle(x, y, 6.5);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(x - 1.5, y - 1.5, 2.5);

        // crackle
        g.lineStyle(1.5, 0x9ff7e7, 0.5 + Math.sin(time * 11) * 0.3);
        for (let i = 0; i < 3; i++) {
            const a = time * 3 + i * 2.1;
            g.lineBetween(x + Math.cos(a) * 8, y + Math.sin(a) * 8, x + Math.cos(a + 0.4) * (16 + lvl * 2), y + Math.sin(a + 0.4) * (16 + lvl * 2));
        }
        for (let i = 0; i < lvl; i++) {
            g.fillStyle(0x9ff7e7, 1);
            g.fillCircle(x - 8 + i * 8, y + 19, 2.5);
        }
    }
}

export function drawEnemy(g: Phaser.GameObjects.Graphics, e: Enemy, time: number): void {
    const t = time * 8 + e.phase;
    g.save();
    g.translateCanvas(e.x, e.y);
    g.rotateCanvas(e.angle);
    g.fillStyle(0x5a4028, 0.26);
    g.fillEllipse(3, 7, e.type === 'boss' ? 62 : e.type === 'brute' ? 42 : 28, 16);

    switch (e.type) {
        case 'scarab': {
            const leg = Math.sin(t) * 3;
            g.lineStyle(2, 0x3e2018, 1);
            for (let i = -1; i <= 1; i++) {
                g.lineBetween(i * 5, -4, i * 5 - 5, -10 - leg);
                g.lineBetween(i * 5, 4, i * 5 - 5, 10 + leg);
            }
            g.fillStyle(0x6d2b21, 1);
            g.fillEllipse(0, 0, 20, 15);
            g.fillStyle(0xb64832, 1);
            g.fillEllipse(1, -1, 15, 10);
            g.lineStyle(1.5, 0x3b1712, 0.9);
            g.lineBetween(-4, -5, -4, 5);
            g.fillStyle(0xf0a05a, 0.9);
            g.fillCircle(7, -2, 1.6);
            g.fillCircle(7, 2, 1.6);
            break;
        }
        case 'crawler': {
            const leg = Math.sin(t * 0.8) * 4;
            g.lineStyle(3, 0x4d2e18, 1);
            for (let i = -1; i <= 1; i++) {
                g.lineBetween(i * 6, -6, i * 6 - 7, -14 - leg);
                g.lineBetween(i * 6, 6, i * 6 - 7, 14 + leg);
            }
            g.fillStyle(0x7a4424, 1);
            g.fillEllipse(0, 0, 28, 21);
            g.fillStyle(0xb06a33, 1);
            g.fillEllipse(2, -1, 22, 16);
            g.lineStyle(2, 0x5b321b, 0.85);
            g.lineBetween(-3, -7, -3, 7);
            g.lineBetween(3, -6, 3, 6);
            g.fillStyle(0xe3b06c, 0.9);
            g.fillCircle(10, 0, 3);
            break;
        }
        case 'skimmer': {
            g.fillStyle(0x244a4c, 1);
            g.fillEllipse(0, 0, 26, 20);
            g.fillStyle(0x3c8f8a, 1);
            g.fillEllipse(1, -1, 20, 14);
            g.fillStyle(0x9ef0e4, 0.9);
            g.fillCircle(8, 0, 3);
            g.lineStyle(2, 0x1b3838, 1);
            g.lineBetween(-8, -9, -15, -13);
            g.lineBetween(-8, 9, -15, 13);
            g.lineStyle(2, 0xcffcf5, 0.7 + Math.sin(t * 3) * 0.2);
            g.strokeEllipse(-14, -13, 14, 5);
            g.strokeEllipse(-14, 13, 14, 5);
            g.fillStyle(0x9ef0e4, 0.18);
            g.fillCircle(-2, 0, 18);
            break;
        }
        case 'brute': {
            const bob = Math.sin(t * 0.4) * 1.5;
            g.fillStyle(0x4a3145, 1);
            g.fillEllipse(0, bob, 42, 34);
            poly(g, [
                { x: -20, y: -6 + bob }, { x: -10, y: -20 + bob }, { x: 6, y: -22 + bob },
                { x: 21, y: -8 + bob }, { x: 18, y: 12 + bob }, { x: 0, y: 20 + bob }, { x: -17, y: 13 + bob },
            ]);
            g.fillStyle(0x6f4d63, 1);
            g.fillPath();
            poly(g, [
                { x: -12, y: -12 + bob }, { x: 4, y: -17 + bob }, { x: 10, y: -5 + bob }, { x: -6, y: 1 + bob },
            ]);
            g.fillStyle(0x8f6680, 0.9);
            g.fillPath();
            g.lineStyle(2, 0xc09a55, 0.9);
            g.lineBetween(-14, -3 + bob, 13, -1 + bob);
            g.lineBetween(-10, 9 + bob, 9, 10 + bob);
            g.fillStyle(0xffb45c, 0.95);
            g.fillCircle(15, 0 + bob, 3.2);
            break;
        }
        case 'boss': {
            const bob = Math.sin(t * 0.25) * 2;
            g.fillStyle(0x341820, 0.9);
            g.fillCircle(0, 0, 34);
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                g.fillStyle(0x7b2f39, 1);
                g.fillTriangle(
                    Math.cos(a) * 24, Math.sin(a) * 24,
                    Math.cos(a + 0.18) * 41, Math.sin(a + 0.18) * 41,
                    Math.cos(a - 0.18) * 41, Math.sin(a - 0.18) * 41
                );
            }
            g.fillStyle(0x5c2530, 1);
            g.fillEllipse(0, bob, 56, 44);
            g.fillStyle(0x8c3a43, 1);
            g.fillEllipse(2, -2 + bob, 40, 30);
            g.fillStyle(0x2a1118, 1);
            g.fillCircle(0, bob, 14);
            g.fillStyle(0xff7a4a, 0.55 + Math.sin(t * 0.9) * 0.2);
            g.fillCircle(0, bob, 17);
            g.fillStyle(0xffd08a, 1);
            g.fillCircle(0, bob, 8);
            g.lineStyle(2, 0xffc76a, 0.9);
            g.lineBetween(-26, -10 + bob, -12, -4 + bob);
            g.lineBetween(-26, 10 + bob, -12, 4 + bob);
            g.lineBetween(26, -10 + bob, 12, -4 + bob);
            g.lineBetween(26, 10 + bob, 12, 4 + bob);
            break;
        }
    }
    g.restore();

    // health bar (screen aligned)
    if (e.hp < e.maxHp) {
        const w = e.type === 'boss' ? 76 : e.type === 'brute' ? 46 : 30;
        const y = e.y - (e.type === 'boss' ? 52 : e.type === 'brute' ? 34 : 24);
        g.fillStyle(0x2b1d17, 0.7);
        g.fillRoundedRect(e.x - w / 2, y, w, 5, 2.5);
        const pct = Math.max(0, e.hp / e.maxHp);
        const color = pct > 0.55 ? 0x9fd36b : pct > 0.25 ? 0xffc857 : 0xff6b55;
        g.fillStyle(color, 1);
        g.fillRoundedRect(e.x - w / 2 + 1, y + 1, Math.max(2, (w - 2) * pct), 3, 1.5);
    }
}

export function drawHealthBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, pct: number, color: number): void {
    g.fillStyle(0x1d2624, 0.85);
    g.fillRoundedRect(x, y, w, h, h / 2);
    g.fillStyle(color, 1);
    g.fillRoundedRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, pct))), h - 2, (h - 2) / 2);
}
