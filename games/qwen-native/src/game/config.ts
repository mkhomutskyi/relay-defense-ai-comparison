// Relay Defense - game data: layout, path, towers, enemies, waves.

export const W = 1024;
export const H = 768;

export const TILE = 32;
export const COLS = 32;
export const ROWS = 19;

export const HUD_H = 80;
export const MAP_Y = HUD_H;              // map top
export const MAP_H = ROWS * TILE;        // 608
export const BAR_Y = MAP_Y + MAP_H;      // bottom build bar top (688)

export const PATH: [number, number][] = [
  [0, 4], [12, 4], [12, 12], [5, 12], [5, 17], [22, 17], [22, 11], [27, 11], [27, 6], [29, 6],
];

export const HUB_CELL = [29, 6];

export type TowerDef = {
  id: 'mirror' | 'driver';
  name: string;
  role: string;
  cost: number;
  color: number;
  accent: number;
  levels: {
    damage: number;
    cd: number;          // seconds between shots
    range: number;
    splash: number;      // 0 = single target
    upCost: number;      // cost to reach next level
  }[];
};

export const TOWERS: Record<'mirror' | 'driver', TowerDef> = {
  mirror: {
    id: 'mirror',
    name: 'Mirror Array',
    role: 'fast single-target beam',
    cost: 55,
    color: 0x2f3d57,
    accent: 0x53e3d8,
    levels: [
      { damage: 5, cd: 0.34, range: 104, splash: 0, upCost: 40 },
      { damage: 8, cd: 0.30, range: 118, splash: 0, upCost: 70 },
      { damage: 12, cd: 0.26, range: 132, splash: 0, upCost: 0 },
    ],
  },
  driver: {
    id: 'driver',
    name: 'Mass Driver',
    role: 'slow heavy splash',
    cost: 110,
    color: 0x463a34,
    accent: 0xff8f4d,
    levels: [
      { damage: 16, cd: 1.15, range: 152, splash: 44, upCost: 80 },
      { damage: 26, cd: 1.00, range: 166, splash: 52, upCost: 130 },
      { damage: 40, cd: 0.85, range: 180, splash: 62, upCost: 0 },
    ],
  },
};

export type EnemyDef = {
  id: string;
  name: string;
  hp: number;
  armor: number;
  speed: number;      // px/s
  bounty: number;
  leaks: number;      // core damage on arrival
  texture: string;
  size: number;
  boss?: boolean;
  group?: number;     // burst size when spawned
  interval?: number;  // seconds between spawns in a group
};

export const ENEMIES: Record<string, EnemyDef> = {
  scavenger: { id: 'scavenger', name: 'Scavenger', hp: 30, armor: 0, speed: 62, bounty: 8, leaks: 1, texture: 'e_scavenger', size: 22 },
  swarm:     { id: 'swarm', name: 'Swarmling', hp: 18, armor: 0, speed: 80, bounty: 5, leaks: 1, texture: 'e_swarm', size: 16 },
  hauler:    { id: 'hauler', name: 'Armour Hauler', hp: 60, armor: 4, speed: 50, bounty: 14, leaks: 2, texture: 'e_hauler', size: 26 },
  bulky:     { id: 'bulky', name: 'Dust Hulk', hp: 110, armor: 6, speed: 40, bounty: 22, leaks: 4, texture: 'e_bulky', size: 34 },
  boss:      { id: 'boss', name: 'Colossus', hp: 430, armor: 8, speed: 34, bounty: 90, leaks: 20, texture: 'e_boss', size: 54, boss: true },
};

export type WaveGroup = { type: string; count: number; interval: number; gap: number };
export type Wave = { label: string; groups: WaveGroup[]; bonus: number };

export const WAVES: Wave[] = [
  { label: 'Scout Pass', bonus: 25, groups: [{ type: 'scavenger', count: 6, interval: 1.2, gap: 0 }] },
  { label: 'Swarm Drift', bonus: 30, groups: [
    { type: 'swarm', count: 8, interval: 0.5, gap: 0 },
    { type: 'scavenger', count: 3, interval: 1.1, gap: 3 },
  ]},
  { label: 'Armoured Convoy', bonus: 35, groups: [
    { type: 'hauler', count: 5, interval: 1.6, gap: 0 },
    { type: 'scavenger', count: 4, interval: 0.9, gap: 3 },
  ]},
  { label: 'Hulk Assault', bonus: 40, groups: [
    { type: 'bulky', count: 3, interval: 2.2, gap: 0 },
    { type: 'swarm', count: 10, interval: 0.45, gap: 4 },
  ]},
  { label: 'Mixed Raid', bonus: 45, groups: [
    { type: 'hauler', count: 5, interval: 1.4, gap: 0 },
    { type: 'bulky', count: 2, interval: 2.0, gap: 3 },
    { type: 'scavenger', count: 6, interval: 0.8, gap: 2 },
  ]},
  { label: 'The Colossus', bonus: 60, groups: [
    { type: 'swarm', count: 8, interval: 0.6, gap: 0 },
    { type: 'boss', count: 1, interval: 1, gap: 5 },
    { type: 'hauler', count: 3, interval: 1.5, gap: 1 },
  ]},
];

export const START_FUNDS = 140;
export const START_CORE = 15;

// UI hit regions (canvas pixels)
export const BUTTONS: { id: string; x: number; y: number; w: number; h: number; label: string }[] = [
  { id: 'tower_mirror', x: 16, y: BAR_Y + 10, w: 150, h: 56, label: 'Mirror Array' },
  { id: 'tower_driver', x: 172, y: BAR_Y + 10, w: 150, h: 56, label: 'Mass Driver' },
  { id: 'upgrade', x: 328, y: BAR_Y + 10, w: 118, h: 56, label: 'Upgrade' },
  { id: 'sell', x: 452, y: BAR_Y + 10, w: 84, h: 56, label: 'Sell' },
  { id: 'startwave', x: 542, y: BAR_Y + 10, w: 170, h: 56, label: 'Start Wave' },
  { id: 'speed', x: 718, y: BAR_Y + 10, w: 92, h: 56, label: 'Speed' },
  { id: 'pause', x: 816, y: BAR_Y + 10, w: 92, h: 56, label: 'Pause' },
  { id: 'mute', x: 914, y: BAR_Y + 10, w: 94, h: 56, label: 'Mute' },
];

export const COLORS = {
  sand: 0xf0dcb4,
  sandDeep: 0xe2c99c,
  road: 0xcfa876,
  roadLine: 0xf6e8cf,
  pad: 0xbcd3cf,
  ink: 0x24313f,
  panel: 0x1f2a35,
  panelLight: 0x31404e,
  text: 0xf3f6f8,
  dim: 0x9fb0bd,
  mirror: 0x53e3d8,
  driver: 0xff8f4d,
  danger: 0xff5d5d,
  gold: 0xffc857,
};
