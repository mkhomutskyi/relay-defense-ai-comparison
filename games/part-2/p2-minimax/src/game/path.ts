import { Vec2 } from './config';

export interface Segment { ax: number; ay: number; bx: number; by: number; len: number; start: number }

export interface PathData { segs: Segment[]; total: number }

export function buildPath(path: Vec2[]): PathData {
    const segs: Segment[] = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len, start: total });
        total += len;
    }
    return { segs, total };
}

export function pointAt(p: PathData, d: number): { x: number; y: number; angle: number } {
    if (p.segs.length === 0) return { x: 0, y: 0, angle: 0 };
    const clamped = Math.max(0, Math.min(p.total, d));
    for (const s of p.segs) {
        if (clamped <= s.start + s.len || s === p.segs[p.segs.length - 1]) {
            const t = s.len > 0 ? (clamped - s.start) / s.len : 0;
            return {
                x: s.ax + (s.bx - s.ax) * t,
                y: s.ay + (s.by - s.ay) * t,
                angle: Math.atan2(s.by - s.ay, s.bx - s.ax)
            };
        }
    }
    const last = p.segs[p.segs.length - 1];
    return { x: last.bx, y: last.by, angle: 0 };
}

export function distToPath(p: PathData, x: number, y: number): number {
    let best = Infinity;
    for (const s of p.segs) {
        const dx = s.bx - s.ax;
        const dy = s.by - s.ay;
        const l2 = dx * dx + dy * dy;
        let t = l2 > 0 ? ((x - s.ax) * dx + (y - s.ay) * dy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        const px = s.ax + dx * t;
        const py = s.ay + dy * t;
        const d = Math.hypot(x - px, y - py);
        if (d < best) best = d;
    }
    return best;
}
