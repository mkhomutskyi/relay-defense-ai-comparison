/**
 * Relay Defense - shared tuning constants.
 * Canvas is a fixed 1280x720 logical space; Phaser scales it to fit the window.
 */

export const GAME_W = 1280;
export const GAME_H = 720;

export const HUD_H = 58;
export const FOOT_H = 46;
export const MAP_TOP = HUD_H;
export const MAP_BOTTOM = GAME_H - FOOT_H;
export const MAP_H = MAP_BOTTOM - MAP_TOP;

export interface Vec2 { x: number; y: number }

/** Serpentine supply road, in canvas pixel coordinates. */
export const PATH: Vec2[] = [
    { x: -40, y: 330 },
    { x: 210, y: 330 },
    { x: 210, y: 140 },
    { x: 520, y: 140 },
    { x: 520, y: 545 },
    { x: 840, y: 545 },
    { x: 840, y: 265 },
    { x: 1060, y: 265 },
    { x: 1060, y: 470 },
    { x: 1150, y: 470 }
];

export const CORE_POS: Vec2 = { x: 1208, y: 470 };
export const PATH_WIDTH = 46;
export const SPAWN_POS: Vec2 = { x: -30, y: 330 };

/** Palette - bright desert solar outpost. */
export const C = {
    sand: 0xe8ca90,
    sandLight: 0xf3dcae,
    sandDark: 0xd6b077,
    sandShadow: 0xc39a63,
    pathEdge: 0xf7e8c2,
    path: 0xcb9a5c,
    pathDark: 0xb07f47,
    rock: 0xa8845c,
    rockDark: 0x8a6a48,
    cactus: 0x5f9a63,
    cactusDark: 0x437a4c,
    panel: 0x2f4a6b,
    panelLight: 0x4f7cb0,
    hud: 0x161c26,
    hudPanel: 0x222c3a,
    hudLine: 0x33404f,
    amber: 0xffc247,
    amberDeep: 0xe08a1f,
    cyan: 0x5ce1d6,
    cyanDeep: 0x1c8f92,
    violet: 0xa97bff,
    danger: 0xff6a52,
    good: 0x7ddc6a,
    ink: 0x101722
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_BOLD = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/* ------------------------------------------------------------------ towers */

export type TowerKind = 'prism' | 'coil';

export interface TowerLevel {
    cost: number;
    damage: number;
    range: number;
    fireRate: number;   // shots per second
    chains: number;     // arc coil only
}

export interface TowerDef {
    kind: TowerKind;
    name: string;
    role: string;
    tint: number;
    levels: TowerLevel[];   // index 0 = level 1
}

export const TOWERS: Record<TowerKind, TowerDef> = {
    prism: {
        kind: 'prism',
        name: 'Prism Beam',
        role: 'Long range - one hard target',
        tint: C.cyan,
        levels: [
            { cost: 100, damage: 26, range: 250, fireRate: 0.8, chains: 1 },
            { cost: 110, damage: 42, range: 275, fireRate: 0.95, chains: 1 },
            { cost: 170, damage: 66, range: 305, fireRate: 1.15, chains: 1 }
        ]
    },
    coil: {
        kind: 'coil',
        name: 'Arc Coil',
        role: 'Short range - chains between foes',
        tint: C.violet,
        levels: [
            { cost: 75, damage: 14, range: 140, fireRate: 1.5, chains: 2 },
            { cost: 80, damage: 21, range: 155, fireRate: 1.8, chains: 3 },
            { cost: 130, damage: 31, range: 175, fireRate: 2.2, chains: 4 }
        ]
    }
};

/* ----------------------------------------------------------------- enemies */

export type EnemyKind = 'scrapper' | 'duster' | 'skimmer' | 'bulwark' | 'boss';

export interface EnemyDef {
    kind: EnemyKind;
    name: string;
    hp: number;
    speed: number;      // px per second
    armor: number;      // flat damage reduction
    reward: number;     // credits on kill
    leak: number;       // core damage when it reaches the relay
    radius: number;
    color: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
    scrapper: { kind: 'scrapper', name: 'Scrapper', hp: 62, speed: 56, armor: 0, reward: 14, leak: 1, radius: 12, color: 0xe2593a },
    duster: { kind: 'duster', name: 'Duster', hp: 30, speed: 104, armor: 0, reward: 8, leak: 1, radius: 9, color: 0xf2c53d },
    skimmer: { kind: 'skimmer', name: 'Skimmer', hp: 50, speed: 126, armor: 1, reward: 13, leak: 1, radius: 11, color: 0x36c3c0 },
    bulwark: { kind: 'bulwark', name: 'Bulwark', hp: 230, speed: 34, armor: 6, reward: 34, leak: 2, radius: 18, color: 0x9a86c9 },
    boss: { kind: 'boss', name: 'Solar Devourer', hp: 2600, speed: 22, armor: 9, reward: 400, leak: 8, radius: 40, color: 0xd4457f }
};

/* ------------------------------------------------------------------- waves */

export interface SpawnGroup { kind: EnemyKind; count: number; gap: number; delay: number }

export interface WaveDef { name: string; brief: string; groups: SpawnGroup[] }

export const WAVES: WaveDef[] = [
    {
        name: 'Scout Screen',
        brief: 'Scrapper scouts probe the road.',
        groups: [{ kind: 'scrapper', count: 8, gap: 1.1, delay: 0 }]
    },
    {
        name: 'Dust Front',
        brief: 'Dust swarms ride with the scouts.',
        groups: [
            { kind: 'scrapper', count: 10, gap: 0.9, delay: 0 },
            { kind: 'duster', count: 6, gap: 0.6, delay: 6 }
        ]
    },
    {
        name: 'Ironfoot',
        brief: 'Bulwark plating shrugs off light fire.',
        groups: [
            { kind: 'duster', count: 8, gap: 0.5, delay: 0 },
            { kind: 'scrapper', count: 8, gap: 0.8, delay: 3 },
            { kind: 'bulwark', count: 2, gap: 4, delay: 10 }
        ]
    },
    {
        name: 'Skimmer Run',
        brief: 'Skimmers are fast and armoured.',
        groups: [
            { kind: 'skimmer', count: 10, gap: 0.7, delay: 0 },
            { kind: 'duster', count: 12, gap: 0.45, delay: 5 },
            { kind: 'bulwark', count: 3, gap: 4, delay: 12 }
        ]
    },
    {
        name: 'Heavy Dust',
        brief: 'A heavy mixed push. Hold the line.',
        groups: [
            { kind: 'skimmer', count: 12, gap: 0.55, delay: 0 },
            { kind: 'bulwark', count: 5, gap: 3.5, delay: 4 },
            { kind: 'scrapper', count: 14, gap: 0.6, delay: 9 }
        ]
    },
    {
        name: 'Solar Devourer',
        brief: 'The boss rolls in. Bring everything.',
        groups: [
            { kind: 'scrapper', count: 12, gap: 0.7, delay: 0 },
            { kind: 'bulwark', count: 4, gap: 3, delay: 8 },
            { kind: 'skimmer', count: 8, gap: 0.6, delay: 14 },
            { kind: 'boss', count: 1, gap: 1, delay: 3 }
        ]
    }
];

export const START_CREDITS = 300;
export const START_CORE_HP = 20;
export const COUNTDOWN = 12;          // seconds before wave 1 auto-starts
export const INTER_WAVE = 10;         // seconds between waves
export const EARLY_BONUS = 25;        // credits for sending a wave early
export const CHAIN_RANGE = 120;       // arc coil chain jump radius
