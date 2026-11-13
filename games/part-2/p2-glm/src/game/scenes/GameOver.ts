import { Scene } from 'phaser';

export class GameOver extends Scene
{
    constructor() { super('GameOver'); }

    create(data: { win?: boolean; wave?: number; credits?: number }): void
    {
        const win = !!data?.win;
        this.cameras.main.setBackgroundColor(win ? 0x2a3d1e : 0x3a1f1c);

        this.add.text(512, 300, win ? 'RELAY SECURED' : 'RELAY LOST', {
            fontFamily: 'Verdana', fontSize: 52, color: win ? '#7dff8a' : '#ff6b6b', fontStyle: 'bold',
        }).setOrigin(0.5);

        const wave = data?.wave ?? 0;
        this.add.text(512, 380, win
            ? `All 6 waves repelled. Credits banked: $${data?.credits ?? 0}`
            : `The core fell on wave ${Math.max(1, wave)}.`,
            { fontFamily: 'Verdana', fontSize: 18, color: '#e8eef2' }).setOrigin(0.5);

        const bg = this.add.rectangle(512, 470, 320, 60, 0x2b3138, 0.95).setStrokeStyle(3, 0xffd447).setInteractive({ useHandCursor: true });
        this.add.text(512, 470, '↻  PLAY AGAIN', { fontFamily: 'Verdana', fontSize: 20, color: '#ffd447' }).setOrigin(0.5);
        bg.on('pointerdown', () => { this.scene.start('Game'); });

        window.render_game_to_text = () => JSON.stringify({ mode: win ? 'won' : 'lost', wave });
        window.advanceTime = () => { /* static screen */ };
    }
}
