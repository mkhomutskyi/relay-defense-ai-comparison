import { Scene } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { ENGINE } from '../scenes/RelayDefense';
import { controls, renderControlLabels } from '../controls';

/** Original title screen, drawn procedurally (no template logo/background). */
export class MainMenu extends Scene {
  constructor() { super('MainMenu'); }

  create() {
    const g = this.add.graphics();
    // sky
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      const t = y / GAME_HEIGHT;
      const color = (lerp(0x2c, 0xef, t) << 16) | (lerp(0x3a, 0xe0, t) << 8) | lerp(0x4b, 0xc4, t);
      g.fillStyle(color, 1);
      g.fillRect(0, y, GAME_WIDTH, 4);
    }
    // sun
    g.fillStyle(0xffd166, 1);
    g.fillCircle(GAME_WIDTH - 210, 150, 46);
    g.fillStyle(0xffd166, 0.25);
    g.fillCircle(GAME_WIDTH - 210, 150, 66);
    // dunes
    g.fillStyle(0xd9b877, 1);
    g.fillTriangle(0, 470, 380, 430, 0, GAME_HEIGHT);
    g.fillTriangle(300, 520, 700, 440, 700, GAME_HEIGHT);
    g.fillStyle(0xc9ae86, 1);
    g.fillTriangle(560, 560, 1024, 470, 1024, GAME_HEIGHT);
    // relay dish silhouette
    g.fillStyle(0x3c4450, 1);
    g.fillRect(760, 480, 10, 120);
    g.fillCircle(765, 470, 34);
    g.fillStyle(0xefe3c8, 1);
    g.fillCircle(765, 470, 26);
    g.lineStyle(4, 0x3c4450, 1);
    g.lineBetween(765, 470, 850, 380);
    g.fillStyle(0xffd166, 1);
    g.fillCircle(850, 380, 8);

    this.add.text(60, 84, 'RELAY DEFENSE', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '54px', color: '#f7f4e6',
    }).setDepth(10);
    this.add.text(60, 150, 'Hold the desert outpost through six waves. Two towers, one relay core.', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '17px', color: '#e8e3d5',
    }).setDepth(10);

    this.add.text(60, 210, [
      'Mirror Array — focused beam, single target, long range.',
      'Static Coil — area pulse, damages and slows everything nearby.',
      'Enemies follow the pale track. Reach the core and it takes damage.',
    ].join('\n'), {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '15px', color: '#e8e3d5', lineSpacing: 7,
    }).setDepth(10);

    this.add.text(60, 320, 'Controls: click pads to build · P pause · F speed · M mute · R restart · Enter start', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '14px', color: '#c8d0da',
    }).setDepth(10);

    const startHint = this.add.text(60, 360, 'Press Enter, or use the Start button above.', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '15px', color: '#ffd166',
    }).setDepth(10);

    controls.start = () => {
      ENGINE.sfx('ui');
      this.scene.start('RelayDefense');
    };
    controls.getState = () => ({ mode: 'menu', paused: false, speed: 1, muted: ENGINE.mutedFlag(), canStart: true });
    renderControlLabels();

    const kb = this.input.keyboard;
    if (kb) kb.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        ENGINE.sfx('ui');
        this.scene.start('RelayDefense');
      }
    });
    this.input.on('pointerdown', () => {
      this.scene.start('RelayDefense');
    });

    startHint.setInteractive().on('pointerover', () => startHint.setColor('#ffe9a8'));
  }
}
