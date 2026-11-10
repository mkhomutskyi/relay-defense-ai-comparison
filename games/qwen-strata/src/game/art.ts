import { Scene } from 'phaser';
import { CELL } from './constants';

/**
 * All art is drawn procedurally with Phaser Graphics and baked into textures.
 * No image files, no remote assets.
 */

export function buildTextures(scene: Scene) {
  const g = scene.add.graphics();

  // ---- desert ground tile (48px cell, speckled sand) ----
  g.fillStyle(0xe8c98c, 1);
  g.fillRect(0, 0, CELL, CELL);
  const speckles = [
    [0.15, 0.2, 1.6], [0.7, 0.35, 1.3], [0.45, 0.8, 1.2], [0.85, 0.65, 1.0],
    [0.3, 0.55, 0.9], [0.6, 0.12, 1.1], [0.9, 0.9, 1.0], [0.2, 0.75, 1.2],
  ];
  for (const [px, py, r] of speckles) {
    g.fillStyle(0xd4b474, 1);
    g.fillCircle(px * CELL, py * CELL, r);
  }
  g.fillStyle(0xf2ddb0, 0.5);
  g.fillRect(3, 3, CELL - 6, 2);
  g.fillStyle(0xddd0ad, 0.6);
  g.fillCircle(CELL - 12, CELL - 14, 1.5);
  g.generateTexture('ground', CELL, CELL);
  g.clear();

  // ---- path plate ----
  g.fillStyle(0xb99c75, 1);
  g.fillRect(0, 0, CELL, CELL);
  g.fillStyle(0xa98d67, 1);
  g.fillRect(0, 0, CELL, 2);
  g.fillStyle(0xcaaf86, 1);
  g.fillRect(0, CELL - 2, CELL, 2);
  for (let i = 0; i < 5; i++) {
    g.lineStyle(1, 0x9c8060, 0.45);
    g.lineBetween(4 + i * 9, 10 + i * 7, CELL - 6, 12 + i * 7);
  }
  g.fillStyle(0x8f7757, 0.35);
  g.fillCircle(CELL / 2, CELL / 2, 1.2);
  g.generateTexture('path', CELL, CELL);
  g.clear();

  // ---- tower pad ----
  g.fillStyle(0xb9b4a6, 1);
  g.fillRoundedRect(4, 4, CELL - 8, CELL - 8, 6);
  g.fillStyle(0xd6d1c2, 1);
  g.fillRoundedRect(7, 7, CELL - 14, CELL - 14, 5);
  g.lineStyle(1.5, 0x8b8676, 1);
  g.strokeRoundedRect(7, 7, CELL - 14, CELL - 14, 5);
  g.generateTexture('pad', CELL, CELL);
  g.clear();

  // ---- towers ----
  drawLance(g);
  drawPulse(g);

  // ---- enemies ----
  drawDrone(g);
  drawRunner(g);
  drawDuster(g);
  drawHauler(g);
  drawNullifier(g);
  drawBoss(g);

  // ---- misc ----
  g.fillStyle(0xffffff, 1);
  g.fillCircle(5, 5, 5);
  g.generateTexture('dot', 10, 10);

  g.fillStyle(0xffd166, 1);
  g.fillRoundedRect(0, 0, 14, 14, 3);
  g.lineStyle(2, 0x7c5a1c, 1);
  g.strokeRoundedRect(0, 0, 14, 14, 3);
  g.fillStyle(0x7c5a1c, 1);
  g.fillCircle(7, 7, 3);
  g.generateTexture('credit', 14, 14);

  g.fillStyle(0x2b3140, 1);
  g.fillRoundedRect(0, 0, 20, 20, 6);
  g.generateTexture('chip', 20, 20);

  g.destroy();
}

function drawLance(g: Phaser.GameObjects.Graphics) {
  // solar mirror array: pale plate, bright emitter, amber accents
  g.fillStyle(0x3c4450, 1);
  g.fillRoundedRect(4, 4, 40, 40, 6);
  g.fillStyle(0xf6f7f4, 1);
  g.fillCircle(24, 24, 15);
  g.fillStyle(0xdfd9c8, 1);
  g.fillCircle(24, 24, 11);
  g.lineStyle(3, 0x9aa39b, 1);
  g.strokeCircle(24, 24, 14);
  g.fillStyle(0xffd166, 1);
  g.fillCircle(24, 24, 6);
  g.lineStyle(2, 0xbfbfb3, 1);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.lineBetween(24 + Math.cos(a) * 12, 24 + Math.sin(a) * 12, 24 + Math.cos(a) * 16, 24 + Math.sin(a) * 16);
  }
  g.lineStyle(2, 0x8fb3c9, 1);
  g.lineBetween(24, 24, 44, 12);
  g.generateTexture('tower_lance', 48, 48);
  g.clear();
}

