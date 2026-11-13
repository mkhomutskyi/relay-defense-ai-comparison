// Relay Defense — tunable game balance data (pure, no Phaser dependency).

export const VIEW_W = 1024;
export const VIEW_H = 640;
export const HUD_H = 64;            // top bar height (map starts below this)
export const CELL = 64;

// Map grid: cols x rows of CELL that sit inside the playfield (below HUD).
export const GRID_COLS = 16;        // 16*64 = 1024
export const GRID_ROWS = 9;         // 9*64 = 576; playfield from y=HUD_H
export const PLAY_TOP = HUD_H;      // 64
export const PLAY_H = 576;          // 64..640

// Money / base
export const START_MONEY = 220;
export const START_LIVES = 20;

// Tower definitions -------------------------------------------------------
export type TowerKind = 'pulse' | 'arc';

export interface TowerLevel {
    range: number;      // px
    damage: number;
    cooldown: number;   // seconds between shots
    upgradeCost: number;// cost to reach THIS level (level 0 = build cost)
    splash?: number;    // arc chain jumps
}

export interface TowerDef {
    kind: TowerKind;
    name: string;
    role: string;       // one-line role description for HUD
    buildCost: number;
    color: number;
    levels: TowerLevel[];
    // pulse = hits single target with a projectile; arc = instant chain lightning
    mode: 'projectile' | 'chain';
    chainRange?: number;
    slow?: number;      // 0..1 speed multiplier applied for slowTime
    slowTime?: number;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
    pulse: {
        kind: 'pulse',
        name: 'Pulse Cannon',
        role: 'Single-target laser. Fast, high damage.',
        buildCost: 70,
        color: 0xff5a3c,
        mode: 'projectile',
        levels: [
            { range: 150, damage: 22, cooldown: 0.55, upgradeCost: 70 },
            { range: 165, damage: 38, cooldown: 0.48, upgradeCost: 60 },
            { range: 185, damage: 64, cooldown: 0.40, upgradeCost: 95 },
        ],
    },
    arc: {
        kind: 'arc',
        name: 'Arc Coil',
        role: 'Chain lightning. Slows and hits many foes.',
        buildCost: 95,
        color: 0x38d6ff,
        mode: 'chain',
        chainRange: 90,
        slow: 0.55,
        slowTime: 1.2,
        levels: [
            { range: 120, damage: 12, cooldown: 0.9, upgradeCost: 95, splash: 2 },
            { range: 130, damage: 18, cooldown: 0.8, upgradeCost: 80, splash: 3 },
            { range: 145, damage: 28, cooldown: 0.7, upgradeCost: 120, splash: 4 },
        ],
    },
};

// Enemy definitions ------------------------------------------------------
export type EnemyKind = 'drifter' | 'hauler' | 'runner' | 'boss';

export interface EnemyDef {
    kind: EnemyKind;
    name: string;
    hp: number;
    speed: number;   // px/sec
    bounty: number;
    damage: number;  // lives lost if it reaches relay
    radius: number;
    color: number;
    armor: number;   // flat damage reduction per hit
    boss?: boolean;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
    drifter: { kind: 'drifter', name: 'Drifter', hp: 60, speed: 46, bounty: 12, damage: 1, radius: 15, color: 0x9b6cff, armor: 0 },
    runner:  { kind: 'runner',  name: 'Runner',  hp: 38, speed: 88, bounty: 10, damage: 1, radius: 12, color: 0x4ade80, armor: 0 },
    hauler:  { kind: 'hauler',  name: 'Hauler',  hp: 185, speed: 30, bounty: 26, damage: 2, radius: 20, color: 0xf59e0b, armor: 6 },
    boss:    { kind: 'boss',    name: 'Storm Colossus', hp: 2600, speed: 24, bounty: 220, damage: 10, radius: 42, color: 0xff2a4a, armor: 10, boss: true },
};

// Waves: list of {kind, count, gap(seconds), startAt(seconds offset)}
export interface SpawnSpec { kind: EnemyKind; count: number; gap: number; startAt: number; }
export interface WaveDef { label: string; spawns: SpawnSpec[]; reward: number; }

export const WAVES: WaveDef[] = [
    { label: 'Wave 1', reward: 40, spawns: [
        { kind: 'drifter', count: 6, gap: 1.1, startAt: 0 },
    ]},
    { label: 'Wave 2', reward: 45, spawns: [
        { kind: 'drifter', count: 6, gap: 0.9, startAt: 0 },
        { kind: 'runner',  count: 4, gap: 0.7, startAt: 3 },
    ]},
    { label: 'Wave 3', reward: 50, spawns: [
        { kind: 'runner',  count: 8, gap: 0.6, startAt: 0 },
        { kind: 'hauler',  count: 2, gap: 2.0, startAt: 2 },
    ]},
    { label: 'Wave 4', reward: 60, spawns: [
        { kind: 'drifter', count: 10, gap: 0.7, startAt: 0 },
        { kind: 'hauler',  count: 4, gap: 1.6, startAt: 3 },
        { kind: 'runner',  count: 6, gap: 0.5, startAt: 8 },
    ]},
    { label: 'Wave 5', reward: 75, spawns: [
        { kind: 'hauler',  count: 8, gap: 1.1, startAt: 0 },
        { kind: 'runner',  count: 12, gap: 0.4, startAt: 1 },
        { kind: 'drifter', count: 8, gap: 0.6, startAt: 6 },
    ]},
    { label: 'Wave 6 — BOSS', reward: 120, spawns: [
        { kind: 'runner',  count: 10, gap: 0.5, startAt: 0 },
        { kind: 'hauler',  count: 6, gap: 1.2, startAt: 3 },
        { kind: 'boss',    count: 1, gap: 0, startAt: 6 },
        { kind: 'drifter', count: 10, gap: 0.6, startAt: 10 },
    ]},
];

// Path waypoints in playfield pixel coords (grid-aligned).
export const PATH: { x: number; y: number }[] = [
    { x: -24, y: PLAY_TOP + 96 },
    { x: 160, y: PLAY_TOP + 96 },
    { x: 160, y: PLAY_TOP + 288 },
    { x: 416, y: PLAY_TOP + 288 },
    { x: 416, y: PLAY_TOP + 96 },
    { x: 672, y: PLAY_TOP + 96 },
    { x: 672, y: PLAY_TOP + 448 },
    { x: 896, y: PLAY_TOP + 448 },
    { x: 896, y: PLAY_TOP + 224 },
    { x: 1044, y: PLAY_TOP + 224 },
];

// Buildable grid cells: which cells are blocked (on the path) — computed in scene.
