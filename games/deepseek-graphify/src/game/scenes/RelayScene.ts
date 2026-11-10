import { Scene } from 'phaser';
import { AudioEngine } from '../audio';
import {
    drawBackground, drawEnemy, drawHealthBar, drawPad, drawRelay, drawTower,
} from '../art';
import {
    ArcBolt, Beam, Enemy, EnemyType, FloatLabel, Mode, Pad, Particle, PAD_POSITIONS,
    RELAY, Ring, Tower, TOWER_COST, WaveState, WAVES, enemyStats, pathLength, pathPoint,
    towerStats, upgradeCost,
} from '../types';

interface SpawnItem { type: EnemyType; gap: number; }

const START_BUTTON = { x: 96, y: 568, w: 306, h: 60 };
const AGAIN_BUTTON = { x: 490, y: 492, w: 300, h: 54 };
const RESUME_BUTTON = { x: 520, y: 406, w: 240, h: 48 };


export class RelayScene extends Scene {
    private audio = new AudioEngine();

    private mode: Mode = 'menu';
    private wave = 0;
    private waveState: WaveState = 'prep';
    private prepTimer = 0;
    private spawnQueue: SpawnItem[] = [];
    private spawnTimer = 0;

    private credits = 160;
    private integrity = 100;
    private kills = 0;
    private score = 0;
    private speed = 1;
    private simTime = 0;
    private totalTime = 0;

    private pads: Pad[] = [];
    private enemies: Enemy[] = [];
    private beams: Beam[] = [];
    private arcs: ArcBolt[] = [];
    private particles: Particle[] = [];
    private rings: Ring[] = [];
    private labels: FloatLabel[] = [];
    private nextEnemyId = 1;

    private selectedPad = -1;
    private hoverPad = -1;

    private bannerTitle = '';
    private bannerSub = '';
    private bannerTimer = 0;
    private bannerMax = 1;
    private flashTimer = 0;
    private relayShake = 0;
    private startHover = false;
    private pauseHover = false;
    private manual = false;
    private lastBeamSfx = -10;
    private lastArcSfx = -10;
    private lastKillSfx = -10;

    private bg!: Phaser.GameObjects.Graphics;
    private dyn!: Phaser.GameObjects.Graphics;
    private ui!: Phaser.GameObjects.Graphics;
    private overlayG!: Phaser.GameObjects.Graphics;

    private waveValue!: Phaser.GameObjects.Text;
    private waveSub!: Phaser.GameObjects.Text;
    private creditsValue!: Phaser.GameObjects.Text;
    private integrityValue!: Phaser.GameObjects.Text;
    private bossLabel!: Phaser.GameObjects.Text;
    private hint!: Phaser.GameObjects.Text;
    private bannerText!: Phaser.GameObjects.Text;
    private bannerText2!: Phaser.GameObjects.Text;
    private pauseIcon!: Phaser.GameObjects.Text;
    private speedText!: Phaser.GameObjects.Text;
    private muteText!: Phaser.GameObjects.Text;

    private panelTitle!: Phaser.GameObjects.Text;
    private panelSub!: Phaser.GameObjects.Text;
    private panelStats!: Phaser.GameObjects.Text;
    private btn1Title!: Phaser.GameObjects.Text;
    private btn1Sub!: Phaser.GameObjects.Text;
    private btn2Title!: Phaser.GameObjects.Text;
    private btn2Sub!: Phaser.GameObjects.Text;
    private closeText!: Phaser.GameObjects.Text;

    private startOverline!: Phaser.GameObjects.Text;
    private startTitle1!: Phaser.GameObjects.Text;
    private startTitle2!: Phaser.GameObjects.Text;
    private startSub!: Phaser.GameObjects.Text;
    private startStep1!: Phaser.GameObjects.Text;
    private startStep2!: Phaser.GameObjects.Text;
    private startStep3!: Phaser.GameObjects.Text;
    private startControls!: Phaser.GameObjects.Text;
    private startButtonText!: Phaser.GameObjects.Text;
    private startEnter!: Phaser.GameObjects.Text;
    private startFoot!: Phaser.GameObjects.Text;

    private pauseTitle!: Phaser.GameObjects.Text;
    private pauseSub!: Phaser.GameObjects.Text;
    private pauseButtonText!: Phaser.GameObjects.Text;
    private pauseHint!: Phaser.GameObjects.Text;

    private endOverline!: Phaser.GameObjects.Text;
    private endTitle!: Phaser.GameObjects.Text;
    private endSub!: Phaser.GameObjects.Text;
    private endStats!: Phaser.GameObjects.Text;
    private endStats2!: Phaser.GameObjects.Text;
    private endButtonText!: Phaser.GameObjects.Text;
    private endHint!: Phaser.GameObjects.Text;

    constructor() {
        super('Relay');
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0xdfb26d);
        this.bg = this.add.graphics().setDepth(0);
        drawBackground(this.bg);
        this.dyn = this.add.graphics().setDepth(10);
        this.ui = this.add.graphics().setDepth(50);
        this.overlayG = this.add.graphics().setDepth(70);

        for (let i = 0; i < PAD_POSITIONS.length; i++) {
            this.pads.push({ index: i, x: PAD_POSITIONS[i].x, y: PAD_POSITIONS[i].y, tower: null });
        }