function drawPulse(g: Phaser.GameObjects.Graphics) {
  // static coil: dark base, cyan rings, spark
  g.fillStyle(0x33323a, 1);
  g.fillRoundedRect(4, 4, 40, 40, 6);
  g.lineStyle(3, 0x53d8e6, 1);
  g.strokeCircle(24, 24, 15);
  g.lineStyle(2, 0x8ee8f2, 1);
  g.strokeCircle(24, 24, 10);
  g.fillStyle(0x2c3a40, 1);
  g.fillCircle(24, 24, 8);
  g.fillStyle(0x9ff2fb, 1);
  g.fillCircle(24, 24, 4);
  g.lineStyle(2, 0x9ff2fb, 0.9);
  g.lineBetween(24, 24, 31, 15);
  g.lineBetween(24, 24, 17, 15);
  g.generateTexture('tower_pulse', 48, 48);
  g.clear();
}

function body(g: Phaser.GameObjects.Graphics, size: number, fill: number, stroke: number) {
  g.fillStyle(fill, 1);
  g.fillRoundedRect(2, 2, size - 4, size - 4, 6);
  g.lineStyle(2, stroke, 1);
  g.strokeRoundedRect(2, 2, size - 4, size - 4, 6);
}

function drawDrone(g: Phaser.GameObjects.Graphics) {
  body(g, 28, 0x1f7a70, 0x143f3a);
  g.fillStyle(0x143f3a, 1);
  for (let i = 0; i < 3; i++) g.fillRect(6 + i * 6, 20, 4, 5);
  g.fillStyle(0xffb03a, 1);
  g.fillCircle(14, 12, 4);
  g.lineStyle(2, 0x143f3a, 1);
  g.lineBetween(2, 8, 10, 2);
  g.generateTexture('enemy_drone', 28, 28);
  g.clear();
}

function drawRunner(g: Phaser.GameObjects.Graphics) {
  body(g, 26, 0x5b8f3c, 0x2f4a22);
  g.fillStyle(0x2f4a22, 1);
  g.fillTriangle(6, 20, 20, 20, 13, 6);
  g.fillStyle(0xf2e46a, 1);
  g.fillCircle(13, 13, 3.5);
  g.generateTexture('enemy_runner', 26, 26);
  g.clear();
}

function drawDuster(g: Phaser.GameObjects.Graphics) {
  body(g, 32, 0xb47a35, 0x5f401c);
  g.fillStyle(0x5f401c, 1);
  g.fillRoundedRect(6, 18, 20, 8, 3);
  g.fillStyle(0xffe1b0, 1);
  g.fillCircle(16, 12, 4);
  g.generateTexture('enemy_duster', 32, 32);
  g.clear();
}

function drawHauler(g: Phaser.GameObjects.Graphics) {
  body(g, 38, 0x6f7f92, 0x33414f);
  g.fillStyle(0x33414f, 1);
  g.fillRoundedRect(5, 24, 28, 8, 2);
  g.fillStyle(0xa9bfd2, 1);
  g.fillRoundedRect(9, 8, 20, 10, 2);
  g.lineStyle(2, 0x33414f, 0.8);
  for (let i = 0; i < 4; i++) g.lineBetween(6 + i * 7, 24, 6 + i * 7, 32);
  g.generateTexture('enemy_hauler', 38, 38);
  g.clear();
}

function drawNullifier(g: Phaser.GameObjects.Graphics) {
  body(g, 30, 0x9a4146, 0x4c2226);
  g.lineStyle(2, 0xf0727a, 1);
  g.strokeCircle(15, 15, 9);
  g.fillStyle(0xf0727a, 1);
  g.fillCircle(15, 15, 4);
  g.generateTexture('enemy_nullifier', 30, 30);
  g.clear();
}

function drawBoss(g: Phaser.GameObjects.Graphics) {
  body(g, 64, 0x7c3a3f, 0x2c1a1e);
  g.lineStyle(3, 0xf0727a, 1);
  g.strokeCircle(32, 32, 20);
  g.fillStyle(0x2c1a1e, 1);
  g.fillRoundedRect(10, 40, 44, 10, 3);
  g.fillStyle(0xffb03a, 1);
  g.fillCircle(24, 26, 5);
  g.fillCircle(40, 26, 5);
  for (let i = 0; i < 4; i++) {
    g.lineStyle(3, 0x2c1a1e, 1);
    g.lineBetween(32, 32, 32 + Math.cos(i * 1.6) * 24, 32 + Math.sin(i * 1.6) * 24);
  }
  g.generateTexture('enemy_boss', 64, 64);
  g.clear();
}
