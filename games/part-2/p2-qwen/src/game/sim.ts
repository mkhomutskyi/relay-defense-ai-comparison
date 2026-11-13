// Relay Defense — head-agnostic game simulation (pure logic, no Phaser).
// The GameScene renders this state and drives it; window.advanceTime and
// window.render_game_to_text read/step it directly. Fixed timestep inside.

import {
    PATH, ENEMIES, TOWERS, WAVES, CELL, PLAY_TOP, GRID_COLS, GRID_ROWS,
    START_MONEY, START_LIVES, VIEW_W,
    type EnemyKind, type TowerKind, type TowerLevel,
} from './data';

export interface Enemy {
    id: number; kind: EnemyKind; x: number; y: number;
    hp: number; maxHp: number; p: number;         // p = distance along path
    speed: number; slow: number; slowT: number;
    alive: boolean; leaked: boolean; boss: boolean;
    flash: number;                                 // hit flash timer
}
export interface Tower {
    id: number; kind: TowerKind; col: number; row: number; x: number; y: number;
    level: number; cd: number; muzzle: number;
}
export interface Bullet {
    id: number; x: number; y: number; tx: number; ty: number;
    targetId: number; speed: number; damage: number; alive: boolean; color: number;
}
export interface Particle {
    x: number; y: number; vx: number; vy: number; life: number; max: number;
    color: number; size: number; kind: 'spark' | 'ring' | 'text'; text?: string;
}
export interface Bolt { pts: number[]; life: number; max: number; color: number; }

export type Phase = 'build' | 'combat' | 'intermission' | 'won' | 'lost';

// --- path precompute ---
const SEG: { a: { x: number; y: number }; b: { x: number; y: number }; len: number; acc: number }[] = [];
let TOTAL = 0;
(function buildPath() {
    let acc = 0;
    for (let i = 0; i < PATH.length - 1; i++) {
        const len = Math.hypot(PATH[i + 1].x - PATH[i].x, PATH[i + 1].y - PATH[i].y);
        SEG.push({ a: PATH[i], b: PATH[i + 1], len, acc });
        acc += len;
    }
    TOTAL = acc;
})();

export function pointAt(p: number): { x: number; y: number } {
    if (p <= 0) return { ...PATH[0] };
    if (p >= TOTAL) return { ...PATH[PATH.length - 1] };
    for (const s of SEG) {
        if (p <= s.acc + s.len) {
            const t = (p - s.acc) / s.len;
            return { x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t };
        }
    }
    return { ...PATH[PATH.length - 1] };
}

// Buildable cell grid: mark cells whose center lies within ~50px of the path.
export function computeBuildable(): boolean[][] {
    const grid: boolean[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_COLS; c++) {
            const cx = c * CELL + CELL / 2;
            const cy = PLAY_TOP + r * CELL + CELL / 2;
            let near = false;
            // sample path densely
            for (let s = 0; s <= 100; s++) {
                const pt = pointAt((s / 100) * TOTAL);
                if (Math.hypot(pt.x - cx, pt.y - cy) < 52) { near = true; break; }
            }
            grid[r][c] = !near;
        }
    }
    return grid;
}

export class Sim {
    time = 0;
    money = START_MONEY;
    lives = START_LIVES;
    waveIndex = 0;                       // next wave to launch (0-based)
    waveActive = false;
    phase: Phase = 'build';
    enemies: Enemy[] = [];
    towers: Tower[] = [];
    bullets: Bullet[] = [];
    particles: Particle[] = [];
    bolts: Bolt[] = [];
    buildable: boolean[][];
    towerAt: (number | null)[][];        // grid -> tower id
    private nextId = 1;
    private spawnQueue: { kind: EnemyKind; at: number }[] = [];
    private intermissionT = 0;
    kills = 0;
    leaks = 0;

    constructor() {
        this.buildable = computeBuildable();
        this.towerAt = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    }

