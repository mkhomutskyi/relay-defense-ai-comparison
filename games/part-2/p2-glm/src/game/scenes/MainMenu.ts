import { Scene } from 'phaser';
import { audio } from '../audio';

export class MainMenu extends Scene
{
    constructor() { super('MainMenu'); }

    create(): void
    {
        const g = this.add.graphics();
        // sky gradient bands (bright desert dawn)
        g.fillGradientStyle(0xffe3a3, 0xffe3a3, 0xe6c078, 0xe6c078, 1);
        g.fillRect(0, 0, 1024, 768);
        // sun
        g.fillStyle(0xfff3c4, 0.9); g.fillCircle(512, 210, 90);
        g.fillStyle(0xffe082, 0.4); g.fillCircle(512, 210, 130);
        // dunes
        g.fillStyle(0xd9b06a); g.fillEllipse(200, 600, 700, 220);
        g.fillEllipse(860, 620, 640, 200);
        g.fillStyle(0xcf9f58); g.fillEllipse(512, 700, 1100, 260);
        // small relay silhouette
        g.fillStyle(0x6b6f76); g.fillRect(880, 300, 6, 60);
        g.fillStyle(0xf5f7fa); g.fillEllipse(883, 300, 40, 12);
        g.generateTexture('menu-bg', 1024, 768);
        g.destroy();
        this.add.image(512, 384, 'menu-bg');

        this.add.text(512, 250, 'RELAY DEFENSE', {
            fontFamily: 'Verdana', fontSize: 56, color: '#5b3d16', fontStyle: 'bold',
        }).setOrigin(0.5).setShadow(0, 4, '#c49a55', 8);
        this.add.text(512, 305, 'hold the solar relay outpost through 6 waves', {
            fontFamily: 'Verdana', fontSize: 16, color: '#7a5a28',
        }).setOrigin(0.5);

        this.add.text(512, 420,
            'BUILD  1 Solar Turret ($50) — fast beam   |   2 Arc Pylon ($90) — chain lightning\n' +
            'Click sand to build · click towers to upgrade · survive the Sandstorm Titan\n' +
            'P pause · F speed · M mute · R restart',
            { fontFamily: 'Verdana', fontSize: 13, color: '#5b3d16', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

        const bg = this.add.rectangle(512, 520, 300, 56, 0x2b3138, 0.95).setStrokeStyle(3, 0xffd447).setInteractive({ useHandCursor: true });
        this.add.text(512, 520, '▶  START', { fontFamily: 'Verdana', fontSize: 22, color: '#ffd447' }).setOrigin(0.5);
        bg.on('pointerover', () => bg.setFillStyle(0x3d4750));
        bg.on('pointerout', () => bg.setFillStyle(0x2b3138));
        bg.on('pointerdown', () => {
            audio.ensure();
            audio.startMusic();
            this.scene.start('Game');
        });

        window.render_game_to_text = () => JSON.stringify({ mode: 'menu' });
        window.advanceTime = () => { /* nothing to step on menu */ };
    }
}
