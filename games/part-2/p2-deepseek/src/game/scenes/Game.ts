import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT, PADS, RELAY_POS } from '../path';
import {
    RelayModel,
    TOWER_STATS,
    WAVES,
    TOTAL_WAVES,
    type Enemy,
    type EnemyType,
    type GameEvent,
    type Tower,
    type TowerType
} from '../model';
import { ensureTextures } from '../art';
import { audio } from '../audio';
import { UIButton, drawPanel } from '../ui';

type Overlay = 'none' | 'tutorial' | 'pause' | 'won' | 'lost';

interface EnemyView {
    container: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Image;
    shadow: Phaser.GameObjects.Image;
}

interface TowerView {
    container: Phaser.GameObjects.Container;
    head: Phaser.GameObjects.Image;
    ring: Phaser.GameObjects.Graphics;
    pips: Phaser.GameObjects.Graphics;
    level: number;
    angle: number;
}

interface Fx {
    kind: 'beam' | 'ring';
    x: number;
    y: number;
    x2: number;
    y2: number;
    radius: number;
    color: number;
    life: number;
    max: number;
    width: number;
}

interface Mote {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
}

const HUD_TOP = 72;
const HUD_BOTTOM = 632;
const ENEMY_TEXTURE: Record<EnemyType, string> = {
    scarab: 'enemy-scarab',
    crawler: 'enemy-crawler',
    drone: 'enemy-drone',
    titan: 'enemy-titan'
};

export class Game extends Phaser.Scene {
    private model!: RelayModel;
    private overlay: Overlay = 'none';
    private elapsed = 0;
    private relayFlash = 0;

    private enemyViews = new Map<number, EnemyView>();
    private towerViews = new Map<number, TowerView>();
    private fx: Fx[] = [];
    private motes: Mote[] = [];
    private floaters: Phaser.GameObjects.Text[] = [];

    private fxGfx!: Phaser.GameObjects.Graphics;
    private hpGfx!: Phaser.GameObjects.Graphics;
    private rangeGfx!: Phaser.GameObjects.Graphics;
    private padGfx!: Phaser.GameObjects.Graphics;
    private shieldGfx!: Phaser.GameObjects.Graphics;
    private relay!: Phaser.GameObjects.Image;
    private relayGlow!: Phaser.GameObjects.Image;
    private relayRing!: Phaser.GameObjects.Image;

    private dockGfx!: Phaser.GameObjects.Graphics;
    private contextGfx!: Phaser.GameObjects.Graphics;
    private integrityGfx!: Phaser.GameObjects.Graphics;
    private waveDotsGfx!: Phaser.GameObjects.Graphics;
    private bossGfx!: Phaser.GameObjects.Graphics;
    private buildIcons: Phaser.GameObjects.Image[] = [];
    private buildTexts: Phaser.GameObjects.Text[][] = [];
    private waveText!: Phaser.GameObjects.Text;
    private waveNameText!: Phaser.GameObjects.Text;
    private creditsText!: Phaser.GameObjects.Text;
    private integrityText!: Phaser.GameObjects.Text;
    private ctxTitle!: Phaser.GameObjects.Text;
    private ctxSub!: Phaser.GameObjects.Text;
    private ctxHint!: Phaser.GameObjects.Text;
    private bossLabel!: Phaser.GameObjects.Text;

    private startBtn!: UIButton;
    private buildBtns: UIButton[] = [];
    private upgradeBtn!: UIButton;
    private sellBtn!: UIButton;
    private pauseBtn!: UIButton;
    private speedBtn!: UIButton;
    private muteBtn!: UIButton;

    private ghostBase!: Phaser.GameObjects.Image;
    private ghostHead!: Phaser.GameObjects.Image;
    private toastText!: Phaser.GameObjects.Text;
    private toastTimer: Phaser.Time.TimerEvent | null = null;
    private overlayGroup: Phaser.GameObjects.GameObject[] = [];
    private overlayButtons: UIButton[] = [];

    constructor() {
        super('Game');
    }

    create(): void {
        this.enemyViews = new Map();
        this.towerViews = new Map();
        this.fx = [];
        this.floaters = [];
        this.overlayGroup = [];
        this.overlayButtons = [];
        this.overlay = 'none';
        this.elapsed = 0;
        this.relayFlash = 0;
        this.model = new RelayModel();
        this.model.muted = audio.muted;

        ensureTextures(this);
        audio.ensure();
        audio.startMusic();

        this.add.image(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'bg').setDepth(0);
        this.createAmbient();

        this.shieldGfx = this.add.graphics().setDepth(3);
        this.relayRing = this.add.image(RELAY_POS.x, RELAY_POS.y, 'relay-ring').setDepth(4);
        this.relayGlow = this.add
            .image(RELAY_POS.x, RELAY_POS.y, 'relay')
            .setDepth(4)
            .setAlpha(0.16)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(1.05);
        this.relay = this.add.image(RELAY_POS.x, RELAY_POS.y, 'relay').setDepth(5).setScale(0.86);

        this.padGfx = this.add.graphics().setDepth(6);
        for (const pad of PADS) {
            this.add.image(pad.x, pad.y, 'pad').setDepth(6).setScale(0.84);
        }
        this.rangeGfx = this.add.graphics().setDepth(7);

        this.ghostBase = this.add.image(0, 0, 'lance-base').setDepth(8).setAlpha(0);
        this.ghostHead = this.add.image(0, 0, 'lance-head').setDepth(8).setAlpha(0);

        this.fxGfx = this.add.graphics().setDepth(40);
        this.hpGfx = this.add.graphics().setDepth(42);

        this.createHud();
        this.bindInput();
        this.createTutorial();
        this.exposeHooks();
        this.updateHud();
    }

    private createAmbient(): void {
        this.motes = [];
        for (let i = 0; i < 34; i++) {
            const mote: Mote = {
                x: Math.random() * MAP_WIDTH,
                y: HUD_TOP + Math.random() * (HUD_BOTTOM - HUD_TOP),
                vx: 5 + Math.random() * 14,
                vy: -3 - Math.random() * 7,
                size: 0.8 + Math.random() * 1.8,
                alpha: 0.12 + Math.random() * 0.2
            };
            this.motes.push(mote);
        }
    }

