import { PADS, PATH_LENGTH, pointAtDistance } from './path';

export type TowerType = 'lance' | 'pulse';
export type EnemyType = 'scarab' | 'crawler' | 'drone' | 'titan';
export type Phase = 'tutorial' | 'build' | 'combat' | 'won' | 'lost';

export interface TowerStats {
    name: string;
    role: string;
    cost: number;
    range: number[];
    damage: number[];
    rate: number[];
    blast: number[];
    upgradeCost: number[];
    color: number;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
    lance: {
        name: 'Solar Lance',
        role: 'Long range · single target',
        cost: 90,
        range: [185, 205, 228],
        damage: [28, 45, 68],
        rate: [0.85, 0.78, 0.68],
        blast: [0, 0, 0],
        upgradeCost: [80, 140],
        color: 0x6fe3d6
    },
    pulse: {
        name: 'Pulse Coil',
        role: 'Short range · area burst',
        cost: 115,
        range: [125, 140, 158],
        damage: [15, 23, 34],
        rate: [1.15, 1.05, 0.95],
        blast: [48, 58, 70],
        upgradeCost: [95, 165],
        color: 0xf2a33c
    }
};

export interface EnemyDef {
    name: string;
    hp: number;
    speed: number;
    reward: number;
    leak: number;
    scale: number;
}

export const ENEMY_STATS: Record<EnemyType, EnemyDef> = {
    scarab: { name: 'Scarab', hp: 36, speed: 56, reward: 14, leak: 1, scale: 1 },
    crawler: { name: 'Dune Crawler', hp: 135, speed: 33, reward: 28, leak: 2, scale: 1.1 },
    drone: { name: 'Glass Drone', hp: 28, speed: 88, reward: 17, leak: 1, scale: 1 },
    titan: { name: 'Sandstorm Titan', hp: 3800, speed: 26, reward: 320, leak: 7, scale: 1 }
};

export interface Enemy {
    id: number;
    type: EnemyType;
    dist: number;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    speed: number;
    reward: number;
    leak: number;
    alive: boolean;
    age: number;
    angle: number;
    hitFlash: number;
}

export interface Tower {
    id: number;
    type: TowerType;
    padIndex: number;
    x: number;
    y: number;
    level: number;
    cooldown: number;
    angle: number;
    invested: number;
    targetId: number | null;
}

export type GameEvent =
    | { kind: 'build'; x: number; y: number; tower: TowerType }
    | { kind: 'upgrade'; x: number; y: number; level: number }
    | { kind: 'sell'; x: number; y: number }
    | { kind: 'deny'; reason: string }
    | { kind: 'beam'; x: number; y: number; x2: number; y2: number }
    | { kind: 'pulse'; x: number; y: number; radius: number }
    | { kind: 'hit'; x: number; y: number; damage: number; boss: boolean }
    | { kind: 'death'; x: number; y: number; type: EnemyType; reward: number }
    | { kind: 'leak'; x: number; y: number; amount: number }
    | { kind: 'waveStart'; wave: number; name: string }
    | { kind: 'waveClear'; wave: number; bonus: number }
    | { kind: 'win' }
    | { kind: 'lose' }
    | { kind: 'boss' }
    | { kind: 'titanDown' };

interface WaveDef {
    name: string;
    subtitle: string;
    bonus: number;
    units: { type: EnemyType; at: number }[];
}

