import { Scene, TintModes } from 'phaser';
import { audio } from '../audio';

// ============================================================
// Relay Defense — core gameplay scene
// Coordinates: canvas 1024x768, origin top-left, x right, y down.
// ============================================================

const W = 1024;
const H = 768;
const HUD_TOP = 40;
const BAR_H = 78;
const BAR_Y = H - BAR_H;

// Path waypoints (playfield). Enemies walk these in order, then hit the core.
const PATH: Array<[number, number]> = [
    [1060, 150], [560, 150], [560, 360], [830, 360],
    [830, 590], [250, 590], [250, 300], [185, 300],
];
const CORE: [number, number] = [140, 300];

type EnemyKind = 'scout' | 'runner' | 'crawler' | 'drone' | 'boss';
type TowerKind = 'turret' | 'pylon';

interface EnemyDef { hp: number; speed: number; reward: number; r: number; tex: string; label: string }
const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
    scout: { hp: 22, speed: 72, reward: 8, r: 12, tex: 'e-scout', label: 'Scout' },
    runner: { hp: 16, speed: 118, reward: 9, r: 11, tex: 'e-runner', label: 'Runner' },
    crawler: { hp: 75, speed: 44, reward: 15, r: 16, tex: 'e-crawler', label: 'Crawler' },
    drone: { hp: 44, speed: 62, reward: 13, r: 13, tex: 'e-drone', label: 'Drone' },
    boss: { hp: 1150, speed: 26, reward: 200, r: 30, tex: 'e-boss', label: 'Sandstorm Titan' },
};

interface TowerLevel { cost: number; dmg: number; rate: number; range: number; chain: number }
interface TowerDef { name: string; cost: number; levels: TowerLevel[]; color: number; desc: string }
const TOWER_DEFS: Record<TowerKind, TowerDef> = {
    turret: {
        name: 'Solar Turret', cost: 50, color: 0xffd447,
        desc: 'Fast single-target beam',
        levels: [
            { cost: 50, dmg: 8, rate: 0.5, range: 175, chain: 1 },
            { cost: 60, dmg: 14, rate: 0.4, range: 190, chain: 1 },
            { cost: 110, dmg: 24, rate: 0.3, range: 210, chain: 1 },
        ],
    },
    pylon: {
        name: 'Arc Pylon', cost: 90, color: 0x4fd7ff,
        desc: 'Lightning chains between foes',
        levels: [
            { cost: 90, dmg: 7, rate: 1.0, range: 150, chain: 3 },
            { cost: 80, dmg: 12, rate: 0.9, range: 165, chain: 4 },
            { cost: 140, dmg: 20, rate: 0.8, range: 180, chain: 5 },
        ],
    },
};

interface WaveEntry { kind: EnemyKind; count: number; gap: number; delay: number }
const WAVES: WaveEntry[][] = [
    [{ kind: 'scout', count: 8, gap: 1.1, delay: 0 }],
    [{ kind: 'scout', count: 8, gap: 1.0, delay: 0 }, { kind: 'runner', count: 4, gap: 1.2, delay: 5 }],
    [{ kind: 'crawler', count: 6, gap: 1.6, delay: 0 }, { kind: 'scout', count: 6, gap: 0.9, delay: 3 }],
    [{ kind: 'runner', count: 8, gap: 0.8, delay: 0 }, { kind: 'drone', count: 6, gap: 1.4, delay: 4 }, { kind: 'crawler', count: 4, gap: 2.0, delay: 8 }],
    [{ kind: 'drone', count: 12, gap: 1.0, delay: 0 }, { kind: 'crawler', count: 9, gap: 1.4, delay: 5 }],
    [{ kind: 'crawler', count: 4, gap: 1.5, delay: 0 }, { kind: 'runner', count: 10, gap: 0.7, delay: 3 },
     { kind: 'drone', count: 6, gap: 1.2, delay: 7 }, { kind: 'boss', count: 1, gap: 1, delay: 14 }],
];

interface Enemy {
    kind: EnemyKind; hp: number; maxHp: number; speed: number; reward: number; r: number;
    x: number; y: number; wp: number; dist: number; flash: number;
    cont: Phaser.GameObjects.Container; body: Phaser.GameObjects.Image;
    hpFill: Phaser.GameObjects.Rectangle;
}
interface Tower {
    kind: TowerKind; x: number; y: number; level: number; cd: number;
    head: Phaser.GameObjects.Image; cont: Phaser.GameObjects.Container;
}
interface Proj { x: number; y: number; vx: number; vy: number; dmg: number; target: Enemy | null; img: Phaser.GameObjects.Image }
interface Bolt { pts: Array<[number, number]>; life: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: number; size: number }
interface FloatText { obj: Phaser.GameObjects.Text; life: number }

function distToPath(px: number, py: number): number
{
    let best = Infinity;
    for (let i = 0; i < PATH.length - 1; i++)
    {
        const [x1, y1] = PATH[i]; const [x2, y2] = PATH[i + 1];
        const dx = x2 - x1; const dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
        const cx = x1 + t * dx; const cy = y1 + t * dy;
        best = Math.min(best, Math.hypot(px - cx, py - cy));
    }
    return best;
}

export class Game extends Scene
{
    private credits = 140;
    private lives = 10;
    private waveIdx = 0;
    private waveActive = false;
    private buildTimer = 10; // countdown to next wave while building
    private spawnQueue: Array<{ kind: EnemyKind; at: number }> = [];
    private waveTime = 0;
    private speed = 1;
    private paused = false;
    private over = false;

    private enemies: Enemy[] = [];
    private towers: Tower[] = [];
    private projs: Proj[] = [];
    private bolts: Bolt[] = [];
    private parts: Particle[] = [];
    private floats: FloatText[] = [];

