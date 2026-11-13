import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '../path';
import { ensureTextures } from '../art';
import { audio } from '../audio';
import { UIButton } from '../ui';

interface Dust {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
}

export class MainMenu extends Phaser.Scene {
    private relayRing!: Phaser.GameObjects.Image;
    private relayGlow!: Phaser.GameObjects.Image;
    private dustGfx!: Phaser.GameObjects.Graphics;
    private dust: Dust[] = [];
    private elapsed = 0;
    private started = false;

    constructor() {
        super('MainMenu');
    }

    create(): void {
        this.started = false;
        this.elapsed = 0;
        ensureTextures(this);
        this.add.image(MAP_WIDTH / 2, MAP_HEIGHT / 2, 'bg').setDepth(0);

        const shade = this.add.graphics().setDepth(2);
        shade.fillStyle(0x160f09, 0.52);
        shade.fillRect(0, 0, 700, MAP_HEIGHT);
        shade.fillStyle(0x160f09, 0.22);
        shade.fillRect(700, 0, 150, MAP_HEIGHT);
        shade.fillStyle(0x160f09, 0.35);
        shade.fillRect(0, MAP_HEIGHT - 120, MAP_WIDTH, 120);
        shade.fillStyle(0xf2a33c, 0.9);
        shade.fillRect(0, 0, MAP_WIDTH, 3);

        this.dustGfx = this.add.graphics().setDepth(3);
        this.dust = [];
        for (let i = 0; i < 40; i++) {
            this.dust.push({
                x: Math.random() * MAP_WIDTH,
                y: Math.random() * MAP_HEIGHT,
                vx: 4 + Math.random() * 12,
                vy: -2 - Math.random() * 6,
                size: 0.7 + Math.random() * 1.7,
                alpha: 0.12 + Math.random() * 0.22
            });
        }

        const sunGlow = this.add
            .circle(1080, 92, 120, 0xffd27a, 0.1)
            .setDepth(1)
            .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: sunGlow, scale: 1.18, alpha: 0.16, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.relayRing = this.add.image(990, 404, 'relay-ring').setDepth(4).setScale(1.15);
        this.relayGlow = this.add
            .image(990, 404, 'relay')
            .setDepth(4)
            .setScale(1.5)
            .setAlpha(0.2)
            .setBlendMode(Phaser.BlendModes.ADD);
        this.add.image(990, 404, 'relay').setDepth(5).setScale(1.22);

        this.add
            .text(990, 556, 'RELAY 07 · ONLINE', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '10px',
                color: '#9EF0E2'
            })
            .setOrigin(0.5)
            .setDepth(6)
            .setLetterSpacing(2);
        this.add
            .text(990, 576, 'SOLAR ARRAY / SUNLINE OUTPOST', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '8px',
                color: '#B9A582'
            })
            .setOrigin(0.5)
            .setDepth(6)
            .setLetterSpacing(1.2);

        this.add.image(858, 630, 'lance-head').setDepth(6).setScale(0.8);
        this.add
            .text(858, 668, 'SOLAR LANCE', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#9EF0E2'
            })
            .setOrigin(0.5)
            .setDepth(6)
            .setLetterSpacing(0.8);
        this.add.image(1122, 630, 'pulse-head').setDepth(6).setScale(0.95);
        this.add
            .text(1122, 668, 'PULSE COIL', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#FFD27A'
            })
            .setOrigin(0.5)
            .setDepth(6)
            .setLetterSpacing(0.8);

        this.add.image(80, 70, 'sun-logo').setDepth(7).setScale(0.75);
        this.add
            .text(110, 58, 'SUNLINE OUTPOST', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '10px',
                fontStyle: 'bold',
                color: '#F2A33C'
            })
            .setDepth(7)
            .setLetterSpacing(2.2);
        this.add
            .text(110, 74, 'SECTOR 07 · CARAVAN APPROACH', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '8px',
                color: '#B9A582'
            })
            .setDepth(7)
            .setLetterSpacing(0.8);

        this.add
            .text(1206, 64, 'PROTOTYPE 1.0', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '8px',
                color: '#B9A582'
            })
            .setOrigin(1, 0)
            .setDepth(7)
            .setLetterSpacing(1.4);

        const titleShadow = this.add
            .text(88, 150, 'RELAY\nDEFENSE', {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '96px',
                fontStyle: 'bold',
                color: '#2A1B0F',
                lineSpacing: -18
            })
            .setDepth(8)
            .setAlpha(0.45);
        const title = this.add
            .text(84, 146, 'RELAY\nDEFENSE', {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '96px',
                fontStyle: 'bold',
                color: '#FFF1D0',
                lineSpacing: -18
            })
            .setDepth(9);
        title.setShadow(0, 0, '#2A1B0F', 10, false, true);
        titleShadow.setShadow(0, 0, '#2A1B0F', 4, false, true);

        const rule = this.add.graphics().setDepth(9);
        rule.fillStyle(0xf2a33c, 1);
        rule.fillRect(90, 384, 128, 3);
        rule.fillStyle(0x6fe3d6, 0.8);
        rule.fillRect(222, 384, 28, 3);

        this.add
            .text(90, 404, 'Six waves. Two towers. One last relay.', {
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '21px',
                fontStyle: 'italic',
                color: '#FFE4B0'
            })
            .setDepth(9);
        this.add
            .text(90, 444, 'Build along the caravan track, tune your coils,\nand keep the solar relay alive until dawn.', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '13px',
                color: '#D8C6A6',
                lineSpacing: 6
            })
            .setDepth(9);

        const start = new UIButton(this, {
            x: 228,
            y: 540,
            w: 276,
            h: 58,
            label: 'START DEFENSE',
            sub: 'Click or press Space',
            size: 18,
            subSize: 10,
            primary: true,
            onClick: () => this.startGame()
        });
        start.bg.setDepth(20);
        start.label.setDepth(22);
        start.sub?.setDepth(22);
        start.zone.setDepth(21);

        this.add
            .text(90, 600, 'BUILD · UPGRADE · HOLD THE LINE', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#8C7A60'
            })
            .setDepth(9)
            .setLetterSpacing(1.8);
        this.add
            .text(90, 620, 'P pause · S speed · M mute · F fullscreen', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '9px',
                color: '#8C7A60'
            })
            .setDepth(9);

        this.add
            .text(1240, 700, 'PROCEDURAL GRAPHICS · ORIGINAL WEB AUDIO', {
                fontFamily: '"Trebuchet MS", Verdana, sans-serif',
                fontSize: '8px',
                color: '#8C7A60'
            })
            .setOrigin(1, 1)
            .setDepth(9)
            .setLetterSpacing(1.2);

        this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
        this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
        this.input.once('pointerdown', () => {
            // A first click anywhere also arms the audio context.
            audio.ensure();
        });

        this.exposeHooks();
    }

    private startGame(): void {
        if (this.started) return;
        this.started = true;
        audio.ensure();
        audio.startMusic();
        audio.sfx('click');
        this.scene.start('Game');
    }

    update(_time: number, delta: number): void {
        const dt = Math.min(delta / 1000, 0.05);
        this.elapsed += dt;
        this.relayRing.rotation += dt * 0.14;
        const pulse = 0.5 + 0.5 * Math.sin(this.elapsed * 1.8);
        this.relayGlow.setAlpha(0.14 + pulse * 0.1).setScale(1.46 + pulse * 0.05);

        this.dustGfx.clear();
        for (const d of this.dust) {
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            if (d.x > MAP_WIDTH + 10) d.x = -10;
            if (d.y < -10) {
                d.y = MAP_HEIGHT + 10;
                d.x = Math.random() * MAP_WIDTH;
            }
            this.dustGfx.fillStyle(0xffe6b0, d.alpha);
            this.dustGfx.fillCircle(d.x, d.y, d.size);
        }
    }

    private exposeHooks(): void {
        type HookWindow = Window & {
            render_game_to_text?: () => string;
            advanceTime?: (ms: number) => void;
        };
        const w = window as HookWindow;
        w.render_game_to_text = () =>
            JSON.stringify({
                game: 'Relay Defense',
                scene: 'MainMenu',
                mode: 'menu',
                title: 'Relay Defense',
                subtitle: 'Six waves. Two towers. One last relay.',
                started: this.started,
                buttons: {
                    start: { x: 228, y: 540, label: 'START DEFENSE' }
                },
                controls: { start: 'SPACE or click START DEFENSE' }
            });
        w.advanceTime = () => {
            // Menu is decorative; the simulation starts in the Game scene.
        };
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            delete w.render_game_to_text;
            delete w.advanceTime;
        });
    }
}
