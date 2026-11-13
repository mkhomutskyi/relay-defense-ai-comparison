import { Scene, Scenes } from 'phaser';
import { FONT_BOLD, GAME_H, GAME_W } from '../config';
import { UIButton } from '../ui';
import { audio } from '../audio';
import { buildMenuCanvas } from '../mapArt';

export class MenuScene extends Scene {
    private dust: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    private dustG!: Phaser.GameObjects.Graphics;

    constructor() {
        super('Menu');
    }

    create(): void {
        const canvas = buildMenuCanvas();
        if (!this.textures.exists('menu-bg')) {
            this.textures.addCanvas('menu-bg', canvas);
        }
        this.add.image(0, 0, 'menu-bg').setOrigin(0).setDepth(0);

        // Warm scrim on the left so the copy stays readable over the sky.
        const scrim = this.add.graphics().setDepth(1);
        scrim.fillGradientStyle(0x0d1420, 0x0d1420, 0x0d1420, 0x0d1420, 0.82, 0.05, 0.72, 0.0);
        scrim.fillRect(0, 0, GAME_W, GAME_H);

        const title = this.add.text(110, 96, 'RELAY DEFENSE', {
            fontFamily: FONT_BOLD, fontSize: '66px', color: '#fff3d4'
        }).setDepth(2);
        title.setStroke('#2a1a08', 8);
        title.setShadow(0, 6, '#000000', 10, false, true);

        this.add.text(114, 182, 'SOLAR OUTPOST 7  ·  HOLD THE RELAY', {
            fontFamily: FONT_BOLD, fontSize: '21px', color: '#ffc861'
        }).setDepth(2);

        this.add.text(114, 214, 'Six waves are climbing the supply road. Build, upgrade, survive the Solar Devourer.', {
            fontFamily: FONT_BOLD, fontSize: '16px', color: '#e8dcc4'
        }).setDepth(2).setAlpha(0.92);

        // How to play panel.
        const panelG = this.add.graphics().setDepth(2);
        panelG.fillStyle(0x101822, 0.78);
        panelG.fillRoundedRect(108, 268, 620, 214, 14);
        panelG.lineStyle(1, 0x3d4d60, 0.9);
        panelG.strokeRoundedRect(108, 268, 620, 214, 14);

        const steps: [string, string, string, number][] = [
            ['1', 'PICK A TOWER, CLICK THE SAND', 'Prism Beam 100c  ·  Arc Coil 75c', 0x5ce1d6],
            ['2', 'SHOOT WHAT MATTERS', 'Prism Beam hits one far target. Arc Coil chains through a crowd.', 0xa97bff],
            ['3', 'UPGRADE AND HOLD', 'Select a built tower and upgrade it. The relay has 20 integrity.', 0xffc247]
        ];
        steps.forEach(([n, head, body, col], i) => {
            const y = 300 + i * 62;
            const badge = this.add.graphics().setDepth(3);
            badge.fillStyle(col, 1);
            badge.fillCircle(140, y + 12, 15);
            badge.lineStyle(2, 0x101822, 1);
            badge.strokeCircle(140, y + 12, 15);
            this.add.text(140, y + 12, n, {
                fontFamily: FONT_BOLD, fontSize: '16px', color: '#101822'
            }).setOrigin(0.5).setDepth(3);
            this.add.text(170, y, head, {
                fontFamily: FONT_BOLD, fontSize: '17px', color: '#ffffff'
            }).setDepth(3);
            this.add.text(170, y + 23, body, {
                fontFamily: FONT_BOLD, fontSize: '14px', color: '#b9c6d6'
            }).setDepth(3);
        });

        this.add.text(110, 500,
            '1 / 2 pick tower    ·    click to build    ·    click a tower to upgrade    ·    N send wave early\n'
            + 'P pause    ·    M mute    ·    R restart    ·    F fullscreen    ·    ESC cancel',
            { fontFamily: FONT_BOLD, fontSize: '14px', color: '#9fb0c4', lineSpacing: 8 }).setDepth(3);

        const startBtn = new UIButton(this, 230, 596, 240, 56, 'START DEFENSE', {
            fontSize: 20,
            bg: 0xffc247,
            border: 0xffe3a0,
            textColor: 0x20160a,
            radius: 12,
            active: true,
            onClick: () => this.begin()
        });
        startBtn.setPosition(230, 596);

        this.add.text(372, 596, 'or press ENTER', {
            fontFamily: FONT_BOLD, fontSize: '14px', color: '#cbb894'
        }).setOrigin(0, 0.5).setDepth(3);

        // Atmospheric dust.
        this.dustG = this.add.graphics().setDepth(3);
        for (let i = 0; i < 90; i++) {
            this.dust.push({
                x: Math.random() * GAME_W,
                y: 380 + Math.random() * 340,
                vx: 0.25 + Math.random() * 0.7,
                vy: (Math.random() - 0.5) * 0.2,
                r: 0.8 + Math.random() * 2.2,
                a: 0.08 + Math.random() * 0.22
            });
        }

        this.input.keyboard?.on('keydown-ENTER', () => this.begin());
        this.input.keyboard?.on('keydown-SPACE', () => this.begin());

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.removeAllListeners();
        });
    }

    private begin(): void {
        audio.unlock();
        audio.sfx('click');
        audio.startMusic();
        this.scene.start('Game');
    }

    override update(_time: number, delta: number): void {
        this.stepDust(delta / 1000);
    }

    /** Deterministic stepping hook (same API as the game scene). */
    public manualStep(dt: number): void {
        this.stepDust(dt);
    }

    private stepDust(dt: number): void {
        const g = this.dustG;
        g.clear();
        for (const d of this.dust) {
            d.x += d.vx * dt * 60;
            d.y += d.vy * dt * 60;
            if (d.x > GAME_W + 10) d.x = -10;
            g.fillStyle(0xfff0cf, d.a);
            g.fillCircle(d.x, d.y, d.r);
        }
    }
}
