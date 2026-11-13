import { AUTO, Game, Scale } from 'phaser';
import { GAME_H, GAME_W } from './config';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: 'game-container',
    backgroundColor: '#0b1018',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        roundPixels: false
    },
    fps: { target: 60 },
    scene: [MenuScene, GameScene]
};

const StartGame = (parent: string): Game => {
    const game = new Game({ ...config, parent });

    /* ------------------------------------------------------- inspection API */
    const sceneOf = (key: string): GameScene | MenuScene | null => {
        const s = game.scene.getScene(key);
        return s && s.scene.isActive() ? (s as GameScene | MenuScene) : null;
    };

    const w = window as unknown as Record<string, unknown>;

    /** Text snapshot of the live simulation (real state, not a stub). */
    w.render_game_to_text = (): string => {
        const g = sceneOf('Game');
        if (g && 'stateText' in g) return (g as GameScene).stateText();
        return JSON.stringify({
            coordinateSystem: 'canvas pixels, origin top-left, x right, y down',
            mode: 'menu',
            hint: 'Press START DEFENSE (or ENTER) to begin the campaign.'
        });
    };

    /**
     * Deterministic time control: advances the running simulation by exactly
     * `ms` of game time in 60 Hz steps, independent of the render loop.
     */
    w.advanceTime = async (ms: number): Promise<boolean> => {
        const steps = Math.max(1, Math.round(ms / (1000 / 60)));
        for (let i = 0; i < steps; i++) {
            const g = sceneOf('Game');
            if (g && 'manualStep' in g) {
                (g as GameScene).manualStep(1 / 60);
            } else {
                const m = sceneOf('Menu');
                if (m && 'manualStep' in m) (m as MenuScene).manualStep(1 / 60);
            }
        }
        return true;
    };

    w.relayDefenseGame = game;
    return game;
};

export default StartGame;
