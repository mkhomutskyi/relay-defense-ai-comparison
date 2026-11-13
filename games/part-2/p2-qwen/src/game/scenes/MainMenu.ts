import { Scene, GameObjects } from 'phaser';
import { audio } from '../audio';
import { VIEW_W, VIEW_H } from '../data';

export class MainMenu extends Scene {
    private startBtn!: GameObjects.Container;
    private pulse!: GameObjects.Graphics;

    constructor() { super('MainMenu'); }

    create() {
        // desert backdrop fills the canvas (full-bleed, per frontend skill)
        this.add.image(VIEW_W / 2, VIEW_H / 2, 'bg').setDepth(0);

        // warm sun glow behind title
        this.pulse = this.add.graphics().setDepth(1);

        // darkening gradient band so text reads cleanly over sand
        const shade = this.add.graphics().setDepth(2);
        shade.fillStyle(0x1a1030, 0.55).fillRect(0, 0, VIEW_W, VIEW_H);
        shade.fillStyle(0x000000, 0.25).fillRect(0, 0, VIEW_W, 120);
        shade.fillStyle(0x000000, 0.25).fillRect(0, VIEW_H - 150, VIEW_W, 150);

        // brand + headline (brand is loudest)
        this.add.text(VIEW_W / 2, 150, 'RELAY DEFENSE', {
            fontFamily: 'Arial Black, Arial', fontSize: 66, color: '#ffe8c7',
            stroke: '#7a3d12', strokeThickness: 10,
        }).setOrigin(0.5).setDepth(3);

        this.add.text(VIEW_W / 2, 214, 'Hold the solar relay through six desert assault waves.', {
            fontFamily: 'Arial', fontSize: 22, color: '#f4d6a8',
        }).setOrigin(0.5).setDepth(3);

        // two-tower role explainer (compact, no card soup)
        const info = this.add.text(VIEW_W / 2, 286,
            'PULSE CANNON — fast single-target laser\n' +
            'ARC COIL — chain lightning that slows swarms\n' +
            'Click open sand to build. Click a tower to upgrade or sell.', {
            fontFamily: 'Arial', fontSize: 18, color: '#cfe6ff', align: 'center', lineSpacing: 8,
        }).setOrigin(0.5).setDepth(3);

        // start button container
        this.startBtn = this.add.container(VIEW_W / 2, 400).setDepth(4).setSize(260, 64);
        const btnBg = this.add.rectangle(0, 0, 260, 64, 0xff6a3d, 1).setStrokeStyle(3, 0xffd9a0);
        const btnLabel = this.add.text(0, 2, 'START MISSION', {
            fontFamily: 'Arial Black, Arial', fontSize: 26, color: '#1a0d05',
        }).setOrigin(0.5);
        this.startBtn.add([btnBg, btnLabel]);
        this.startBtn.setSize(260, 64);
        this.startBtn.setInteractive({ useHandCursor: true });
        this.startBtn.on('pointerover', () => btnBg.setFillStyle(0xff865a));
        this.startBtn.on('pointerout', () => btnBg.setFillStyle(0xff6a3d));
        this.startBtn.on('pointerdown', () => this.go());

        // controls line
        this.add.text(VIEW_W / 2, VIEW_H - 60,
            'Controls:  [1]/[2] select tower   [Space] next wave   [P] pause   [S] speed   [M] mute   [R] restart', {
            fontFamily: 'Arial', fontSize: 16, color: '#b7a7d6',
        }).setOrigin(0.5).setDepth(3);

        void info;

        this.input.keyboard?.on('keydown-SPACE', () => this.go());
        this.input.keyboard?.on('keydown-ENTER', () => this.go());
    }

    private go() {
        audio.resume();
        audio.click();
        this.scene.start('Game');
    }

    update(_t: number, dt: number) {
        const s = Math.sin(this.time.now * 0.003);
        this.pulse.clear();
        const cx = VIEW_W / 2, cy = 150;
        this.pulse.fillStyle(0xffcf7a, 0.18 + s * 0.05);
        this.pulse.fillCircle(cx, cy, 150 + s * 10);
        this.pulse.fillStyle(0xff9d4a, 0.12);
        this.pulse.fillCircle(cx, cy, 90 + s * 6);
        void dt;
    }
}
