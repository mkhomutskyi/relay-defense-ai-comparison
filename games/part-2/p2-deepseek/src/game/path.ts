export interface Vec2 {
    x: number;
    y: number;
}

export interface PathSample extends Vec2 {
    dist: number;
    angle: number;
}

export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 720;
export const HUD_TOP = 72;
export const HUD_BOTTOM = 632;

// The relay is the last point of the caravan track. The track enters from the
// western dunes and snakes through the outpost toward the solar relay.
const CONTROL_POINTS: Vec2[] = [
    { x: -60, y: 380 },
    { x: 90, y: 360 },
    { x: 210, y: 300 },
    { x: 330, y: 255 },
    { x: 430, y: 300 },
    { x: 500, y: 390 },
    { x: 600, y: 450 },
    { x: 710, y: 455 },
    { x: 800, y: 400 },
    { x: 850, y: 300 },
    { x: 930, y: 245 },
    { x: 1030, y: 255 },
    { x: 1100, y: 320 },
    { x: 1140, y: 340 }
];

function catmullRom(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
}

export const PATH: PathSample[] = (() => {
    const raw: Vec2[] = [];
    for (let i = 0; i < CONTROL_POINTS.length - 1; i++) {
        const p0 = CONTROL_POINTS[Math.max(0, i - 1)];
        const p1 = CONTROL_POINTS[i];
        const p2 = CONTROL_POINTS[i + 1];
        const p3 = CONTROL_POINTS[Math.min(CONTROL_POINTS.length - 1, i + 2)];
        for (let s = 0; s < 20; s++) {
            raw.push(catmullRom(p0, p1, p2, p3, s / 20));
        }
    }
    raw.push(CONTROL_POINTS[CONTROL_POINTS.length - 1]);

    const samples: PathSample[] = [];
    let total = 0;
    for (let i = 0; i < raw.length; i++) {
        if (i > 0) {
            total += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
        }
        const a = raw[Math.max(0, i - 1)];
        const b = raw[Math.min(raw.length - 1, i + 1)];
        samples.push({
            x: raw[i].x,
            y: raw[i].y,
            dist: total,
            angle: Math.atan2(b.y - a.y, b.x - a.x)
        });
    }
    return samples;
})();

export const PATH_LENGTH = PATH[PATH.length - 1].dist;

export const RELAY_POS: Vec2 = { x: 1142, y: 340 };

export interface PadDef extends Vec2 {
    index: number;
    side: number;
}

// Hand-tuned build pads, all at least 65px clear of the caravan track.
export const PADS: PadDef[] = [
    { index: 0, x: 150, y: 440, side: 1 },
    { index: 1, x: 265, y: 195, side: -1 },
    { index: 2, x: 400, y: 425, side: 1 },
    { index: 3, x: 555, y: 525, side: 1 },
    { index: 4, x: 675, y: 345, side: -1 },
    { index: 5, x: 760, y: 560, side: 1 },
    { index: 6, x: 895, y: 175, side: -1 },
    { index: 7, x: 1015, y: 420, side: 1 }
];

export function pointAtDistance(dist: number): PathSample {
    if (dist <= 0) {
        const first = PATH[0];
        return { ...first, dist: 0 };
    }
    if (dist >= PATH_LENGTH) {
        return { ...PATH[PATH.length - 1], dist: PATH_LENGTH };
    }
    // Binary search for the segment containing dist.
    let lo = 0;
    let hi = PATH.length - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (PATH[mid].dist <= dist) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    const a = PATH[lo];
    const b = PATH[hi];
    const span = Math.max(0.0001, b.dist - a.dist);
    const t = (dist - a.dist) / span;
    return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        dist,
        angle: Math.atan2(b.y - a.y, b.x - a.x)
    };
}

export function distanceToPath(x: number, y: number): number {
    let best = Infinity;
    for (let i = 0; i < PATH.length; i += 2) {
        const dx = PATH[i].x - x;
        const dy = PATH[i].y - y;
        const d = dx * dx + dy * dy;
        if (d < best) {
            best = d;
        }
    }
    return Math.sqrt(best);
}
