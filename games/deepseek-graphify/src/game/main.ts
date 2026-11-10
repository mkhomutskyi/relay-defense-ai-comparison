import { AUTO, Game, Scale } from 'phaser';
import { RelayScene } from './scenes/RelayScene';

// Relay Defense — original game code, procedural art and Web Audio.
// Built on the MIT-licensed Phaser + TypeScript + Vite starter template.
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1280,
    height: 800,
    parent: 'game-container',
    backgroundColor: '#dfb26d',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [RelayScene],
};

const StartGame = (parent: string) => {
    const game = new Game({ ...config, parent });
    return game;
};

export default StartGame;
