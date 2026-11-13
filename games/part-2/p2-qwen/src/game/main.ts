import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/Boot';
import { GameScene } from './scenes/GameScene';
import { MainMenu } from './scenes/MainMenu';

// Relay Defense game config. Single centered canvas, procedural art only.
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'game-container',
    backgroundColor: '#1a1030',
    scale: {
        mode: Scale.NONE,
        autoCenter: Scale.NO_CENTER,
        width: 1024,
        height: 640,
    },
    render: {
        antialias: true,
        roundPixels: false,
    },
    scene: [Boot, MainMenu, GameScene],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
