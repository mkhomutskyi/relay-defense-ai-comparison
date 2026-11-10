export type EnemyType = 'scarab' | 'crawler' | 'skimmer' | 'brute' | 'boss';
export type TowerType = 'sunspear' | 'arc';
export type Mode = 'menu' | 'playing' | 'paused' | 'won' | 'lost';
export type WaveState = 'prep' | 'spawning' | 'clearing';

export interface Vec { x: number; y: number; }

export interface Pad {
    index: number;
    x: number;
    y: number;
    tower: Tower | null;
}

export interface Tower {
    pad: Pad;
    type: TowerType;
    level: number;
    cooldown: number;
    angle: number;
    damage: number;
    range: number;
    fireRate: number;
    chain: number;
    slow: number;
    flash: number;
}

export interface Enemy {
    id: number;
    type: EnemyType;
    x: number;
    y: number;
    angle: number;
    hp: number;
    maxHp: number;
    speed: number;
    reward: number;
    damage: number;
    dist: number;
    slow: number;
    slowTimer: number;
    phase: number;
    dead: boolean;
}

export interface Beam {
    x1: number; y1: number; x2: number; y2: number;
    color: number; width: number; life: number; maxLife: number;
}

export interface ArcBolt {
    points: Vec[];
    life: number;
    maxLife: number;
    color: number;
}

export interface Particle {
    x: number; y: number; vx: number; vy: number;
    life: number; maxLife: number; size: number; color: number;
}

export interface Ring {
    x: number; y: number; radius: number; maxRadius: number;
    life: number; maxLife: number; color: number; width: number;
}

export interface FloatLabel {
    text: Phaser.GameObjects.Text;
    life: number;
    maxLife: number;
    vy: number;
}

export interface WaveGroup {
    type: EnemyType;
    count: number;
    gap: number;
}

export interface WaveDef {
    name: string;
    groups: WaveGroup[];
}

export const PATH: Vec[] = [
    { x: -50, y: 660 },
    { x: 180, y: 660 },
    { x: 180, y: 520 },
    { x: 360, y: 520 },
    { x: 360, y: 370 },
    { x: 560, y: 370 },
    { x: 560, y: 600 },
    { x: 760, y: 600 },
    { x: 760, y: 450 },
    { x: 930, y: 450 },
    { x: 930, y: 260 },
    { x: 1122, y: 260 },
];

export const PAD_POSITIONS: Vec[] = [
    { x: 262, y: 598 },
    { x: 272, y: 430 },
    { x: 462, y: 455 },
    { x: 462, y: 282 },
    { x: 662, y: 508 },
    { x: 658, y: 282 },
    { x: 862, y: 532 },
    { x: 854, y: 352 },
    { x: 1028, y: 352 },
    { x: 1040, y: 548 },
    { x: 1018, y: 148 },
];

export const RELAY = { x: 1152, y: 260 };

export const WAVES: WaveDef[] = [
    { name: 'FIRST CONTACT', groups: [{ type: 'scarab', count: 6, gap: 0.95 }] },
    { name: 'DUNE RUNNERS', groups: [{ type: 'scarab', count: 6, gap: 0.8 }, { type: 'crawler', count: 4, gap: 0.8 }] },
    { name: 'SKIMMER SWARM', groups: [{ type: 'crawler', count: 5, gap: 0.75 }, { type: 'skimmer', count: 5, gap: 0.65 }] },
    { name: 'IRON SHELLS', groups: [{ type: 'scarab', count: 8, gap: 0.5 }, { type: 'crawler', count: 4, gap: 0.6 }, { type: 'brute', count: 2, gap: 1.4 }] },
    { name: 'THE LONG DARK', groups: [{ type: 'skimmer', count: 6, gap: 0.55 }, { type: 'crawler', count: 6, gap: 0.55 }, { type: 'brute', count: 3, gap: 1.1 }] },
    { name: 'SIEGE WARDEN', groups: [{ type: 'scarab', count: 8, gap: 0.42 }, { type: 'skimmer', count: 4, gap: 0.5 }, { type: 'brute', count: 2, gap: 0.9 }, { type: 'boss', count: 1, gap: 1.2 }] },
];

export const TOWER_COST: Record<TowerType, number> = { sunspear: 55, arc: 85 };

export function upgradeCost(type: TowerType, level: number): number {
    if (type === 'sunspear') return level === 1 ? 65 : 95;
    return level === 1 ? 90 : 130;
}

export function towerStats(type: TowerType, level: number) {
    if (type === 'sunspear') {
        const dmg = [0, 18, 28, 42][level];
        const range = [0, 190, 212, 238][level];
        const cd = [0, 0.62, 0.56, 0.5][level];
        return { damage: dmg, range, cooldown: cd, chains: 1, slow: 0 };
    }
    const dmg = [0, 11, 16, 24][level];
    const range = [0, 132, 148, 168][level];
    const cd = [0, 0.95, 0.88, 0.8][level];
    const chains = [0, 3, 4, 5][level];
    const slow = [0, 0.28, 0.34, 0.4][level];
    return { damage: dmg, range, cooldown: cd, chains, slow };
}

export function enemyStats(type: EnemyType, waveScale = 1) {
    switch (type) {
        case 'scarab':
            return { hp: 30 * waveScale, speed: 78, reward: 7, damage: 5, radius: 10, name: 'Scarab' };
        case 'crawler':
            return { hp: 68 * waveScale, speed: 55, reward: 10, damage: 7, radius: 14, name: 'Dune Crawler' };
        case 'skimmer':
            return { hp: 46 * waveScale, speed: 106, reward: 9, damage: 6, radius: 12, name: 'Skimmer' };
        case 'brute':
            return { hp: 205 * waveScale, speed: 38, reward: 22, damage: 14, radius: 22, name: 'Sand Brute' };
        case 'boss':
            return { hp: 1550, speed: 30, reward: 160, damage: 45, radius: 34, name: 'Siege Warden' };
    }
}

export function pathLength(): number {
    let total = 0;
    for (let i = 1; i < PATH.length; i++) {
        total += Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
    }
    return total;
}

export function pathPoint(dist: number): { x: number; y: number; angle: number } {
    let remaining = dist;
    for (let i = 1; i < PATH.length; i++) {
        const a = PATH[i - 1];
        const b = PATH[i];
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
    const last = PATH[PATH.length - 1];
    return { x: last.x, y: last.y, angle: 0 };
}
