import { Math as PhaserMath, Scene, TintModes } from 'phaser';
import {
    C, CORE_POS, COUNTDOWN, CHAIN_RANGE, EARLY_BONUS, ENEMIES, EnemyDef, EnemyKind,
    FOOT_H, GAME_H, GAME_W, HUD_H, INTER_WAVE, MAP_BOTTOM, MAP_TOP,
    PATH, PATH_WIDTH, SPAWN_POS, START_CORE_HP, START_CREDITS, TOWERS, TowerKind, WAVES
} from '../config';
import { PathData, buildPath, distToPath, pointAt } from '../path';
import { buildMapCanvas } from '../mapArt';
import { makeTextures } from '../textures';
import { UIButton, panel } from '../ui';
import { audio } from '../audio';

interface Enemy {
    kind: EnemyKind;
    def: EnemyDef;
    hp: number;
    maxHp: number;
    dist: number;
    x: number;
    y: number;
    angle: number;
    sprite: Phaser.GameObjects.Image;
    shadow: Phaser.GameObjects.Image;
    flash: number;
    alive: boolean;
}

interface Tower {
    kind: TowerKind;
    x: number;
    y: number;
    level: number;
    cooldown: number;
    angle: number;
    invested: number;
    sprite: Phaser.GameObjects.Image;
    head: Phaser.GameObjects.Image;
    shadow: Phaser.GameObjects.Image;
    recoil: number;
}

/** Distance from the tower base to the rotating emitter, in screen pixels. */
const EMIT_H: Record<TowerKind, number> = { prism: 37, coil: 48 };
/** vertical origin of the rotating emitter head (pivot inside the sprite) */
const HEAD_OY: Record<TowerKind, number> = { prism: 0.9, coil: 0.62 };
/** Distance from the emitter to the muzzle, per level (0-based). */
const MOUTH_H: Record<TowerKind, number[]> = { prism: [31, 31, 31], coil: [45, 54, 63] };
/** Texture keys for the static body and the rotating head. */
const BODY_KEY: Record<TowerKind, string> = { prism: 'twp', coil: 'twc' };
const HEAD_KEY: Record<TowerKind, string> = { prism: 'twph', coil: 'twch' };

interface Particle {
    x: number; y: number; vx: number; vy: number; life: number; max: number;
    color: number; size: number; grav: number;
}

interface BeamFx { kind: 'beam'; ax: number; ay: number; bx: number; by: number; life: number; max: number; color: number }
interface ArcFx { kind: 'arc'; pts: PhaserMath.Vector2[]; life: number; max: number; color: number }
interface RingFx { kind: 'ring'; x: number; y: number; r: number; life: number; max: number; color: number }
type Fx = BeamFx | ArcFx | RingFx;

type Phase = 'countdown' | 'wave' | 'won' | 'lost';

export class GameScene extends Scene {
    private pathData!: PathData;
    private fxG!: Phaser.GameObjects.Graphics;
    private barG!: Phaser.GameObjects.Graphics;
    private overlayG!: Phaser.GameObjects.Graphics;
    private hudG!: Phaser.GameObjects.Graphics;
    private ghost!: Phaser.GameObjects.Image;

    private towers: Tower[] = [];
    private enemies: Enemy[] = [];
    private particles: Particle[] = [];
    private effects: Fx[] = [];
    private spawnQueue: { t: number; kind: EnemyKind }[] = [];

    private credits = START_CREDITS;
    private coreHp = START_CORE_HP;
    private waveIndex = 0;
    private phase: Phase = 'countdown';
    private countdown = COUNTDOWN;
    private waveClock = 0;
    private speed = 1;
    private paused = false;
    private muted = false;
    private useManual = false;

    private selectedBuild: TowerKind | null = null;
    private selectedTower: Tower | null = null;
    private kills = 0;
    private leaked = 0;
    private hintText = '';
    private hintTimer = 0;
    private bannerText: Phaser.GameObjects.Text | null = null;
    private bannerTimer = 0;
    private simClock = 0;

    // HUD text
    private tCredits!: Phaser.GameObjects.Text;
    private tHp!: Phaser.GameObjects.Text;
    private tWave!: Phaser.GameObjects.Text;
    private tWaveName!: Phaser.GameObjects.Text;
    private tStatus!: Phaser.GameObjects.Text;
    private tInspect!: Phaser.GameObjects.Text;

    // Buttons
    private btnPrism!: UIButton;
    private btnCoil!: UIButton;
    private btnSend!: UIButton;
    private btnSpeed!: UIButton;
    private btnPause!: UIButton;
    private btnMute!: UIButton;
    private btnRestart!: UIButton;
    private btnUpgrade!: UIButton;
    private btnSell!: UIButton;
    private overlayButtons: UIButton[] = [];

    constructor() {
        super('Game');
    }

    /* ================================================================ setup */

