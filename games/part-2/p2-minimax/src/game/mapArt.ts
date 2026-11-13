/**
 * The outpost map is painted once into an offscreen 2D canvas (gradients,
 * rounded road, dunes, scatter decor) and registered as a Phaser texture.
 * Everything is generated locally - no image files.
 */
import { PATH, PATH_WIDTH, CORE_POS, GAME_W, MAP_TOP, MAP_H } from './config';
import { PathData, distToPath } from './path';

/** Deterministic PRNG so the scatter is identical every run. */
function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function buildMapCanvas(pathData: PathData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = GAME_W;
    canvas.height = MAP_H;
    const g = canvas.getContext('2d')!;
    const rnd = mulberry32(20261113);

    /* ---------------------------------------------------------- sand base */
    const sky = g.createLinearGradient(0, 0, 0, MAP_H);
    sky.addColorStop(0, '#f6e2b4');
    sky.addColorStop(0.35, '#efd29b');
    sky.addColorStop(1, '#d9ab68');
    g.fillStyle = sky;
    g.fillRect(0, 0, GAME_W, MAP_H);

    /* ----------------------------------------------------- horizon mesas */
    g.fillStyle = 'rgba(196,150,96,0.55)';
    g.beginPath();
    g.moveTo(0, 96);
    for (let x = 0; x <= GAME_W; x += 40) {
        const h = 96 + Math.sin(x * 0.004) * 26 + Math.sin(x * 0.013) * 12;
        g.lineTo(x, h);
    }
    g.lineTo(GAME_W, 0);
    g.lineTo(0, 0);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(214,175,124,0.5)';
    g.beginPath();
    g.moveTo(0, 74);
    for (let x = 0; x <= GAME_W; x += 50) {
        const h = 74 + Math.sin(x * 0.0055 + 2) * 18;
        g.lineTo(x, h);
    }
    g.lineTo(GAME_W, 0);
    g.lineTo(0, 0);
    g.closePath();
    g.fill();

    /* -------------------------------------------------------------- dunes */
    const dunes: [number, number, number, string][] = [
        [180, 250, 300, 'rgba(224,190,133,0.85)'],
        [520, 180, 340, 'rgba(214,175,112,0.7)'],
        [900, 300, 380, 'rgba(226,193,138,0.75)'],
        [1230, 170, 300, 'rgba(210,170,110,0.6)'],
        [640, 520, 420, 'rgba(226,192,135,0.55)'],
        [1120, 590, 340, 'rgba(206,164,105,0.5)']
    ];
    for (const [x, y, r, col] of dunes) {
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(x, y, r, r * 0.34, 0, 0, Math.PI * 2);
        g.fill();
    }

    /* --------------------------------------------------------- sand grain */
    for (let i = 0; i < 2600; i++) {
        const x = rnd() * GAME_W;
        const y = rnd() * MAP_H;
        const a = 0.03 + rnd() * 0.07;
        g.fillStyle = rnd() > 0.5 ? `rgba(255,246,222,${a})` : `rgba(120,86,48,${a})`;
        g.fillRect(x, y, 2, 2);
    }

    /* ------------------------------------------------------------- road */
    const trace = (): void => {
        g.beginPath();
        g.moveTo(PATH[0].x, PATH[0].y - MAP_TOP);
        for (let i = 1; i < PATH.length; i++) g.lineTo(PATH[i].x, PATH[i].y - MAP_TOP);
    };
    g.lineCap = 'round';
    g.lineJoin = 'round';
    trace();
    g.strokeStyle = '#f7e9c6';
    g.lineWidth = PATH_WIDTH + 14;
    g.stroke();
    trace();
    g.strokeStyle = '#c79553';
    g.lineWidth = PATH_WIDTH;
    g.stroke();
    // compacted centre
    trace();
    g.strokeStyle = 'rgba(196,140,80,0.55)';
    g.lineWidth = PATH_WIDTH - 16;
    g.stroke();
    // ruts
    g.setLineDash([14, 18]);
    g.strokeStyle = 'rgba(255,244,214,0.4)';
    g.lineWidth = 3;
    trace();
    g.stroke();
    g.setLineDash([]);
    // gravel speckle on the road
    for (let i = 0; i < 900; i++) {
        const t = rnd();
        const idx = Math.min(PATH.length - 2, Math.floor(t * (PATH.length - 1)));
        const local = t * (PATH.length - 1) - idx;
        const a = PATH[idx];
        const b = PATH[idx + 1];
        const x = a.x + (b.x - a.x) * local + (rnd() - 0.5) * PATH_WIDTH;
        const y = a.y + (b.y - a.y) * local + (rnd() - 0.5) * PATH_WIDTH;
        g.fillStyle = rnd() > 0.5 ? 'rgba(255,238,200,0.35)' : 'rgba(120,84,44,0.3)';
        g.fillRect(x, y - MAP_TOP, 2, 2);
    }

    /* ------------------------------------------------------------ decor */
    // pathData lives in canvas coordinates, decor is drawn in map-local space.
    const clearOfRoad = (x: number, y: number, margin: number): boolean =>
        distToPath(pathData, x, y + MAP_TOP) > PATH_WIDTH / 2 + margin;

    // dry scrub bushes
    for (let i = 0; i < 70; i++) {
        const x = rnd() * GAME_W;
        const y = 40 + rnd() * (MAP_H - 40);
        if (!clearOfRoad(x, y, 16)) continue;
        g.strokeStyle = 'rgba(120,120,72,0.55)';
        g.lineWidth = 1.6;
        for (let b = 0; b < 5; b++) {
            const a = -Math.PI / 2 + (b - 2) * 0.34;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
            g.stroke();
        }
    }
    // rocks
    for (let i = 0; i < 46; i++) {
        const x = rnd() * GAME_W;
        const y = 40 + rnd() * (MAP_H - 40);
        if (!clearOfRoad(x, y, 14)) continue;
        const r = 5 + rnd() * 12;
        g.fillStyle = 'rgba(60,44,28,0.18)';
        g.beginPath();
        g.ellipse(x + 2, y + 3, r * 1.05, r * 0.42, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#a8845c';
        g.beginPath();
        g.ellipse(x, y, r, r * 0.72, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#c2a077';
        g.beginPath();
        g.ellipse(x - r * 0.25, y - r * 0.2, r * 0.55, r * 0.34, 0, 0, Math.PI * 2);
        g.fill();
    }
    // cacti
    for (let i = 0; i < 22; i++) {
        const x = rnd() * GAME_W;
        const y = 60 + rnd() * (MAP_H - 70);
        if (!clearOfRoad(x, y, 30)) continue;
        const h = 26 + rnd() * 26;
        g.fillStyle = 'rgba(60,44,28,0.16)';
        g.beginPath();
        g.ellipse(x + 4, y + 2, 12, 4, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#437a4c';
        g.fillRect(x - 4, y - h, 8, h);
        g.fillRect(x - 14, y - h * 0.62, 6, h * 0.42);
        g.fillRect(x - 14, y - h * 0.62, 11, 5);
        g.fillRect(x + 8, y - h * 0.48, 6, h * 0.34);
        g.fillRect(x + 3, y - h * 0.48, 11, 5);
        g.fillStyle = '#5f9a63';
        g.fillRect(x - 3, y - h, 3, h);
    }
    // solar panel arrays
    for (let i = 0; i < 14; i++) {
        const x = 60 + rnd() * (GAME_W - 120);
        const y = 70 + rnd() * (MAP_H - 110);
        if (!clearOfRoad(x, y, 46)) continue;
        const w = 54 + rnd() * 26;
        const h = 26;
        g.fillStyle = 'rgba(60,44,28,0.18)';
        g.beginPath();
        g.ellipse(x + 3, y + h * 0.55 + 4, w * 0.55, 6, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#8a7457';
        g.fillRect(x - 2, y + h * 0.4, 4, 12);
        g.fillStyle = '#2f4a6b';
        g.fillRect(x - w / 2, y - h / 2, w, h);
        g.fillStyle = '#4f7cb0';
        g.fillRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 8);
        g.strokeStyle = 'rgba(20,40,66,0.85)';
        g.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
            g.beginPath();
            g.moveTo(x - w / 2 + 3 + (k * (w - 6)) / 4, y - h / 2 + 3);
            g.lineTo(x - w / 2 + 3 + (k * (w - 6)) / 4, y + h / 2 - 5);
            g.stroke();
        }
        g.beginPath();
        g.moveTo(x - w / 2 + 3, y - 2);
        g.lineTo(x + w / 2 - 3, y - 2);
        g.stroke();
    }

    /* ------------------------------------------------------- heat vignette */
    const vig = g.createRadialGradient(GAME_W / 2, MAP_H / 2, MAP_H * 0.34, GAME_W / 2, MAP_H / 2, MAP_H * 0.95);
    vig.addColorStop(0, 'rgba(255,240,205,0.10)');
    vig.addColorStop(1, 'rgba(96,58,20,0.30)');
    g.fillStyle = vig;
    g.fillRect(0, 0, GAME_W, MAP_H);

    /* ------------------------------------------- relay compound pad */
    g.fillStyle = 'rgba(160,120,70,0.35)';
    g.beginPath();
    g.ellipse(CORE_POS.x - 6, CORE_POS.y - MAP_TOP + 20, 108, 34, 0, 0, Math.PI * 2);
    g.fill();

    return canvas;
}

/** Menu backdrop: dawn sky over the dunes with the relay dish on the horizon. */
export function buildMenuCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = GAME_W;
    canvas.height = 720;
    const g = canvas.getContext('2d')!;
    const rnd = mulberry32(77123);

    const sky = g.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, '#1d3a52');
    sky.addColorStop(0.32, '#4d6d86');
    sky.addColorStop(0.52, '#c98f63');
    sky.addColorStop(0.66, '#f0b96f');
    sky.addColorStop(0.78, '#f6d79a');
    sky.addColorStop(1, '#e6bd7c');
    g.fillStyle = sky;
    g.fillRect(0, 0, GAME_W, 720);

    // sun
    const sunY = 520;
    const glow = g.createRadialGradient(940, sunY, 10, 940, sunY, 260);
    glow.addColorStop(0, 'rgba(255,236,180,0.95)');
    glow.addColorStop(0.35, 'rgba(255,196,110,0.45)');
    glow.addColorStop(1, 'rgba(255,180,90,0)');
    g.fillStyle = glow;
    g.fillRect(680, sunY - 260, 520, 520);
    g.fillStyle = '#fff0c4';
    g.beginPath();
    g.arc(940, sunY, 46, 0, Math.PI * 2);
    g.fill();

    // stars in the upper sky
    for (let i = 0; i < 90; i++) {
        const x = rnd() * GAME_W;
        const y = rnd() * 250;
        g.fillStyle = `rgba(255,255,255,${0.15 + rnd() * 0.5})`;
        g.fillRect(x, y, 1.6, 1.6);
    }

    // distant ridge
    g.fillStyle = 'rgba(60,52,74,0.85)';
    g.beginPath();
    g.moveTo(0, 470);
    for (let x = 0; x <= GAME_W; x += 60) {
        g.lineTo(x, 455 + Math.sin(x * 0.006) * 22 + Math.sin(x * 0.017) * 9);
    }
    g.lineTo(GAME_W, 720);
    g.lineTo(0, 720);
    g.closePath();
    g.fill();

    // relay dish silhouette on the ridge
    g.save();
    g.translate(1055, 400);
    g.strokeStyle = 'rgba(28,30,42,0.95)';
    g.fillStyle = 'rgba(28,30,42,0.95)';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, 62);
    g.stroke();
    g.beginPath();
    g.ellipse(-4, -8, 42, 20, -0.5, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // dune layers
    const layers: [number, string][] = [
        [560, 'rgba(214,161,104,0.95)'],
        [620, 'rgba(226,178,118,0.95)'],
        [690, 'rgba(238,196,136,0.98)']
    ];
    for (const [y, col] of layers) {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, y + 40);
        for (let x = 0; x <= GAME_W; x += 40) {
            g.lineTo(x, y + Math.sin(x * 0.005 + y) * 26);
        }
        g.lineTo(GAME_W, 720);
        g.lineTo(0, 720);
        g.closePath();
        g.fill();
    }
    return canvas;
}
