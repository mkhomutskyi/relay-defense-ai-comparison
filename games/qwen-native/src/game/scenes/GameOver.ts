// End screen: win/lose result, campaign stats, restart.
import { Scene, GameObjects } from 'phaser';
import * as CFG from '../config';
import { drawText, measureText } from '../font';
import { audio } from '../audio';

type Stats = { win: boolean; wave: number; kills: number; leaks: number; seconds: number };

export class GameOver extends Scene {
  stats: Stats = { win: false, wave: 0, kills: 0, leaks: 0, seconds: 0 };
  hud!: GameObjects.Graphics;

  constructor() { super('GameOver'); }

  init(data: Stats) { this.stats = data; }

  create() {
    this.add.image(CFG.W / 2, CFG.MAP_Y + CFG.MAP_H / 2, 'bg').setDepth(0);
    this.hud = this.add.graphics().setDepth(10);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.unlock();
      if (p.x >= 120 && p.x <= 260 && p.y >= 600 && p.y <= 660) { audio.ui(); this.scene.start('Game'); }
      if (p.x >= 280 && p.x <= 420 && p.y >= 600 && p.y <= 660) { audio.ui(); this.scene.start('MainMenu'); }
    });
    (this.input.keyboard ? this.input.keyboard : this.events).on('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyR') { audio.ui(); this.scene.start('Game'); }
      if (e.code === 'KeyM') { audio.ui(); this.scene.start('MainMenu'); }
    });

    this.renderEnd();
  }

  private renderEnd() {
    const g = this.hud, C = CFG.COLORS;
    g.clear();
    g.fillStyle(0x1b242e, 0.94).fillRoundedRect(120, 180, 560, 380, 12);
    g.fillStyle(this.stats.win ? C.mirror : C.danger, 0.9).fillRoundedRect(120, 180, 560, 8, 4);

    g.lineStyle(2, this.stats.win ? C.mirror : C.danger, 1);
    const title = this.stats.win ? 'OUTPOST SECURED' : 'RELAY OVERRUN';
    drawText(g, title, 160, 232, 5, 6, 3);

    g.lineStyle(2, C.dim, 1);
    drawText(g, this.stats.win ? 'All six waves cleared. The relay still shines.' : 'The core fell before the last wave cleared.', 160, 300, 2.2, 3.2, 1.6);

    const rows = [
      ['WAVES CLEARED', `${this.stats.wave}/6`],
      ['ROAD KILLS', String(this.stats.kills)],
      ['CORE LEAKS', String(this.stats.leaks)],
      ['CORE INTEGRITY', `${this.stats.win ? CFG.START_CORE : 0}/${CFG.START_CORE}`],
      ['CAMPAIGN TIME', `${Math.round(this.stats.seconds)}s`],
    ];
    rows.forEach((row, i) => {
      const y = 348 + i * 34;
      g.lineStyle(1.5, 0x3d4d5c, 1);
      g.beginPath(); g.moveTo(160, y + 14); g.lineTo(640, y + 14); g.strokePath();
      g.lineStyle(2, C.dim, 1);
      drawText(g, row[0], 160, y, 2, 3, 1.6);
      g.lineStyle(2, C.text, 1);
      drawText(g, row[1], 540, y, 2, 3, 1.6);
    });

    const btn = (x: number, label: string, hot: number) => {
      g.fillStyle(0x31404e, 1).fillRoundedRect(x, 600, 140, 60, 6);
      g.lineStyle(2, hot, 1); g.strokeRoundedRect(x, 600, 140, 60, 6);
      g.lineStyle(2, C.text, 1);
      const w = measureText(label, 2.4, 3.4);
      drawText(g, label, x + (140 - w) / 2, 620, 2.4, 3.4, 1.8);
    };
    btn(120, 'RESTART', C.gold);
    btn(280, 'MENU', C.mirror);
    g.lineStyle(2, 0x6c7d8a, 1);
    drawText(g, 'R RESTART  •  M MENU', 470, 624, 1.8, 2.6, 1.3);
  }

  update(_t: number, _d: number) { this.renderEnd(); }

  renderGameToText() {
    return JSON.stringify({
      mode: 'end',
      coord: 'origin top-left, x right 1024px, y down 768px',
      win: this.stats.win,
      wave: this.stats.wave,
      kills: this.stats.kills,
      leaks: this.stats.leaks,
      seconds: Math.round(this.stats.seconds),
      buttons: [{ id: 'restart', x: 120, y: 600, w: 140, h: 60 }, { id: 'menu', x: 280, y: 600, w: 140, h: 60 }],
    });
  }

  advanceTime(ms: number) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) this.update(0, 1000 / 60);
    return this.renderGameToText();
  }
}