    private placing: TowerKind | null = null;
    private selected: Tower | null = null;
    private ghost!: Phaser.GameObjects.Container;
    private rangeG!: Phaser.GameObjects.Graphics;
    private boltG!: Phaser.GameObjects.Graphics;
    private partG!: Phaser.GameObjects.Graphics;

    private creditText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private waveText!: Phaser.GameObjects.Text;
    private infoText!: Phaser.GameObjects.Text;
    private waveBtn!: Phaser.GameObjects.Container;
    private waveBtnText!: Phaser.GameObjects.Text;
    private speedBtnText!: Phaser.GameObjects.Text;
    private muteBtnText!: Phaser.GameObjects.Text;
    private pauseBtnText!: Phaser.GameObjects.Text;
    private upgBtn: Phaser.GameObjects.Container | null = null;
    private tutorialPanel: Phaser.GameObjects.Container | null = null;
    private coreGlow!: Phaser.GameObjects.Image;
    private time2 = 0;

    constructor() { super('Game'); }

    create(): void
    {
        (window as unknown as { __rd_scene: unknown }).__rd_scene = this;

        // Reset mutable state: Phaser scene.restart() reuses the instance,
        // so class field initializers do NOT run again. Reset everything
        // a restart must clear here.
        this.credits = 140;
        this.lives = 10;
        this.waveIdx = 0;
        this.waveActive = false;
        this.buildTimer = 10;
        this.spawnQueue = [];
        this.waveTime = 0;
        this.speed = 1;
        this.paused = false;
        this.over = false;
        this.enemies = [];
        this.towers = [];
        this.projs = [];
        this.bolts = [];
        this.parts = [];
        this.floats = [];
        this.placing = null;
        this.selected = null;
        this.upgBtn = null;
        this.tutorialPanel = null;
        this.time2 = 0;

        this.makeTextures();
        this.add.image(W / 2, H / 2, 'desert');

        // Core (relay dish)
        this.coreGlow = this.add.image(CORE[0], CORE[1], 'core-glow').setDepth(11).setAlpha(0.7);
        this.add.image(CORE[0], CORE[1], 'core').setDepth(12);
        this.add.text(CORE[0], CORE[1] + 52, 'RELAY CORE', { fontFamily: 'Verdana', fontSize: 11, color: '#5b3d16' }).setOrigin(0.5).setDepth(12);

        this.rangeG = this.add.graphics().setDepth(5);
        this.boltG = this.add.graphics().setDepth(24);
        this.partG = this.add.graphics().setDepth(25);

        this.buildHud();
        this.buildBottomBar();
        this.buildGhost();
        this.showTutorial();

        this.input.keyboard?.on('keydown-P', () => this.togglePause());
        this.input.keyboard?.on('keydown-F', () => this.cycleSpeed());
        this.input.keyboard?.on('keydown-M', () => this.toggleMute());
        this.input.keyboard?.on('keydown-R', () => this.restart());
        this.input.keyboard?.on('keydown-ONE', () => this.pickPlace('turret'));
        this.input.keyboard?.on('keydown-TWO', () => this.pickPlace('pylon'));
        this.input.keyboard?.on('keydown-U', () => this.upgradeSelected());
        this.input.keyboard?.on('keydown-ESC', () => { this.placing = null; this.selectTower(null); });
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));

        // Inspection hooks (real game state)
        window.render_game_to_text = () => this.stateText();
        window.advanceTime = (ms: number) => this.advanceTimeHook(ms);

        audio.startMusic();
    }

    // ================= textures =================
    private makeTextures(): void
    {
        const g = this.add.graphics();
        // --- desert ground ---
        g.fillStyle(0xe6c078); g.fillRect(0, 0, W, H);
        for (let i = 0; i < 260; i++)
        {
            const x = Math.random() * W; const y = HUD_TOP + Math.random() * (H - HUD_TOP);
            g.fillStyle(Math.random() < 0.5 ? 0xd9b06a : 0xf0d08c, 0.55);
            g.fillCircle(x, y, 3 + Math.random() * 14);
        }
        // dune ridges
        g.lineStyle(2, 0xcf9f58, 0.6);
        for (let i = 0; i < 14; i++)
        {
            const y = 70 + Math.random() * 600; const x0 = Math.random() * W - 100;
            g.beginPath(); g.moveTo(x0, y);
            for (let x = 0; x < 220; x += 20) { g.lineTo(x0 + x, y + Math.sin(x / 40) * 6); }
            g.strokePath();
        }
        // rocks
        for (let i = 0; i < 26; i++)
        {
            const x = Math.random() * W; const y = 60 + Math.random() * 620;
            if (distToPath(x, y) < 70) { continue; }
            const s = 4 + Math.random() * 7;
            g.fillStyle(0xb08a52); g.fillCircle(x, y, s);
            g.fillStyle(0x8a6a3c); g.fillCircle(x + s * 0.3, y + s * 0.3, s * 0.55);
        }
        // cacti
        for (let i = 0; i < 8; i++)
        {
            const x = 60 + Math.random() * 900; const y = 70 + Math.random() * 580;
            if (distToPath(x, y) < 80) { continue; }
            g.fillStyle(0x4e7d3a); g.fillRect(x - 3, y - 16, 6, 22);
            g.fillRect(x - 12, y - 10, 9, 4); g.fillRect(x - 12, y - 16, 4, 8);
            g.fillRect(x + 3, y - 6, 9, 4); g.fillRect(x + 8, y - 13, 4, 9);
        }
        // road
        const drawPath = (w: number, c: number) =>
        {
            g.lineStyle(w, c); g.beginPath();
            g.moveTo(PATH[0][0], PATH[0][1]);
            for (let i = 1; i < PATH.length; i++) { g.lineTo(PATH[i][0], PATH[i][1]); }
            g.strokePath();
        };
        drawPath(60, 0xa97e3e);
        drawPath(52, 0xc49a55);
        g.lineStyle(2, 0x8a6330, 0.8); // edge lines
        g.beginPath(); g.moveTo(PATH[0][0] + 26, PATH[0][1] - 4);
        for (let i = 1; i < PATH.length; i++) { g.lineTo(PATH[i][0] + 26, PATH[i][1] - 4); }
        g.strokePath();
        g.beginPath(); g.moveTo(PATH[0][0] + 26, PATH[0][1] + 4);
        for (let i = 1; i < PATH.length; i++) { g.lineTo(PATH[i][0] + 26, PATH[i][1] + 4); }
        g.strokePath();
        g.generateTexture('desert', W, H);
        g.clear();

        // --- core glow + dish ---
        g.fillStyle(0xffe9a3, 0.35); g.fillCircle(48, 48, 44);
        g.fillStyle(0xffd447, 0.4); g.fillCircle(48, 48, 30);
        g.generateTexture('core-glow', 96, 96); g.clear();

        g.fillStyle(0x6b6f76); g.fillCircle(48, 54, 22); // base
        g.fillStyle(0x9aa0a8); g.fillCircle(48, 54, 16);
        g.fillStyle(0x4a4e55); g.fillRect(44, 20, 8, 26); // mast
        g.fillStyle(0xf5f7fa); g.fillEllipse(48, 22, 44, 16); // dish
        g.fillStyle(0xcdd3da); g.fillEllipse(48, 24, 34, 10);
        g.fillStyle(0xffd447); g.fillCircle(48, 22, 5); // beacon
        g.generateTexture('core', 96, 96); g.clear();

        // --- towers ---
        g.fillStyle(0x7d7466); g.fillCircle(24, 24, 20); // turret base
        g.fillStyle(0x9d9484); g.fillCircle(24, 24, 16);
        g.fillStyle(0x5e574c); g.fillCircle(24, 24, 7);
        g.generateTexture('turret-base', 48, 48); g.clear();
        g.fillStyle(0xffd447); g.fillRoundedRect(8, 12, 32, 24, 5); // turret head
        g.fillStyle(0x3d3a33); g.fillRect(30, 20, 18, 8); // barrel
        g.fillStyle(0xfff3c4); g.fillCircle(20, 24, 6);
        g.generateTexture('turret-head', 48, 48); g.clear();

        g.fillStyle(0x5a6f7a); g.fillCircle(24, 24, 20); // pylon base
        g.fillStyle(0x7e97a3); g.fillCircle(24, 24, 16);
        g.fillStyle(0x2f3b42); g.fillCircle(24, 24, 7);
        g.generateTexture('pylon-base', 48, 48); g.clear();
        g.fillStyle(0x4fd7ff); g.fillCircle(24, 24, 12); // pylon orb
        g.fillStyle(0xdffbff); g.fillCircle(20, 20, 5);
        g.lineStyle(3, 0x2b8fa8);
        g.beginPath(); g.moveTo(24, 12); g.lineTo(24, 4); g.strokePath();
        g.beginPath(); g.moveTo(24, 36); g.lineTo(24, 44); g.strokePath();
        g.generateTexture('pylon-head', 48, 48); g.clear();

        // --- enemies ---
        // scout: yellow triangle
        g.fillStyle(0xffd23f); g.fillTriangle(26, 6, 12, 40, 40, 40);
        g.fillStyle(0x8a6a10); g.fillTriangle(26, 14, 19, 34, 33, 34);
        g.generateTexture('e-scout', 52, 46); g.clear();
        // runner: orange dart
        g.fillStyle(0xff8c3b); g.fillTriangle(40, 20, 8, 6, 14, 20);
        g.fillTriangle(40, 20, 8, 34, 14, 20);
        g.fillStyle(0xffe0b0); g.fillCircle(30, 20, 5);
        g.generateTexture('e-runner', 46, 40); g.clear();
        // crawler: red armored hexagon
        g.fillStyle(0xd8433b); g.fillRect(6, 10, 36, 24);
        g.fillTriangle(42, 10, 42, 34, 50, 22);
        g.fillStyle(0x8e211d); g.fillRect(6, 16, 36, 4); g.fillRect(6, 26, 36, 4);
        g.fillStyle(0x3c3c3c); g.fillRect(8, 6, 8, 4); g.fillRect(8, 34, 8, 4);
        g.fillRect(28, 6, 8, 4); g.fillRect(28, 34, 8, 4);
        g.generateTexture('e-crawler', 54, 42); g.clear();
        // drone: violet hovering diamond
        g.fillStyle(0xb07cf0); g.fillTriangle(22, 2, 4, 20, 40, 20);
        g.fillTriangle(22, 38, 4, 20, 40, 20);
        g.fillStyle(0xeadcff); g.fillCircle(22, 20, 6);
        g.fillStyle(0x6a3fa8); g.fillTriangle(22, 8, 12, 20, 32, 20);
        g.generateTexture('e-drone', 44, 40); g.clear();
        // boss: big dark octagon with molten core
        const cx = 40; const cy = 40; const R = 34; const r2 = 22;
        g.fillStyle(0x51372b); g.beginPath();
        for (let i = 0; i < 8; i++)
        {
            const a = (Math.PI / 4) * i + Math.PI / 8;
            const x = cx + Math.cos(a) * R; const y = cy + Math.sin(a) * R;
            if (i === 0) { g.moveTo(x, y); } else { g.lineTo(x, y); }
        }
        g.closePath(); g.fillPath();
        g.fillStyle(0x7a5138); g.beginPath();
        for (let i = 0; i < 8; i++)
        {
            const a = (Math.PI / 4) * i + Math.PI / 8;
            const x = cx + Math.cos(a) * r2; const y = cy + Math.sin(a) * r2;
            if (i === 0) { g.moveTo(x, y); } else { g.lineTo(x, y); }
        }
        g.closePath(); g.fillPath();
        g.fillStyle(0xff8b2e); g.fillCircle(cx, cy, 11);
        g.fillStyle(0xffd76e); g.fillCircle(cx, cy, 5);
        g.generateTexture('e-boss', 80, 80); g.clear();
        g.destroy();
    }

    // ================= HUD & bars =================
    private makeButton(x: number, y: number, w: number, h: number, label: string, cb: () => void, fontSize = 14): Phaser.GameObjects.Container
    {
        const cont = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, w, h, 0x2b3138, 0.92).setStrokeStyle(2, 0x8fa3b0);
        const t = this.add.text(0, 0, label, { fontFamily: 'Verdana', fontSize, color: '#e8eef2' }).setOrigin(0.5);
        cont.add([bg, t]);
        cont.setSize(w, h);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => bg.setFillStyle(0x3d4750));
        bg.on('pointerout', () => bg.setFillStyle(0x2b3138));
        bg.on('pointerdown', () => { audio.sfx('ui'); cb(); });
        (cont as unknown as { bgRect: Phaser.GameObjects.Rectangle; btnText: Phaser.GameObjects.Text }).bgRect = bg;
        (cont as unknown as { bgRect: Phaser.GameObjects.Rectangle; btnText: Phaser.GameObjects.Text }).btnText = t;
        return cont;
    }

    private buildHud(): void
    {
        this.add.rectangle(W / 2, HUD_TOP / 2, W, HUD_TOP, 0x23282e, 0.96).setDepth(100);
        this.creditText = this.add.text(14, HUD_TOP / 2, '', { fontFamily: 'Verdana', fontSize: 16, color: '#ffd447' }).setOrigin(0, 0.5).setDepth(101);
        this.livesText = this.add.text(170, HUD_TOP / 2, '', { fontFamily: 'Verdana', fontSize: 16, color: '#7dff8a' }).setOrigin(0, 0.5).setDepth(101);
        this.waveText = this.add.text(320, HUD_TOP / 2, '', { fontFamily: 'Verdana', fontSize: 16, color: '#8fd4ff' }).setOrigin(0, 0.5).setDepth(101);
        this.add.text(440, HUD_TOP / 2, '1/2 build · click tower to upgrade · P/F/M/R keys',
            { fontFamily: 'Verdana', fontSize: 10, color: '#9fb0bc' }).setOrigin(0, 0.5).setDepth(101);

        const mk = (x: number, label: string, cb: () => void, w = 92) => this.makeButton(x, HUD_TOP / 2, w, 30, label, cb, 12).setDepth(101);
        const pauseBtn = mk(760, 'PAUSE', () => this.togglePause());
        this.pauseBtnText = (pauseBtn as unknown as { btnText: Phaser.GameObjects.Text }).btnText;
        const speedBtn = mk(862, 'SPEED 1x', () => this.cycleSpeed(), 100);
        this.speedBtnText = (speedBtn as unknown as { btnText: Phaser.GameObjects.Text }).btnText;
        const muteBtn = mk(958, 'SOUND ON', () => this.toggleMute());
        this.muteBtnText = (muteBtn as unknown as { btnText: Phaser.GameObjects.Text }).btnText;
        this.refreshHud();
    }

    private buildBottomBar(): void
    {
        this.add.rectangle(W / 2, BAR_Y + BAR_H / 2, W, BAR_H, 0x23282e, 0.96).setDepth(100);
        this.add.text(14, BAR_Y + 10, 'BUILD', { fontFamily: 'Verdana', fontSize: 10, color: '#9fb0bc' }).setDepth(101);

        const mkTowerBtn = (x: number, kind: TowerKind) =>
        {
            const d = TOWER_DEFS[kind];
            const cont = this.makeButton(x, BAR_Y + 40, 168, 54, `${d.name}\n$${d.cost}`, () => this.pickPlace(kind), 13).setDepth(101);
            (cont as unknown as { btnText: Phaser.GameObjects.Text }).btnText.setColor('#' + d.color.toString(16).padStart(6, '0'));
        };
        mkTowerBtn(90, 'turret');
        mkTowerBtn(274, 'pylon');

        this.infoText = this.add.text(460, BAR_Y + 40, 'Select a tower type,\nthen click open sand to build.', { fontFamily: 'Verdana', fontSize: 11, color: '#c9d6de', align: 'center' }).setOrigin(0.5).setDepth(101);

        this.waveBtn = this.makeButton(660, BAR_Y + 40, 150, 54, 'CALL WAVE\n+15 credits', () => this.callWave(), 13).setDepth(101);
        this.waveBtnText = (this.waveBtn as unknown as { btnText: Phaser.GameObjects.Text }).btnText;
        this.waveBtnText.setColor('#7dff8a');

        this.refreshHud();
    }

    private buildGhost(): void
    {
        this.ghost = this.add.container(0, 0).setDepth(30).setVisible(false);
        const base = this.add.image(0, 0, 'turret-base').setAlpha(0.6);
        const head = this.add.image(0, 0, 'turret-head').setAlpha(0.6);
        this.ghost.add([base, head]);
        (this.ghost as unknown as { imgs: Phaser.GameObjects.Image[] }).imgs = [base, head];
    }

    private showTutorial(): void
    {
        const cont = this.add.container(W / 2, 430).setDepth(200);
        const bg = this.add.rectangle(0, 0, 560, 200, 0x1c2126, 0.94).setStrokeStyle(2, 0xffd447);
        const title = this.add.text(0, -74, 'RELAY DEFENSE', { fontFamily: 'Verdana', fontSize: 24, color: '#ffd447' }).setOrigin(0.5);
        const body = this.add.text(0, -8,
            'Raiders march the dirt road to your relay core.\n' +
            '1 — Solar Turret ($50): fast single-target beam\n' +
            '2 — Arc Pylon ($90): lightning that chains 3 foes\n' +
            'Click sand (not the road) to build · click a tower to upgrade.\n' +
            'Survive all 6 waves. P pause · F speed · M mute · R restart.',
            { fontFamily: 'Verdana', fontSize: 13, color: '#e8eef2', align: 'center', lineSpacing: 6 }).setOrigin(0.5);
        const go = this.add.text(0, 72, 'CLICK TO START DEFENDING', { fontFamily: 'Verdana', fontSize: 14, color: '#7dff8a' }).setOrigin(0.5);
        cont.add([bg, title, body, go]);
        this.tutorialPanel = cont;
    }

    // ================= input =================
    private pickPlace(kind: TowerKind): void
    {
        if (this.over) { return; }
        this.selectTower(null);
        this.placing = this.placing === kind ? null : kind;
        audio.sfx('ui');
        this.updateInfoText();
    }

    private canPlaceAt(x: number, y: number): boolean
    {
        if (x < 70 || x > 954 || y < HUD_TOP + 30 || y > BAR_Y - 30) { return false; }
        if (distToPath(x, y) < 48) { return false; }
        if (Math.hypot(x - CORE[0], y - CORE[1]) < 70) { return false; }
        for (const t of this.towers) { if (Math.hypot(x - t.x, y - t.y) < 54) { return false; } }
        return true;
    }

    private onPointerDown(p: Phaser.Input.Pointer): void
    {
        if (this.tutorialPanel)
        {
            this.tutorialPanel.destroy();
            this.tutorialPanel = null;
            audio.sfx('ui');
            return;
        }
        if (this.over) { return; }
        const wx = p.worldX; const wy = p.worldY;
        if (wy < HUD_TOP || wy > BAR_Y) { return; }
        // selecting a tower?
        let hit: Tower | null = null;
        for (const t of this.towers) { if (Math.hypot(wx - t.x, wy - t.y) < 28) { hit = t; break; } }
        if (hit) { this.placing = null; this.selectTower(hit); return; }
        if (this.placing)
        {
            const kind = this.placing;
            const cost = TOWER_DEFS[kind].cost;
            if (!this.canPlaceAt(wx, wy)) { audio.sfx('error'); this.floatText(wx, wy - 20, 'Blocked!', 0xff6b6b); return; }
            if (this.credits < cost) { audio.sfx('error'); this.floatText(wx, wy - 20, 'Need $' + cost, 0xff6b6b); return; }
            this.credits -= cost;
            this.addTower(kind, wx, wy);
            audio.sfx('build');
            this.refreshHud();
        }
        else { this.selectTower(null); }
    }

    private addTower(kind: TowerKind, x: number, y: number): void
    {
        const cont = this.add.container(x, y).setDepth(10);
        const base = this.add.image(0, 0, kind + '-base');
        const head = this.add.image(0, 0, kind + '-head');
        cont.add([base, head]);
        const t: Tower = { kind, x, y, level: 0, cd: 0, head, cont };
        this.towers.push(t);
        this.spawnRing(x, y, TOWER_DEFS[kind].color);
    }

    private selectTower(t: Tower | null): void
    {
        this.selected = t;
        this.upgBtn?.destroy();
        this.upgBtn = null;
        this.rangeG.clear();
        if (!t) { this.updateInfoText(); return; }
        const def = TOWER_DEFS[t.kind];
        const lv = def.levels[t.level];
        this.rangeG.lineStyle(2, def.color, 0.9).fillStyle(def.color, 0.08);
        this.rangeG.fillCircle(t.x, t.y, lv.range);
        this.rangeG.strokeCircle(t.x, t.y, lv.range);
        if (t.level < def.levels.length - 1)
        {
            const next = def.levels[t.level + 1];
            const btn = this.makeButton(880, BAR_Y + 40, 150, 54, `UPGRADE $${next.cost}\n(${t.level + 1}->${t.level + 2})`, () => this.upgradeSelected(), 12).setDepth(101);
            (btn as unknown as { btnText: Phaser.GameObjects.Text }).btnText.setColor('#ffd447');
            this.upgBtn = btn;
        }
        else
        {
            const btn = this.makeButton(880, BAR_Y + 40, 150, 54, 'MAX LEVEL', () => {}, 12).setDepth(101);
            this.upgBtn = btn;
        }
        this.updateInfoText();
    }

    private upgradeSelected(): void
    {
        const t = this.selected;
        if (!t || this.over) { return; }
        const def = TOWER_DEFS[t.kind];
        if (t.level >= def.levels.length - 1) { return; }
        const cost = def.levels[t.level + 1].cost;
        if (this.credits < cost) { audio.sfx('error'); this.floatText(t.x, t.y - 30, 'Need $' + cost, 0xff6b6b); return; }
        this.credits -= cost;
        t.level++;
        audio.sfx('upgrade');
        this.spawnRing(t.x, t.y, 0x7dff8a);
        this.floatText(t.x, t.y - 34, 'LV ' + (t.level + 1), 0x7dff8a);
        this.selectTower(t);
        this.refreshHud();
    }

    // ================= waves =================
    private callWave(): void
    {
        if (this.waveActive || this.over || this.waveIdx >= WAVES.length) { return; }
        this.credits += 15;
        this.startWave();
    }

    private startWave(): void
    {
        this.waveActive = true;
        this.waveTime = 0;
        this.spawnQueue = [];
        for (const e of WAVES[this.waveIdx])
        {
            for (let i = 0; i < e.count; i++)
            {
                this.spawnQueue.push({ kind: e.kind, at: e.delay + i * e.gap });
            }
        }
        this.spawnQueue.sort((a, b) => a.at - b.at);
        audio.sfx('wave');
        this.floatText(W / 2, 200, `WAVE ${this.waveIdx + 1}`, 0xffd447);
        this.refreshHud();
    }

    private endWave(): void
    {
        this.waveActive = false;
        this.waveIdx++;
        if (this.waveIdx >= WAVES.length)
        {
            this.finish(true);
            return;
        }
        this.buildTimer = 12;
        this.credits += 25 + this.waveIdx * 5;
        this.floatText(W / 2, 200, 'WAVE CLEARED  +$', 0x7dff8a);
        this.refreshHud();
    }

    // ================= update loop =================
    update(_time: number, delta: number): void
    {
        this.time2 += delta;
        const dt = Math.min(delta, 50) / 1000;
        const glow = 0.55 + Math.sin(this.time2 / 300) * 0.25;
        this.coreGlow.setAlpha(glow).setScale(1 + Math.sin(this.time2 / 300) * 0.08);
        if (this.paused || this.over) { this.drawParts(dt); return; }

        const sdt = dt * this.speed;
        if (this.tutorialPanel) { return; }

        // wave timing
        if (this.waveActive)
        {
            this.waveTime += sdt;
            while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveTime)
            {
                this.spawnEnemy(this.spawnQueue.shift()!.kind);
            }
            if (!this.spawnQueue.length && !this.enemies.length) { this.endWave(); }
        }
        else if (this.waveIdx < WAVES.length)
        {
            this.buildTimer -= sdt;
            if (this.buildTimer <= 0) { this.startWave(); }
        }

        this.updateEnemies(sdt);
        this.updateTowers(sdt);
        this.updateProjs(sdt);
        for (let i = this.bolts.length - 1; i >= 0; i--)
        {
            this.bolts[i].life -= sdt;
            if (this.bolts[i].life <= 0) { this.bolts.splice(i, 1); }
        }
        this.drawBolts();
        this.drawParts(dt);
        this.updateFloats(dt);
        this.updateGhost();
        this.refreshWaveButton();
    }

    private spawnEnemy(kind: EnemyKind): void
    {
        const d = ENEMY_DEFS[kind];
        const cont = this.add.container(PATH[0][0], PATH[0][1]).setDepth(15);
        const body = this.add.image(0, 0, d.tex);
        const barBg = this.add.rectangle(0, -d.r - 10, Math.max(30, d.r * 2), 5, 0x1c2126, 0.9);
        const hpFill = this.add.rectangle(0, -d.r - 10, Math.max(30, d.r * 2) - 2, 3, 0x6dff7d);
        cont.add([body, barBg, hpFill]);
        if (kind === 'drone') { body.setY(-8); }
        const e: Enemy = { kind, hp: d.hp, maxHp: d.hp, speed: d.speed, reward: d.reward, r: d.r, x: PATH[0][0], y: PATH[0][1], wp: 1, dist: 0, flash: 0, cont, body, hpFill };
        this.enemies.push(e);
    }

    private updateEnemies(dt: number): void
    {
        for (let i = this.enemies.length - 1; i >= 0; i--)
        {
            const e = this.enemies[i];
            let move = e.speed * dt;
            while (move > 0 && e.wp < PATH.length)
            {
                const [tx, ty] = PATH[e.wp];
                const dx = tx - e.x; const dy = ty - e.y;
                const d = Math.hypot(dx, dy);
                if (d <= move)
                {
                    e.x = tx; e.y = ty; e.dist += d; move -= d; e.wp++;
                }
                else
                {
                    e.x += (dx / d) * move; e.y += (dy / d) * move; e.dist += move; move = 0;
                    e.body.setRotation(Math.atan2(dy, dx) + (e.kind === 'crawler' ? Math.PI / 2 : 0));
                }
            }
            if (e.wp >= PATH.length)
            {
                // reached core
                this.enemies.splice(i, 1);
                e.cont.destroy();
                this.lives--;
                audio.sfx('leak');
                this.cameras.main.shake(140, 0.005);
                this.floatText(CORE[0] + 40, CORE[1] - 40, '-1 LIFE', 0xff6b6b);
                this.refreshHud();
                if (this.lives <= 0) { this.finish(false); }
                continue;
            }
            e.cont.setPosition(e.x, e.y);
            if (e.flash > 0)
            {
                e.flash -= dt;
                e.body.setTint(0xffffff).setTintMode(TintModes.FILL);
                if (e.flash <= 0) { e.body.clearTint(); }
            }
            const frac = Math.max(0, e.hp / e.maxHp);
            e.hpFill.width = Math.max(0, (Math.max(30, e.r * 2) - 2) * frac);
            e.hpFill.setX(-(Math.max(30, e.r * 2) - 2) / 2 + e.hpFill.width / 2);
            e.hpFill.setFillStyle(frac > 0.5 ? 0x6dff7d : frac > 0.25 ? 0xffd447 : 0xff6b6b);
        }
    }

    private updateTowers(dt: number): void
    {
        for (const t of this.towers)
        {
            const lv = TOWER_DEFS[t.kind].levels[t.level];
            t.cd -= dt;
            const target = this.findTarget(t.x, t.y, lv.range);
            if (target)
            {
                const ang = Math.atan2(target.y - t.y, target.x - t.x);
                t.head.setRotation(ang + (t.kind === 'turret' ? Math.PI / 2 : 0));
                if (t.cd <= 0)
                {
                    t.cd = lv.rate;
                    this.fire(t, lv, target);
                }
            }
        }
    }

    private findTarget(x: number, y: number, range: number): Enemy | null
    {
        let best: Enemy | null = null;
        let bestDist = -1;
        for (const e of this.enemies)
        {
            if (Math.hypot(e.x - x, e.y - y) <= range && e.dist > bestDist)
            {
                best = e; bestDist = e.dist;
            }
        }
        return best;
    }

    private fire(t: Tower, lv: TowerLevel, target: Enemy): void
    {
        if (t.kind === 'turret')
        {
            const img = this.add.image(t.x, t.y, 'turret-head').setDepth(20).setScale(0.45).setTint(0xffe9a3).setTintMode(TintModes.FILL);
            const ang = Math.atan2(target.y - t.y, target.x - t.x);
            this.projs.push({ x: t.x + Math.cos(ang) * 20, y: t.y + Math.sin(ang) * 20, vx: Math.cos(ang) * 460, vy: Math.sin(ang) * 460, dmg: lv.dmg, target, img });
            audio.sfx('shoot');
        }
        else
        {
            // chain lightning
            const pts: Array<[number, number]> = [[t.x, t.y]];
            const hitSet = new Set<Enemy>();
            let cur: Enemy | null = target;
            let dmg = lv.dmg;
            for (let c = 0; c < lv.chain; c++)
            {
                if (!cur) { break; }
                pts.push([cur.x, cur.y]);
                hitSet.add(cur);
                this.damage(cur, dmg);
                dmg = Math.max(1, Math.round(dmg * 0.8));
                let next: Enemy | null = null;
                let nd = 140;
                for (const e of this.enemies)
                {
                    if (hitSet.has(e)) { continue; }
                    const d = Math.hypot(e.x - cur.x, e.y - cur.y);
                    if (d < nd) { next = e; nd = d; }
                }
                cur = next;
            }
            this.bolts.push({ pts, life: 0.14 });
            audio.sfx('zap');
        }
    }

    private updateProjs(dt: number): void
    {
        for (let i = this.projs.length - 1; i >= 0; i--)
        {
            const p = this.projs[i];
            if (p.target && !this.enemies.includes(p.target))
            {
                // retarget nearest
                let best: Enemy | null = null; let bd = 200;
                for (const e of this.enemies)
                {
                    const d = Math.hypot(e.x - p.x, e.y - p.y);
                    if (d < bd) { best = e; bd = d; }
                }
                p.target = best;
            }
            if (p.target)
            {
                const ang = Math.atan2(p.target.y - p.y, p.target.x - p.x);
                p.vx = Math.cos(ang) * 460; p.vy = Math.sin(ang) * 460;
            }
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.img.setPosition(p.x, p.y);
            p.img.setRotation(p.img.rotation + 0.4);
            let hit = false;
            if (p.target && Math.hypot(p.target.x - p.x, p.target.y - p.y) < p.target.r + 6) { hit = true; }
            if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) { hit = true; }
            if (hit)
            {
                if (p.target) { this.damage(p.target, p.dmg); }
                this.spawnBurst(p.x, p.y, 0xffe9a3, 4, 60);
                p.img.destroy();
                this.projs.splice(i, 1);
            }
        }
    }

    private damage(e: Enemy, dmg: number): void
    {
        e.hp -= dmg;
        e.flash = 0.06;
        this.floatText(e.x, e.y - e.r - 18, String(dmg), 0xffffff, 11);
        if (e.hp <= 0) { this.killEnemy(e); }
        else { audio.sfx('hit'); }
    }

    private killEnemy(e: Enemy): void
    {
        const idx = this.enemies.indexOf(e);
        if (idx >= 0) { this.enemies.splice(idx, 1); }
        e.cont.destroy();
        this.credits += e.reward;
        this.spawnBurst(e.x, e.y, e.kind === 'boss' ? 0xff8b2e : 0xffa64d, e.kind === 'boss' ? 40 : 12, e.kind === 'boss' ? 200 : 110);
        this.floatText(e.x, e.y - e.r - 20, '+$' + e.reward, 0xffd447);
        if (e.kind === 'boss') { this.cameras.main.shake(300, 0.008); this.floatText(e.x, e.y - 60, 'TITAN DOWN!', 0xff8b2e, 20); }
        audio.sfx('boom');
        this.refreshHud();
    }

    // ================= effects =================
    private spawnBurst(x: number, y: number, color: number, n: number, spd: number): void
    {
        for (let i = 0; i < n; i++)
        {
            const a = Math.random() * Math.PI * 2;
            const s = spd * (0.4 + Math.random() * 0.6);
            this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.3, max: 0.8, color, size: 2 + Math.random() * 3 });
        }
    }

    private spawnRing(x: number, y: number, color: number): void
    {
        for (let i = 0; i < 16; i++)
        {
            const a = (Math.PI * 2 * i) / 16;
            this.parts.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.4, max: 0.4, color, size: 3 });
        }
    }

    private drawParts(dt: number): void
    {
        this.partG.clear();
        for (let i = this.parts.length - 1; i >= 0; i--)
        {
            const p = this.parts[i];
            p.life -= dt;
            if (p.life <= 0) { this.parts.splice(i, 1); continue; }
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vx *= 0.92; p.vy *= 0.92;
            this.partG.fillStyle(p.color, p.life / p.max);
            this.partG.fillCircle(p.x, p.y, p.size * (p.life / p.max) + 0.5);
        }
    }

    private drawBolts(): void
    {
        this.boltG.clear();
        for (const b of this.bolts)
        {
            const a = Math.min(1, b.life / 0.14);
            this.boltG.lineStyle(4, 0x4fd7ff, 0.85 * a);
            this.boltG.beginPath();
            this.boltG.moveTo(b.pts[0][0], b.pts[0][1]);
            for (let i = 1; i < b.pts.length; i++)
            {
                const [x0, y0] = b.pts[i - 1];
                const [x1, y1] = b.pts[i];
                const segs = 5;
                for (let s = 1; s <= segs; s++)
                {
                    const t = s / segs;
                    const jx = x0 + (x1 - x0) * t + (s < segs ? (Math.random() - 0.5) * 14 : 0);
                    const jy = y0 + (y1 - y0) * t + (s < segs ? (Math.random() - 0.5) * 14 : 0);
                    this.boltG.lineTo(jx, jy);
                }
            }
            this.boltG.strokePath();
            this.boltG.lineStyle(1.5, 0xdffbff, 0.9 * a);
            this.boltG.strokePath();
        }
    }

    private floatText(x: number, y: number, msg: string, color: number, size = 13): void
    {
        const obj = this.add.text(x, y, msg, { fontFamily: 'Verdana', fontSize: size, color: '#' + color.toString(16).padStart(6, '0'), stroke: '#1c2126', strokeThickness: 3 }).setOrigin(0.5).setDepth(60);
        this.floats.push({ obj, life: 0.9 });
    }

    private updateFloats(dt: number): void
    {
        for (let i = this.floats.length - 1; i >= 0; i--)
        {
            const f = this.floats[i];
            f.life -= dt;
            f.obj.y -= 24 * dt;
            f.obj.setAlpha(Math.max(0, f.life / 0.9));
            if (f.life <= 0) { f.obj.destroy(); this.floats.splice(i, 1); }
        }
    }

    // Ghost preview + info text
    private updateGhost(): void
    {
        const p = this.input.activePointer;
        if (this.placing && p.worldY > HUD_TOP && p.worldY < BAR_Y)
        {
            this.ghost.setVisible(true).setPosition(Math.round(p.worldX), Math.round(p.worldY));
            const ok = this.canPlaceAt(p.worldX, p.worldY) && this.credits >= TOWER_DEFS[this.placing].cost;
            const imgs = (this.ghost as unknown as { imgs: Phaser.GameObjects.Image[] }).imgs;
            const tex = this.placing === 'turret' ? 'turret' : 'pylon';
            imgs[0].setTexture(tex + '-base');
            imgs[1].setTexture(tex + '-head');
            imgs.forEach(im => im.setTint(ok ? 0xffffff : 0xff5555));
            this.rangeG.clear();
            const lv = TOWER_DEFS[this.placing].levels[0];
            this.rangeG.lineStyle(2, TOWER_DEFS[this.placing].color, ok ? 0.7 : 0.3).strokeCircle(p.worldX, p.worldY, lv.range);
        }
        else if (!this.selected)
        {
            this.ghost.setVisible(false);
            this.rangeG.clear();
        }
        else { this.ghost.setVisible(false); }
    }

    private updateInfoText(): void
    {
        if (this.selected)
        {
            const def = TOWER_DEFS[this.selected.kind];
            const lv = def.levels[this.selected.level];
            this.infoText.setText(`${def.name} LV${this.selected.level + 1}\nDMG ${lv.dmg} · ROF ${lv.rate}s · RNG ${lv.range}${lv.chain > 1 ? ` · CHAIN ${lv.chain}` : ''}`);
        }
        else if (this.placing)
        {
            const d = TOWER_DEFS[this.placing];
            this.infoText.setText(`Placing: ${d.name}\n${d.desc}`);
        }
        else
        {
            this.infoText.setText('Select a tower type,\nthen click open sand to build.');
        }
    }

    private refreshHud(): void
    {
        this.creditText.setText(`$${this.credits}`);
        this.livesText.setText(`CORE ${this.lives}/10`);
        this.waveText.setText(`WAVE ${Math.min(this.waveIdx + 1, WAVES.length)}/${WAVES.length}`);
    }

    private refreshWaveButton(): void
    {
        if (this.waveActive)
        {
            this.waveBtnText.setText(`WAVE ${this.waveIdx + 1}\n${this.enemies.length + this.spawnQueue.length} left`);
            this.waveBtnText.setColor('#8fd4ff');
        }
        else if (this.waveIdx < WAVES.length)
        {
            this.waveBtnText.setText(`CALL WAVE ${this.waveIdx + 1}\nin ${Math.ceil(this.buildTimer)}s  (+$15)`);
            this.waveBtnText.setColor('#7dff8a');
        }
        this.updateInfoText();
    }

    // ================= controls =================
    private togglePause(): void
    {
        if (this.over) { return; }
        this.paused = !this.paused;
        this.pauseBtnText.setText(this.paused ? 'RESUME' : 'PAUSE');
        audio.sfx('ui');
        if (this.paused) { this.floatText(W / 2, 260, 'PAUSED', 0xffd447, 26); }
    }

    private cycleSpeed(): void
    {
        this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
        this.speedBtnText.setText(`SPEED ${this.speed}x`);
        audio.sfx('ui');
    }

    private toggleMute(): void
    {
        audio.ensure();
        audio.setMuted(!audio.muted);
        this.muteBtnText.setText(audio.muted ? 'MUTED' : 'SOUND ON');
        if (!audio.muted) { audio.sfx('ui'); }
    }

    private restart(): void
    {
        audio.stopMusic();
        this.scene.restart();
    }

    private finish(win: boolean): void
    {
        this.over = true;
        audio.stopMusic();
        audio.sfx(win ? 'win' : 'lose');
        this.scene.start('GameOver', { win, wave: this.waveIdx, credits: this.credits });
    }

    // ================= inspection hooks =================
    private advanceTimeHook(ms: number): void
    {
        const steps = Math.max(1, Math.round(ms / (1000 / 60)));
        for (let i = 0; i < steps; i++) { this.update(0, 1000 / 60); }
    }

    private stateText(): string
    {
        return JSON.stringify({
            mode: this.over ? (this.scene.isActive('GameOver') ? 'gameover' : 'over-pending') : this.paused ? 'paused' : 'playing',
            credits: this.credits,
            lives: this.lives,
            wave: this.waveIdx + 1,
            waveTotal: WAVES.length,
            waveActive: this.waveActive,
            buildTimer: Math.ceil(this.buildTimer),
            speed: this.speed,
            muted: audio.muted,
            placing: this.placing,
            enemies: this.enemies.map((e) => ({ kind: e.kind, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp) })),
            towers: this.towers.map((t) => ({ kind: t.kind, x: t.x, y: t.y, level: t.level + 1 })),
            queue: this.spawnQueue.length,
        });
    }
}