function waveDefs(): WaveDef[] {
    const defs: WaveDef[] = [];

    // 1 — a gentle scout wave.
    const w1: { type: EnemyType; at: number }[] = [];
    for (let i = 0; i < 8; i++) w1.push({ type: 'scarab', at: 1.4 + i * 0.85 });
    defs.push({ name: 'Scarab Skitter', subtitle: 'Light carapace scouts', bonus: 75, units: w1 });

    // 2 — armoured crawlers join.
    const w2: { type: EnemyType; at: number }[] = [];
    for (let i = 0; i < 5; i++) w2.push({ type: 'scarab', at: 1.2 + i * 0.7 });
    for (let i = 0; i < 4; i++) w2.push({ type: 'crawler', at: 2.2 + i * 1.5 });
    defs.push({ name: 'Iron Caravan', subtitle: 'Plated crawlers inbound', bonus: 90, units: w2 });

    // 3 — fast glass drones.
    const w3: { type: EnemyType; at: number }[] = [];
    for (let i = 0; i < 6; i++) w3.push({ type: 'drone', at: 1.2 + i * 0.7 });
    for (let i = 0; i < 6; i++) w3.push({ type: 'scarab', at: 2.0 + i * 0.9 });
    defs.push({ name: 'Glasswing Rush', subtitle: 'Drones cut the corners', bonus: 105, units: w3 });

    // 4 — mixed pressure.
    const w4: { type: EnemyType; at: number }[] = [];
    for (let i = 0; i < 6; i++) w4.push({ type: 'scarab', at: 1.1 + i * 0.6 });
    for (let i = 0; i < 5; i++) w4.push({ type: 'crawler', at: 1.7 + i * 1.25 });
    for (let i = 0; i < 7; i++) w4.push({ type: 'drone', at: 2.5 + i * 0.75 });
    defs.push({ name: 'Sunscour', subtitle: 'Three vectors, one relay', bonus: 120, units: w4 });

    // 5 — the outpost is tested.
    const w5: { type: EnemyType; at: number }[] = [];
    for (let i = 0; i < 8; i++) w5.push({ type: 'drone', at: 1.1 + i * 0.55 });
    for (let i = 0; i < 7; i++) w5.push({ type: 'crawler', at: 1.5 + i * 1.05 });
    for (let i = 0; i < 9; i++) w5.push({ type: 'scarab', at: 2.0 + i * 0.5 });
    defs.push({ name: 'Siege of Glass', subtitle: 'Hold the line', bonus: 140, units: w5 });

    // 6 — boss and escorts.
    const w6: { type: EnemyType; at: number }[] = [];
    w6.push({ type: 'titan', at: 2.2 });
    for (let i = 0; i < 10; i++) w6.push({ type: i % 2 === 0 ? 'drone' : 'crawler', at: 3.0 + i * 0.95 });
    defs.push({ name: 'Sandstorm Titan', subtitle: 'Final assault', bonus: 0, units: w6 });

    return defs;
}

export const WAVES: WaveDef[] = waveDefs();
export const TOTAL_WAVES = WAVES.length;

export class RelayModel {
    credits = 300;
    integrity = 20;
    maxIntegrity = 20;
    wave = 1;
    phase: Phase = 'tutorial';
    paused = false;
    speed = 1;
    muted = false;

    towers: Tower[] = [];
    enemies: Enemy[] = [];
    events: GameEvent[] = [];

    kills = 0;
    creditsEarned = 0;
    leaked = 0;
    waveTime = 0;
    spawnQueue: { type: EnemyType; at: number; spawned: boolean }[] = [];
    selectedTowerId: number | null = null;
    buildType: TowerType | null = null;
    hoverPad: number | null = null;
    lastMessage = '';

    private nextEnemyId = 1;
    private nextTowerId = 1;
    private spawnIndex = 0;

    reset(): void {
        this.credits = 300;
        this.integrity = this.maxIntegrity;
        this.wave = 1;
        this.phase = 'tutorial';
        this.paused = false;
        this.speed = 1;
        this.towers = [];
        this.enemies = [];
        this.events = [];
        this.kills = 0;
        this.creditsEarned = 0;
        this.leaked = 0;
        this.waveTime = 0;
        this.spawnQueue = [];
        this.selectedTowerId = null;
        this.buildType = null;
        this.hoverPad = null;
        this.lastMessage = '';
        this.nextEnemyId = 1;
        this.nextTowerId = 1;
        this.spawnIndex = 0;
    }

    beginBuild(): void {
        if (this.phase === 'tutorial') {
            this.phase = 'build';
            this.lastMessage = 'Build on the pads, then start the wave.';
        }
    }

    startWave(): boolean {
        if (this.phase !== 'build') return false;
        const def = WAVES[this.wave - 1];
        this.phase = 'combat';
        this.waveTime = 0;
        this.spawnIndex = 0;
        this.spawnQueue = def.units
            .slice()
            .sort((a, b) => a.at - b.at)
            .map((u) => ({ ...u, spawned: false }));
        this.events.push({ kind: 'waveStart', wave: this.wave, name: def.name });
        this.lastMessage = `${def.name} inbound`;
        return true;
    }

    towerAtPad(padIndex: number): Tower | undefined {
        return this.towers.find((t) => t.padIndex === padIndex);
    }

    placeTower(padIndex: number, type: TowerType): boolean {
        if (this.phase !== 'build') {
            this.deny('You can only build between waves');
            return false;
        }
        if (this.towerAtPad(padIndex)) {
            this.deny('That pad is occupied');
            return false;
        }
        const stats = TOWER_STATS[type];
        if (this.credits < stats.cost) {
            this.deny('Not enough credits');
            return false;
        }
        const pad = PADS[padIndex];
        this.credits -= stats.cost;
        const tower: Tower = {
            id: this.nextTowerId++,
            type,
            padIndex,
            x: pad.x,
            y: pad.y,
            level: 1,
            cooldown: 0.35,
            angle: -Math.PI / 2,
            invested: stats.cost,
            targetId: null
        };
        this.towers.push(tower);
        this.selectedTowerId = tower.id;
        this.buildType = null;
        this.events.push({ kind: 'build', x: tower.x, y: tower.y, tower: type });
        this.lastMessage = `${stats.name} online`;
        return true;
    }