    reset() {
        this.time = 0; this.money = START_MONEY; this.lives = START_LIVES;
        this.waveIndex = 0; this.waveActive = false; this.phase = 'build';
        this.enemies = []; this.towers = []; this.bullets = [];
        this.particles = []; this.bolts = []; this.kills = 0; this.leaks = 0;
        this.buildable = computeBuildable();
        this.towerAt = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
        this.nextId = 1; this.spawnQueue = []; this.intermissionT = 0;
    }

    // ---- build / sell / upgrade ----
    cellFromXY(x: number, y: number) {
        const c = Math.floor(x / CELL);
        const r = Math.floor((y - PLAY_TOP) / CELL);
        if (c < 0 || c >= GRID_COLS || r < 0 || r >= GRID_ROWS) return null;
        return { c, r };
    }
    isBuildable(c: number, r: number): boolean {
        return this.buildable[r] && this.buildable[r][c] && this.towerAt[r][c] === null;
    }
    canAfford(kind: TowerKind) { return this.money >= TOWERS[kind].buildCost; }

    placeTower(kind: TowerKind, c: number, r: number): Tower | null {
        const def = TOWERS[kind];
        if (!this.isBuildable(c, r) || this.money < def.buildCost) return null;
        this.money -= def.buildCost;
        const t: Tower = {
            id: this.nextId++, kind, col: c, row: r,
            x: c * CELL + CELL / 2, y: PLAY_TOP + r * CELL + CELL / 2,
            level: 0, cd: 0, muzzle: 0,
        };
        this.towers.push(t);
        this.towerAt[r][c] = t.id;
        this.puff(t.x, t.y, def.color, 14);
        return t;
    }
    upgradeCost(t: Tower): number | null {
        const def = TOWERS[t.kind];
        if (t.level >= def.levels.length - 1) return null;
        return def.levels[t.level + 1].upgradeCost;
    }
    upgradeTower(t: Tower): boolean {
        const cost = this.upgradeCost(t);
        if (cost === null || this.money < cost) return false;
        this.money -= cost; t.level++;
        this.puff(t.x, t.y, TOWERS[t.kind].color, 18);
        return true;
    }
    sellValue(t: Tower): number {
        const def = TOWERS[t.kind];
        let spent = def.levels[0].upgradeCost;
        for (let i = 1; i <= t.level; i++) spent += def.levels[i].upgradeCost;
        return Math.floor(spent * 0.7);
    }
    sellTower(t: Tower) {
        this.money += this.sellValue(t);
        this.towerAt[t.row][t.col] = null;
        this.towers = this.towers.filter(x => x.id !== t.id);
        this.puff(t.x, t.y, 0xffffff, 12);
    }

    // ---- waves ----
    startWave(): boolean {
        if (this.waveActive || this.waveIndex >= WAVES.length) return false;
        const w = WAVES[this.waveIndex];
        this.spawnQueue = [];
        for (const sp of w.spawns) {
            for (let i = 0; i < sp.count; i++) {
                this.spawnQueue.push({ kind: sp.kind, at: this.time + sp.startAt + i * sp.gap });
            }
        }
        this.spawnQueue.sort((a, b) => a.at - b.at);
        this.waveActive = true;
        this.phase = 'combat';
        return true;
    }

    spawn(kind: EnemyKind, offsetP = 0) {
        const d = ENEMIES[kind];
        const hpScale = 1 + this.waveIndex * 0.16;   // gentle scaling per wave
        const pos = pointAt(offsetP);
        const e: Enemy = {
            id: this.nextId++, kind, x: pos.x, y: pos.y,
            hp: Math.round(d.hp * hpScale), maxHp: Math.round(d.hp * hpScale),
            p: offsetP, speed: d.speed, slow: 1, slowT: 0,
            alive: true, leaked: false, boss: !!d.boss, flash: 0,
        };
        this.enemies.push(e);
    }