        this.createHudText();
        this.createPanelText();
        this.createOverlayText();
        this.createInput();
        this.setupTestHooks();
        this.render();
    }

    private mkText(
        x: number, y: number, text: string, size: number, color: string,
        opts: { bold?: boolean; serif?: boolean; origin?: number; alpha?: number; stroke?: string; strokeThickness?: number } = {}
    ): Phaser.GameObjects.Text {
        const t = this.add.text(x, y, text, {
            fontFamily: opts.serif ? 'Georgia, "Times New Roman", serif' : '"Trebuchet MS", Verdana, sans-serif',
            fontSize: `${size}px`,
            color,
            fontStyle: opts.bold ? 'bold' : 'normal',
            align: 'left',
        });
        t.setDepth(80);
        if (opts.origin !== undefined) t.setOrigin(opts.origin);
        if (opts.alpha !== undefined) t.setAlpha(opts.alpha);
        if (opts.stroke) t.setStroke(opts.stroke, opts.strokeThickness ?? 3);
        return t;
    }

    private createHudText(): void {
        const cream = '#f7ecd2';
        this.mkText(26, 12, 'RELAY DEFENSE', 20, cream, { bold: true });
        this.mkText(27, 38, 'HELIOS FLATS  ·  SECTOR 07', 9, '#b9ae93');
        this.mkText(286, 10, 'WAVE', 9, '#b9ae93');
        this.waveValue = this.mkText(286, 22, '— / 6', 20, cream, { bold: true });
        this.waveSub = this.mkText(424, 30, '', 9, '#b9ae93', { origin: 1 });
        this.mkText(444, 10, 'CREDITS', 9, '#b9ae93');
        this.creditsValue = this.mkText(444, 22, '◎ 160', 20, '#ffd678', { bold: true });
        this.mkText(584, 10, 'RELAY INTEGRITY', 9, '#b9ae93');
        this.integrityValue = this.mkText(764, 22, '100%', 20, cream, { bold: true });
        this.bossLabel = this.mkText(402, 66, '', 10, '#ffb4a2', { bold: true });
        this.hint = this.mkText(640, 702, '', 10, '#f7ecd2', { alpha: 0.95, origin: 0.5, stroke: '#3a2b1b', strokeThickness: 3 });
        this.bannerText = this.mkText(640, 352, '', 46, '#f7ecd2', { bold: true, serif: true, origin: 0.5, stroke: '#3a2b1b', strokeThickness: 6 });
        this.bannerText2 = this.mkText(640, 398, '', 11, '#f2b64b', { origin: 0.5, bold: true });
        this.pauseIcon = this.mkText(1108, 23, 'II', 14, '#f7ecd2', { bold: true });
        this.speedText = this.mkText(1158, 23, '1×', 14, '#f7ecd2', { bold: true });
        this.muteText = this.mkText(1208, 23, '♪', 16, '#f7ecd2', { bold: true });
    }

    private createPanelText(): void {
        const cream = '#f7ecd2';
        this.panelTitle = this.mkText(306, 676, '', 15, cream, { bold: true });
        this.panelSub = this.mkText(306, 699, '', 11, '#c8bb9f');
        this.panelStats = this.mkText(306, 720, '', 10, '#a99c80');
        this.btn1Title = this.mkText(610, 686, '', 12, cream, { bold: true });
        this.btn1Sub = this.mkText(610, 705, '', 9, '#c8bb9f');
        this.btn2Title = this.mkText(790, 686, '', 12, cream, { bold: true });
        this.btn2Sub = this.mkText(790, 705, '', 9, '#c8bb9f');
        this.closeText = this.mkText(956, 700, '×', 18, '#f7ecd2', { bold: true, origin: 0.5 });
    }

    private createOverlayText(): void {
        const cream = '#f7ecd2';
        this.startOverline = this.mkText(98, 122, 'A  D E S E R T   S O L A R - R E L A Y   D E F E N S E', 10, '#f2b64b', { bold: true });
        this.startTitle1 = this.mkText(94, 158, 'RELAY', 76, cream, { bold: true, serif: true });
        this.startTitle2 = this.mkText(94, 232, 'DEFENSE', 76, '#ffd678', { bold: true, serif: true });
        this.startSub = this.mkText(98, 326, 'Six waves. One relay. No retreat.', 15, '#e6d9bc');
        this.startStep1 = this.mkText(130, 378, 'Click a build pad, then choose a tower.', 13, cream);
        this.startStep2 = this.mkText(130, 418, 'Sunspear: long-range beam. Arc Pylon: chain lightning.', 13, cream);
        this.startStep3 = this.mkText(130, 458, 'Upgrade both roles. Keep the relay above zero.', 13, cream);
        this.startControls = this.mkText(98, 512, 'P pause   ·   S speed   ·   M mute   ·   R restart   ·   F fullscreen', 10, '#a99c80');
        this.startButtonText = this.mkText(249, 598, 'START DEFENSE', 16, '#18231f', { bold: true, origin: 0.5 });
        this.startEnter = this.mkText(424, 590, 'or press ENTER', 10, '#a99c80');
        this.startFoot = this.mkText(98, 654, 'PROCEDURAL ART + AUDIO  ·  6 WAVES  ·  ABOUT 4 MINUTES', 9, '#8f856d');

        this.pauseTitle = this.mkText(640, 330, 'PAUSED', 38, '#ffd678', { bold: true, serif: true, origin: 0.5 });
        this.pauseSub = this.mkText(640, 372, 'The desert holds its breath.', 12, '#d8ccb0', { origin: 0.5 });
        this.pauseButtonText = this.mkText(640, 430, 'RESUME', 14, '#18231f', { bold: true, origin: 0.5 });
        this.pauseHint = this.mkText(640, 466, 'P to resume   ·   R to restart', 9, '#a99c80', { origin: 0.5 });

        this.endOverline = this.mkText(640, 260, '', 11, '#f2b64b', { bold: true, origin: 0.5 });
        this.endTitle = this.mkText(640, 292, '', 44, '#ffd678', { bold: true, serif: true, origin: 0.5 });
        this.endSub = this.mkText(640, 348, '', 13, '#e6d9bc', { origin: 0.5 });
        this.endStats = this.mkText(640, 394, '', 12, '#f7ecd2', { origin: 0.5 });
        this.endStats2 = this.mkText(640, 416, '', 12, '#f7ecd2', { origin: 0.5 });
        this.endButtonText = this.mkText(640, 519, 'DEFEND AGAIN', 14, '#18231f', { bold: true, origin: 0.5 });
        this.endHint = this.mkText(640, 558, 'or press R', 9, '#a99c80', { origin: 0.5 });
    }

    private createInput(): void {
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            this.startHover = this.mode === 'menu' && this.inRect(p.x, p.y, START_BUTTON);
            this.pauseHover = this.mode === 'paused' && this.inRect(p.x, p.y, RESUME_BUTTON);
            if (this.mode === 'playing') {
                this.hoverPad = -1;
                if (!this.panelOpen()) {
                    for (const pad of this.pads) {
                        if (Math.hypot(p.x - pad.x, p.y - pad.y) < 36) { this.hoverPad = pad.index; break; }
                    }
                }
            } else {
                this.hoverPad = -1;
            }
        });

        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            this.handleClick(p.x, p.y);
        });

        const kb = this.input.keyboard;
        if (kb) {
            kb.addCapture(['SPACE', 'ENTER', 'P', 'S', 'M', 'R', 'F', 'U', 'X', 'ESC', 'ONE', 'TWO']);
            kb.on('keydown', (e: KeyboardEvent) => this.handleKey(e));
        }
    }

    private inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): boolean {
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    private handleKey(e: KeyboardEvent): void {
        const key = e.key.toLowerCase();
        if (key === 'f') {
            const doc = document as Document & { fullscreenElement?: Element };
            if (!doc.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
            else void document.exitFullscreen?.().catch(() => undefined);
            return;
        }
        if (key === 'm') { this.toggleMute(); return; }
        if (key === 'r') {
            if (this.mode !== 'menu') this.restartRun();
            return;
        }
        if (this.mode === 'menu') {
            if (key === 'enter' || key === ' ') this.startGame();
            return;
        }
        if (key === 'p' || (key === 'escape' && this.mode === 'paused')) { this.togglePause(); return; }
        if (this.mode === 'won' || this.mode === 'lost') {
            if (key === 'enter' || key === ' ') this.restartRun();
            return;
        }
        if (this.mode !== 'playing' && this.mode !== 'paused') return;
        if (key === 's') { this.toggleSpeed(); return; }
        if (this.mode !== 'playing') return;
        if (key === 'escape') { this.selectedPad = -1; return; }
        if (this.selectedPad < 0) return;
        if (key === '1' || key === '2') this.build(this.selectedPad, key === '1' ? 'sunspear' : 'arc');
        if (key === 'u') this.upgrade(this.selectedPad);
        if (key === 'x') this.sell(this.selectedPad);
    }

    private handleClick(x: number, y: number): void {
        if (this.mode === 'menu') {
            if (this.inRect(x, y, START_BUTTON)) this.startGame();
            return;
        }
        if (this.mode === 'paused') {
            if (this.inRect(x, y, RESUME_BUTTON)) this.togglePause();
            return;
        }
        if (this.mode === 'won' || this.mode === 'lost') {
            if (this.inRect(x, y, AGAIN_BUTTON)) this.restartRun();
            return;
        }
        if (this.mode !== 'playing') return;

        if (this.inRect(x, y, { x: 1092, y: 6, w: 44, h: 46 })) { this.togglePause(); return; }
        if (this.inRect(x, y, { x: 1142, y: 6, w: 44, h: 46 })) { this.toggleSpeed(); return; }
        if (this.inRect(x, y, { x: 1192, y: 6, w: 50, h: 46 })) { this.toggleMute(); return; }

        if (this.panelOpen()) {
            if (this.inRect(x, y, { x: 590, y: 674, w: 170, h: 92 })) {
                if (this.padTower(this.selectedPad)) this.upgrade(this.selectedPad);
                else this.build(this.selectedPad, 'sunspear');
                return;
            }
            if (this.inRect(x, y, { x: 772, y: 674, w: 148, h: 92 })) {
                if (this.padTower(this.selectedPad)) this.sell(this.selectedPad);
                else this.build(this.selectedPad, 'arc');
                return;
            }
            if (this.inRect(x, y, { x: 938, y: 682, w: 36, h: 36 })) { this.selectedPad = -1; return; }
        }

        for (const pad of this.pads) {
            if (Math.hypot(x - pad.x, y - pad.y) < 37) {
                this.selectedPad = this.selectedPad === pad.index ? -1 : pad.index;
                this.hoverPad = pad.index;
                return;
            }
        }
        this.selectedPad = -1;
    }

    private panelOpen(): boolean {
        return this.selectedPad >= 0 && this.mode === 'playing';
    }

    private padTower(index: number): Tower | null {
        const pad = this.pads[index];
        return pad ? pad.tower : null;
    }

    private startGame(): void {
        this.resetRun();
        this.mode = 'playing';
        this.audio.startMusic();
        this.beginPrep(0);
    }

    private restartRun(): void {
        this.resetRun();
        this.mode = 'playing';
        this.audio.startMusic();
        this.beginPrep(0);
    }

    private resetRun(): void {
        this.wave = 0;
        this.waveState = 'prep';
        this.prepTimer = 0;
        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.credits = 160;
        this.integrity = 100;
        this.kills = 0;
        this.score = 0;
        this.speed = 1;
        this.simTime = 0;
        this.totalTime = 0;
        this.enemies = [];
        this.beams = [];
        this.arcs = [];
        this.particles = [];
        this.rings = [];
        this.labels = [];
        this.selectedPad = -1;
        this.hoverPad = -1;
        this.bannerTimer = 0;
        this.flashTimer = 0;
        this.relayShake = 0;
        this.manual = false;
        this.pads.forEach((p) => { p.tower = null; });
        this.audio.setPaused(false);
    }

    private beginPrep(index: number): void {
        this.wave = index;
        this.waveState = 'prep';
        this.prepTimer = 12;
        const def = WAVES[index];
        this.showBanner(`WAVE ${index + 1}`, def.name);
    }

    private startWave(): void {
        this.waveState = 'spawning';
        this.spawnTimer = 0.25;
        this.spawnQueue = [];
        for (const group of WAVES[this.wave].groups) {
            for (let i = 0; i < group.count; i++) this.spawnQueue.push({ type: group.type, gap: group.gap });
        }
        this.audio.play('wave');
        this.showBanner(`WAVE ${this.wave + 1}`, WAVES[this.wave].name);
    }

    private showBanner(title: string, sub: string): void {
        this.bannerTitle = title;
        this.bannerSub = sub;
        this.bannerTimer = 2.2;
        this.bannerMax = 2.2;
    }

    private togglePause(): void {
        if (this.mode === 'playing') {
            this.mode = 'paused';
            this.audio.setPaused(true);
        } else if (this.mode === 'paused') {
            this.mode = 'playing';
            this.audio.setPaused(false);
        }
    }

    private toggleSpeed(): void {
        if (this.mode !== 'playing' && this.mode !== 'paused') return;
        this.speed = this.speed === 1 ? 2 : 1;
    }

    private toggleMute(): void {
        this.audio.setMuted(!this.audio.isMuted);
    }

    private build(index: number, type: 'sunspear' | 'arc'): void {
        const pad = this.pads[index];
        if (!pad || pad.tower) return;
        const cost = TOWER_COST[type];
        if (this.credits < cost) {
            this.floatText(pad.x, pad.y - 36, 'NOT ENOUGH CREDITS', '#ff8a70');
            this.audio.play('deny');
            return;
        }
        this.credits -= cost;
        const stats = towerStats(type, 1);
        const tower: Tower = {
            type, level: 1, pad, angle: -Math.PI / 2, cooldown: 0.2, flash: 0,
            damage: stats.damage, range: stats.range, fireRate: stats.cooldown, chain: stats.chains, slow: stats.slow,
        };
        pad.tower = tower;
        this.audio.play('build');
        this.ring(pad.x, pad.y, type === 'sunspear' ? 0xffd678 : 0x7ff0df, 26, 0.45);
        this.burst(pad.x, pad.y, type === 'sunspear' ? 0xffd678 : 0x7ff0df, 10, 90);
        this.floatText(pad.x, pad.y - 36, type === 'sunspear' ? 'SUNSPEAR READY' : 'ARC PYLON READY', type === 'sunspear' ? '#ffd678' : '#9ff7e7');
        this.selectedPad = index;
        this.score += 15;
    }

    private upgrade(index: number): void {
        const tower = this.padTower(index);
        if (!tower) return;
        if (tower.level >= 3) {
            this.floatText(tower.pad.x, tower.pad.y - 36, 'MAX LEVEL', '#c8bb9f');
            this.audio.play('deny');
            return;
        }
        const cost = upgradeCost(tower.type, tower.level);
        if (this.credits < cost) {
            this.floatText(tower.pad.x, tower.pad.y - 36, 'NOT ENOUGH CREDITS', '#ff8a70');
            this.audio.play('deny');
            return;
        }
        this.credits -= cost;
        tower.level += 1;
        const stats = towerStats(tower.type, tower.level);
        tower.damage = stats.damage;
        tower.range = stats.range;
        tower.fireRate = stats.cooldown;
        tower.chain = stats.chains;
        tower.slow = stats.slow;
        tower.flash = 0.35;
        this.audio.play('upgrade');
        this.ring(tower.pad.x, tower.pad.y, 0xffe08a, 30, 0.5);
        this.burst(tower.pad.x, tower.pad.y, 0xffe08a, 14, 110);
        this.floatText(tower.pad.x, tower.pad.y - 38, `MK ${tower.level}`, '#ffe08a');
        this.score += 30;
    }

    private sell(index: number): void {
        const tower = this.padTower(index);
        if (!tower) return;
        let paid = TOWER_COST[tower.type];
        for (let l = 1; l < tower.level; l++) paid += upgradeCost(tower.type, l);
        const refund = Math.floor(paid * 0.65);
        this.credits += refund;
        tower.pad.tower = null;
        this.selectedPad = index;
        this.audio.play('sell');
        this.burst(tower.pad.x, tower.pad.y, 0xc8bb9f, 10, 70);
        this.floatText(tower.pad.x, tower.pad.y - 34, `+ ◎${refund}`, '#ffd678');
    }

    private setupTestHooks(): void {
        const w = window as unknown as {
            render_game_to_text?: () => string;
            advanceTime?: (ms: number) => void;
        };
        w.render_game_to_text = () => this.renderGameToText();
        w.advanceTime = (ms: number) => {
            const steps = Math.max(1, Math.min(360, Math.ceil(ms / 16.6667)));
            const dt = ms / steps / 1000;
            this.manual = true;
            for (let i = 0; i < steps; i++) this.step(dt * this.speed);
        };
    }

    private renderGameToText(): string {
        const selectedTower = this.padTower(this.selectedPad);
        const boss = this.enemies.find((e) => e.type === 'boss');
        return JSON.stringify({
            game: 'Relay Defense',
            mode: this.mode,
            wave: this.wave + 1,
            waveName: WAVES[this.wave]?.name ?? '',
            waveState: this.waveState,
            prepSeconds: Math.max(0, Math.ceil(this.prepTimer)),
            speed: this.speed,
            muted: this.audio.isMuted,
            credits: Math.round(this.credits),
            integrity: Math.round(this.integrity),
            kills: this.kills,
            score: Math.round(this.score),
            selectedPad: this.selectedPad,
            selectedTower: selectedTower ? { type: selectedTower.type, level: selectedTower.level } : null,
            towerCount: this.pads.filter((p) => p.tower).length,
            enemies: this.enemies.map((e) => ({
                id: e.id, type: e.type, x: Math.round(e.x), y: Math.round(e.y),
                hp: Math.round(e.hp), maxHp: e.maxHp, slow: Math.round(e.slow * 100),
            })),
            boss: boss ? { x: Math.round(boss.x), y: Math.round(boss.y), hp: Math.round(boss.hp), maxHp: boss.maxHp } : null,
            pads: this.pads.map((p) => ({ i: p.index, x: p.x, y: p.y, tower: p.tower ? p.tower.type : null, level: p.tower?.level ?? 0 })),
            banner: this.bannerTimer > 0 ? { title: this.bannerTitle, sub: this.bannerSub } : null,
            controls: 'click pads; 1/2 build; U upgrade; X sell; P pause; S speed; M mute; R restart',
        });
    }

    update(_time: number, delta: number): void {
        if (!this.manual && this.mode === 'playing') {
            const dt = Math.min(0.05, delta / 1000) * this.speed;
            this.step(dt);
        }
        this.render();
    }

    private step(dt: number): void {
        this.simTime += dt;
        this.totalTime += dt;
        if (this.bannerTimer > 0) this.bannerTimer -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.relayShake > 0) this.relayShake = Math.max(0, this.relayShake - dt * 3);
        this.updateEffects(dt);

        if (this.mode !== 'playing') return;

        if (this.waveState === 'prep') {
            this.prepTimer -= dt;
            if (this.prepTimer <= 0) this.startWave();
        } else if (this.waveState === 'spawning') {
            this.spawnTimer -= dt;
            if (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
                const item = this.spawnQueue.shift();
                if (item) {
                    this.spawnEnemy(item.type);
                    this.spawnTimer = this.spawnQueue.length > 0 ? this.spawnQueue[0].gap : 0.6;
                }
            }
            if (this.spawnQueue.length === 0) this.waveState = 'clearing';
        }

        this.updateTowers(dt);
        this.updateEnemies(dt);

        if (this.waveState === 'clearing' && this.enemies.length === 0 && this.mode === 'playing') {
            this.completeWave();
        }
    }

    private updateEffects(dt: number): void {
        for (const b of this.beams) b.life -= dt;
        this.beams = this.beams.filter((b) => b.life > 0);
        for (const a of this.arcs) a.life -= dt;
        this.arcs = this.arcs.filter((a) => a.life > 0);
        for (const p of this.particles) {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 70 * dt;
            p.vx *= 0.97;
        }
        this.particles = this.particles.filter((p) => p.life > 0);
        for (const r of this.rings) {
            r.life -= dt;
            r.radius += (r.maxRadius - r.radius) * Math.min(1, dt * 9);
        }
        this.rings = this.rings.filter((r) => r.life > 0);
        for (const l of this.labels) {
            l.life -= dt;
            l.text.y += l.vy * dt;
            l.text.setAlpha(Math.max(0, l.life / l.maxLife));
        }
        this.labels = this.labels.filter((l) => {
            if (l.life <= 0) { l.text.destroy(); return false; }
            return true;
        });
        for (const tower of this.pads) {
            if (tower.tower) tower.tower.flash = Math.max(0, tower.tower.flash - dt * 3);
        }
    }

    private spawnEnemy(type: EnemyType): void {
        const stats = enemyStats(type);
        const start = pathPoint(0);
        this.enemies.push({
            id: this.nextEnemyId++,
            type,
            x: start.x,
            y: start.y,
            angle: start.angle,
            hp: stats.hp,
            maxHp: stats.hp,
            speed: stats.speed,
            reward: stats.reward,
            damage: stats.damage,
            dist: 0,
            slow: 0,
            slowTimer: 0,
            phase: Math.random() * 10,
            dead: false,
        });
        if (type === 'boss') {
            this.showBanner('SIEGE WARDEN', 'THE LAST THING THE DUNES SEND');
            this.audio.play('wave');
        }
    }

    private updateEnemies(dt: number): void {
        const total = pathLength();
        for (const e of this.enemies) {
            if (e.dead) continue;
            if (e.slowTimer > 0) {
                e.slowTimer -= dt;
                if (e.slowTimer <= 0) e.slow = 0;
            }
            e.dist += e.speed * (1 - e.slow) * dt;
            if (e.dist >= total) {
                e.dead = true;
                this.hitRelay(e);
                continue;
            }
            const p = pathPoint(e.dist);
            e.x = p.x;
            e.y = p.y;
            e.angle = p.angle;
        }
        this.enemies = this.enemies.filter((e) => !e.dead);
        if (this.integrity <= 0 && this.mode === 'playing') this.loseGame();
    }

    private updateTowers(dt: number): void {
        for (const pad of this.pads) {
            const tower = pad.tower;
            if (!tower) continue;
            tower.cooldown -= dt;
            let target: Enemy | null = null;
            let best = -1;
            for (const e of this.enemies) {
                if (e.dead) continue;
                const d = Math.hypot(e.x - pad.x, e.y - pad.y);
                if (d <= tower.range && e.dist > best) { best = e.dist; target = e; }
            }
            if (!target) continue;
            tower.angle = Math.atan2(target.y - pad.y, target.x - pad.x);
            if (tower.cooldown > 0) continue;
            tower.cooldown = tower.fireRate;
            tower.flash = 1;
            if (tower.type === 'sunspear') this.fireSunspear(tower, target);
            else this.fireArc(tower, target);
        }
    }

    private fireSunspear(tower: Tower, target: Enemy): void {
        const { x, y } = tower.pad;
        const tipX = x + Math.cos(tower.angle) * 30;
        const tipY = y + Math.sin(tower.angle) * 30;
        this.beams.push({ x1: tipX, y1: tipY, x2: target.x, y2: target.y, color: 0xffd678, width: 5, life: 0.13, maxLife: 0.13 });
        this.beams.push({ x1: tipX, y1: tipY, x2: target.x, y2: target.y, color: 0xfff6d0, width: 2, life: 0.1, maxLife: 0.1 });
        this.burst(target.x, target.y, 0xffd678, 6, 80);
        this.damageEnemy(target, tower.damage);
        if (this.simTime - this.lastBeamSfx > 0.09) {
            this.audio.play('beam');
            this.lastBeamSfx = this.simTime;
        }
    }

    private fireArc(tower: Tower, target: Enemy): void {
        const hit = new Set<number>();
        const points = [{ x: tower.pad.x, y: tower.pad.y }];
        let current: Enemy | null = target;
        let damage = tower.damage;
        for (let i = 0; i < tower.chain && current; i++) {
            hit.add(current.id);
            points.push({ x: current.x, y: current.y });
            this.damageEnemy(current, damage);
            if (tower.slow > 0) {
                current.slow = Math.max(current.slow, tower.slow);
                current.slowTimer = Math.max(current.slowTimer, 1.8);
            }
            this.burst(current.x, current.y, 0x9ff7e7, 4, 70);
            let next: Enemy | null = null;
            let best = 999;
            for (const e of this.enemies) {
                if (e.dead || hit.has(e.id)) continue;
                const d = Math.hypot(e.x - current.x, e.y - current.y);
                if (d < 138 && d < best) { best = d; next = e; }
            }
            current = next;
            damage *= 0.78;
        }
        this.arcs.push({ points, life: 0.18, maxLife: 0.18, color: 0x9ff7e7 });
        this.ring(target.x, target.y, 0x9ff7e7, 22, 0.3);
        if (this.simTime - this.lastArcSfx > 0.12) {
            this.audio.play('arc');
            this.lastArcSfx = this.simTime;
        }
    }

    private damageEnemy(e: Enemy, amount: number): void {
        if (e.dead) return;
        e.hp -= amount;
        if (e.hp <= 0) {
            e.dead = true;
            this.kills += 1;
            this.credits += e.reward;
            this.score += e.reward * 5;
            this.burst(e.x, e.y, e.type === 'boss' ? 0xff9a5c : 0xffd678, e.type === 'boss' ? 40 : 12, e.type === 'boss' ? 200 : 110);
            this.ring(e.x, e.y, e.type === 'boss' ? 0xff9a5c : 0xffe08a, e.type === 'boss' ? 80 : 26, 0.5);
            this.floatText(e.x, e.y - 24, `+◎${e.reward}`, '#ffd678');
            if (this.simTime - this.lastKillSfx > 0.08) {
                this.audio.play('kill');
                this.lastKillSfx = this.simTime;
            }
        }
    }

    private hitRelay(e: Enemy): void {
        this.integrity = Math.max(0, this.integrity - e.damage);
        this.flashTimer = 0.45;
        this.relayShake = 1;
        this.audio.play('relayHit');
        this.ring(RELAY.x, RELAY.y, 0xff6b55, 90, 0.6);
        this.burst(RELAY.x, RELAY.y, 0xff8a70, 14, 150);
        this.floatText(RELAY.x, RELAY.y - 60, `-${e.damage}`, '#ff8a70');
        this.cameras.main.shake(160, 0.006);
        if (this.integrity <= 0) this.loseGame();
    }

    private completeWave(): void {
        if (this.wave >= WAVES.length - 1) {
            this.winGame();
            return;
        }
        const bonus = 45 + this.wave * 10;
        this.credits += bonus;
        this.score += 100 + this.wave * 25;
        this.floatText(RELAY.x, RELAY.y - 70, `WAVE CLEAR  +◎${bonus}`, '#ffd678');
        this.audio.play('upgrade');
        this.beginPrep(this.wave + 1);
    }

    private winGame(): void {
        this.mode = 'won';
        this.score += 500 + Math.round(this.integrity) * 10;
        this.audio.stopMusic();
        this.audio.play('win');
        this.showBanner('RELAY SECURED', 'THE OUTPOST HOLDS');
    }

    private loseGame(): void {
        if (this.mode === 'lost') return;
        this.mode = 'lost';
        this.integrity = 0;
        this.audio.stopMusic();
        this.audio.play('lose');
        this.showBanner('RELAY DOWN', 'THE DUNES TAKE THE LIGHT');
    }

    private burst(x: number, y: number, color: number, count: number, speed: number): void {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = speed * (0.35 + Math.random() * 0.75);
            const life = 0.25 + Math.random() * 0.5;
            this.particles.push({
                x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20,
                life, maxLife: life, size: 1.4 + Math.random() * 2.6, color,
            });
        }
    }

    private ring(x: number, y: number, color: number, maxRadius: number, life: number): void {
        this.rings.push({ x, y, radius: 6, maxRadius, life, maxLife: life, color, width: 3 });
    }

    private floatText(x: number, y: number, text: string, color: string): void {
        const t = this.mkText(x, y, text, 11, color, { bold: true, origin: 0.5 });
        t.setDepth(45);
        this.labels.push({ text: t, life: 0.9, maxLife: 0.9, vy: -34 });
    }

    private render(): void {
        const t = this.simTime + (this.mode === 'playing' ? 0 : this.time.now * 0.001);
        const g = this.dyn;
        g.clear();

        for (const pad of this.pads) {
            drawPad(g, pad, this.hoverPad === pad.index, this.selectedPad === pad.index, t);
        }
        drawRelay(g, t, this.integrity);

        const sorted = [...this.enemies].sort((a, b) => a.y - b.y);
        for (const e of sorted) drawEnemy(g, e, t);
        for (const pad of this.pads) {
            if (pad.tower) drawTower(g, pad.tower, t);
        }

        for (const b of this.beams) {
            const a = b.life / b.maxLife;
            g.lineStyle(b.width + 5, b.color, 0.16 * a);
            g.lineBetween(b.x1, b.y1, b.x2, b.y2);
            g.lineStyle(b.width, b.color, 0.95 * a);
            g.lineBetween(b.x1, b.y1, b.x2, b.y2);
        }
        for (const arc of this.arcs) {
            const a = arc.life / arc.maxLife;
            for (let pass = 0; pass < 2; pass++) {
                g.lineStyle(pass === 0 ? 7 : 2.5, arc.color, (pass === 0 ? 0.18 : 0.95) * a);
                g.beginPath();
                for (let i = 0; i < arc.points.length; i++) {
                    const p = arc.points[i];
                    const jx = i === 0 ? 0 : (Math.random() - 0.5) * 10;
                    const jy = i === 0 ? 0 : (Math.random() - 0.5) * 10;
                    if (i === 0) g.moveTo(p.x, p.y);
                    else g.lineTo(p.x + jx, p.y + jy);
                }
                g.strokePath();
            }
        }
        for (const p of this.particles) {
            const a = Math.max(0, p.life / p.maxLife);
            g.fillStyle(p.color, a);
            g.fillCircle(p.x, p.y, p.size * (0.5 + a * 0.7));
        }
        for (const r of this.rings) {
            const a = Math.max(0, r.life / r.maxLife);
            g.lineStyle(r.width, r.color, a * 0.8);
            g.strokeCircle(r.x, r.y, r.radius);
        }
        if (this.flashTimer > 0) {
            g.fillStyle(0xff5b45, this.flashTimer * 0.22);
            g.fillRect(0, 0, 1280, 800);
        }

        this.drawUi();
        this.drawOverlay();
        this.syncText();
    }

    private drawUi(): void {
        const g = this.ui;
        g.clear();
        g.fillStyle(0x18231f, 0.94);
        g.fillRect(0, 0, 1280, 62);
        g.lineStyle(1, 0xf2b64b, 0.35);
        g.lineBetween(0, 62, 1280, 62);
        g.lineStyle(1, 0xf7ecd2, 0.1);
        g.lineBetween(274, 10, 274, 52);
        g.lineBetween(432, 10, 432, 52);
        g.lineBetween(572, 10, 572, 52);
        g.lineBetween(782, 10, 782, 52);

        drawHealthBar(g, 584, 42, 170, 8, this.integrity / 100, this.integrity > 55 ? 0x9fd36b : this.integrity > 25 ? 0xffc857 : 0xff6b55);

        for (let i = 0; i < WAVES.length; i++) {
            const done = i < this.wave || this.mode === 'won';
            const current = i === this.wave && this.mode !== 'won';
            g.fillStyle(done ? 0xf2b64b : current ? 0xffd678 : 0x4a5349, done || current ? 0.95 : 0.55);
            g.fillRect(286 + i * 13, 50, 8, 5);
        }

        const btnY = 12;
        for (let i = 0; i < 3; i++) {
            g.fillStyle(0x273730, 1);
            g.fillRoundedRect(1096 + i * 50, btnY, 38, 36, 8);
            g.lineStyle(1, 0xf7ecd2, 0.12);
            g.strokeRoundedRect(1096 + i * 50, btnY, 38, 36, 8);
        }

        const boss = this.enemies.find((e) => e.type === 'boss');
        if (boss) {
            g.fillStyle(0x1a1216, 0.8);
            g.fillRoundedRect(392, 66, 496, 30, 10);
            g.lineStyle(1, 0xff9a5c, 0.4);
            g.strokeRoundedRect(392, 66, 496, 30, 10);
            drawHealthBar(g, 402, 82, 476, 8, boss.hp / boss.maxHp, 0xff7a55);
        }

        if (this.panelOpen()) this.drawPanel(g);
    }

    private drawPanel(g: Phaser.GameObjects.Graphics): void {
        const pad = this.pads[this.selectedPad];
        if (!pad) return;
        const tower = pad.tower;
        g.fillStyle(0x18231f, 0.97);
        g.fillRoundedRect(286, 666, 708, 116, 12);
        g.lineStyle(1, 0xf2b64b, 0.4);
        g.strokeRoundedRect(286, 666, 708, 116, 12);
        g.fillStyle(0xf2b64b, 0.9);
        g.fillRoundedRect(286, 666, 4, 116, 2);

        const upCost = tower && tower.level < 3 ? upgradeCost(tower.type, tower.level) : 0;
        const canUp = tower ? tower.level < 3 && this.credits >= upCost : this.credits >= TOWER_COST.sunspear;
        const canArc = tower ? true : this.credits >= TOWER_COST.arc;
        this.drawButton(g, 590, 674, 170, 92, canUp, 0xffd678);
        this.drawButton(g, 772, 674, 148, 92, canArc, tower ? 0xff9a5c : 0x7ff0df);
        g.fillStyle(0x273730, 1);
        g.fillCircle(956, 700, 15);
        g.lineStyle(1, 0xf2b64b, 0.35);
        g.strokeCircle(956, 700, 15);
    }

    private drawButton(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, enabled: boolean, accent: number): void {
        g.fillStyle(enabled ? 0x2b3d35 : 0x222b27, 1);
        g.fillRoundedRect(x, y, w, h, 9);
        g.lineStyle(1.5, enabled ? accent : 0x4a5349, enabled ? 0.8 : 0.4);
        g.strokeRoundedRect(x, y, w, h, 9);
        g.fillStyle(accent, enabled ? 0.85 : 0.25);
        g.fillRoundedRect(x, y, 3, h, 2);
    }

    private drawOverlay(): void {
        const g = this.overlayG;
        g.clear();
        const showMenu = this.mode === 'menu';
        const showPause = this.mode === 'paused';
        const showEnd = this.mode === 'won' || this.mode === 'lost';

        const ba = this.bannerTimer > 0
            ? Math.min(1, this.bannerTimer / 0.45) * Math.min(1, (this.bannerMax - this.bannerTimer) / 0.2 + 0.2)
            : 0;
        if (ba > 0 && (this.mode === 'playing' || this.mode === 'menu')) {
            g.fillStyle(0x18231f, 0.62 * ba);
            g.fillRoundedRect(392, 318, 496, 106, 14);
            g.lineStyle(1, 0xf2b64b, 0.35 * ba);
            g.strokeRoundedRect(392, 318, 496, 106, 14);
        }

        if (showMenu) {
            g.fillStyle(0x15201c, 0.16);
            g.fillRect(0, 0, 1280, 800);
            g.fillStyle(0x17231f, 0.98);
            g.fillRoundedRect(60, 84, 580, 646, 20);
            g.lineStyle(1.5, 0xf2b64b, 0.55);
            g.strokeRoundedRect(60, 84, 580, 646, 20);
            g.fillStyle(0xf2b64b, 1);
            g.fillRoundedRect(60, 84, 580, 4, 2);
            g.lineStyle(1, 0xf7ecd2, 0.14);
            g.lineBetween(98, 352, 600, 352);
            g.lineBetween(98, 500, 600, 500);

            // sun seal
            const sx = 584, sy = 158;
            g.fillStyle(0xf2b64b, 0.16);
            g.fillCircle(sx, sy, 42);
            g.lineStyle(2, 0xf2b64b, 0.8);
            g.strokeCircle(sx, sy, 30);
            g.fillStyle(0xffd678, 0.9);
            g.fillCircle(sx, sy, 13);
            for (let i = 0; i < 12; i++) {
                const a = (i / 12) * Math.PI * 2;
                g.lineStyle(2, 0xf2b64b, 0.55);
                g.lineBetween(sx + Math.cos(a) * 34, sy + Math.sin(a) * 34, sx + Math.cos(a) * 42, sy + Math.sin(a) * 42);
            }

            for (let i = 0; i < 3; i++) {
                const y = 384 + i * 40;
                g.fillStyle(0xf2b64b, 0.95);
                g.fillTriangle(104, y - 6, 113, y, 104, y + 6);
            }
            g.fillStyle(this.startHover ? 0xffd678 : 0xf2b64b, 1);
            g.fillRoundedRect(START_BUTTON.x, START_BUTTON.y, START_BUTTON.w, START_BUTTON.h, 10);
            g.lineStyle(2, 0x18231f, 0.35);
            g.strokeRoundedRect(START_BUTTON.x, START_BUTTON.y, START_BUTTON.w, START_BUTTON.h, 10);
        }

        if (showPause) {
            g.fillStyle(0x101815, 0.48);
            g.fillRect(0, 0, 1280, 800);
            g.fillStyle(0x17231f, 0.97);
            g.fillRoundedRect(430, 294, 420, 200, 16);
            g.lineStyle(1.5, 0xf2b64b, 0.5);
            g.strokeRoundedRect(430, 294, 420, 200, 16);
            g.fillStyle(this.pauseHover ? 0xffd678 : 0xf2b64b, 1);
            g.fillRoundedRect(RESUME_BUTTON.x, RESUME_BUTTON.y, RESUME_BUTTON.w, RESUME_BUTTON.h, 8);
        }

        if (showEnd) {
            const won = this.mode === 'won';
            const accent = won ? 0xf2b64b : 0xe4664d;
            g.fillStyle(0x101815, 0.56);
            g.fillRect(0, 0, 1280, 800);
            g.fillStyle(0x17231f, 0.97);
            g.fillRoundedRect(350, 214, 580, 370, 18);
            g.lineStyle(1.5, accent, 0.6);
            g.strokeRoundedRect(350, 214, 580, 370, 18);
            g.fillStyle(accent, 1);
            g.fillRoundedRect(350, 214, 580, 4, 2);
            g.lineStyle(1, 0xf7ecd2, 0.14);
            g.lineBetween(430, 370, 850, 370);
            g.fillStyle(won ? 0xf2b64b : 0xe4664d, 1);
            g.fillRoundedRect(AGAIN_BUTTON.x, AGAIN_BUTTON.y, AGAIN_BUTTON.w, AGAIN_BUTTON.h, 9);
        }
    }

    private syncText(): void {
        const tower = this.padTower(this.selectedPad);
        const panel = this.panelOpen();
        const boss = this.enemies.find((e) => e.type === 'boss');

        this.waveValue.setText(this.mode === 'menu' ? '— / 6' : `${Math.min(this.wave + 1, 6)} / 6`);
        this.creditsValue.setText(`◎ ${Math.round(this.credits)}`);
        this.integrityValue.setText(`${Math.round(this.integrity)}%`);
        this.integrityValue.setColor(this.integrity > 55 ? '#f7ecd2' : this.integrity > 25 ? '#ffc857' : '#ff8a70');
        if (this.mode === 'menu') this.waveSub.setText('AWAITING ORDERS');
        else if (this.mode === 'won') this.waveSub.setText('COMPLETE');
        else if (this.mode === 'lost') this.waveSub.setText('RELAY DOWN');
        else if (this.waveState === 'prep') this.waveSub.setText(`PREP ${Math.max(0, Math.ceil(this.prepTimer))}s`);
        else if (this.waveState === 'spawning') this.waveSub.setText('INCOMING');
        else if (this.enemies.length > 0) this.waveSub.setText('IN COMBAT');
        else this.waveSub.setText('SECTOR CLEAR');

        this.pauseIcon.setText(this.mode === 'paused' ? '▶' : 'II');
        this.speedText.setText(`${this.speed}×`);
        this.muteText.setText(this.audio.isMuted ? '×' : '♪');
        this.speedText.setColor(this.speed === 2 ? '#ffd678' : '#f7ecd2');
        this.muteText.setColor(this.audio.isMuted ? '#ff8a70' : '#f7ecd2');

        this.bossLabel.setText(boss ? `SIEGE WARDEN   ${Math.round(boss.hp)} / ${boss.maxHp}` : '');
        this.bossLabel.setVisible(!!boss);

        this.bannerText.setText(this.bannerTitle);
        this.bannerText2.setText(this.bannerSub);
        const ba = this.bannerTimer > 0 ? Math.min(1, this.bannerTimer / 0.45) * Math.min(1, (this.bannerMax - this.bannerTimer) / 0.2 + 0.2) : 0;
        this.bannerText.setAlpha(ba);
        this.bannerText2.setAlpha(ba);
        this.bannerText.setVisible(ba > 0 && (this.mode === 'playing' || this.mode === 'menu'));
        this.bannerText2.setVisible(ba > 0 && (this.mode === 'playing' || this.mode === 'menu'));

        this.hint.setText(this.hintForState());
        this.hint.setVisible(this.mode === 'playing' && !panel);

        this.panelTitle.setVisible(panel);
        this.panelSub.setVisible(panel);
        this.panelStats.setVisible(panel);
        this.btn1Title.setVisible(panel);
        this.btn1Sub.setVisible(panel);
        this.btn2Title.setVisible(panel);
        this.btn2Sub.setVisible(panel);
        this.closeText.setVisible(panel);
        if (panel) {
            const pad = this.pads[this.selectedPad];
            if (tower) {
                this.panelTitle.setText(`${tower.type === 'sunspear' ? 'SUNSPEAR' : 'ARC PYLON'}  ·  MK ${tower.level}`);
                this.panelSub.setText(`DMG ${tower.damage}   RANGE ${tower.range}   ${tower.fireRate.toFixed(2)}s`);
                this.panelStats.setText(tower.type === 'sunspear'
                    ? 'Solar lance. Long reach, heavy single-target burst.'
                    : `Chain lightning · ${tower.chain} jumps · ${Math.round(tower.slow * 100)}% slow.`);
                const maxed = tower.level >= 3;
                this.btn1Title.setText(maxed ? 'FULLY UPGRADED' : 'UPGRADE');
                this.btn1Sub.setText(maxed ? 'MK 3' : `◎ ${upgradeCost(tower.type, tower.level)}   ·   U`);
                let paid = TOWER_COST[tower.type];
                for (let l = 1; l < tower.level; l++) paid += upgradeCost(tower.type, l);
                this.btn2Title.setText('SALVAGE');
                this.btn2Sub.setText(`+ ◎ ${Math.floor(paid * 0.65)}   ·   X`);
            } else {
                this.panelTitle.setText(`BUILD PAD ${pad.index + 1}`);
                this.panelSub.setText('Choose a tower role.');
                this.panelStats.setText('Towers fire automatically. Cover the road.');
                this.btn1Title.setText('1   SUNSPEAR');
                this.btn1Sub.setText(`◎ ${TOWER_COST.sunspear}  ·  long-range burst`);
                this.btn2Title.setText('2   ARC PYLON');
                this.btn2Sub.setText(`◎ ${TOWER_COST.arc}  ·  chain + slow`);
            }
        }

        this.setMenuText(this.showMenu());
        this.setPauseText(this.mode === 'paused');
        this.setEndText(this.mode === 'won' || this.mode === 'lost');
    }

    private showMenu(): boolean { return this.mode === 'menu'; }

    private hintForState(): string {
        if (this.mode === 'menu') return '';
        if (this.selectedPad >= 0) {
            return this.padTower(this.selectedPad) ? 'U  UPGRADE     ·     X  SELL     ·     ESC  CLOSE' : '1  SUNSPEAR     ·     2  ARC PYLON     ·     ESC  CLOSE';
        }
        if (this.pads.every((p) => !p.tower)) return 'CLICK A GLOWING PAD TO BUILD YOUR FIRST TOWER';
        return 'CLICK A PAD TO BUILD OR UPGRADE     ·     P  PAUSE     ·     S  SPEED     ·     M  MUTE';
    }

    private setMenuText(v: boolean): void {
        this.startOverline.setVisible(v);
        this.startTitle1.setVisible(v);
        this.startTitle2.setVisible(v);
        this.startSub.setVisible(v);
        this.startStep1.setVisible(v);
        this.startStep2.setVisible(v);
        this.startStep3.setVisible(v);
        this.startControls.setVisible(v);
        this.startButtonText.setVisible(v);
        this.startEnter.setVisible(v);
        this.startFoot.setVisible(v);
    }

    private setPauseText(v: boolean): void {
        this.pauseTitle.setVisible(v);
        this.pauseSub.setVisible(v);
        this.pauseButtonText.setVisible(v);
        this.pauseHint.setVisible(v);
    }

    private setEndText(v: boolean): void {
        this.endOverline.setVisible(v);
        this.endTitle.setVisible(v);
        this.endSub.setVisible(v);
        this.endStats.setVisible(v);
        this.endStats2.setVisible(v);
        this.endButtonText.setVisible(v);
        this.endHint.setVisible(v);
        if (!v) return;
        const won = this.mode === 'won';
        const accent = won ? '#f2b64b' : '#ff8a70';
        this.endOverline.setText(won ? 'CAMPAIGN COMPLETE' : 'OUTPOST LOST').setColor(accent);
        this.endTitle.setText(won ? 'RELAY SECURED' : 'RELAY DOWN').setColor(accent);
        this.endSub.setText(won ? 'Six waves broke against the solar line.' : 'The dunes swallowed the last light.');
        const mins = Math.floor(this.totalTime / 60);
        const secs = Math.floor(this.totalTime % 60).toString().padStart(2, '0');
        this.endStats.setText(`WAVES ${won ? 6 : Math.min(this.wave + 1, 6)} / 6   ·   HOSTILES ${this.kills}   ·   SCORE ${this.score}`);
        this.endStats2.setText(`RELAY ${Math.round(this.integrity)}%   ·   TIME ${mins}:${secs}`);
        this.endButtonText.setText(won ? 'DEFEND AGAIN' : 'TRY AGAIN');
        this.endHint.setText('or press R');
    }
}
