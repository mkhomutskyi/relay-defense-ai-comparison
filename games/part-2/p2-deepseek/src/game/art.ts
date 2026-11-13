import type { Scene } from 'phaser';
import { PATH, PADS, RELAY_POS, MAP_WIDTH, MAP_HEIGHT } from './path';

function makeTexture(scene: Scene, key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
    if (scene.textures.exists(key)) return;
    const texture = scene.textures.createCanvas(key, width, height);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, width, height);
    draw(ctx);
    texture.refresh();
}

function rng(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, seed: number): void {
    const r = rng(seed);
    ctx.save();
    ctx.translate(x, y);
    // soft shadow
    ctx.fillStyle = 'rgba(93, 52, 30, 0.18)';
    ctx.beginPath();
    ctx.ellipse(10 * s, 16 * s, 56 * s, 26 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    const pts: [number, number][] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rad = (34 + r() * 22) * s;
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.72 - 10 * s]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = '#B96842';
    ctx.fill();
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = '#8A472B';
    ctx.stroke();

    // sunlit top face
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * 0.86, pts[0][1] * 0.86 - 8 * s);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * 0.86, pts[i][1] * 0.86 - 8 * s);
    ctx.closePath();
    ctx.fillStyle = '#D98A5A';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 226, 176, 0.35)';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    // cracks
    ctx.strokeStyle = 'rgba(91, 44, 26, 0.5)';
    ctx.lineWidth = 1.4 * s;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const px = (r() - 0.5) * 40 * s;
        const py = (r() - 0.5) * 20 * s;
        ctx.moveTo(px, py);
        ctx.lineTo(px + 10 * s, py + 8 * s);
        ctx.lineTo(px + 4 * s, py + 17 * s);
        ctx.stroke();
    }
    ctx.restore();
}

function drawSolarFarm(ctx: CanvasRenderingContext2D, x: number, y: number, rows: number, cols: number, tilt: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const px = col * 46;
            const py = row * 34;
            ctx.fillStyle = 'rgba(74, 44, 25, 0.16)';
            ctx.beginPath();
            ctx.ellipse(px + 22, py + 24, 21, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#123F43';
            roundRect(ctx, px, py, 40, 26, 3);
            ctx.fill();
            ctx.fillStyle = '#1D6C6C';
            roundRect(ctx, px + 2, py + 2, 36, 22, 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(126, 228, 214, 0.45)';
            ctx.lineWidth = 1;
            for (let i = 1; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(px + 2 + i * 9, py + 2);
                ctx.lineTo(px + 2 + i * 9, py + 24);
                ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(8, 36, 39, 0.65)';
            ctx.beginPath();
            ctx.moveTo(px + 2, py + 13);
            ctx.lineTo(px + 38, py + 13);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 244, 220, 0.5)';
            ctx.fillRect(px + 2, py + 2, 36, 2);
        }
    }
    ctx.restore();
}