    // ---- main fixed step ----
    step(dt: number) {
        if (this.phase === 'won' || this.phase === 'lost') { this.stepEffects(dt); return; }
        this.time += dt;

        // spawn from queue
        while (this.spawnQueue.length && this.spawnQueue[0].at <= this.time) {
            const s = this.spawnQueue.shift()!;
            this.spawn(s.kind);
            if (s.kind === 'boss') this.spawnBossFx();
        }

        // enemies move
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 1; }
            if (e.flash > 0) e.flash -= dt;
            e.p += e.speed * e.slow * dt;
            const pos = pointAt(e.p);
            e.x = pos.x; e.y = pos.y;
            if (e.p >= TOTAL) {
                e.alive = false; e.leaked = true;
                this.lives -= ENEMIES[e.kind].damage;
                this.leaks++;
                this.ring(e.x, e.y, 0xff2244);
                if (this.lives <= 0) { this.lives = 0; this.phase = 'lost'; }
            }
        }

        // towers fire
        for (const t of this.towers) {
            if (t.muzzle > 0) t.muzzle -= dt;
            t.cd -= dt;
            if (t.cd > 0) continue;
            const def = TOWERS[t.kind];
            const lvl = def.levels[t.level];
            const target = this.pickTarget(t.x, t.y, lvl.range);
            if (!target) { t.cd = 0; continue; }
            t.cd = lvl.cooldown;
            t.muzzle = 0.12;
            if (def.mode === 'projectile') {
                this.bullets.push({
                    id: this.nextId++, x: t.x, y: t.y, tx: target.x, ty: target.y,
                    targetId: target.id, speed: 460, damage: lvl.damage, alive: true, color: def.color,
                });
            } else {
                this.fireChain(t, target, lvl, def);
            }
        }

        // bullets
        for (const b of this.bullets) {
            if (!b.alive) continue;
            const tgt = this.enemies.find(e => e.id === b.targetId && e.alive);
            if (tgt) { b.tx = tgt.x; b.ty = tgt.y; }
            const dx = b.tx - b.x, dy = b.ty - b.y;
            const dist = Math.hypot(dx, dy);
            const stepLen = b.speed * dt;
            if (dist <= stepLen + 6) {
                b.x = b.tx; b.y = b.ty; b.alive = false;
                if (tgt) this.damage(tgt, b.damage, false);
                this.puff(b.tx, b.ty, b.color, 5);
            } else {
                b.x += dx / dist * stepLen; b.y += dy / dist * stepLen;
            }
        }

        // cleanup dead enemies
        this.enemies = this.enemies.filter(e => e.alive || (e.flash > 0 && e.leaked));
        // wave end detection
        if (this.waveActive) {
            const remaining = this.enemies.some(e => e.alive) || this.spawnQueue.length > 0;
            if (!remaining) {
                this.waveActive = false;
                const reward = WAVES[this.waveIndex].reward;
                this.money += reward;
                this.pushText(this.moneyX(), PLAY_TOP + 20, '+' + reward, 0x8be04a);
                this.waveIndex++;
                if (this.waveIndex >= WAVES.length) {
                    this.phase = 'won';
                } else {
                    this.phase = 'intermission'; this.intermissionT = 8;
                }
            }
        }
        if (this.phase === 'intermission') {
            this.intermissionT -= dt;
            if (this.intermissionT <= 0) this.startWave();
        }

        this.stepEffects(dt);
    }

    private stepEffects(dt: number) {
        for (const p of this.particles) {
            p.life -= dt;
            if (p.kind !== 'text') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
            else { p.y -= 20 * dt; }
        }
        this.particles = this.particles.filter(p => p.life > 0);
        for (const b of this.bolts) b.life -= dt;
        this.bolts = this.bolts.filter(b => b.life > 0);
        this.bullets = this.bullets.filter(b => b.alive);
    }

    private pickTarget(x: number, y: number, range: number): Enemy | null {
        let best: Enemy | null = null;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (Math.hypot(e.x - x, e.y - y) <= range) {
                if (!best || e.p > best.p) best = e;   // furthest along path
            }
        }
        return best;
    }

    private fireChain(t: Tower, first: Enemy, lvl: TowerLevel, def: typeof TOWERS[TowerKind]) {
        const hits: Enemy[] = [first];
        let cur = first;
        const chainRange = def.chainRange || 90;
        for (let i = 1; i < (lvl.splash || 2); i++) {
            let nx: Enemy | null = null; let nd = chainRange;
            for (const e of this.enemies) {
                if (!e.alive || hits.includes(e)) continue;
                const d = Math.hypot(e.x - cur.x, e.y - cur.y);
                if (d < nd) { nd = d; nx = e; }
            }
            if (!nx) break;
            hits.push(nx); cur = nx;
        }
        const pts = [t.x, t.y];
        for (const h of hits) {
            pts.push(h.x, h.y);
            this.damage(h, lvl.damage, true);
            if (def.slow) { h.slow = def.slow; h.slowT = def.slowTime || 1; }
        }
        this.bolts.push({ pts, life: 0.16, max: 0.16, color: def.color });
    }

    private damage(e: Enemy, amount: number, isChain: boolean) {
        const armor = ENEMIES[e.kind].armor;
        const dealt = Math.max(1, amount - armor);
        e.hp -= dealt;
        e.flash = 0.08;
        if (e.hp <= 0 && e.alive) {
            e.alive = false;
            this.kills++;
            this.money += ENEMIES[e.kind].bounty;
            this.pushText(e.x, e.y - 10, '+' + ENEMIES[e.kind].bounty, 0xffd24a);
            if (e.boss) { this.explodeBig(e.x, e.y); }
            else this.explodeSmall(e.x, e.y, ENEMIES[e.kind].color);
            void isChain;
        }
    }

    // ---- fx spawners ----
    private puff(x: number, y: number, color: number, n: number) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
            this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20,
                life: 0.4 + Math.random() * 0.3, max: 0.7, color, size: 2 + Math.random() * 3, kind: 'spark' });
        }
    }
    private explodeSmall(x: number, y: number, color: number) {
        for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120;
            this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
                life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 4, kind: 'spark' });
        }
        this.ring(x, y, color);
    }
    private explodeBig(x: number, y: number) {
        for (let i = 0; i < 60; i++) {
            const a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260;
            this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                life: 0.8 + Math.random() * 0.8, max: 1.6, color: i % 3 ? 0xff3355 : 0xffd24a, size: 3 + Math.random() * 6, kind: 'spark' });
        }
        this.ring(x, y, 0xffd24a); this.ring(x, y, 0xff3355);
    }
    private ring(x: number, y: number, color: number) {
        this.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, max: 0.45, color, size: 4, kind: 'ring' });
    }
    private pushText(x: number, y: number, text: string, color: number) {
        this.particles.push({ x, y, vx: 0, vy: 0, life: 0.9, max: 0.9, color, size: 12, kind: 'text', text });
    }
    private spawnBossFx() {
        this.ring(PATH[0].x + 40, PATH[0].y, 0xff3355);
    }
    private moneyX() { return VIEW_W / 2; }

    // ---- inspection ----
    renderToText(): any {
        return {
            coords: 'origin top-left; x right 0..1024, y down 0..640; map below y=64',
            phase: this.phase,
            time: Math.round(this.time * 10) / 10,
            money: this.money,
            lives: this.lives,
            wave: { index: this.waveIndex, total: WAVES.length, active: this.waveActive },
            kills: this.kills,
            leaks: this.leaks,
            towers: this.towers.map(t => ({ id: t.id, kind: t.kind, level: t.level, x: Math.round(t.x), y: Math.round(t.y) })),
            enemies: this.enemies.filter(e => e.alive).map(e => ({
                id: e.id, kind: e.kind, x: Math.round(e.x), y: Math.round(e.y),
                hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp,
                slow: e.slow < 1, boss: e.boss,
            })),
            bullets: this.bullets.map(b => ({ x: Math.round(b.x), y: Math.round(b.y) })),
        };
    }
}