    create(): void {
        this.towers = [];
        this.enemies = [];
        this.particles = [];
        this.effects = [];
        this.credits = START_CREDITS;
        this.coreHp = START_CORE_HP;
        this.waveIndex = 0;
        this.phase = 'countdown';
        this.countdown = COUNTDOWN;
        this.waveClock = 0;
        this.speed = 1;
        this.paused = false;
        this.selectedBuild = null;
        this.selectedTower = null;
        this.kills = 0;
        this.leaked = 0;
        this.useManual = false;

        this.pathData = buildPath(PATH);
        makeTextures(this);

        // --- map -----------------------------------------------------------
        const canvas = buildMapCanvas(this.pathData);
        if (this.textures.exists('map-bg')) this.textures.remove('map-bg');
        this.textures.addCanvas('map-bg', canvas);
        this.add.image(0, MAP_TOP, 'map-bg').setOrigin(0).setDepth(0);

        this.barG = this.add.graphics().setDepth(24);
        this.fxG = this.add.graphics().setDepth(32);
        this.overlayG = this.add.graphics().setDepth(36);
        this.ghost = this.add.image(0, 0, 'twp-1').setOrigin(0.5, 0.88).setAlpha(0.6).setDepth(35).setVisible(false).setScale(1.3);

        // relay core structure
        this.add.image(CORE_POS.x, CORE_POS.y + 8, 'shadow').setDisplaySize(120, 46).setAlpha(0.5).setDepth(8);
        this.add.image(CORE_POS.x, CORE_POS.y, 'core-base').setOrigin(0.5, 0.88).setDepth(10);
        this.dish = this.add.image(CORE_POS.x, CORE_POS.y - 68, 'core-dish').setOrigin(0.5, 0.72).setDepth(11);

        // --- HUD -----------------------------------------------------------
        this.hudG = this.add.graphics().setDepth(90);
        this.buildHudText();

        // --- input ---------------------------------------------------------
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
        this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.onPointerUp(p));
        this.input.keyboard?.on('keydown', (e: KeyboardEvent) => this.onKey(e));