function drawTent(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(80, 48, 28, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 10 * s, 32 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F4E2BC';
    ctx.beginPath();
    ctx.moveTo(-28 * s, 8 * s);
    ctx.lineTo(0, -22 * s);
    ctx.lineTo(28 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#B58A5C';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    ctx.fillStyle = '#C86C44';
    ctx.beginPath();
    ctx.moveTo(-8 * s, 8 * s);
    ctx.lineTo(0, -22 * s);
    ctx.lineTo(8 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7A4B2C';
    ctx.beginPath();
    ctx.moveTo(-6 * s, 8 * s);
    ctx.lineTo(0, -2 * s);
    ctx.lineTo(6 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawPath(ctx: CanvasRenderingContext2D): void {
    const trace = () => {
        ctx.beginPath();
        ctx.moveTo(PATH[0].x, PATH[0].y);
        for (let i = 1; i < PATH.length; i++) ctx.lineTo(PATH[i].x, PATH[i].y);
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    trace();
    ctx.strokeStyle = 'rgba(92, 55, 32, 0.18)';
    ctx.lineWidth = 76;
    ctx.stroke();

    trace();
    ctx.strokeStyle = '#A9683F';
    ctx.lineWidth = 60;
    ctx.stroke();

    trace();
    ctx.strokeStyle = '#D7A063';
    ctx.lineWidth = 48;
    ctx.stroke();

    trace();
    ctx.strokeStyle = '#E4B578';
    ctx.lineWidth = 38;
    ctx.stroke();

    // Wheel ruts
    ctx.setLineDash([14, 18]);
    ctx.lineDashOffset = 4;
    trace();
    ctx.strokeStyle = 'rgba(128, 80, 45, 0.28)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    // small stones and track studs
    const r = rng(991);
    for (let i = 0; i < PATH.length; i += 8) {
        const p = PATH[i];
        const side = i % 16 === 0 ? 1 : -1;
        const nx = Math.cos(p.angle + Math.PI / 2) * (30 + r() * 5) * side;
        const ny = Math.sin(p.angle + Math.PI / 2) * (30 + r() * 5) * side;
        ctx.fillStyle = 'rgba(255, 235, 190, 0.35)';
        ctx.beginPath();
        ctx.arc(p.x + nx, p.y + ny, 1.8 + r() * 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Relay foundation
    ctx.save();
    ctx.translate(RELAY_POS.x, RELAY_POS.y);
    ctx.fillStyle = 'rgba(87, 52, 31, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 88, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C9A77C';
    ctx.beginPath();
    ctx.arc(0, 0, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8C6A4A';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = '#6FE3D6';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 9]);
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255, 244, 220, 0.35)';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 68, Math.sin(a) * 68, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Entry gate pylons
    for (const [gx, gy] of [[6, 330], [10, 438]] as [number, number][]) {
        ctx.save();
        ctx.translate(gx, gy);
        ctx.fillStyle = '#7A4B2C';
        roundRect(ctx, -12, -30, 24, 60, 5);
        ctx.fill();
        ctx.fillStyle = '#E6C28C';
        roundRect(ctx, -8, -26, 16, 52, 3);
        ctx.fill();
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#C65B38' : '#F0D6A6';
            ctx.fillRect(-8, -22 + i * 12, 16, 6);
        }
        ctx.restore();
    }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    grad.addColorStop(0, '#F3D79B');
    grad.addColorStop(0.5, '#EAC183');
    grad.addColorStop(1, '#DDA968');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Broad dune bands
    const r = rng(20261113);
    ctx.save();
    for (let i = 0; i < 9; i++) {
        const y = 90 + i * 72;
        ctx.beginPath();
        ctx.moveTo(-50, y);
        for (let x = -50; x <= MAP_WIDTH + 60; x += 80) {
            const yy = y + Math.sin((x + i * 60) / 190) * 24 + (r() - 0.5) * 12;
            ctx.lineTo(x, yy);
        }
        ctx.lineTo(MAP_WIDTH + 60, y + 100);
        ctx.lineTo(-50, y + 100);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 238, 196, 0.10)' : 'rgba(172, 111, 60, 0.055)';
        ctx.fill();
    }
    ctx.restore();

    // Fine sand speckle
    for (let i = 0; i < 4200; i++) {
        const x = r() * MAP_WIDTH;
        const y = r() * MAP_HEIGHT;
        ctx.fillStyle = r() > 0.5 ? 'rgba(255, 243, 208, 0.16)' : 'rgba(150, 93, 49, 0.10)';
        ctx.fillRect(x, y, 1 + r() * 1.6, 1 + r() * 1.2);
    }

    // Solar farms
    drawSolarFarm(ctx, 78, 116, 3, 4, -0.06);
    drawSolarFarm(ctx, 470, 92, 2, 4, 0.04);
    drawSolarFarm(ctx, 1030, 480, 3, 4, 0.08);
    drawSolarFarm(ctx, 720, 92, 2, 3, -0.03);
    drawSolarFarm(ctx, 250, 560, 2, 4, 0.05);

    // Outpost tents
    drawTent(ctx, 1078, 540, 0.9);
    drawTent(ctx, 1164, 470, 0.72);
    drawTent(ctx, 330, 570, 0.65);
    drawTent(ctx, 70, 520, 0.8);

    // Rock mesas
    drawRock(ctx, 40, 600, 1.25, 11);
    drawRock(ctx, 345, 105, 1.0, 23);
    drawRock(ctx, 1185, 612, 1.15, 37);
    drawRock(ctx, 1005, 118, 0.9, 41);
    drawRock(ctx, 210, 610, 0.85, 53);
    drawRock(ctx, 610, 615, 0.8, 67);

    // Antenna masts
    for (const [ax, ay] of [[1190, 400], [1020, 590]] as [number, number][]) {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.strokeStyle = '#6E452B';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 14);
        ctx.lineTo(0, -34);
        ctx.stroke();
        ctx.fillStyle = '#F2A33C';
        ctx.beginPath();
        ctx.arc(0, -36, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(110, 69, 43, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 6);
        ctx.lineTo(0, -12);
        ctx.lineTo(10, 6);
        ctx.stroke();
        ctx.restore();
    }

    // Sun-warmed vignette
    const vign = ctx.createRadialGradient(MAP_WIDTH * 0.52, MAP_HEIGHT * 0.48, 180, MAP_WIDTH * 0.52, MAP_HEIGHT * 0.48, 760);
    vign.addColorStop(0, 'rgba(255, 246, 214, 0)');
    vign.addColorStop(1, 'rgba(128, 72, 32, 0.20)');
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    drawPath(ctx);
}

function drawPad(ctx: CanvasRenderingContext2D): void {
    const w = 92;
    const c = w / 2;
    ctx.fillStyle = 'rgba(78, 46, 26, 0.22)';
    ctx.beginPath();
    ctx.ellipse(c, c + 8, 37, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9A704C';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
        const px = c + Math.cos(a) * 38;
        const py = c + Math.sin(a) * 38;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6B4A30';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#DCC08D';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
        const px = c + Math.cos(a) * 32;
        const py = c + Math.sin(a) * 32;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#2C6E6A';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.arc(c, c, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#2C6E6A';
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * 27, c + Math.sin(a) * 27, 2.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.beginPath();
    ctx.arc(c - 8, c - 10, 13, 0, Math.PI * 2);
    ctx.fill();
}

function drawLanceBase(ctx: CanvasRenderingContext2D): void {
    const c = 36;
    ctx.fillStyle = 'rgba(62, 40, 24, 0.24)';
    ctx.beginPath();
    ctx.ellipse(c, c + 6, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3E5C58';
    ctx.beginPath();
    ctx.arc(c, c, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E8D0A2';
    ctx.beginPath();
    ctx.arc(c, c, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1F4A48';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#2C6E6A';
    ctx.beginPath();
    ctx.arc(c, c, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(111, 227, 214, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, 11, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillStyle = '#9B7A52';
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * 18, c + Math.sin(a) * 18, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawLanceHead(ctx: CanvasRenderingContext2D): void {
    const c = 36;
    // barrel (points right)
    ctx.fillStyle = '#1B3B3A';
    roundRect(ctx, c - 4, c - 7, 32, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#E9F7EE';
    roundRect(ctx, c, c - 5, 30, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#6FE3D6';
    roundRect(ctx, c + 6, c - 2, 18, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#FFF6D9';
    roundRect(ctx, c + 25, c - 4, 7, 8, 2);
    ctx.fill();
    // body
    ctx.fillStyle = '#2C6E6A';
    ctx.beginPath();
    ctx.arc(c, c, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#123F43';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#E8D0A2';
    ctx.beginPath();
    ctx.arc(c - 2, c, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6FE3D6';
    ctx.beginPath();
    ctx.arc(c - 2, c, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(c - 4, c - 3, 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawPulseBase(ctx: CanvasRenderingContext2D): void {
    const c = 36;
    ctx.fillStyle = 'rgba(62, 40, 24, 0.24)';
    ctx.beginPath();
    ctx.ellipse(c, c + 6, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6D452E';
    ctx.beginPath();
    ctx.arc(c, c, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E8D0A2';
    ctx.beginPath();
    ctx.arc(c, c, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9C5A36';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#B65C33';
    ctx.beginPath();
    ctx.arc(c, c, 15, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillStyle = '#7A3F25';
        ctx.beginPath();
        ctx.arc(c + Math.cos(a) * 18, c + Math.sin(a) * 18, 2.2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPulseHead(ctx: CanvasRenderingContext2D): void {
    const c = 28;
    // prongs
    ctx.strokeStyle = '#4A2B1A';
    ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
        const a = -0.55 + i * 0.55;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * 8, c + Math.sin(a) * 8);
        ctx.lineTo(c + Math.cos(a) * 24, c + Math.sin(a) * 24);
        ctx.stroke();
    }
    ctx.fillStyle = '#F2A33C';
    ctx.beginPath();
    ctx.arc(c, c, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5A2F1B';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#FFE0A0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#FFF6D9';
    ctx.beginPath();
    ctx.arc(c, c, 4.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawScarab(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(24, 24);
    ctx.rotate(-Math.PI / 2);
    // legs
    ctx.strokeStyle = '#4A2A18';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    for (const sx of [-8, 0, 8]) {
        for (const sy of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(sx, sy * 5);
            ctx.lineTo(sx - 4, sy * 13);
            ctx.lineTo(sx - 10, sy * 16);
            ctx.stroke();
        }
    }
    // shell
    ctx.fillStyle = '#B95A2E';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5E2A16';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#E58A45';
    ctx.beginPath();
    ctx.ellipse(2, 0, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(84, 37, 18, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    // head
    ctx.fillStyle = '#4A2A18';
    ctx.beginPath();
    ctx.arc(14, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6FE3D6';
    ctx.beginPath();
    ctx.arc(15, -2, 1.5, 0, Math.PI * 2);
    ctx.arc(15, 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // horn
    ctx.fillStyle = '#F0C98C';
    ctx.beginPath();
    ctx.moveTo(18, -3);
    ctx.lineTo(24, 0);
    ctx.lineTo(18, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawCrawler(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(30, 30);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = '#3A2417';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const sx of [-12, -4, 4, 12]) {
        for (const sy of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(sx, sy * 8);
            ctx.lineTo(sx - 3, sy * 17);
            ctx.stroke();
        }
    }
    ctx.fillStyle = '#5B3A26';
    roundRect(ctx, -20, -11, 40, 22, 8);
    ctx.fill();
    ctx.strokeStyle = '#2D1B10';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#8A5736' : '#6F4328';
        roundRect(ctx, -16 + i * 8, -8, 6, 16, 2);
        ctx.fill();
    }
    ctx.fillStyle = '#E0B075';
    roundRect(ctx, 6, -5, 12, 10, 4);
    ctx.fill();
    ctx.fillStyle = '#F2A33C';
    ctx.beginPath();
    ctx.arc(10, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2D1B10';
    ctx.lineWidth = 2;
    for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-2, sy * 9);
        ctx.lineTo(-8, sy * 16);
        ctx.stroke();
    }
    ctx.fillStyle = '#F0C98C';
    ctx.beginPath();
    ctx.moveTo(20, -6);
    ctx.lineTo(27, 0);
    ctx.lineTo(20, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawDrone(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(24, 24);
    ctx.strokeStyle = '#124A4A';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
        ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17);
        ctx.stroke();
        ctx.fillStyle = 'rgba(190, 246, 236, 0.55)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 18, Math.sin(a) * 18, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(20, 74, 74, 0.8)';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 18, Math.sin(a) * 18, 5.5, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.fillStyle = '#1F6F6B';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0E3F3E';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#9EF0E2';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D9503F';
    ctx.beginPath();
    ctx.arc(1, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-2, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTitan(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-Math.PI / 2);
    // shadow
    ctx.fillStyle = 'rgba(56, 30, 16, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 48, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    // body segments
    for (let i = 0; i < 5; i++) {
        const px = -42 + i * 17;
        ctx.fillStyle = i % 2 === 0 ? '#7A4528' : '#94552F';
        ctx.beginPath();
        ctx.ellipse(px, 0, 15, 27 - i * 1.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3D2113';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(240, 200, 140, 0.35)';
        ctx.beginPath();
        ctx.ellipse(px - 2, -8, 9, 8, -0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    // armour spikes
    ctx.fillStyle = '#3D2113';
    for (let i = 0; i < 4; i++) {
        const px = -30 + i * 17;
        for (const sy of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(px - 4, sy * 22);
            ctx.lineTo(px + 2, sy * 33);
            ctx.lineTo(px + 7, sy * 21);
            ctx.closePath();
            ctx.fill();
        }
    }
    // head / maw
    ctx.fillStyle = '#5A2F1B';
    ctx.beginPath();
    ctx.arc(42, 0, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2D170D';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#F2A33C';
    ctx.beginPath();
    ctx.arc(44, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF0C4';
    ctx.beginPath();
    ctx.arc(46, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3D2113';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(44 + Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.lineTo(44 + Math.cos(a + 0.25) * 24, Math.sin(a + 0.25) * 24);
        ctx.lineTo(44 + Math.cos(a + 0.5) * 16, Math.sin(a + 0.5) * 16);
        ctx.closePath();
        ctx.fill();
    }
    // core
    ctx.fillStyle = '#FFD27A';
    ctx.beginPath();
    ctx.arc(8, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawRelay(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(95, 95);
    // outer solar ring
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.fillStyle = '#E6D2A8';
        roundRect(ctx, 48, -17, 38, 34, 5);
        ctx.fill();
        ctx.strokeStyle = '#8E6B45';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#1C5D60';
        roundRect(ctx, 52, -13, 30, 26, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(126, 228, 214, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(67, -13);
        ctx.lineTo(67, 13);
        ctx.stroke();
        ctx.restore();
    }
    // base rings
    ctx.fillStyle = '#9A704C';
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E8D0A2';
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2C6E6A';
    ctx.lineWidth = 4;
    ctx.stroke();
    // inner tower
    ctx.fillStyle = '#2C6E6A';
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#123F43';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#6FE3D6';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF6D9';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2A33C';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    // pylons
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
        ctx.fillStyle = '#E6D2A8';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 34, Math.sin(a) * 34, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawRelayRing(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(95, 95);
    ctx.strokeStyle = 'rgba(111, 227, 214, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 246, 217, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(14, 14);
    ctx.fillStyle = '#B8741F';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2C15C';
    ctx.beginPath();
    ctx.arc(0, -1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8C5414';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#FFF3CC';
    ctx.beginPath();
    ctx.moveTo(-1, -6);
    ctx.lineTo(3, -1);
    ctx.lineTo(0, -1);
    ctx.lineTo(2, 5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawSunLogo(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(24, 24);
    ctx.fillStyle = '#F2A33C';
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(3, -11);
        ctx.lineTo(-3, -11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    ctx.fillStyle = '#FFF6D9';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2A33C';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawShadow(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(32, 12, 2, 32, 12, 30);
    grad.addColorStop(0, 'rgba(58, 32, 16, 0.35)');
    grad.addColorStop(1, 'rgba(58, 32, 16, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(32, 12, 30, 11, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawVignette(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(640, 340, 150, 640, 340, 800);
    grad.addColorStop(0, 'rgba(30, 18, 10, 0)');
    grad.addColorStop(0.65, 'rgba(30, 18, 10, 0.18)');
    grad.addColorStop(1, 'rgba(24, 14, 8, 0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
}

export function ensureTextures(scene: Scene): void {
    makeTexture(scene, 'bg', MAP_WIDTH, MAP_HEIGHT, drawBackground);
    makeTexture(scene, 'pad', 92, 92, drawPad);
    makeTexture(scene, 'lance-base', 72, 72, drawLanceBase);
    makeTexture(scene, 'lance-head', 72, 72, drawLanceHead);
    makeTexture(scene, 'pulse-base', 72, 72, drawPulseBase);
    makeTexture(scene, 'pulse-head', 56, 56, drawPulseHead);
    makeTexture(scene, 'enemy-scarab', 48, 48, drawScarab);
    makeTexture(scene, 'enemy-crawler', 60, 60, drawCrawler);
    makeTexture(scene, 'enemy-drone', 48, 48, drawDrone);
    makeTexture(scene, 'enemy-titan', 128, 128, drawTitan);
    makeTexture(scene, 'relay', 190, 190, drawRelay);
    makeTexture(scene, 'relay-ring', 190, 190, drawRelayRing);
    makeTexture(scene, 'coin', 28, 28, drawCoin);
    makeTexture(scene, 'sun-logo', 48, 48, drawSunLogo);
    makeTexture(scene, 'shadow', 64, 24, drawShadow);
    makeTexture(scene, 'vignette', 1280, 720, drawVignette);
}

export const PAD_POSITIONS = PADS;
