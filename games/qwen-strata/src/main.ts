import { AUTO, Game } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants';
import { MainMenu } from './game/scenes/MainMenu';
import { RelayDefense } from './game/scenes/RelayDefense';
import { wireControls } from './game/controls';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: 0xefe3c8,
  render: { antialias: true },
  scene: [MainMenu, RelayDefense],
};

const game = new Game(config);
wireControls();

export default game;