        this.setHint('Build a tower: click PRISM BEAM or ARC COIL, then click the sand.', 6);
        this.refreshHud();
    }

    private dish!: Phaser.GameObjects.Image;

    private buildHudText(): void {
        this.add.text(18, 29, 'RELAY DEFENSE', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '19px', color: '#ffc247'
        }).setOrigin(0, 0.5).setDepth(92);

        this.tHp = this.add.text(180, 29, '', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '15px', color: '#e8f0f8'
        }).setOrigin(0, 0.5).setDepth(92);

        this.tCredits = this.add.text(454, 29, '', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '16px', color: '#ffd98a'
        }).setOrigin(0, 0.5).setDepth(92);

        this.tWave = this.add.text(512, 29, '', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '15px', color: '#ffffff'
        }).setOrigin(0, 0.5).setDepth(92);

        this.tWaveName = this.add.text(606, 29, '', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '14px', color: '#9fb6cc'
        }).setOrigin(0, 0.5).setDepth(92);

        this.btnSpeed = new UIButton(this, 1054, 29, 52, 30, '1x', { fontSize: 14, onClick: () => this.cycleSpeed() });
        this.btnPause = new UIButton(this, 1112, 29, 52, 30, 'PAUSE', { fontSize: 12, onClick: () => this.togglePause() });
        this.btnMute = new UIButton(this, 1170, 29, 52, 30, 'SOUND', { fontSize: 11, onClick: () => this.toggleMute() });
        this.btnRestart = new UIButton(this, 1228, 29, 52, 30, 'RESET', { fontSize: 11, onClick: () => this.restart() });

        // footer command bar
        this.tStatus = this.add.text(16, GAME_H - FOOT_H / 2, '', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '14px', color: '#dfe8f2'
        }).setOrigin(0, 0.5).setDepth(92);

        this.btnSend = new UIButton(this, 660, GAME_H - FOOT_H / 2, 132, 30, 'SEND NOW', {
            fontSize: 13, bg: 0x2f6d4f, border: 0x7ddc6a, textColor: 0xffffff, onClick: () => this.sendWaveNow()
        });
        this.btnSend.setVisible(false);

        this.btnPrism = new UIButton(this, 936, GAME_H - FOOT_H / 2, 150, 32, 'PRISM 100c', {
            fontSize: 14, onClick: () => this.selectBuild(this.selectedBuild === 'prism' ? null : 'prism')
        });
        this.btnCoil = new UIButton(this, 1096, GAME_H - FOOT_H / 2, 150, 32, 'ARC COIL 75c', {
            fontSize: 14, onClick: () => this.selectBuild(this.selectedBuild === 'coil' ? null : 'coil')
        });

        // inspector panel buttons (hidden until a tower is selected)
        this.tInspect = this.add.text(0, 0, '', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '13px', color: '#eef4fa'
        }).setOrigin(0.5).setDepth(38).setVisible(false);
        this.btnUpgrade = new UIButton(this, 0, 0, 120, 26, 'UPGRADE', {
            fontSize: 12, depth: 38, onClick: () => this.upgradeSelected()
        });
        this.btnSell = new UIButton(this, 0, 0, 74, 26, 'SELL', {
            fontSize: 12, depth: 38, onClick: () => this.sellSelected()
        });
        this.btnUpgrade.setVisible(false);
        this.btnSell.setVisible(false);
    }

    /* ============================================================== helpers */

    private onPointerMove(p: Phaser.Input.Pointer): void {
        if (this.selectedBuild) {
            this.ghost.setVisible(true);
            this.ghost.setPosition(p.worldX, p.worldY);
            this.ghost.setTexture(`${BODY_KEY[this.selectedBuild]}-1`);
            const ok = this.canPlace(p.worldX, p.worldY).ok && this.credits >= TOWERS[this.selectedBuild].levels[0].cost;
            if (ok) this.ghost.clearTint();
            else this.ghost.setTint(0xff6a52);
        } else {
            this.ghost.setVisible(false);
        }
    }

    private onPointerDown(p: Phaser.Input.Pointer): void {
        if (this.isUiAt(p.worldX, p.worldY)) return;
        if (p.worldY < HUD_H || p.worldY > MAP_BOTTOM) return;
        if (this.phase === 'won' || this.phase === 'lost') return;

        if (this.selectedBuild) {
            // clicking an existing tower always selects it, even in build mode
            const existing = this.towerAt(p.worldX, p.worldY);
            if (existing) {
                this.selectBuild(null);
                this.selectTower(existing);
                return;
            }
            this.tryPlace(p.worldX, p.worldY);
            return;
        }
        // select an existing tower
        const t = this.towerAt(p.worldX, p.worldY);
        this.selectTower(t);
    }

    private onPointerUp(_p: Phaser.Input.Pointer): void { /* reserved */ }

    private onKey(e: KeyboardEvent): void {
        const k = e.key.toLowerCase();
        if (k === '1') this.selectBuild(this.selectedBuild === 'prism' ? null : 'prism');
        else if (k === '2') this.selectBuild(this.selectedBuild === 'coil' ? null : 'coil');
        else if (k === 'n') this.sendWaveNow();
        else if (k === 'p') this.togglePause();
        else if (k === 'm') this.toggleMute();
        else if (k === 'r') this.restart();
        else if (k === 'u') this.upgradeSelected();
        else if (k === 'escape') { this.selectBuild(null); this.selectTower(null); }
        else if (k === 'f') this.toggleFullscreen();
    }

    private toggleFullscreen(): void {
        if (this.scale.isFullscreen) this.scale.stopFullscreen();
        else this.scale.startFullscreen();
    }

    private isUiAt(x: number, y: number): boolean {
        const all = [this.btnPrism, this.btnCoil, this.btnSend, this.btnSpeed, this.btnPause, this.btnMute, this.btnRestart,
            this.btnUpgrade, this.btnSell, ...this.overlayButtons];
        for (const b of all) {
            if (!b.container.visible) continue;
            if (b.rect.contains(x, y)) return true;
        }
        return false;
    }

    /* ============================================================ build/sell */

    private selectBuild(kind: TowerKind | null): void {
        if (kind && (this.phase === 'won' || this.phase === 'lost')) return;
        this.selectedBuild = kind;
        this.btnPrism.setActive(kind === 'prism');
        this.btnCoil.setActive(kind === 'coil');
        if (kind) {
            this.selectTower(null);
            audio.sfx('click');
        }
        this.ghost.setVisible(!!kind);
    }

    private canPlace(x: number, y: number): { ok: boolean; reason: string } {
        if (x < 26 || x > GAME_W - 26 || y < MAP_TOP + 26 || y > MAP_BOTTOM - 26) {
            return { ok: false, reason: 'Too close to the edge of the map.' };
        }
        if (distToPath(this.pathData, x, y) < PATH_WIDTH / 2 + 16) {
            return { ok: false, reason: 'Too close to the supply road.' };
        }
        if (Math.hypot(x - CORE_POS.x, y - CORE_POS.y) < 86) {
            return { ok: false, reason: 'Too close to the relay core.' };
        }
        if (Math.hypot(x - SPAWN_POS.x, y - SPAWN_POS.y) < 70) {
            return { ok: false, reason: 'Too close to the breach point.' };
        }
        for (const t of this.towers) {
            if (Math.hypot(x - t.x, y - t.y) < 54) return { ok: false, reason: 'Another tower is standing there.' };
        }
        return { ok: true, reason: '' };
    }

    private tryPlace(x: number, y: number): void {
        const kind = this.selectedBuild;
        if (!kind) return;
        const def = TOWERS[kind];
        if (this.credits < def.levels[0].cost) {
            audio.sfx('deny');
            this.setHint(`Not enough credits for a ${def.name}.`, 2.5);
            return;
        }
        const check = this.canPlace(x, y);
        if (!check.ok) {
            audio.sfx('deny');
            this.setHint(check.reason, 2.5);
            return;
        }
        this.credits -= def.levels[0].cost;
        const sprite = this.add.image(x, y, `${BODY_KEY[kind]}-1`).setOrigin(0.5, 0.88).setDepth(14).setScale(1.3);
        const head = this.add.image(x, y - EMIT_H[kind], `${HEAD_KEY[kind]}-1`).setOrigin(0.5, HEAD_OY[kind]).setDepth(15).setScale(1.3);
        const shadow = this.add.image(x, y + 4, 'shadow').setDisplaySize(42, 21).setAlpha(0.45).setDepth(12);
        this.towers.push({
            kind, x, y, level: 0, cooldown: 0.3, angle: 0,
            invested: def.levels[0].cost, sprite, head, shadow, recoil: 0
        });
        audio.sfx('place');
        this.burst(x, y - 26, C.amber, 12, 90);
        this.ring(x, y, 26, C.amber);
        this.ghost.setVisible(false);
        this.setHint(`${def.name} built. Click it to upgrade.`, 3);
    }

    private towerAt(x: number, y: number): Tower | null {
        let best: Tower | null = null;
        let bestD = 30;
        for (const t of this.towers) {
            const d = Math.hypot(x - t.x, y - t.y);
            if (d < bestD) { bestD = d; best = t; }
        }
        return best;
    }

    private nearestRoadPoint(x: number, y: number): { x: number; y: number } {
        const step = 32;
        let best = { x: this.pathData.segs[0]?.ax ?? x, y: this.pathData.segs[0]?.ay ?? y };
        let bestD = Infinity;
        for (let d = 0; d <= this.pathData.total; d += step) {
            const p = pointAt(this.pathData, d);
            const dd = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
            if (dd < bestD) { bestD = dd; best = { x: p.x, y: p.y }; }
        }
        return best;
    }

    private selectTower(t: Tower | null): void {
        this.selectedTower = t;
        if (!t) {
            this.tInspect.setVisible(false);
            this.btnUpgrade.setVisible(false);
            this.btnSell.setVisible(false);
            return;
        }
        this.tInspect.setVisible(true);
        this.btnUpgrade.setVisible(true);
        this.btnSell.setVisible(true);
        this.updateInspector();
    }

    private updateInspector(): void {
        const t = this.selectedTower;
        if (!t) return;
        const def = TOWERS[t.kind];
        const lvl = def.levels[t.level];
        const next = def.levels[t.level + 1];
        const px = PhaserMath.Clamp(t.x, 130, GAME_W - 130);
        const py = PhaserMath.Clamp(t.y - 92, MAP_TOP + 60, MAP_BOTTOM - 60);
        this.tInspect.setPosition(px, py - 14);
        this.tInspect.setText(`${def.name.toUpperCase()}  ·  Lv${t.level + 1}\nDMG ${lvl.damage}  RNG ${lvl.range}  ${lvl.fireRate.toFixed(2)}/s`);
        this.tInspect.setAlign('center');
        this.btnUpgrade.setPosition(px - 64, py + 22);
        this.btnSell.setPosition(px + 62, py + 22);
        if (next) {
            this.btnUpgrade.setText(`UPGRADE ${next.cost}c`);
            this.btnUpgrade.setEnabled(this.credits >= next.cost && !this.paused);
        } else {
            this.btnUpgrade.setText('MAX LEVEL');
            this.btnUpgrade.setEnabled(false);
        }
        const refund = Math.floor(t.invested * 0.6);
        this.btnSell.setText(`SELL ${refund}c`);
    }

    private upgradeSelected(): void {
        const t = this.selectedTower;
        if (!t) return;
        const def = TOWERS[t.kind];
        const next = def.levels[t.level + 1];
        if (!next) { audio.sfx('deny'); return; }
        if (this.credits < next.cost) { audio.sfx('deny'); this.setHint('Not enough credits to upgrade.', 2.5); return; }
        this.credits -= next.cost;
        t.invested += next.cost;
        t.level++;
        t.sprite.setTexture(`${BODY_KEY[t.kind]}-${t.level + 1}`);
        t.head.setTexture(`${HEAD_KEY[t.kind]}-${t.level + 1}`);
        audio.sfx('upgrade');
        this.burst(t.x, t.y - 30, def.tint, 18, 120);
        this.ring(t.x, t.y, 34, def.tint);
        this.updateInspector();
        this.refreshHud();
    }

    private sellSelected(): void {
        const t = this.selectedTower;
        if (!t) return;
        const refund = Math.floor(t.invested * 0.6);
        this.credits += refund;
        t.sprite.destroy();
        t.head.destroy();
        t.shadow.destroy();
        this.towers = this.towers.filter((x) => x !== t);
        audio.sfx('sell');
        this.setHint(`Tower sold for ${refund}c.`, 2.5);
        this.selectTower(null);
        this.refreshHud();
    }

    /* ============================================================== waves */

    private sendWaveNow(): void {
        if (this.phase !== 'countdown') return;
        const bonus = EARLY_BONUS + this.waveIndex * 5;
        this.credits += bonus;
        audio.sfx('click');
        this.setHint(`Wave sent early  +${bonus}c`, 2.5);
        this.startWave();
    }

    private startWave(): void {
        const wave = WAVES[this.waveIndex];
        this.phase = 'wave';
        this.waveClock = 0;
        this.spawnQueue = [];
        for (const grp of wave.groups) {
            for (let i = 0; i < grp.count; i++) {
                this.spawnQueue.push({ t: grp.delay + i * grp.gap, kind: grp.kind });
            }
        }
        this.spawnQueue.sort((a, b) => a.t - b.t);
        this.btnSend.setVisible(false);
        this.banner(`WAVE ${this.waveIndex + 1}  ·  ${wave.name.toUpperCase()}`);
        audio.sfx('waveStart');
    }

    private banner(text: string): void {
        if (this.bannerText) this.bannerText.destroy();
        this.bannerText = this.add.text(GAME_W / 2, 168, text, {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '34px', color: '#fff3d4'
        }).setOrigin(0.5).setDepth(38);
        this.bannerText.setStroke('#2a1a08', 6);
        this.bannerTimer = 2.4;
    }

    private completeWave(): void {
        const bonus = 40 + (this.waveIndex + 1) * 20;
        this.credits += bonus;
        audio.sfx('upgrade');
        if (this.waveIndex + 1 >= WAVES.length) {
            this.phase = 'won';
            this.showEnd(true);
            return;
        }
        this.waveIndex++;
        this.phase = 'countdown';
        this.countdown = INTER_WAVE;
        this.btnSend.setVisible(true);
        this.setHint(`Wave cleared  +${bonus}c`, 3.5);
    }

    /* ============================================================ simulation */

    private spawnEnemy(kind: EnemyKind): void {
        const def = ENEMIES[kind];
        const p = pointAt(this.pathData, 0);
        const shadow = this.add.image(p.x, p.y + 4, 'shadow')
            .setDisplaySize(def.radius * 2.4, def.radius * 1.2).setAlpha(0.45).setDepth(11);
        const sprite = this.add.image(p.x, p.y, `en-${kind}`).setOrigin(0.5, 0.5).setDepth(20);
        sprite.setScale(kind === 'boss' ? 1 : 1);
        this.enemies.push({
            kind, def, hp: def.hp, maxHp: def.hp, dist: 0, x: p.x, y: p.y,
            angle: p.angle, sprite, shadow, flash: 0, alive: true
        });
    }

    /** One simulation step. dt is game-time seconds. */
    public simulate(dt: number): void {
        this.simClock += dt;
        if (this.phase === 'won' || this.phase === 'lost') {
            this.stepParticles(dt);
            this.drawEffects();
            return;
        }
        if (this.paused) {
            this.drawEffects();
            return;
        }
        const steps = Math.max(1, Math.ceil(dt / 0.02));
        const sub = dt / steps;
        for (let i = 0; i < steps; i++) this.step(sub);
        this.drawEffects();
    }

    private step(dt: number): void {
        // countdown between waves
        if (this.phase === 'countdown') {
            this.countdown -= dt;
            if (this.countdown <= 0) this.startWave();
        }

        // spawning
        if (this.phase === 'wave') {
            this.waveClock += dt;
            while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveClock) {
                const s = this.spawnQueue.shift()!;
                this.spawnEnemy(s.kind);
            }
        }

        // enemies
        for (const e of this.enemies) {
            if (!e.alive) continue;
            e.dist += e.def.speed * dt;
            if (e.flash > 0) e.flash -= dt;
            const p = pointAt(this.pathData, e.dist);
            e.x = p.x;
            e.y = p.y;
            e.angle = p.angle;
            if (e.dist >= this.pathData.total) {
                this.leak(e);
                continue;
            }
        }

        // towers
        for (const t of this.towers) {
            t.cooldown -= dt;
            if (t.recoil > 0) t.recoil -= dt;
            const target = this.findTarget(t);
            if (target) {
                const want = Math.atan2(target.y - t.y, target.x - t.x) + Math.PI / 2;
                let diff = want - t.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                t.angle += diff * Math.min(1, dt * 12);
                if (t.cooldown <= 0) {
                    this.fire(t, target);
                    t.cooldown = 1 / TOWERS[t.kind].levels[t.level].fireRate;
                    t.recoil = 0.12;
                }
            } else {
                // idle: sweep the emitter slowly toward the nearest stretch of road
                const road = this.nearestRoadPoint(t.x, t.y);
                const want = Math.atan2(road.y - t.y, road.x - t.x) + Math.PI / 2;
                let diff = want - t.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                t.angle += diff * Math.min(1, dt * 1.6);
            }
        }

        this.stepParticles(dt);
        this.effects = this.effects.filter((f) => (f.life -= dt) > 0);

        // wave clear check
        if (this.phase === 'wave' && this.spawnQueue.length === 0 && !this.enemies.some((e) => e.alive)) {
            this.completeWave();
        }

        // transient timers
        if (this.hintTimer > 0) {
            this.hintTimer -= dt;
            if (this.hintTimer <= 0) this.hintText = '';
        }
        if (this.bannerTimer > 0) {
            this.bannerTimer -= dt;
            if (this.bannerText) {
                this.bannerText.setAlpha(Math.min(1, this.bannerTimer));
                this.bannerText.setScale(1 + Math.max(0, this.bannerTimer - 2.1) * 0.08);
            }
        }
        if (this.selectedTower) this.updateInspector();
    }

    private findTarget(t: Tower): Enemy | null {
        const lvl = TOWERS[t.kind].levels[t.level];
        let best: Enemy | null = null;
        let bestDist = -1;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - t.x, e.y - t.y);
            if (d > lvl.range) continue;
            if (e.dist > bestDist) { bestDist = e.dist; best = e; }
        }
        return best;
    }

    private muzzle(t: Tower, len: number): { x: number; y: number } {
        const ey = t.y - EMIT_H[t.kind];
        return { x: t.x + Math.sin(t.angle) * len, y: ey - Math.cos(t.angle) * len };
    }

    private fire(t: Tower, target: Enemy): void {
        const def = TOWERS[t.kind];
        const lvl = def.levels[t.level];
        const m = this.muzzle(t, MOUTH_H[t.kind][t.level]);
        if (t.kind === 'prism') {
            this.effects.push({ kind: 'beam', ax: m.x, ay: m.y, bx: target.x, by: target.y, life: 0.14, max: 0.14, color: C.cyan });
            this.burst(target.x, target.y, C.cyan, 7, 110);
            this.damage(target, lvl.damage);
            audio.sfx('beam');
        } else {
            const chain: Enemy[] = [target];
            let from = target;
            for (let i = 1; i < lvl.chains; i++) {
                let next: Enemy | null = null;
                let bestD = CHAIN_RANGE;
                for (const e of this.enemies) {
                    if (!e.alive || chain.includes(e)) continue;
                    const d = Math.hypot(e.x - from.x, e.y - from.y);
                    if (d < bestD) { bestD = d; next = e; }
                }
                if (!next) break;
                chain.push(next);
                from = next;
            }
            let prev = m;
            for (const e of chain) {
                const pts = this.jag(prev.x, prev.y, e.x, e.y, 5, 9);
                this.effects.push({ kind: 'arc', pts, life: 0.16, max: 0.16, color: C.violet });
                this.damage(e, lvl.damage);
                prev = { x: e.x, y: e.y };
            }
            this.burst(target.x, target.y, C.violet, 6, 90);
            audio.sfx('arc');
        }
    }

    private jag(ax: number, ay: number, bx: number, by: number, steps: number, amp: number): PhaserMath.Vector2[] {
        const pts: PhaserMath.Vector2[] = [new PhaserMath.Vector2(ax, ay)];
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const off = (Math.random() - 0.5) * amp * 2;
            pts.push(new PhaserMath.Vector2(ax + dx * t + nx * off, ay + dy * t + ny * off));
        }
        pts.push(new PhaserMath.Vector2(bx, by));
        return pts;
    }

    private damage(e: Enemy, amount: number): void {
        const dmg = Math.max(1, Math.round(amount - e.def.armor));
        e.hp -= dmg;
        e.flash = 0.08;
        e.sprite.setTint(0xffffff).setTintMode(TintModes.FILL);
        this.burst(e.x, e.y, e.def.color, 3, 60);
        if (e.hp <= 0) this.kill(e);
    }

    private kill(e: Enemy): void {
        e.alive = false;
        this.kills++;
        this.credits += e.def.reward;
        audio.sfx('kill');
        this.burst(e.x, e.y, e.def.color, e.kind === 'boss' ? 40 : 14, e.kind === 'boss' ? 220 : 140);
        this.ring(e.x, e.y, e.kind === 'boss' ? 70 : 26, e.def.color);
        if (e.kind === 'boss') {
            this.cameras.main.shake(420, 0.012);
            this.setHint('Solar Devourer destroyed! The relay holds.', 4);
        }
        e.sprite.destroy();
        e.shadow.destroy();
    }

    private leak(e: Enemy): void {
        e.alive = false;
        this.leaked++;
        this.coreHp = Math.max(0, this.coreHp - e.def.leak);
        audio.sfx('coreHit');
        this.cameras.main.shake(260, 0.008);
        this.burst(CORE_POS.x, CORE_POS.y - 40, C.danger, 18, 160);
        this.ring(CORE_POS.x, CORE_POS.y - 40, 40, C.danger);
        e.sprite.destroy();
        e.shadow.destroy();
        if (this.coreHp <= 0) {
            this.phase = 'lost';
            this.showEnd(false);
        }
    }

    private stepParticles(dt: number): void {
        for (const p of this.particles) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.grav * dt;
            p.vx *= 0.99;
        }
        this.particles = this.particles.filter((p) => p.life > 0);
    }

    private burst(x: number, y: number, color: number, count: number, speed: number): void {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = speed * (0.35 + Math.random() * 0.8);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s - 20,
                life: 0.25 + Math.random() * 0.45,
                max: 0.7,
                color,
                size: 2 + Math.random() * 3,
                grav: 220
            });
        }
    }

    private ring(x: number, y: number, r: number, color: number): void {
        this.effects.push({ kind: 'ring', x, y, r, life: 0.4, max: 0.4, color });
    }

    /* ================================================================ draw */

    private drawEffects(): void {
        const fx = this.fxG;
        fx.clear();

        for (const f of this.effects) {
            const a = Math.max(0, f.life / f.max);
            if (f.kind === 'beam') {
                fx.lineStyle(7, f.color, a * 0.35);
                fx.lineBetween(f.ax, f.ay, f.bx, f.by);
                fx.lineStyle(2.4, 0xffffff, a * 0.95);
                fx.lineBetween(f.ax, f.ay, f.bx, f.by);
                fx.fillStyle(0xffffff, a);
                fx.fillCircle(f.bx, f.by, 4 + 3 * a);
            } else if (f.kind === 'arc') {
                fx.lineStyle(4, f.color, a * 0.45);
                fx.strokePoints(f.pts, false);
                fx.lineStyle(1.6, 0xf2e9ff, a);
                fx.strokePoints(f.pts, false);
            } else {
                const rr = f.r * (1 - a) + 6;
                fx.lineStyle(3, f.color, a * 0.8);
                fx.strokeCircle(f.x, f.y, rr);
            }
        }

        for (const p of this.particles) {
            const a = Math.max(0, p.life / p.max);
            fx.fillStyle(p.color, a);
            fx.fillCircle(p.x, p.y, p.size * (0.4 + a * 0.8));
        }

        // enemy hp bars
        const bg = this.barG;
        bg.clear();
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (e.kind !== 'boss' && e.hp >= e.maxHp) continue;
            const w = e.kind === 'boss' ? 78 : Math.max(18, e.def.radius * 2.1);
            const h = e.kind === 'boss' ? 7 : 4;
            const x = e.x - w / 2;
            const y = e.y - e.def.radius - 14;
            bg.fillStyle(0x10161f, 0.8);
            bg.fillRect(x - 1, y - 1, w + 2, h + 2);
            const r = e.hp / e.maxHp;
            bg.fillStyle(r > 0.55 ? 0x7ddc6a : r > 0.25 ? 0xffc247 : 0xff6a52, 1);
            bg.fillRect(x, y, w * r, h);
        }

        // overlays: range ring + build ghost
        const og = this.overlayG;
        og.clear();
        if (this.selectedTower) {
            const lvl = TOWERS[this.selectedTower.kind].levels[this.selectedTower.level];
            og.lineStyle(2, TOWERS[this.selectedTower.kind].tint, 0.5);
            og.strokeCircle(this.selectedTower.x, this.selectedTower.y, lvl.range);
            og.fillStyle(TOWERS[this.selectedTower.kind].tint, 0.07);
            og.fillCircle(this.selectedTower.x, this.selectedTower.y, lvl.range);
        } else if (this.selectedBuild && this.ghost.visible) {
            const lvl = TOWERS[this.selectedBuild].levels[0];
            og.lineStyle(2, TOWERS[this.selectedBuild].tint, 0.55);
            og.strokeCircle(this.ghost.x, this.ghost.y, lvl.range);
            og.fillStyle(TOWERS[this.selectedBuild].tint, 0.07);
            og.fillCircle(this.ghost.x, this.ghost.y, lvl.range);
        }

        // inspector panel background
        if (this.selectedTower) {
            const t = this.selectedTower;
            const px = PhaserMath.Clamp(t.x, 130, GAME_W - 130);
            const py = PhaserMath.Clamp(t.y - 92, MAP_TOP + 60, MAP_BOTTOM - 60);
            panel(og, px - 110, py - 40, 220, 80, 0x0f1620, 0x3d4d60, 10, 0.92);
        }

        // entity transforms
        for (const e of this.enemies) {
            if (!e.alive) continue;
            e.sprite.setPosition(e.x, e.y);
            e.sprite.setRotation(e.angle);
            e.shadow.setPosition(e.x, e.y + 5);
            if (e.flash > 0 && e.sprite.tintTopLeft !== 0xffffff) e.sprite.setTint(0xffffff);
            else if (e.flash <= 0 && e.sprite.isTinted) e.sprite.clearTint();
        }
        for (const t of this.towers) {
            const recoil = t.recoil > 0 ? t.recoil * 8 : 0;
            t.sprite.setPosition(t.x, t.y + recoil);
            t.head.setPosition(t.x, t.y - EMIT_H[t.kind] + recoil * 0.4);
            t.head.setRotation(t.angle);
        }

        this.dish.setRotation(this.dish.rotation + 0.006);
        const pulse = 1 + Math.sin(this.simClock * 3.1) * 0.05;
        this.dish.setScale(pulse);
    }

    /* ================================================================= HUD */

    private setHint(text: string, seconds: number): void {
        this.hintText = text;
        this.hintTimer = seconds;
    }

    private refreshHud(): void {
        const g = this.hudG;
        g.clear();
        // top bar
        g.fillStyle(C.hud, 0.96);
        g.fillRect(0, 0, GAME_W, HUD_H);
        g.fillStyle(0x0b1018, 1);
        g.fillRect(0, HUD_H - 2, GAME_W, 2);
        g.fillStyle(C.amberDeep, 1);
        g.fillRect(0, HUD_H - 2, GAME_W, 2);
        // footer
        g.fillStyle(C.hud, 0.96);
        g.fillRect(0, GAME_H - FOOT_H, GAME_W, FOOT_H);
        g.fillStyle(C.amberDeep, 1);
        g.fillRect(0, GAME_H - FOOT_H, GAME_W, 2);

        // integrity bar
        const bx = 280;
        const by = 40;
        const seg = 5;
        const gap = 2;
        const shown = Math.max(0, this.coreHp);
        for (let i = 0; i < START_CORE_HP; i++) {
            const x = bx + i * (seg + gap);
            const filled = i < shown;
            g.fillStyle(filled ? (shown <= 5 ? C.danger : C.cyan) : 0x2b3542, 1);
            g.fillRect(x, by, seg, 12);
        }
        // credit coin
        g.fillStyle(C.amber, 1);
        g.fillCircle(440, 29, 8);
        g.lineStyle(2, 0x8a5a12, 1);
        g.strokeCircle(440, 29, 8);
        g.fillStyle(0x8a5a12, 1);
        g.fillRect(439, 24, 2, 10);

        this.tCredits.setText(`${this.credits}c`);
        this.tHp.setText(`RELAY ${this.coreHp}/${START_CORE_HP}`);
        this.tWave.setText(`WAVE ${Math.min(this.waveIndex + 1, WAVES.length)} / ${WAVES.length}`);
        const wave = WAVES[Math.min(this.waveIndex, WAVES.length - 1)];
        this.tWaveName.setText(this.phase === 'won' ? 'SECURED' : wave.name);
        this.btnSpeed.setText(`${this.speed}x`);
        this.btnMute.setText(this.muted ? 'MUTED' : 'SOUND');
        this.btnPause.setText(this.paused ? 'RESUME' : 'PAUSE');
        this.btnPause.setActive(this.paused);

        // status line
        let status: string;
        if (this.hintTimer > 0) status = this.hintText;
        else if (this.phase === 'countdown') status = `Wave ${this.waveIndex + 1} incoming in ${Math.ceil(this.countdown)}s — ${wave.brief}`;
        else if (this.phase === 'wave') status = `${wave.brief}  ·  ${this.enemies.filter((e) => e.alive).length} on the road`;
        else if (this.phase === 'won') status = 'The relay is secure. All six waves repelled.';
        else status = 'The relay has fallen.';
        this.tStatus.setText(status);
    }

    private togglePause(): void {
        if (this.phase === 'won' || this.phase === 'lost') return;
        this.paused = !this.paused;
        audio.sfx('click');
        this.refreshHud();
    }

    private toggleMute(): void {
        this.muted = !this.muted;
        audio.setMuted(this.muted);
        this.refreshHud();
    }

    private cycleSpeed(): void {
        this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
        audio.sfx('click');
        this.refreshHud();
    }

    private restart(): void {
        audio.sfx('click');
        this.scene.restart();
    }

    private showEnd(won: boolean): void {
        audio.stopMusic();
        audio.sfx(won ? 'win' : 'lose');
        this.ghost.setVisible(false);
        this.selectTower(null);
        this.selectBuild(null);

        const g = this.add.graphics().setDepth(60);
        g.fillStyle(0x0a0f16, 0.72);
        g.fillRect(0, 0, GAME_W, GAME_H);

        const title = this.add.text(GAME_W / 2, 250, won ? 'RELAY SECURED' : 'RELAY LOST', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '54px', color: won ? '#9ff08a' : '#ff8a72'
        }).setOrigin(0.5).setDepth(61);
        title.setStroke('#141a24', 8);

        this.add.text(GAME_W / 2, 320, won
            ? 'All six waves repelled. The outpost keeps its light.'
            : 'The core went dark. The road swallowed the outpost.', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '19px', color: '#dfe8f2'
        }).setOrigin(0.5).setDepth(61);

        const stats = `Waves survived ${won ? WAVES.length : this.waveIndex} / ${WAVES.length}    ·    Enemies destroyed ${this.kills}    ·    Credits ${this.credits}c    ·    Relay integrity ${this.coreHp}/${START_CORE_HP}`;
        this.add.text(GAME_W / 2, 360, stats, {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '16px', color: '#a9bdd0'
        }).setOrigin(0.5).setDepth(61);

        const again = new UIButton(this, GAME_W / 2 - 90, 440, 170, 46, 'PLAY AGAIN', {
            fontSize: 17, bg: 0xffc247, border: 0xffe3a0, textColor: 0x20160a, radius: 10, active: true, depth: 62,
            onClick: () => this.restart()
        });
        const menu = new UIButton(this, GAME_W / 2 + 90, 440, 170, 46, 'MAIN MENU', {
            fontSize: 17, depth: 62, onClick: () => { audio.startMusic(); this.scene.start('Menu'); }
        });
        this.overlayButtons = [again, menu];
        this.add.text(GAME_W / 2, 492, 'press R to restart', {
            fontFamily: '"Trebuchet MS", sans-serif', fontSize: '14px', color: '#8fa4b8'
        }).setOrigin(0.5).setDepth(61);
    }

    /* ============================================================== runtime */

    override update(_time: number, delta: number): void {
        if (!this.useManual) {
            this.simulate(Math.min(delta, 60) / 1000 * this.speed);
        }
        this.refreshHud();
        this.drawEffects();
    }

    /** Deterministic stepping hook used by the automated test client. */
    public manualStep(dt: number): void {
        this.useManual = true;
        this.simulate(dt * this.speed);
    }

    public stateText(): string {
        return JSON.stringify({
            coordinateSystem: 'canvas pixels, origin top-left, x right, y down',
            mode: 'game',
            phase: this.phase,
            paused: this.paused,
            speed: this.speed,
            muted: this.muted,
            credits: this.credits,
            coreHp: this.coreHp,
            coreHpMax: START_CORE_HP,
            wave: Math.min(this.waveIndex + 1, WAVES.length),
            waveTotal: WAVES.length,
            waveName: WAVES[Math.min(this.waveIndex, WAVES.length - 1)].name,
            countdown: this.phase === 'countdown' ? Math.max(0, Math.round(this.countdown * 10) / 10) : 0,
            enemiesAlive: this.enemies.filter((e) => e.alive).length,
            enemies: this.enemies.filter((e) => e.alive).map((e) => ({
                kind: e.kind, x: Math.round(e.x), y: Math.round(e.y),
                hp: Math.max(0, e.hp), maxHp: e.maxHp, progress: Math.round(e.dist)
            })),
            towers: this.towers.map((t) => ({
                kind: t.kind, x: Math.round(t.x), y: Math.round(t.y), level: t.level + 1,
                damage: TOWERS[t.kind].levels[t.level].damage, range: TOWERS[t.kind].levels[t.level].range
            })),
            selectedBuild: this.selectedBuild,
            selectedTower: this.selectedTower
                ? { kind: this.selectedTower.kind, x: this.selectedTower.x, y: this.selectedTower.y, level: this.selectedTower.level + 1 }
                : null,
            kills: this.kills,
            leaked: this.leaked,
            status: this.hintTimer > 0 ? this.hintText : this.phase
        });
    }
}
