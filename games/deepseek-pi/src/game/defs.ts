import * as Phaser from 'phaser';
import { PALETTE } from './art';

export type TowerKind = 'sunspear' | 'arc';
export type EnemyKind = 'crawler' | 'skimmer' | 'brute' | 'wasp' | 'boss';
export type Mode = 'menu' | 'playing' | 'won' | 'lost';
export type Phase = 'build' | 'wave';

export interface TowerDef {
  name: string;
  role: string;
  cost: number;
  range: number[];
  damage: number[];
  rate: number[];
  chain: number[];
  chainRange: number;
  color: number;
  light: number;
  blurb: string;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  sunspear: {
    name: 'SUNSPEAR',
    role: 'FOCUSED BEAM',
    cost: 70,
    range: [212, 230, 250],
    damage: [27, 42, 64],
    rate: [0.94, 0.84, 0.72],
    chain: [1, 1, 1],
    chainRange: 0,
    color: PALETTE.orangeDeep,
    light: 0xffe0a3,
    blurb: 'One hard beam. Punches through armor.',
  },
  arc: {
    name: 'ARC PYLON',
    role: 'CHAIN LIGHTNING',
    cost: 90,
    range: [152, 166, 182],
    damage: [13, 19, 28],
    rate: [0.74, 0.66, 0.57],
    chain: [3, 4, 5],
    chainRange: 112,
    color: PALETTE.teal,
    light: 0xa9fff0,
    blurb: 'Jumps between raiders. Great versus swarms.',
  },
};

export interface EnemyDef {
  label: string;
  hp: number;
  speed: number;
  reward: number;
  damage: number;
  armor: number;
  radius: number;
  color: number;
  accent: number;
  barWidth: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  crawler: {
    label: 'Dust Crawler', hp: 48, speed: 55, reward: 7, damage: 4, armor: 0,
    radius: 13, color: 0x9e4a2c, accent: 0xf2b46b, barWidth: 28,
  },
  skimmer: {
    label: 'Sand Skimmer', hp: 31, speed: 98, reward: 8, damage: 3, armor: 0,
    radius: 11, color: 0x2d8d88, accent: 0xa8f5e6, barWidth: 26,
  },
  brute: {
    label: 'Scrap Brute', hp: 185, speed: 34, reward: 20, damage: 9, armor: 3,
    radius: 21, color: 0x6c4835, accent: 0xd9a25f, barWidth: 40,
  },
  wasp: {
    label: 'Glass Wasp', hp: 43, speed: 84, reward: 9, damage: 4, armor: 0,
    radius: 11, color: 0xcf9a28, accent: 0xffe28d, barWidth: 26,
  },
  boss: {
    label: 'Dust Colossus', hp: 1900, speed: 27, reward: 220, damage: 35, armor: 5,
    radius: 36, color: 0x5c3e33, accent: 0xff8b4a, barWidth: 92,
  },
};

export interface SpawnGroup {
  kind: EnemyKind;
  count: number;
  interval: number;
  delay: number;
}

export interface WaveDef {
  groups: SpawnGroup[];
  bonus: number;
  label: string;
}

export const WAVES: WaveDef[] = [
  {
    label: 'PROBE SWEEP',
    bonus: 70,
    groups: [{ kind: 'crawler', count: 8, interval: 0.82, delay: 0.4 }],
  },
  {
    label: 'SKIMMER RUN',
    bonus: 80,
    groups: [
      { kind: 'crawler', count: 10, interval: 0.68, delay: 0.2 },
      { kind: 'skimmer', count: 5, interval: 1.05, delay: 4.2 },
    ],
  },
  {
    label: 'ARMORED COLUMN',
    bonus: 90,
    groups: [
      { kind: 'skimmer', count: 8, interval: 0.62, delay: 0.2 },
      { kind: 'brute', count: 4, interval: 2.1, delay: 3.2 },
    ],
  },
  {
    label: 'MIXED RAID',
    bonus: 100,
    groups: [
      { kind: 'crawler', count: 12, interval: 0.52, delay: 0.2 },
      { kind: 'wasp', count: 6, interval: 1.1, delay: 4.4 },
      { kind: 'brute', count: 3, interval: 2.5, delay: 8.4 },
    ],
  },
  {
    label: 'THE LONG DUST',
    bonus: 110,
    groups: [
      { kind: 'wasp', count: 8, interval: 0.78, delay: 0.2 },
      { kind: 'brute', count: 6, interval: 1.75, delay: 3.1 },
      { kind: 'skimmer', count: 8, interval: 0.55, delay: 8.2 },
    ],
  },
  {
    label: 'COLOSSUS',
    bonus: 120,
    groups: [
      { kind: 'boss', count: 1, interval: 0, delay: 1.6 },
      { kind: 'crawler', count: 6, interval: 0.85, delay: 5.2 },
      { kind: 'brute', count: 4, interval: 2.3, delay: 8.2 },
      { kind: 'skimmer', count: 6, interval: 0.65, delay: 13.4 },
    ],
  },
];

export interface PadSpec {
  x: number;
  y: number;
}

export const PAD_SPECS: PadSpec[] = [
  { x: 150, y: 425 },
  { x: 330, y: 430 },
  { x: 335, y: 220 },
  { x: 470, y: 455 },
  { x: 640, y: 410 },
  { x: 720, y: 590 },
  { x: 905, y: 390 },
  { x: 1015, y: 225 },
  { x: 1160, y: 365 },
];

export const PATH_POINTS: [number, number][] = [
  [-50, 520],
  [130, 520],
  [230, 445],
  [245, 330],
  [370, 295],
  [500, 345],
  [550, 470],
  [680, 525],
  [800, 455],
  [815, 330],
  [930, 275],
  [1040, 330],
  [1075, 455],
  [1145, 500],
];

export const RELAY = { x: 1200, y: 505 };
export const START_SCRAP = 175;
export const START_INTEGRITY = 100;

export const UI = {
  topH: 68,
  bottomY: 624,
  pause: { x: 1028, y: 12, w: 52, h: 44 },
  speed: { x: 1088, y: 12, w: 52, h: 44 },
  mute: { x: 1148, y: 12, w: 52, h: 44 },
  restart: { x: 1208, y: 12, w: 48, h: 44 },
  card1: { x: 18, y: 632, w: 190, h: 76 },
  card2: { x: 218, y: 632, w: 190, h: 76 },
  inspect: { x: 426, y: 630, w: 606, h: 80 },
  upgrade: { x: 878, y: 644, w: 142, h: 52 },
  launch: { x: 1046, y: 630, w: 216, h: 80 },
  start: { x: 110, y: 500, w: 292, h: 64 },
  resume: { x: 535, y: 358, w: 210, h: 52 },
  restartPause: { x: 535, y: 422, w: 210, h: 52 },
  restartEnd: { x: 535, y: 438, w: 210, h: 54 },
};

export interface Rect { x: number; y: number; w: number; h: number }

export function inRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function upgradeCost(kind: TowerKind, level: number): number | null {
  if (level >= 3) return null;
  const base = TOWERS[kind].cost;
  return level === 1 ? Math.round(base * 1.15) : Math.round(base * 1.85);
}

export function vec(x: number, y: number): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(x, y);
}