    upgradeSelected(): boolean {
        const tower = this.selectedTower();
        if (!tower) {
            this.deny('Select a tower first');
            return false;
        }
        if (this.phase !== 'build') {
            this.deny('Upgrade between waves');
            return false;
        }
        if (tower.level >= 3) {
            this.deny('Already at max level');
            return false;
        }
        const stats = TOWER_STATS[tower.type];
        const cost = stats.upgradeCost[tower.level - 1];
        if (this.credits < cost) {
            this.deny('Not enough credits');
            return false;
        }
        this.credits -= cost;
        tower.invested += cost;
        tower.level++;
        tower.cooldown = 0.2;
        this.events.push({ kind: 'upgrade', x: tower.x, y: tower.y, level: tower.level });
        this.lastMessage = `${stats.name} upgraded to L${tower.level}`;
        return true;
    }

    sellSelected(): boolean {
        const tower = this.selectedTower();
        if (!tower) {
            this.deny('Select a tower first');
            return false;
        }
        if (this.phase !== 'build') {
            this.deny('Sell between waves');
            return false;
        }
        const value = Math.floor(tower.invested * 0.6);
        this.credits += value;
        this.towers = this.towers.filter((t) => t.id !== tower.id);
        this.selectedTowerId = null;
        this.events.push({ kind: 'sell', x: tower.x, y: tower.y });
        this.lastMessage = `Tower sold for ${value} credits`;
        return true;
    }

    selectedTower(): Tower | null {
        if (this.selectedTowerId === null) return null;
        return this.towers.find((t) => t.id === this.selectedTowerId) ?? null;
    }

    togglePause(): void {
        if (this.phase === 'won' || this.phase === 'lost' || this.phase === 'tutorial') return;
        this.paused = !this.paused;
    }

    toggleSpeed(): void {
        this.speed = this.speed === 1 ? 2 : 1;
    }

    deny(reason: string): void {
        this.lastMessage = reason;
        this.events.push({ kind: 'deny', reason });
    }

    get spawnsRemaining(): number {
        return Math.max(0, this.spawnQueue.length - this.spawnIndex);
    }

    get boss(): Enemy | null {
        return this.enemies.find((e) => e.type === 'titan' && e.alive) ?? null;
    }

    tick(dtRaw: number): void {
        if (this.paused || this.phase === 'won' || this.phase === 'lost' || this.phase === 'tutorial') {
            return;
        }
        const dt = Math.min(0.05, Math.max(0, dtRaw)) * this.speed;

        if (this.phase === 'combat') {
            this.waveTime += dt;
            while (this.spawnIndex < this.spawnQueue.length && this.spawnQueue[this.spawnIndex].at <= this.waveTime) {
                this.spawnEnemy(this.spawnQueue[this.spawnIndex].type);
                this.spawnIndex++;
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.age += dt;
            enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 4);
            enemy.dist += enemy.speed * dt;
            const point = pointAtDistance(enemy.dist);
            enemy.x = point.x;
            enemy.y = point.y;
            enemy.angle = point.angle;
            if (enemy.dist >= PATH_LENGTH) {
                this.leakEnemy(enemy);
            }
        }

        for (const tower of this.towers) {
            tower.cooldown -= dt;
            if (tower.cooldown > 0) continue;
            this.fireTower(tower);
        }

        const dead = this.enemies.filter((e) => !e.alive);
        if (dead.length) {
            this.enemies = this.enemies.filter((e) => e.alive);
        }

        if (this.phase === 'combat' && this.spawnIndex >= this.spawnQueue.length && this.enemies.length === 0) {
            this.finishWave();
        }
    }

    private spawnEnemy(type: EnemyType): void {
        const stats = ENEMY_STATS[type];
        const scale = 1 + 0.16 * (this.wave - 1);
        const hp = type === 'titan' ? stats.hp : Math.round(stats.hp * scale);
        const enemy: Enemy = {
            id: this.nextEnemyId++,
            type,
            dist: 0,
            x: 0,
            y: 0,
            hp,
            maxHp: hp,
            speed: stats.speed * (1 + 0.02 * (this.wave - 1)),
            reward: stats.reward,
            leak: stats.leak,
            alive: true,
            age: 0,
            angle: 0,
            hitFlash: 0
        };
        const point = pointAtDistance(0);
        enemy.x = point.x;
        enemy.y = point.y;
        enemy.angle = point.angle;
        this.enemies.push(enemy);
        if (type === 'titan') {
            this.events.push({ kind: 'boss' });
            this.lastMessage = 'SANDSTORM TITAN has entered the sector';
        }
    }

