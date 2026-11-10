import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { W, H } from './config';

type Hookable = { renderGameToText(): string; advanceTime(ms: number): string };

let game: Phaser.Game | null = null;

export function StartGame(target: HTMLElement | string) {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: target as any,
    backgroundColor: '#141c24',
    banner: false,
    scene: [Boot, MainMenu, Game, GameOver],
  };

  game = new Phaser.Game(config);

  // Playwright/automation hooks (real game state, no test-only cheats).
  const active = (): Hookable | null => {
    if (!game) return null;
    for (const s of game.scene.getScenes(true)) {
      const c = s as unknown as Hookable;
      if (c && typeof c.renderGameToText === 'function' && typeof c.advanceTime === 'function') return c;
    }
    return null;
  };

  (window as any).render_game_to_text = () => {
    const s = active();
    return s ? s.renderGameToText() : '';
  };
  (window as any).advanceTime = (ms: number) => {
    const s = active();
    return s ? s.advanceTime(ms) : '';
  };
  (window as any).game = game;

  return game;
}

export default StartGame;
