import { Scene } from 'phaser';
import { audio } from '../audio';

export class MainMenu extends Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    const W = 1280, H = 720;
    const g = this.add.graphics();
    // sky gradient: dawn desert
    g.fillGradientStyle(0x2b1a3e, 0x2b1a3e, 0xb3541e, 0xb3541e, 1);
    g.fillRect(0, 0, W, H * 0.62);
    g.fillGradientStyle(0xb3541e, 0xb3541e, 0xf2d59a, 0xf2d59a, 1);
    g.fillRect(0, H * 0.62, W, H * 0.38);
    // sun
    g.fillStyle(0xffe9a8, 1);
    g.fillCircle(W / 2, H * 0.56, 90);
    g.fillStyle(0xfff6d8, 1);
    g.fillCircle(W / 2, H * 0.56, 62);
    // distant dunes
    g.fillStyle(0x8a4a2e, 1);
    g.fillEllipse(180, H * 0.66, 560, 130);
    g.fillStyle(0x74402a, 1);
    g.fillEllipse(980, H * 0.68, 640, 150);
    g.fillStyle(0x5d3a26, 1);
    g.fillEllipse(620, H * 0.72, 900, 170);
    // relay silhouette
    g.fillStyle(0x1a120a, 1);
    g.fillRect(W / 2 - 8, H * 0.30, 16, H * 0.32);
    g.fillRect(W / 2 - 46, H * 0.36, 92, 9);
    g.fillRect(W / 2 - 30, H * 0.45, 60, 7);
    g.fillTriangle(W / 2 - 24, H * 0.30, W / 2, H * 0.22, W / 2 + 24, H * 0.30);
    g.fillCircle(W / 2, H * 0.245, 10);

    this.add.text(W / 2, 96, 'RELAY DEFENSE', {
      fontFamily: 'Georgia, serif', fontSize: '76px', color: '#ffd166', fontStyle: 'bold',
      stroke: '#3a2410', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(W / 2, 152, 'The desert relay is the last light on the line. Hold it.', {
      fontFamily: 'Trebuchet MS', fontSize: '19px', color: '#ffe9b8', fontStyle: 'italic',
    }).setOrigin(0.5);

    // instructions panel
    const px = W / 2, py = 470;
    this.add.rectangle(px, py, 720, 150, 0x1a120a, 0.78).setStrokeStyle(2, 0xffd166, 0.8);
    this.add.text(px, py - 52, 'HOW TO PLAY', { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#ffd166', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(px, py + 6, [
      'Click a tower card (or press 1 / 2), then click open sand to build.',
      'Solar Lancers fire fast beams · Sunburst Mortars deal splash damage.',
      'Click a placed tower to upgrade or sell it. Earn gold for every kill.',
      'Stop the swarm before it reaches the relay. Survive all 6 waves.',
    ], { fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#f5e6c8', align: 'center', lineSpacing: 7 }).setOrigin(0.5);

    const btn = this.add.rectangle(px, 620, 280, 64, 0xb3541e, 1).setStrokeStyle(3, 0xffd166).setInteractive({ useHandCursor: true });
    const label = this.add.text(px, 620, 'START DEFENSE', { fontFamily: 'Trebuchet MS', fontSize: '24px', color: '#ffe9b8', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0xd06a28, 1));
    btn.on('pointerout', () => btn.setFillStyle(0xb3541e, 1));
    btn.on('pointerdown', () => { audio.ensure(); audio.sfxUpgrade(); this.scene.start('Game'); });
    this.input.keyboard?.on('keydown-SPACE', () => { audio.ensure(); this.scene.start('Game'); });
    void label;
  }
}
