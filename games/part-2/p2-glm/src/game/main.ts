import { AUTO, Game, Scale } from 'phaser';
import { MainMenu } from './scenes/MainMenu';
import { Game as GameScene } from './scenes/Game';
import { GameOver } from './scenes/GameOver';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#e6c078',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    scene: [MainMenu, GameScene, GameOver],
};

const StartGame = (parent: string) => new Game({ ...config, parent });

export default StartGame;