    private fireTower(tower: Tower): void {
        const stats = TOWER_STATS[tower.type];
        const range = stats.range[tower.level - 1];
        let target: Enemy | null = null;
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
            if (d <= range && (!target || enemy.dist > target.dist)) {
                target = enemy;
            }
        }
        if (!target) {
            tower.targetId = null;
            tower.angle += 0.25 / 60;
            return;
        }
        tower.targetId = target.id;
        tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
        tower.cooldown = stats.rate[tower.level - 1];
        const damage = stats.damage[tower.level - 1];

        if (tower.type === 'lance') {
            this.events.push({ kind: 'beam', x: tower.x, y: tower.y, x2: target.x, y2: target.y });
            this.damageEnemy(target, damage);
        } else {
            const blast = stats.blast[tower.level - 1];
            this.events.push({ kind: 'pulse', x: target.x, y: target.y, radius: blast });
            const victims = this.enemies.filter(
                (e) => e.alive && Math.hypot(e.x - target!.x, e.y - target!.y) <= blast
            );
            for (const victim of victims) {
                this.damageEnemy(victim, damage);
            }
        }
    }

    private damageEnemy(enemy: Enemy, damage: number): void {
        if (!enemy.alive) return;
        enemy.hp -= damage;
        enemy.hitFlash = 1;
        this.events.push({
            kind: 'hit',
            x: enemy.x,
            y: enemy.y,
            damage,
            boss: enemy.type === 'titan'
        });
        if (enemy.hp <= 0) {
            enemy.alive = false;
            this.kills++;
            this.credits += enemy.reward;
            this.creditsEarned += enemy.reward;
            this.events.push({ kind: 'death', x: enemy.x, y: enemy.y, type: enemy.type, reward: enemy.reward });
            if (enemy.type === 'titan') {
                this.events.push({ kind: 'titanDown' });
                this.lastMessage = 'Titan down!';
            }
        }
    }

    private leakEnemy(enemy: Enemy): void {
        enemy.alive = false;
        this.leaked++;
        this.integrity = Math.max(0, this.integrity - enemy.leak);
        this.events.push({ kind: 'leak', x: enemy.x, y: enemy.y, amount: enemy.leak });
        this.lastMessage = `Relay hit! -${enemy.leak} integrity`;
        if (this.integrity <= 0) {
            this.phase = 'lost';
            this.paused = false;
            this.events.push({ kind: 'lose' });
        }
    }

    private finishWave(): void {
        const def = WAVES[this.wave - 1];
        if (def.bonus > 0) {
            this.credits += def.bonus;
            this.creditsEarned += def.bonus;
        }
        this.events.push({ kind: 'waveClear', wave: this.wave, bonus: def.bonus });
        if (this.wave >= TOTAL_WAVES) {
            this.phase = 'won';
            this.paused = false;
            this.events.push({ kind: 'win' });
            this.lastMessage = 'All waves repelled. Relay held.';
        } else {
            this.wave++;
            this.phase = 'build';
            this.selectedTowerId = null;
            this.buildType = null;
            this.lastMessage = `Wave cleared · +${def.bonus} credits`;
        }
    }

    drainEvents(): GameEvent[] {
        const out = this.events;
        this.events = [];
        return out;
    }

    stateSummary(): Record<string, unknown> {
        const boss = this.boss;
        return {
            mode: this.phase,
            paused: this.paused,
            speed: this.speed,
            muted: this.muted,
            wave: this.wave,
            totalWaves: TOTAL_WAVES,
            waveName: WAVES[this.wave - 1]?.name ?? '',
            credits: this.credits,
            integrity: this.integrity,
            maxIntegrity: this.maxIntegrity,
            kills: this.kills,
            creditsEarned: this.creditsEarned,
            leaked: this.leaked,
            buildType: this.buildType,
            selectedTowerId: this.selectedTowerId,
            selectedTower: this.selectedTower()
                ? {
                      id: this.selectedTower()!.id,
                      type: this.selectedTower()!.type,
                      level: this.selectedTower()!.level,
                      x: Math.round(this.selectedTower()!.x),
                      y: Math.round(this.selectedTower()!.y)
                  }
                : null,
            towers: this.towers.map((t) => ({
                id: t.id,
                type: t.type,
                level: t.level,
                x: Math.round(t.x),
                y: Math.round(t.y),
                pad: t.padIndex,
                range: TOWER_STATS[t.type].range[t.level - 1]
            })),
            enemies: this.enemies.map((e) => ({
                id: e.id,
                type: e.type,
                x: Math.round(e.x),
                y: Math.round(e.y),
                hp: Math.round(e.hp),
                maxHp: e.maxHp,
                progress: Math.round((e.dist / PATH_LENGTH) * 100)
            })),
            boss: boss ? { hp: Math.round(boss.hp), maxHp: boss.maxHp } : null,
            spawnsRemaining: Math.max(0, this.spawnQueue.length - this.spawnIndex),
            message: this.lastMessage
        };
    }
}
