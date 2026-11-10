// Shared balance data and path for Relay Defense.

export const W = 1024;
export const H = 768;
export const HUD_H = 46;

// Path waypoints (waypoint 0 starts off-screen left, last is the relay).
export const PATH: { x: number; y: number }[] = [
  { x: -40, y: 520 },
  { x: 150, y: 520 },
  { x: 250, y: 415 },
  { x: 380, y: 415 },
  { x: 455, y: 560 },
  { x: 625, y: 560 },
  { x: 705, y: 430 },
  { x: 830, y: 430 },
  { x: 880, y: 310 },
  { x: 935, y: 245 },
];

export const CORE = { x: 935, y: 245, r: 46 };

export type TowerKind = 'pulse' | 'lance';

export interface TowerDef {
  kind: TowerKind;
  name: string;
  cost: number;
  range: number;
  rate: number; // shots per second
  damage: number;
  hitsAir: boolean;
  color: number;
  key: string;
  blurb: string;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  pulse: {
    kind: 'pulse', name: 'Pulse Tower', cost: 40, range: 165, rate: 2.6, damage: 9,
    hitsAir: true, color: 0x5fd0ff, key: '1',
    blurb: 'Rapid anti-swarm. Hits ground + air.',
  },
  lance: {
    kind: 'lance', name: 'Solar Lance', cost: 75, range: 250, rate: 0.55, damage: 46,
    hitsAir: false, color: 0xffc84d, key: '2',
    blurb: 'Heavy beam. High damage, ground only.',
  },
};

export const MAX_TOWER_LEVEL = 3;

export type EnemyKind = 'runner' | 'crawler' | 'glider' | 'boss';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  speed: number;
  bounty: number;
  r: number;
  color: number;
  air: boolean;
  damage: number; // damage to relay if it reaches the core
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  runner: { kind: 'runner', hp: 26, speed: 95, bounty: 8, r: 11, color: 0xff6a5e, air: false, damage: 1 },
  crawler: { kind: 'crawler', hp: 95, speed: 52, bounty: 15, r: 17, color: 0xd08cff, air: false, damage: 2 },
  glider: { kind: 'glider', hp: 48, speed: 78, bounty: 12, r: 12, color: 0x7ef2c3, air: true, damage: 1 },
  boss: { kind: 'boss', hp: 1500, speed: 30, bounty: 250, r: 34, color: 0xff3d3d, air: false, damage: 8 },
};

export interface WaveGroup { kind: EnemyKind; count: number; gap: number; delay: number }
export interface WaveDef { groups: WaveGroup[]; label: string }

export const WAVES: WaveDef[] = [
  { label: 'Scout runners', groups: [{ kind: 'runner', count: 8, gap: 0.9, delay: 0 }] },
  { label: 'Runner surge', groups: [{ kind: 'runner', count: 12, gap: 0.7, delay: 0 }] },
  { label: 'Crawlers arrive', groups: [
    { kind: 'runner', count: 6, gap: 0.8, delay: 0 },
    { kind: 'crawler', count: 4, gap: 1.6, delay: 5 },
  ] },
  { label: 'Glider wing', groups: [
    { kind: 'glider', count: 6, gap: 1.1, delay: 0 },
    { kind: 'runner', count: 8, gap: 0.7, delay: 4 },
  ] },
  { label: 'Sandstorm mix', groups: [
    { kind: 'crawler', count: 5, gap: 1.5, delay: 0 },
    { kind: 'glider', count: 5, gap: 1.0, delay: 3 },
    { kind: 'runner', count: 8, gap: 0.6, delay: 6 },
  ] },
  { label: 'The Sand Titan', groups: [
    { kind: 'runner', count: 6, gap: 0.8, delay: 0 },
    { kind: 'boss', count: 1, gap: 0, delay: 6 },
    { kind: 'glider', count: 6, gap: 1.2, delay: 10 },
  ] },
];

export const START_ENERGY = 95;
export const START_LIVES = 20;
export const WAVE_BONUS = (wave: number) => 25 + wave * 10;
