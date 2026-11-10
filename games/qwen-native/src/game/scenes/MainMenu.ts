// Title screen: full-bleed outpost preview, original vector-font title, tutorial, start.
import { Scene, GameObjects } from 'phaser';
import * as CFG from '../config';
import { drawText, drawTextFit } from '../font';
import { audio } from '../audio';

export class MainMenu extends Scene {
  hud!: GameObjects.Graphics;
  march: { sprite: GameObjects.Sprite, d: number, speed: number }[] = [];
  t = 0;

  constructor() { super('MainMenu'); }

  create() {
    this.add.image(CFG.W / 2, CFG.MAP_Y + CFG.MAP_H / 2, 'bg').setDepth(0);

    // small living preview: towers on pads + enemies marching the road
    this.add.sprite(13 * 32 + 16, CFG.MAP_Y + 3 * 32 + 32, 't_mirror2').setOrigin(0.5, 1).setDepth(4);
    this.add.sprite(14 * 32 + 16, CFG.MAP_Y + 13 * 32 + 32, 't_driver2').setOrigin(0.5, 1).setDepth(4);
    this.add.sprite(26 * 32 + 16, CFG.MAP_Y + 11 * 32 + 32, 't_mirror3').setOrigin(0.5, 1).setDepth(4);

    const roadCells: [number, number][] = [];
    for (let i = 0; i < CFG.PATH.length - 1; i++) {
      const [c1, r1] = CFG.PATH[i], [c2, r2] = CFG.PATH[i + 1];
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) roadCells.push([c, r]);
    }
    const picks = ['e_scavenger', 'e_swarm', 'e_hauler', 'e_bulky', 'e_boss'];
    for (let i = 0; i < 5; i++) {
      const idx = 40 + i * 6;
      const [c, r] = roadCells[Math.min(idx, roadCells.length - 1)];
      const sp = this.add.sprite(c * 32 + 16, CFG.MAP_Y + r * 32 + 16, picks[i]).setDepth(5);
      this.march.push({ sprite: sp, d: idx, speed: 26 + i * 6 });
    }

    this.hud = this.add.graphics().setDepth(10);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (p.x >= 16 && p.x <= 176 && p.y >= CFG.BAR_Y + 10 && p.y <= CFG.BAR_Y + 66) {
        audio.build();
        this.scene.start('Game');
      }
    });
    (this.input.keyboard ? this.input.keyboard : this.events).on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') { audio.unlock(); this.scene.start('Game'); }
    });

    this.renderMenu();
  }

  update(_t: number, delta: number) {
    this.t += delta / 1000;
    const cells: [number, number][] = [];
    for (let i = 0; i < CFG.PATH.length - 1; i++) {
      const [c1, r1] = CFG.PATH[i], [c2, r2] = CFG.PATH[i + 1];
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) cells.push([c, r]);
    }
    for (const m of this.march) {
      m.d = (m.d + m.speed * delta / 1000 / 32) % cells.length;
      const [c, r] = cells[Math.floor(m.d)];
      m.sprite.setPosition(c * 32 + 16, CFG.MAP_Y + r * 32 + 16);
    }
    this.renderMenu();
  }

  private renderMenu() {
    const g = this.hud, C = CFG.COLORS;
    g.clear();
    g.fillStyle(0x24313f, 0.92).fillRoundedRect(16, CFG.MAP_Y + 16, 400, 300, 10);
    g.fillStyle(C.gold, 0.9).fillRoundedRect(16, CFG.MAP_Y + 16, 400, 6, 3);

    g.lineStyle(2, C.gold, 1);
    drawText(g, 'RELAY DEFENSE', 40, CFG.MAP_Y + 48, 5, 6, 3);
    g.lineStyle(2, C.text, 1);
    drawText(g, 'SOLAR OUTPOST  •  SIX WAVES', 40, CFG.MAP_Y + 108, 2.2, 3.4, 1.8);

    g.lineStyle(2, C.dim, 1);
    const lines = [
      'Crawlers follow the road to the core.',
      'MIRROR: fast single-target beam.',
      'DRIVER: slow heavy splash damage.',
      'Paid placement and paid upgrades.',
      'Click a tower to upgrade or sell.',
      'Leaks hurt the core. Six waves run,',
      'then the Colossus.',
    ];
    lines.forEach((l, i) => drawTextFit(g, l, 40, CFG.MAP_Y + 140 + i * 22, 520, 2, 3, 1.6));

    g.lineStyle(2, C.mirror, 0.9);
    g.strokeCircle(120, CFG.MAP_Y + 262, 20);
    g.strokeCircle(300, CFG.MAP_Y + 262, 26);
    g.fillStyle(C.mirror, 0.25).fillCircle(120, CFG.MAP_Y + 262, 20);
    g.fillStyle(C.driver, 0.22).fillCircle(300, CFG.MAP_Y + 262, 26);
    g.lineStyle(2, C.mirror, 1); drawText(g, 'MIRROR', 100, CFG.MAP_Y + 288, 2, 3, 1.6);
    g.lineStyle(2, C.driver, 1); drawText(g, 'DRIVER', 280, CFG.MAP_Y + 288, 2, 3, 1.6);

    // start button
    g.fillStyle(0x31404e, 1).fillRoundedRect(16, CFG.BAR_Y + 10, 160, 56, 6);
    g.lineStyle(2, C.gold, 1); g.strokeRoundedRect(16, CFG.BAR_Y + 10, 160, 56, 6);
    g.lineStyle(2, C.text, 1);
    drawText(g, 'START', 62, CFG.BAR_Y + 26, 3, 4, 2);
    g.lineStyle(2, C.dim, 1);
    drawText(g, 'OR PRESS ENTER', 22, CFG.BAR_Y + 70, 1.8, 2.6, 1.3);
    g.lineStyle(2, 0x6c7d8a, 1);
    drawTextFit(g, 'P PAUSE  •  F SPEED  •  M MUTE  •  R RESTART', 640, CFG.BAR_Y + 34, CFG.W - 656, 1.8, 2.6, 1.3);
  }

  renderGameToText() {
    return JSON.stringify({
      mode: 'menu',
      coord: 'origin top-left, x right 1024px, y down 768px',
      startButton: { x: 16, y: CFG.BAR_Y + 10, w: 160, h: 56 },
      marching: this.march.map(m => ({ type: m.sprite.texture.key, x: Math.round(m.sprite.x), y: Math.round(m.sprite.y) })),
    });
  }

  advanceTime(ms: number) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) this.update(0, 1000 / 60);
    return JSON.stringify({ mode: 'menu', elapsed: Math.round(this.t * 10) / 10 });
  }
}