    private bindInput(): void {
        this.input.removeAllListeners();
        this.input.keyboard?.removeAllListeners();
        this.input.keyboard?.addCapture('SPACE');

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.model.hoverPad = this.overlay === 'none' ? this.padAt(pointer.x, pointer.y) : null;
        });
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.overlay !== 'none') return;
            if (pointer.y < HUD_TOP || pointer.y > HUD_BOTTOM) return;
            const pad = this.padAt(pointer.x, pointer.y);
            if (pad !== null) {
                const tower = this.model.towerAtPad(pad);
                if (tower) {
                    this.model.selectedTowerId = tower.id;
                    this.model.buildType = null;
                    audio.sfx('click');
                } else if (this.model.buildType) {
                    this.model.placeTower(pad, this.model.buildType);
                } else {
                    this.model.deny('Choose a tower below, then click a pad');
                }
                return;
            }
            this.model.selectedTowerId = null;
        });

        const kb = this.input.keyboard;
        kb?.on('keydown-P', () => this.togglePause());
        kb?.on('keydown-S', () => this.toggleSpeed());
        kb?.on('keydown-M', () => this.toggleMute());
        kb?.on('keydown-F', () => this.scale.toggleFullscreen());
        kb?.on('keydown-R', () => this.scene.restart());
        kb?.on('keydown-SPACE', () => this.startWave());
        kb?.on('keydown-ONE', () => this.pickBuild('lance'));
        kb?.on('keydown-TWO', () => this.pickBuild('pulse'));
        kb?.on('keydown-U', () => this.upgradeSelected());
        kb?.on('keydown-X', () => this.sellSelected());
        kb?.on('keydown-ESC', () => {
            if (this.overlay === 'pause') {
                this.model.paused = false;
                this.closeOverlay();
            } else if (this.overlay === 'none') {
                this.model.selectedTowerId = null;
                this.model.buildType = null;
            }
        });
    }

    private createHud(): void {
        const g = this.add.graphics().setDepth(1000);
        g.fillStyle(0x241c14, 0.95);
        g.fillRect(0, 0, MAP_WIDTH, HUD_TOP);
        g.fillStyle(0x1c1510, 0.97);
        g.fillRect(0, HUD_BOTTOM, MAP_WIDTH, MAP_HEIGHT - HUD_BOTTOM);
        g.lineStyle(2, 0x6fe3d6, 0.55);
        g.lineBetween(0, HUD_TOP, MAP_WIDTH, HUD_TOP);
        g.lineStyle(1, 0xf2a33c, 0.6);
        g.lineBetween(0, HUD_BOTTOM, MAP_WIDTH, HUD_BOTTOM);
        for (const x of [286, 500, 780, 1030]) {
            g.lineStyle(1, 0x6b573f, 0.55);
            g.lineBetween(x, 12, x, 60);
        }

        this.add.image(32, 36, 'sun-logo').setDepth(1001).setScale(0.62);
        this.add
            .text(56, 13, 'RELAY DEFENSE', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#FFF1D0'
            })
            .setDepth(1001);
        this.add
            .text(56, 35, 'SUNLINE OUTPOST · SECTOR 07', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#B9A582'
            })
            .setDepth(1001)
            .setLetterSpacing(0.6);

        this.waveText = this.add
            .text(300, 9, 'WAVE 1 / 6', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#FFF1D0'
            })
            .setDepth(1001);
        this.waveNameText = this.add
            .text(300, 32, 'SCARAB SKITTER', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#F2A33C'
            })
            .setDepth(1001)
            .setLetterSpacing(0.8);
        this.waveDotsGfx = this.add.graphics().setDepth(1001);

        this.add
            .text(516, 9, 'RELAY INTEGRITY', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#B9A582'
            })
            .setDepth(1001)
            .setLetterSpacing(0.8);
        this.integrityGfx = this.add.graphics().setDepth(1001);
        this.integrityText = this.add
            .text(690, 29, '20 / 20', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#9EF0E2'
            })
            .setDepth(1001);

        this.add.image(806, 34, 'coin').setDepth(1001).setScale(0.8);
        this.creditsText = this.add
            .text(824, 18, '300', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '21px',
                fontStyle: 'bold',
                color: '#FFD27A'
            })
            .setDepth(1001);
        this.add
            .text(824, 45, 'CREDITS', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#B9A582'
            })
            .setDepth(1001)
            .setLetterSpacing(0.8);

        this.pauseBtn = new UIButton(this, {
            x: 1050,
            y: 36,
            w: 44,
            h: 40,
            label: 'II',
            size: 14,
            onClick: () => this.togglePause()
        });
        this.speedBtn = new UIButton(this, {
            x: 1102,
            y: 36,
            w: 44,
            h: 40,
            label: '1×',
            size: 14,
            onClick: () => this.toggleSpeed()
        });
        this.muteBtn = new UIButton(this, {
            x: 1154,
            y: 36,
            w: 44,
            h: 40,
            label: '♪',
            size: 16,
            onClick: () => this.toggleMute()
        });
        new UIButton(this, {
            x: 1206,
            y: 36,
            w: 44,
            h: 40,
            label: '↻',
            size: 17,
            onClick: () => this.scene.restart()
        });
        this.dockGfx = this.add.graphics().setDepth(1000);
        this.contextGfx = this.add.graphics().setDepth(1000);

        const cardTexts: Phaser.GameObjects.Text[][] = [];
        const types: TowerType[] = ['lance', 'pulse'];
        for (let i = 0; i < 2; i++) {
            const type = types[i];
            const stats = TOWER_STATS[type];
            const x = 16 + i * 184;
            const icon = this.add.image(x + 31, 674, `${type}-head`).setDepth(1002).setScale(type === 'lance' ? 0.58 : 0.72);
            this.buildIcons.push(icon);
            const texts = [
                this.add
                    .text(x + 58, 650, stats.name.toUpperCase(), {
                        fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                        fontSize: '12px',
                        fontStyle: 'bold',
                        color: '#FFF1D0'
                    })
                    .setDepth(1002),
                this.add
                    .text(x + 58, 668, type === 'lance' ? 'LONG RANGE' : 'AREA BURST', {
                        fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                        fontSize: '8px',
                        color: '#9ECFC8'
                    })
                    .setDepth(1002)
                    .setLetterSpacing(0.5),
                this.add
                    .text(x + 58, 687, `${stats.cost}`, {
                        fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                        fontSize: '13px',
                        fontStyle: 'bold',
                        color: '#FFD27A'
                    })
                    .setDepth(1002),
                this.add
                    .text(x + 8, 646, `${i + 1}`, {
                        fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                        fontSize: '9px',
                        color: '#8C7A60'
                    })
                    .setDepth(1002)
            ];
            this.add.image(x + 50, 692, 'coin').setDepth(1002).setScale(0.42);
            cardTexts.push(texts);
        }
        this.buildTexts = cardTexts;

        this.buildBtns.push(
            new UIButton(this, {
                x: 104,
                y: 676,
                w: 176,
                h: 68,
                label: '',
                fill: 0x000000,
                hover: 0xffffff,
                stroke: 0x000000,
                onClick: () => this.pickBuild('lance')
            })
        );
        this.buildBtns.push(
            new UIButton(this, {
                x: 288,
                y: 676,
                w: 176,
                h: 68,
                label: '',
                fill: 0x000000,
                hover: 0xffffff,
                stroke: 0x000000,
                onClick: () => this.pickBuild('pulse')
            })
        );
        for (const b of this.buildBtns) {
            b.bg.setAlpha(0.001);
            b.label.setAlpha(0.001);
        }

        this.ctxTitle = this.add
            .text(408, 648, '', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#FFF1D0'
            })
            .setDepth(1002);
        this.ctxSub = this.add
            .text(408, 668, '', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#B9A582'
            })
            .setDepth(1002);
        this.ctxHint = this.add
            .text(408, 687, '', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#8C7A60'
            })
            .setDepth(1002);

        this.upgradeBtn = new UIButton(this, {
            x: 790,
            y: 676,
            w: 122,
            h: 42,
            label: 'UPGRADE',
            size: 12,
            onClick: () => this.upgradeSelected()
        });
        this.sellBtn = new UIButton(this, {
            x: 900,
            y: 676,
            w: 84,
            h: 42,
            label: 'SELL',
            size: 12,
            danger: true,
            onClick: () => this.sellSelected()
        });
        this.upgradeBtn.setVisible(false);
        this.sellBtn.setVisible(false);

        this.startBtn = new UIButton(this, {
            x: 1120,
            y: 676,
            w: 288,
            h: 68,
            label: 'START WAVE',
            sub: '8 hostiles inbound',
            size: 18,
            subSize: 10,
            primary: true,
            onClick: () => this.startWave()
        });

        this.bossGfx = this.add.graphics().setDepth(1001);
        this.bossLabel = this.add
            .text(640, 83, '', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#FFD0C0'
            })
            .setOrigin(0.5)
            .setDepth(1002)
            .setLetterSpacing(1.4);
        this.bossLabel.setVisible(false);

        this.toastText = this.add
            .text(640, 600, '', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '13px',
                fontStyle: 'bold',
                color: '#FFF1D0',
                backgroundColor: '#2A1B0F',
                padding: { x: 14, y: 8 }
            })
            .setOrigin(0.5)
            .setDepth(1400)
            .setAlpha(0);
    }

    private padAt(x: number, y: number): number | null {
        let best: number | null = null;
        let bestD = 48;
        for (let i = 0; i < PADS.length; i++) {
            const d = Math.hypot(PADS[i].x - x, PADS[i].y - y);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    }

    private pickBuild(type: TowerType): void {
        if (this.overlay !== 'none') return;
        if (this.model.phase !== 'build') {
            this.model.deny('Build between waves');
            return;
        }
        this.model.buildType = this.model.buildType === type ? null : type;
        this.model.selectedTowerId = null;
        audio.sfx('click');
    }

    private startWave(): void {
        if (this.overlay !== 'none') return;
        if (this.model.phase === 'build') {
            if (this.model.startWave()) {
                audio.sfx('wave');
                this.showBanner(`WAVE ${this.model.wave}`, WAVES[this.model.wave - 1].name.toUpperCase());
            }
        } else if (this.model.phase === 'combat') {
            this.model.deny('Wave already in progress');
        }
    }

    private togglePause(): void {
        if (this.overlay === 'tutorial' || this.overlay === 'won' || this.overlay === 'lost') return;
        if (this.model.phase === 'won' || this.model.phase === 'lost') return;
        this.model.togglePause();
        audio.sfx('click');
        if (this.model.paused) this.createPauseOverlay();
        else this.closeOverlay();
    }

    private toggleSpeed(): void {
        if (this.overlay !== 'none' && this.overlay !== 'pause') return;
        this.model.toggleSpeed();
        audio.sfx('click');
    }

    private toggleMute(): void {
        const muted = audio.toggleMuted();
        this.model.muted = muted;
        audio.sfx('click');
    }

    private upgradeSelected(): void {
        if (this.overlay !== 'none') return;
        if (this.model.upgradeSelected()) audio.sfx('upgrade');
    }

    private sellSelected(): void {
        if (this.overlay !== 'none') return;
        if (this.model.sellSelected()) audio.sfx('sell');
    }

    private raiseButton(btn: UIButton, depth: number): void {
        btn.bg.setDepth(depth);
        btn.label.setDepth(depth + 2);
        btn.sub?.setDepth(depth + 2);
        btn.zone.setDepth(depth + 1);
    }

    private createTutorial(): void {
        this.overlay = 'tutorial';
        const dim = this.add
            .rectangle(640, 360, MAP_WIDTH, MAP_HEIGHT, 0x140e09, 0.68)
            .setDepth(2000)
            .setInteractive();
        const panel = this.add.graphics().setDepth(2005);
        drawPanel(panel, 300, 108, 680, 510, 0x241c14, 0.98, 0xf2a33c, 16);
        const title = this.add
            .text(640, 154, 'HOLD THE RELAY', {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '36px',
                fontStyle: 'bold',
                color: '#FFF1D0'
            })
            .setOrigin(0.5)
            .setDepth(2010);
        const sub = this.add
            .text(640, 194, 'FIELD MANUAL · SIX WAVES · ONE OUTPOST', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '10px',
                color: '#F2A33C'
            })
            .setOrigin(0.5)
            .setDepth(2010)
            .setLetterSpacing(1.4);
        const steps = [
            ['01', 'BUILD', 'Choose Solar Lance or Pulse Coil below,\nthen click a glowing pad beside the track.'],
            ['02', 'TUNE', 'Click a built tower to upgrade it or sell it back.\nYou can only build between waves.'],
            ['03', 'HOLD', 'Start the wave and watch the towers fire.\nSurvive six assaults, including the Titan.']
        ];
        this.overlayGroup.push(dim, panel, title, sub);
        for (let i = 0; i < steps.length; i++) {
            const y = 250 + i * 80;
            const num = this.add
                .text(356, y, steps[i][0], {
                    fontFamily: 'Georgia, serif',
                    fontSize: '22px',
                    fontStyle: 'bold',
                    color: '#F2A33C'
                })
                .setDepth(2010);
            const name = this.add
                .text(404, y - 2, steps[i][1], {
                    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                    fontSize: '13px',
                    fontStyle: 'bold',
                    color: '#9EF0E2'
                })
                .setDepth(2010)
                .setLetterSpacing(1);
            const body = this.add
                .text(404, y + 18, steps[i][2], {
                    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                    fontSize: '12px',
                    color: '#D8C6A6',
                    lineSpacing: 5
                })
                .setDepth(2010);
            this.overlayGroup.push(num, name, body);
        }
        const hint = this.add
            .text(640, 592, 'P pause · S speed · M mute · F fullscreen', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '10px',
                color: '#8C7A60'
            })
            .setOrigin(0.5)
            .setDepth(2010);
        this.overlayGroup.push(hint);

        const btn = new UIButton(this, {
            x: 640,
            y: 540,
            w: 250,
            h: 50,
            label: 'TAKE COMMAND',
            sub: 'Click or press Space',
            size: 15,
            subSize: 9,
            primary: true,
            onClick: () => this.dismissTutorial()
        });
        this.raiseButton(btn, 2100);
        this.overlayButtons.push(btn);
    }

    private dismissTutorial(): void {
        if (this.overlay !== 'tutorial') return;
        this.closeOverlay();
        this.model.beginBuild();
        audio.sfx('build');
        this.showBanner('BUILD PHASE', 'PLACE TOWERS, THEN START WAVE 1');
        this.updateHud();
    }

    private createPauseOverlay(): void {
        this.closeOverlay();
        this.overlay = 'pause';
        const dim = this.add
            .rectangle(640, 360, MAP_WIDTH, MAP_HEIGHT, 0x140e09, 0.7)
            .setDepth(2000)
            .setInteractive();
        const panel = this.add.graphics().setDepth(2005);
        drawPanel(panel, 410, 210, 460, 300, 0x241c14, 0.98, 0x6fe3d6, 16);
        const title = this.add
            .text(640, 258, 'PAUSED', {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '38px',
                fontStyle: 'bold',
                color: '#FFF1D0'
            })
            .setOrigin(0.5)
            .setDepth(2010);
        const sub = this.add
            .text(640, 300, 'The relay holds its breath.', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '11px',
                color: '#B9A582'
            })
            .setOrigin(0.5)
            .setDepth(2010);
        this.overlayGroup.push(dim, panel, title, sub);

        const resume = new UIButton(this, {
            x: 640,
            y: 354,
            w: 250,
            h: 44,
            label: 'RESUME',
            size: 13,
            primary: true,
            onClick: () => {
                this.model.paused = false;
                this.closeOverlay();
                audio.sfx('click');
            }
        });
        const restart = new UIButton(this, {
            x: 640,
            y: 406,
            w: 250,
            h: 40,
            label: 'RESTART CAMPAIGN',
            size: 12,
            onClick: () => this.scene.restart()
        });
        const menu = new UIButton(this, {
            x: 640,
            y: 452,
            w: 250,
            h: 36,
            label: 'MAIN MENU',
            size: 11,
            onClick: () => this.scene.start('MainMenu')
        });
        for (const b of [resume, restart, menu]) {
            this.raiseButton(b, 2100);
            this.overlayButtons.push(b);
        }
    }

    private createEndOverlay(won: boolean): void {
        if (this.overlay === 'won' || this.overlay === 'lost') return;
        this.closeOverlay();
        this.overlay = won ? 'won' : 'lost';
        const accent = won ? 0xf2a33c : 0xd9563f;
        const dim = this.add
            .rectangle(640, 360, MAP_WIDTH, MAP_HEIGHT, 0x140e09, 0.74)
            .setDepth(2000)
            .setInteractive();
        const panel = this.add.graphics().setDepth(2005);
        drawPanel(panel, 370, 168, 540, 384, 0x241c14, 0.98, accent, 18);
        const title = this.add
            .text(640, 218, won ? 'RELAY HELD' : 'RELAY LOST', {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '42px',
                fontStyle: 'bold',
                color: won ? '#FFD27A' : '#FF9A82'
            })
            .setOrigin(0.5)
            .setDepth(2010);
        const sub = this.add
            .text(
                640,
                258,
                won ? 'The sunline is safe. For now.' : 'The dunes take the outpost.',
                {
                    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                    fontSize: '12px',
                    color: '#D8C6A6'
                }
            )
            .setOrigin(0.5)
            .setDepth(2010);
        this.overlayGroup.push(dim, panel, title, sub);

        const stats = [
            ['WAVES CLEARED', `${won ? TOTAL_WAVES : Math.max(0, this.model.wave - 1)} / ${TOTAL_WAVES}`],
            ['HOSTILES DOWNED', `${this.model.kills}`],
            ['CREDITS EARNED', `${this.model.creditsEarned}`],
            ['INTEGRITY LEFT', `${this.model.integrity} / ${this.model.maxIntegrity}`]
        ];
        for (let i = 0; i < stats.length; i++) {
            const x = 420 + (i % 2) * 220;
            const y = 312 + Math.floor(i / 2) * 56;
            const label = this.add
                .text(x, y, stats[i][0], {
                    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                    fontSize: '8px',
                    color: '#8C7A60'
                })
                .setDepth(2010)
                .setLetterSpacing(0.8);
            const value = this.add
                .text(x, y + 15, stats[i][1], {
                    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                    fontSize: '18px',
                    fontStyle: 'bold',
                    color: '#FFF1D0'
                })
                .setDepth(2010);
            this.overlayGroup.push(label, value);
        }

        const again = new UIButton(this, {
            x: 520,
            y: 492,
            w: 220,
            h: 46,
            label: won ? 'PLAY AGAIN' : 'TRY AGAIN',
            size: 13,
            primary: true,
            onClick: () => this.scene.restart()
        });
        const menu = new UIButton(this, {
            x: 760,
            y: 492,
            w: 180,
            h: 46,
            label: 'MAIN MENU',
            size: 12,
            onClick: () => this.scene.start('MainMenu')
        });
        for (const b of [again, menu]) {
            this.raiseButton(b, 2100);
            this.overlayButtons.push(b);
        }
    }

    private closeOverlay(): void {
        for (const obj of this.overlayGroup) obj.destroy();
        for (const btn of this.overlayButtons) btn.destroy();
        this.overlayGroup = [];
        this.overlayButtons = [];
        this.overlay = 'none';
    }

    private showBanner(title: string, sub: string): void {
        const t1 = this.add
            .text(640, 188, title, {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '40px',
                fontStyle: 'bold',
                color: '#FFF1D0',
                stroke: '#2A1B0F',
                strokeThickness: 6
            })
            .setOrigin(0.5)
            .setDepth(1300)
            .setAlpha(0);
        const t2 = this.add
            .text(640, 230, sub, {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '11px',
                color: '#F2A33C',
                stroke: '#2A1B0F',
                strokeThickness: 4
            })
            .setOrigin(0.5)
            .setDepth(1300)
            .setAlpha(0)
            .setLetterSpacing(1.6);
        this.tweens.add({
            targets: [t1, t2],
            alpha: 1,
            y: '-=10',
            duration: 220,
            hold: 1050,
            yoyo: true,
            onComplete: () => {
                t1.destroy();
                t2.destroy();
            }
        });
    }

    private toast(message: string): void {
        this.toastText.setText(message).setAlpha(1);
        this.toastText.y = 596;
        this.toastTimer?.remove();
        this.toastTimer = this.time.delayedCall(1200, () => {
            this.tweens.add({ targets: this.toastText, alpha: 0, duration: 260 });
        });
    }

    private floatText(x: number, y: number, text: string, color: string, size = 13): void {
        if (this.floaters.length > 28) return;
        const t = this.add
            .text(x, y, text, {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: `${size}px`,
                fontStyle: 'bold',
                color,
                stroke: '#2A1B0F',
                strokeThickness: 3
            })
            .setOrigin(0.5)
            .setDepth(60);
        this.floaters.push(t);
        this.tweens.add({
            targets: t,
            y: y - 30,
            alpha: 0,
            duration: 760,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                t.destroy();
                this.floaters = this.floaters.filter((f) => f !== t);
            }
        });
    }

    update(_time: number, delta: number): void {
        const dt = Math.min(delta / 1000, 0.05);
        this.elapsed += dt;
        this.model.tick(delta / 1000);
        this.consumeEvents();
        this.syncViews(dt);
        this.updateEffects(dt);
        this.drawWorld(dt);
        this.updateHud();
    }

    private consumeEvents(): void {
        for (const ev of this.model.drainEvents()) {
            this.handleEvent(ev);
        }
    }

    private handleEvent(ev: GameEvent): void {
        switch (ev.kind) {
            case 'build':
                this.fx.push(this.makeRing(ev.x, ev.y, 48, 0x9ef0e2, 0.5, 3));
                this.floatText(ev.x, ev.y - 36, 'ONLINE', '#9EF0E2', 11);
                audio.sfx('build');
                break;
            case 'upgrade':
                this.fx.push(this.makeRing(ev.x, ev.y, 58, 0xffd27a, 0.55, 3));
                this.floatText(ev.x, ev.y - 38, `LEVEL ${ev.level}`, '#FFD27A', 12);
                audio.sfx('upgrade');
                break;
            case 'sell':
                this.spawnSparks(ev.x, ev.y, 0xffd27a, 10);
                this.floatText(ev.x, ev.y - 30, 'SOLD', '#FFD27A', 11);
                audio.sfx('sell');
                break;
            case 'deny':
                this.toast(ev.reason);
                audio.sfx('deny');
                break;
            case 'beam':
                this.fx.push({
                    kind: 'beam',
                    x: ev.x,
                    y: ev.y,
                    x2: ev.x2,
                    y2: ev.y2,
                    radius: 0,
                    color: 0x9ef0e2,
                    life: 0.16,
                    max: 0.16,
                    width: 3
                });
                this.fx.push(this.makeRing(ev.x, ev.y, 18, 0x9ef0e2, 0.18, 2));
                audio.sfx('beam');
                break;
            case 'pulse':
                this.fx.push(this.makeRing(ev.x, ev.y, ev.radius, 0xf2a33c, 0.5, 3));
                this.spawnSparks(ev.x, ev.y, 0xffc46b, 6);
                audio.sfx('pulse');
                this.cameras.main.shake(90, 0.0015);
                break;
            case 'hit':
                this.spawnSparks(ev.x, ev.y, ev.boss ? 0xffb0a0 : 0xfff0c0, ev.boss ? 4 : 2);
                if (ev.boss) this.floatText(ev.x, ev.y - 52, `-${ev.damage}`, '#FFD27A', 14);
                audio.sfx('hit');
                break;
            case 'death':
                this.spawnSparks(ev.x, ev.y, ev.type === 'drone' ? 0x9ef0e2 : 0xd7a063, ev.type === 'titan' ? 26 : 8);
                this.floatText(ev.x, ev.y - 24, `+${ev.reward}`, '#FFD27A', 12);
                if (ev.type === 'titan') this.cameras.main.shake(320, 0.008);
                audio.sfx('death');
                break;
            case 'leak':
                this.relayFlash = 1;
                this.fx.push(this.makeRing(ev.x, ev.y, 34, 0xff7a5a, 0.6, 3));
                this.floatText(RELAY_POS.x, RELAY_POS.y - 70, `-${ev.amount} INTEGRITY`, '#FF9A82', 14);
                this.cameras.main.shake(160, 0.004);
                audio.sfx('leak');
                break;
            case 'waveClear':
                audio.sfx('clear');
                this.showBanner(
                    `WAVE ${ev.wave} CLEARED`,
                    ev.bonus > 0 ? `+${ev.bonus} CREDITS · REBUILD AND TUNE` : 'FINAL WAVE CLEARED'
                );
                break;
            case 'win':
                audio.sfx('win');
                this.createEndOverlay(true);
                break;
            case 'lose':
                audio.sfx('lose');
                this.createEndOverlay(false);
                break;
            case 'boss':
                audio.sfx('boss');
                this.showBanner('SANDSTORM TITAN', 'THE FINAL ASSAULT HAS BEGUN');
                this.cameras.main.shake(420, 0.006);
                break;
            case 'titanDown':
                this.spawnSparks(RELAY_POS.x, RELAY_POS.y, 0xffd27a, 18);
                break;
            case 'waveStart':
                break;
        }
    }

    private makeRing(x: number, y: number, radius: number, color: number, life: number, width: number): Fx {
        return {
            kind: 'ring',
            x,
            y,
            x2: 0,
            y2: 0,
            radius,
            color,
            life,
            max: life,
            width
        };
    }

    private spawnSparks(x: number, y: number, color: number, count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 6 + Math.random() * 22;
            this.fx.push(
                this.makeRing(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 3 + Math.random() * 6, color, 0.25 + Math.random() * 0.25, 2)
            );
        }
    }

    private syncViews(dt: number): void {
        const alive = new Set<number>();
        for (const enemy of this.model.enemies) {
            alive.add(enemy.id);
            let view = this.enemyViews.get(enemy.id);
            if (!view) {
                view = this.createEnemyView(enemy);
                this.enemyViews.set(enemy.id, view);
            }
            this.updateEnemyView(view, enemy, dt);
        }
        for (const [id, view] of this.enemyViews) {
            if (!alive.has(id)) {
                view.container.destroy();
                this.enemyViews.delete(id);
            }
        }
        this.drawEnemyHealth();

        const built = new Set<number>();
        for (const tower of this.model.towers) {
            built.add(tower.id);
            let view = this.towerViews.get(tower.id);
            if (!view) {
                view = this.createTowerView(tower);
                this.towerViews.set(tower.id, view);
            }
            this.updateTowerView(view, tower, dt);
        }
        for (const [id, view] of this.towerViews) {
            if (!built.has(id)) {
                view.container.destroy();
                this.towerViews.delete(id);
            }
        }

        this.drawRange();
    }

    private drawEnemyHealth(): void {
        this.hpGfx.clear();
        for (const enemy of this.model.enemies) {
            if (enemy.hp >= enemy.maxHp && enemy.type !== 'titan') continue;
            const ratio = Math.max(0, enemy.hp / enemy.maxHp);
            const w = enemy.type === 'titan' ? 90 : enemy.type === 'crawler' ? 36 : 30;
            const y = enemy.y - (enemy.type === 'titan' ? 62 : 28);
            const x = enemy.x - w / 2;
            this.hpGfx.fillStyle(0x140d08, 0.8);
            this.hpGfx.fillRoundedRect(x - 1, y - 1, w + 2, 7, 2);
            const color = ratio > 0.55 ? 0x8fe08a : ratio > 0.25 ? 0xf2a33c : 0xd9563f;
            this.hpGfx.fillStyle(color, 0.95);
            this.hpGfx.fillRoundedRect(x, y, Math.max(1, w * ratio), 5, 1.5);
        }
    }

    private createEnemyView(enemy: Enemy): EnemyView {
        const container = this.add.container(enemy.x, enemy.y).setDepth(20 + enemy.y * 0.001);
        const shadow = this.add.image(0, 10, 'shadow').setAlpha(0.6);
        const sprite = this.add.image(0, 0, ENEMY_TEXTURE[enemy.type]);
        const scale = enemy.type === 'titan' ? 0.96 : enemy.type === 'crawler' ? 1.12 : 1.08;
        sprite.setScale(scale);
        shadow.setScale(scale * 1.1, scale * 0.8);
        container.add([shadow, sprite]);
        return { container, sprite, shadow };
    }

    private updateEnemyView(view: EnemyView, enemy: Enemy, dt: number): void {
        view.container.setPosition(enemy.x, enemy.y);
        view.container.setDepth(20 + enemy.y * 0.001);
        view.sprite.rotation = enemy.angle + Math.PI / 2;
        const bob = enemy.type === 'drone' ? 4 : enemy.type === 'titan' ? 1.4 : 1.8;
        view.sprite.y = Math.sin(enemy.age * 9 + enemy.id) * bob;
        view.shadow.setScale((enemy.type === 'titan' ? 1.1 : 0.7) * (1 + Math.sin(enemy.age * 9 + enemy.id) * 0.06));
        if (enemy.hitFlash > 0) view.sprite.setTint(0xfff2d0);
        else if (enemy.type === 'titan') view.sprite.setTint(0xffd0b0);
        else view.sprite.clearTint();
        if (enemy.type === 'titan') {
            view.sprite.setScale(0.96 + Math.sin(this.elapsed * 3) * 0.012);
        }
        void dt;
    }

    private createTowerView(tower: Tower): TowerView {
        const container = this.add.container(tower.x, tower.y).setDepth(10 + tower.y * 0.001);
        const glow = this.add.graphics();
        glow.fillStyle(TOWER_STATS[tower.type].color, 0.2);
        glow.fillCircle(0, 6, 34);
        glow.lineStyle(1.5, TOWER_STATS[tower.type].color, 0.45);
        glow.strokeCircle(0, 6, 34);
        const shadow = this.add.image(0, 12, 'shadow').setScale(0.9, 0.72).setAlpha(0.55);
        const ring = this.add.graphics();
        ring.lineStyle(2, TOWER_STATS[tower.type].color, 0.9);
        ring.strokeCircle(0, 0, 35);
        ring.setVisible(false);
        const base = this.add.image(0, 0, `${tower.type}-base`);
        const head = this.add.image(0, 0, `${tower.type}-head`);
        const pips = this.add.graphics();
        container.add([glow, shadow, ring, base, head, pips]);
        const view: TowerView = { container, head, ring, pips, level: 0, angle: tower.angle };
        this.updateTowerPips(view, tower);
        return view;
    }

    private updateTowerView(view: TowerView, tower: Tower, dt: number): void {
        view.head.rotation = Phaser.Math.Angle.RotateTo(view.angle, tower.angle, dt * 12);
        view.angle = view.head.rotation;
        view.ring.setVisible(this.model.selectedTowerId === tower.id);
        if (view.level !== tower.level) this.updateTowerPips(view, tower);
        const base = view.container.list[3] as Phaser.GameObjects.Image;
        base.setScale(tower.level === 1 ? 1.04 : tower.level === 2 ? 1.08 : 1.12);
    }

    private updateTowerPips(view: TowerView, tower: Tower): void {
        view.level = tower.level;
        view.pips.clear();
        const color = TOWER_STATS[tower.type].color;
        for (let i = 0; i < tower.level; i++) {
            view.pips.fillStyle(color, 0.95);
            view.pips.fillCircle(-6 + i * 6, 29, 2.2);
        }
    }

    private drawRange(): void {
        this.rangeGfx.clear();
        const selected = this.model.selectedTower();
        if (selected) {
            this.strokeRange(selected.x, selected.y, TOWER_STATS[selected.type].range[selected.level - 1], TOWER_STATS[selected.type].color);
        } else if (this.model.buildType && this.model.hoverPad !== null) {
            const pad = PADS[this.model.hoverPad];
            const occupied = this.model.towerAtPad(this.model.hoverPad);
            const stats = TOWER_STATS[this.model.buildType];
            const color = occupied || this.model.credits < stats.cost ? 0xd9563f : stats.color;
            this.strokeRange(pad.x, pad.y, stats.range[0], color);
        }

        if (this.model.phase === 'build' && this.model.buildType) {
            this.ghostBase.setVisible(true).setAlpha(0.55);
            this.ghostHead.setVisible(true).setAlpha(0.55);
            this.ghostBase.setTexture(`${this.model.buildType}-base`);
            this.ghostHead.setTexture(`${this.model.buildType}-head`);
            if (this.model.hoverPad !== null) {
                const pad = PADS[this.model.hoverPad];
                this.ghostBase.setPosition(pad.x, pad.y);
                this.ghostHead.setPosition(pad.x, pad.y);
            } else {
                this.ghostBase.setVisible(false);
                this.ghostHead.setVisible(false);
            }
        } else {
            this.ghostBase.setVisible(false);
            this.ghostHead.setVisible(false);
        }
    }

    private strokeRange(x: number, y: number, radius: number, color: number): void {
        this.rangeGfx.fillStyle(color, 0.07);
        this.rangeGfx.fillCircle(x, y, radius);
        this.rangeGfx.lineStyle(1.5, color, 0.55);
        this.rangeGfx.strokeCircle(x, y, radius);
        this.rangeGfx.lineStyle(1, color, 0.3);
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            this.rangeGfx.lineBetween(
                x + Math.cos(a) * (radius - 5),
                y + Math.sin(a) * (radius - 5),
                x + Math.cos(a) * radius,
                y + Math.sin(a) * radius
            );
        }
    }

    private updateEffects(dt: number): void {
        this.fxGfx.clear();
        for (const fx of this.fx) {
            fx.life -= dt;
            const t = Math.max(0, fx.life / fx.max);
            if (fx.kind === 'beam') {
                this.fxGfx.lineStyle(fx.width * 4, fx.color, t * 0.2);
                this.fxGfx.lineBetween(fx.x, fx.y, fx.x2, fx.y2);
                this.fxGfx.lineStyle(fx.width, 0xffffff, t * 0.95);
                this.fxGfx.lineBetween(fx.x, fx.y, fx.x2, fx.y2);
                this.fxGfx.fillStyle(0xffffff, t);
                this.fxGfx.fillCircle(fx.x2, fx.y2, 3.5);
            } else {
                const p = 1 - t;
                const r = fx.radius * (0.25 + 0.75 * p);
                this.fxGfx.lineStyle(fx.width, fx.color, t * 0.9);
                this.fxGfx.strokeCircle(fx.x, fx.y, r);
                this.fxGfx.fillStyle(fx.color, t * 0.06);
                this.fxGfx.fillCircle(fx.x, fx.y, r);
            }
        }
        this.fx = this.fx.filter((f) => f.life > 0);
    }

    private drawWorld(dt: number): void {
        this.shieldGfx.clear();
        const integrityRatio = this.model.integrity / this.model.maxIntegrity;
        const auraColor = integrityRatio > 0.5 ? 0x6fe3d6 : integrityRatio > 0.25 ? 0xf2a33c : 0xd9563f;
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 2.2);
        this.shieldGfx.lineStyle(2, auraColor, 0.12 + pulse * 0.12);
        this.shieldGfx.strokeCircle(RELAY_POS.x, RELAY_POS.y, 84 + pulse * 5);
        this.shieldGfx.lineStyle(1, auraColor, 0.18);
        for (let i = 0; i < 3; i++) {
            const a = this.elapsed * 0.35 + (i / 3) * Math.PI * 2;
            this.shieldGfx.lineBetween(
                RELAY_POS.x + Math.cos(a) * 70,
                RELAY_POS.y + Math.sin(a) * 70,
                RELAY_POS.x + Math.cos(a) * 92,
                RELAY_POS.y + Math.sin(a) * 92
            );
        }

        this.relayRing.rotation += dt * 0.14;
        this.relayGlow.setAlpha(0.12 + pulse * 0.08).setScale(1.02 + pulse * 0.03);
        this.relayFlash = Math.max(0, this.relayFlash - dt * 2.4);
        if (this.relayFlash > 0) {
            this.relay.setTint(0xff9a82);
            this.shieldGfx.lineStyle(3, 0xff7a5a, this.relayFlash * 0.7);
            this.shieldGfx.strokeCircle(RELAY_POS.x, RELAY_POS.y, 76 + (1 - this.relayFlash) * 34);
        } else {
            this.relay.clearTint();
        }

        this.padGfx.clear();
        const buildPhase = this.model.phase === 'build';
        for (let i = 0; i < PADS.length; i++) {
            const pad = PADS[i];
            const occupied = this.model.towerAtPad(i);
            if (!occupied && buildPhase) {
                const beat = 0.5 + 0.5 * Math.sin(this.elapsed * 2 + i);
                this.padGfx.lineStyle(1.5, this.model.buildType ? 0x9ef0e2 : 0xf2a33c, 0.2 + beat * 0.22);
                this.padGfx.strokeCircle(pad.x, pad.y, 31 + beat * 2);
                this.padGfx.lineStyle(2, 0xfff1d0, 0.3 + beat * 0.2);
                this.padGfx.lineBetween(pad.x - 5, pad.y, pad.x + 5, pad.y);
                this.padGfx.lineBetween(pad.x, pad.y - 5, pad.x, pad.y + 5);
            }
        }
        for (const mote of this.motes) {
            mote.x += mote.vx * dt;
            mote.y += mote.vy * dt;
            if (mote.x > MAP_WIDTH + 10) mote.x = -10;
            if (mote.y < HUD_TOP - 10) {
                mote.y = HUD_BOTTOM + 8;
                mote.x = Math.random() * MAP_WIDTH;
            }
            this.padGfx.fillStyle(0xffe6b0, mote.alpha);
            this.padGfx.fillCircle(mote.x, mote.y, mote.size);
        }
    }

    private updateHud(): void {
        const m = this.model;
        this.waveText.setText(`WAVE ${m.wave} / ${TOTAL_WAVES}`);
        this.waveNameText.setText((WAVES[m.wave - 1]?.name ?? '').toUpperCase());
        this.creditsText.setText(`${m.credits}`);
        this.integrityText.setText(`${m.integrity} / ${m.maxIntegrity}`);

        this.waveDotsGfx.clear();
        for (let i = 0; i < TOTAL_WAVES; i++) {
            const done = i + 1 < m.wave || m.phase === 'won';
            const current = i + 1 === m.wave && m.phase !== 'won';
            const color = done ? 0x6fe3d6 : current ? 0xf2a33c : 0x5a4732;
            this.waveDotsGfx.fillStyle(color, done || current ? 1 : 0.7);
            this.waveDotsGfx.fillCircle(304 + i * 13, 54, current ? 4 : 3);
        }

        this.integrityGfx.clear();
        const ratio = m.integrity / m.maxIntegrity;
        const barColor = ratio > 0.5 ? 0x6fe3d6 : ratio > 0.25 ? 0xf2a33c : 0xd9563f;
        this.integrityGfx.fillStyle(0x120d09, 0.9);
        this.integrityGfx.fillRoundedRect(516, 28, 162, 15, 4);
        this.integrityGfx.fillStyle(barColor, 0.95);
        this.integrityGfx.fillRoundedRect(518, 30, Math.max(2, 158 * ratio), 11, 3);
        this.integrityGfx.lineStyle(1, 0x6b573f, 0.7);
        this.integrityGfx.strokeRoundedRect(516, 28, 162, 15, 4);
        for (let i = 1; i < 5; i++) {
            this.integrityGfx.lineStyle(1, 0x120d09, 0.5);
            this.integrityGfx.lineBetween(516 + (162 / 5) * i, 30, 516 + (162 / 5) * i, 41);
        }
        this.integrityText.setColor(ratio > 0.25 ? '#9EF0E2' : '#FF9A82');

        this.pauseBtn.setLabel(m.paused ? '▶' : 'II');
        this.speedBtn.setLabel(`${m.speed}×`);
        this.muteBtn.setLabel(m.muted ? '✕' : '♪');
        this.muteBtn.setEnabled(true);
        this.pauseBtn.setEnabled(m.phase === 'build' || m.phase === 'combat');
        this.speedBtn.setEnabled(m.phase === 'build' || m.phase === 'combat');

        this.dockGfx.clear();
        this.contextGfx.clear();
        const types: TowerType[] = ['lance', 'pulse'];
        for (let i = 0; i < types.length; i++) {
            const type = types[i];
            const stats = TOWER_STATS[type];
            const x = 16 + i * 184;
            const selected = m.buildType === type;
            const canBuild = m.phase === 'build';
            const affordable = m.credits >= stats.cost;
            this.contextGfx.fillStyle(selected ? 0x3d2f20 : 0x2a2118, 0.95);
            this.contextGfx.fillRoundedRect(x, 642, 176, 68, 8);
            this.contextGfx.lineStyle(selected ? 2 : 1, selected ? stats.color : 0x5a4732, selected ? 0.95 : 0.7);
            this.contextGfx.strokeRoundedRect(x, 642, 176, 68, 8);
            if (selected) {
                this.contextGfx.fillStyle(stats.color, 0.12);
                this.contextGfx.fillRoundedRect(x + 2, 644, 172, 64, 7);
            }
            this.buildIcons[i].setAlpha(canBuild && affordable ? 1 : 0.38);
            for (const text of this.buildTexts[i]) text.setAlpha(canBuild ? (affordable ? 1 : 0.5) : 0.42);
        }

        this.contextGfx.fillStyle(0x2a2118, 0.9);
        this.contextGfx.fillRoundedRect(392, 642, 568, 68, 8);
        this.contextGfx.lineStyle(1, 0x5a4732, 0.7);
        this.contextGfx.strokeRoundedRect(392, 642, 568, 68, 8);

        const selectedTower = m.selectedTower();
        const waveDef = WAVES[m.wave - 1];
        let title = '';
        let sub = '';
        let hint = '';
        if (m.phase === 'tutorial') {
            title = 'FIELD MANUAL';
            sub = 'Build, tune, then hold the relay.';
            hint = 'Dismiss the briefing to take command.';
        } else if (selectedTower) {
            const stats = TOWER_STATS[selectedTower.type];
            const level = selectedTower.level;
            title = `${stats.name.toUpperCase()} · LEVEL ${level}`;
            sub = `DMG ${stats.damage[level - 1]} · RANGE ${stats.range[level - 1]} · RATE ${stats.rate[level - 1]}s${stats.blast[level - 1] > 0 ? ` · BLAST ${stats.blast[level - 1]}` : ''}`;
            hint = m.phase === 'build' ? 'U upgrade · X sell · click empty ground to deselect' : 'Combat in progress · upgrades between waves';
        } else if (m.phase === 'build') {
            title = `NEXT · WAVE ${m.wave} · ${waveDef.name.toUpperCase()}`;
            sub = `${waveDef.units.length} hostiles · ${waveDef.subtitle}`;
            hint = '1 / 2 choose a tower · click a glowing pad · SPACE to start';
        } else if (m.phase === 'combat') {
            const remaining = m.enemies.length + Math.max(0, m.spawnsRemaining);
            title = `WAVE ${m.wave} · ${waveDef.name.toUpperCase()}`;
            sub = `${remaining} hostiles remaining · ${m.kills} downed`;
            hint = 'Towers fire automatically · P pause · S speed';
        } else if (m.phase === 'won') {
            title = 'RELAY HELD';
            sub = `Campaign complete · ${m.kills} hostiles downed`;
            hint = 'R restart · or choose Main Menu';
        } else {
            title = 'RELAY LOST';
            sub = `The outpost fell on wave ${m.wave}`;
            hint = 'R restart · rebuild and try a different mix';
        }
        this.ctxTitle.setText(title);
        this.ctxSub.setText(sub);
        this.ctxHint.setText(hint);

        if (selectedTower) {
            this.upgradeBtn.setVisible(true);
            this.sellBtn.setVisible(true);
            const stats = TOWER_STATS[selectedTower.type];
            const maxed = selectedTower.level >= 3;
            const cost = maxed ? 0 : stats.upgradeCost[selectedTower.level - 1];
            this.upgradeBtn.setLabel(maxed ? 'MAX LEVEL' : `UPGRADE · ${cost}`);
            this.upgradeBtn.setEnabled(!maxed && m.phase === 'build' && m.credits >= cost);
            const refund = Math.floor(selectedTower.invested * 0.6);
            this.sellBtn.setLabel(`SELL · ${refund}`);
            this.sellBtn.setEnabled(m.phase === 'build');
        } else {
            this.upgradeBtn.setVisible(false);
            this.sellBtn.setVisible(false);
        }

        if (m.phase === 'build') {
            this.startBtn.setEnabled(true);
            this.startBtn.setLabel('START WAVE', `${waveDef.units.length} hostiles · ${waveDef.name}`);
        } else if (m.phase === 'combat') {
            this.startBtn.setEnabled(false);
            const remaining = m.enemies.length + Math.max(0, m.spawnsRemaining);
            this.startBtn.setLabel('WAVE ACTIVE', `${remaining} hostiles remain`);
        } else if (m.phase === 'won') {
            this.startBtn.setEnabled(false);
            this.startBtn.setLabel('RELAY HELD', 'Campaign complete');
        } else if (m.phase === 'lost') {
            this.startBtn.setEnabled(false);
            this.startBtn.setLabel('RELAY LOST', 'Restart to try again');
        } else {
            this.startBtn.setEnabled(false);
            this.startBtn.setLabel('AWAITING ORDERS', 'Dismiss the field manual');
        }

        this.bossGfx.clear();
        const boss = m.boss;
        if (boss) {
            this.bossLabel.setVisible(true);
            this.bossLabel.setText('SANDSTORM TITAN');
            const w = 360;
            const x = 640 - w / 2;
            const br = Math.max(0, boss.hp / boss.maxHp);
            this.bossGfx.fillStyle(0x140e09, 0.78);
            this.bossGfx.fillRoundedRect(x - 22, 73, w + 44, 38, 9);
            this.bossGfx.lineStyle(1, 0xd9563f, 0.55);
            this.bossGfx.strokeRoundedRect(x - 22, 73, w + 44, 38, 9);
            this.bossGfx.fillStyle(0x120d09, 0.95);
            this.bossGfx.fillRoundedRect(x, 94, w, 9, 3);
            this.bossGfx.fillStyle(0xd9563f, 0.98);
            this.bossGfx.fillRoundedRect(x + 1, 95, Math.max(1, (w - 2) * br), 7, 3);
            this.bossGfx.lineStyle(1, 0xffb0a0, 0.7);
            this.bossGfx.strokeRoundedRect(x, 94, w, 9, 3);
        } else {
            this.bossLabel.setVisible(false);
        }
    }

    private exposeHooks(): void {
        type HookWindow = Window & {
            render_game_to_text?: () => string;
            advanceTime?: (ms: number) => void;
        };
        const w = window as HookWindow;
        w.render_game_to_text = () => this.stateText();
        w.advanceTime = (ms: number) => {
            let remaining = Math.max(0, Math.min(ms, 180000));
            while (remaining > 0) {
                const step = Math.min(50, remaining);
                this.model.tick(step / 1000);
                this.consumeEvents();
                remaining -= step;
            }
            this.syncViews(0.016);
            this.updateEffects(0.016);
            this.drawWorld(0.016);
            this.updateHud();
        };
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            delete w.render_game_to_text;
            delete w.advanceTime;
        });
    }

    private stateText(): string {
        const s = this.model.stateSummary();
        return JSON.stringify({
            game: 'Relay Defense',
            scene: 'Game',
            overlay: this.overlay,
            map: { width: MAP_WIDTH, height: MAP_HEIGHT },
            ...s,
            hoverPad: this.model.hoverPad,
            controls: {
                start: 'SPACE or START WAVE',
                build: '1 / 2 then click pad',
                upgrade: 'U',
                sell: 'X',
                pause: 'P',
                speed: 'S',
                mute: 'M',
                restart: 'R',
                fullscreen: 'F'
            },
            buttons: {
                buildLance: { x: 104, y: 676 },
                buildPulse: { x: 288, y: 676 },
                startWave: { x: 1120, y: 676 },
                upgrade: { x: 790, y: 676 },
                sell: { x: 900, y: 676 },
                pause: { x: 1050, y: 36 },
                speed: { x: 1102, y: 36 },
                mute: { x: 1154, y: 36 },
                restart: { x: 1206, y: 36 }
            }
        });
    }
}
