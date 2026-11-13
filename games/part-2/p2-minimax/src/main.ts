import StartGame from './game/main';
import { audio } from './game/audio';

document.addEventListener('DOMContentLoaded', () => {
    StartGame('game-container');

    // Web Audio needs a user gesture before it can start.
    const unlock = (): void => {
        audio.unlock();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
});
