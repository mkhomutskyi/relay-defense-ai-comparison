import { AUTO, Game, Scale } from 'phaser';
import { RelayScene } from './RelayScene';

//  Relay Defense — original procedural art and Web Audio.
//  Built on the MIT-licensed Phaser TypeScript/Vite template.
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#1a2a26',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    render: {
        antialias: true,
        roundPixels: false,
    },
    scene: [RelayScene],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
