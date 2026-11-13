import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game, Scale } from 'phaser';

//  Relay Defense runs on the official Phaser + TypeScript + Vite template.
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#1c1510',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        roundPixels: false
    },
    scene: [MainMenu, MainGame]
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
