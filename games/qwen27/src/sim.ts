/**
 * Relay Defense - shared deterministic simulation core.
 *
 * This module is DOM/Phaser/audio-free and must run under plain Node so the
 * browser, render_game_to_text and advanceTime all share one simulation.
 *
 * Packet scope (current increment):
 *  - typed GameState + createGame with authored pads/route
 *  - paid building economy: placeTower / upgradeTower / sellTower (atomic)
 *  - startWave: schedules a deterministic, staggered spawn list for the wave;
 *    pending spawns resolve inside step() on their authored sim-time offsets so
 *    waves are NOT finished merely because no live enemies exist between spawns
 *  - step: moves enemies along the route at speed 1/2; towers acquire targets
 *    and fire with real range/cooldown/damage per their documented role;
 *    dead or escaped enemies are resolved exactly once (one life lost on
 *    escape, one kill reward on death); lives <= 0 -> defeat; last enemy of
 *    wave 12 resolved (killed or escaped) -> victory
 *  - setPaused / setSpeed / serialize / restore
 *
 * Authored campaign content:
 *  - four distinct enemy classes + a final boss (wave 12), each with real
 *    HP/speed/armor/slow/reward differences documented in ENEMY_DATA below;
 *    `maxHp` is truthful maximum HP data for later renderer bars
 *  - staggered per-wave spawn schedules targeting a 10-15 minute normal (1x)
 *    campaign with reasonable defenses
 *
 * Deferred to later packets (documented, not stubbed as passing):
 *  - visible projectile arcs / beam render effects (combat is logical-only)
 */

export type TowerType = 'pulse' | 'cannon' | 'frost' | 'rail';
export type GameMode = 'playing' | 'paused' | 'victory' | 'defeat';

/** Authored enemy classes plus the final boss. */
export type EnemyType = 'drone' | 'runner' | 'tank' | 'shielder' | 'boss';

export interface BuildPad {
  id: string;
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  padId: string;
  lastShotAt?: number;
  x: number;
  y: number;
  /** Paid upgrade tier: 0 (base) -> 1 -> 2 (max). */
  tier: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  /** Truthful maximum HP for this enemy instance (renderer bar denominator). */
  maxHp: number;
  /** Distance travelled along the route, in logical pixels. Internal. */
  dist: number;
  /** Movement speed in logical pixels per second (at game speed 1). Internal. */
  speed: number;
  /** Armor: flat damage reduction applied to non-rail hits. */
  armor: number;
  /** Remaining slow time in ms (sim time). Internal. */
  slowMs: number;
}

/** A scheduled enemy spawn within the active wave (resolves inside step()). */
export interface PendingSpawn {
  type: EnemyType;
  /** Absolute sim time (ms) at which this enemy spawns. */
  spawnAtMs: number;
}

export interface GameState {
  /** Explicit save format version (gate: save_continue requires versioned saves).
   *  Always written by createGame/serialize; restore rejects saves missing it. */
  version?: number;
  /** Save schema version (legacy alias of `version`; kept for roundtrip compatibility). */
  schema: number;
  mode: GameMode;
  seed: number;
  wave: number;
  maxWaves: number;
  lives: number;
  currency: number;
  speed: 1 | 2;
  simulationTimeMs: number;
  buildPads: BuildPad[];
  towers: Tower[];
  enemies: Enemy[];
  /** Authored enemy route, logical 1280x720 coordinates. */
  route: { x: number; y: number }[];
  /** Spawns scheduled for the active wave that have not resolved yet. */
  pendingSpawns: PendingSpawn[];
  /** Sim time (ms) at which the current wave started, or null if no wave is active. */
  waveStartMs: number | null;
  /** Internal id counter so tower ids stay deterministic. */
  towerCounter: number;
  /** Internal id counter so enemy ids stay deterministic. */
  enemyCounter: number;
  /** Per-tower last-shot sim time (ms). Internal; survives serialize/restore. */
  towerCooldowns: Record<string, number>;
  /** Unprocessed sub-tick remainder (sim ms) carried across step() calls onto
   *  the fixed TICK_MS grid. Internal; survives serialize/restore. */
  tickCarryMs: number;
}

export const SCHEMA_VERSION = 1;
export const MAX_TIER = 2;

/** Enemy base speed in logical pixels per second (at game speed 1). */
const ENEMY_BASE_SPEED_PX_PER_S = 90;
export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;
export const SELL_REFUND_RATIO = 0.7;
export const TOWER_TYPES: readonly TowerType[] = ['pulse', 'cannon', 'frost', 'rail'] as const;

export interface TowerSpec {
  name: string;
  /** Base build cost (tier 0). */
  cost: number;
  /** [cost tier 0->1, cost tier 1->2]. */
  upgradeCosts: [number, number];
}

/**
 * Authored enemy classes (authoritative simulation numbers).
 *
 * drone    - basic worker: balanced HP, base speed, no armor.
 * runner   - fast scout: low HP, 1.6x speed, no armor; small reward.
 * tank     - armored bruiser: high HP, 0.75x speed, 3 flat armor (non-rail
 *            damage is reduced by 3 per hit), large reward.
 * shielder - chiller-adjacent: moderate HP, base speed, 1 armor; its slow
 *            resistance means Frost's slow duration on it is halved; medium reward.
 * boss     - final wave 12 only: very high HP, 0.6x speed, 5 flat armor,
 *            Frost slow duration reduced to a third; large reward.
 *
 * Armor rules (documented impact):
 *  - Non-rail towers: damage dealt = max(1, baseDamage - enemy.armor).
 *  - Rail Lance: ignores all armor (full damage always lands).
 * Slow resistance:
 *  - shielder: Frost slow duration is halved on this type.
 *  - boss: Frost slow duration is reduced to one third on this type.
 */
export interface EnemySpec {
  name: string;
  hp: number;
  /** Speed multiplier applied to ENEMY_BASE_SPEED_PX_PER_S. */
  speedMult: number;
  armor: number;
  reward: number;
}

export const ENEMY_DATA: Record<EnemyType, EnemySpec> = {
  drone:    { name: 'Drone',    hp: 20,  speedMult: 1.0,  armor: 0, reward: 8 },
  runner:   { name: 'Runner',   hp: 14,  speedMult: 1.6,  armor: 0, reward: 6 },
  tank:     { name: 'Tank',     hp: 55,  speedMult: 0.75, armor: 3, reward: 18 },
  shielder: { name: 'Shielder', hp: 32,  speedMult: 1.0,  armor: 1, reward: 12 },
  boss:     { name: 'Relay Core', hp: 420, speedMult: 0.6, armor: 5, reward: 150 },
};

export const ENEMY_TYPES: readonly EnemyType[] = ['drone', 'runner', 'tank', 'shielder', 'boss'] as const;

export function isEnemyType(value: unknown): value is EnemyType {
  return typeof value === 'string' && (ENEMY_TYPES as readonly string[]).includes(value);
}


/** Frost slow duration multiplier per enemy type (1 = full, <1 = resistant). */
function frostSlowMult(type: EnemyType): number {
  if (type === 'shielder') return 0.5;
  if (type === 'boss') return 1 / 3;
  return 1;
}


/** Authored per-wave spawn schedule: array of [enemyType, count] entries.
 *  Entries resolve in order with a deterministic stagger gap between each
 *  individual enemy. The campaign targets ~10-15 minutes at normal 1x with
 *  reasonable defenses (route length ~3760px, base speed 90px/s).
 */
interface WaveEntry { type: EnemyType; count: number; }
const WAVE_SCHEDULES: readonly WaveEntry[][] = [
  // Wave 1: intro - all drones
  [{ type: 'drone', count: 5 }],
  // Wave 2: more drones, first runners appear
  [{ type: 'drone', count: 6 }, { type: 'runner', count: 2 }],
  // Wave 3: mixed with a tank introduced
  [{ type: 'drone', count: 5 }, { type: 'runner', count: 3 }, { type: 'tank', count: 1 }],
  // Wave 4: shielders arrive, more tanks
  [{ type: 'drone', count: 6 }, { type: 'shielder', count: 2 }, { type: 'tank', count: 2 }],
  // Wave 5: heavier mix
  [{ type: 'runner', count: 4 }, { type: 'drone', count: 6 }, { type: 'tank', count: 2 }, { type: 'shielder', count: 2 }],
  // Wave 6: mid-game pressure
  [{ type: 'drone', count: 8 }, { type: 'runner', count: 4 }, { type: 'tank', count: 3 }],
  // Wave 7: shielder-heavy wave
  [{ type: 'shielder', count: 5 }, { type: 'drone', count: 6 }, { type: 'tank', count: 2 }],
  // Wave 8: large mixed wave
  [{ type: 'drone', count: 8 }, { type: 'runner', count: 5 }, { type: 'tank', count: 3 }, { type: 'shielder', count: 3 }],
  // Wave 9: tank-heavy assault
  [{ type: 'tank', count: 5 }, { type: 'drone', count: 8 }, { type: 'runner', count: 4 }],
  // Wave 10: everything mixed, high volume
  [{ type: 'drone', count: 10 }, { type: 'runner', count: 6 }, { type: 'tank', count: 4 }, { type: 'shielder', count: 4 }],
  // Wave 11: pre-boss gauntlet
  [{ type: 'tank', count: 6 }, { type: 'shielder', count: 5 }, { type: 'runner', count: 6 }, { type: 'drone', count: 8 }],
  // Wave 12: final boss with escort drones
  [{ type: 'drone', count: 4 }, { type: 'boss', count: 1 }, { type: 'drone', count: 4 }],
];


/** Deterministic stagger gap between individual enemy spawns (sim ms).
 *  Chosen so a wave of ~10-25 enemies spans roughly 8-30 seconds of
 *  spawning, keeping waves distinct and the campaign in the 10-15 min band.
 */
const SPAWN_STAGGER_MS = 1400;

/** Extra gap (sim ms) between different wave entries for visual grouping. */
const ENTRY_GAP_MS = 2600;

/** Local-authored economy data. Displayed UI must use exactly these numbers. */
export const TOWER_DATA: Record<TowerType, TowerSpec> = {
  pulse: { name: 'Pulse Turret', cost: 50, upgradeCosts: [40, 60] },
  cannon: { name: 'Cannon Node', cost: 90, upgradeCosts: [70, 100] },
  frost: { name: 'Frost Relay', cost: 70, upgradeCosts: [55, 85] },
  rail: { name: 'Rail Lance', cost: 120, upgradeCosts: [90, 140] },
};

/**
 * Combat roles (per-tier values are the authoritative simulation numbers).
 *
 * pulse  - fast single-target shot. Reliable damage; no armor penetration.
 * cannon - slow heavy shell with splash: full damage to the primary target,
 *          50% damage to every other enemy within `splashRadius` of it.
 * frost  - chills the primary target for `slowMs`, reducing its movement
 *          speed by `slowFactor`; also deals light direct damage.
 * rail   - long-range lance that ignores all armor (full damage lands) and
 *          hits the first enemy in range along the route (lead target).
 *
 * Armor rules (authoritative):
 *  - Non-rail towers: damage dealt = max(1, baseDamage - enemy.armor).
 *  - Rail Lance: ignores all armor (full damage always lands).
 * Slow resistance:
 *  - shielder: Frost slow duration is halved on this type.
 *  - boss: Frost slow duration is reduced to one third on this type.
 */
export interface TowerCombatSpec {
  /** Attack range in logical pixels per tier [0,1,2]. */
  range: [number, number, number];
  /** Cooldown between shots in ms per tier. */
  cooldownMs: [number, number, number];
  /** Damage dealt to the primary target per tier. */
  damage: [number, number, number];
  /** Cannon only: splash radius (px) and splash damage fraction of primary. */
  splashRadius?: number;
  splashFraction?: number;
  /** Frost only: slow duration (ms) per tier [0,1,2] and speed multiplier while slowed. */
  slowMs?: [number, number, number];
  slowFactor?: number;
}

export const TOWER_COMBAT: Record<TowerType, TowerCombatSpec> = {
  pulse: { range: [130, 150, 175], cooldownMs: [600, 520, 450], damage: [8, 12, 18] },
  cannon: {
    range: [120, 140, 160],
    cooldownMs: [1400, 1300, 1200],
    damage: [18, 28, 42],
    splashRadius: 70,
    splashFraction: 0.5,
  },
  frost: {
    range: [110, 130, 150],
    cooldownMs: [900, 800, 700],
    damage: [4, 6, 9],
    slowMs: [1200, 1500, 1800],
    slowFactor: 0.55,
  },
  rail: { range: [200, 230, 260], cooldownMs: [2200, 2000, 1800], damage: [40, 60, 90] },
};



/** Simple S-shaped route for the 1280x720 logical canvas (enters left, exits bottom). */
const AUTHOR_ROUTE: { x: number; y: number }[] = [
  { x: -40, y: 200 },
  { x: 1080, y: 200 },
  { x: 1080, y: 520 },
  { x: 200, y: 520 },
  { x: 200, y: 760 },
];

/** Build pads authored between the route lanes. */
const AUTHOR_PADS: BuildPad[] = [
  { id: 'pad-1', x: 320, y: 360 },
  { id: 'pad-2', x: 640, y: 360 },
  { id: 'pad-3', x: 960, y: 360 },
  { id: 'pad-4', x: 480, y: 660 },
  { id: 'pad-5', x: 800, y: 660 },
  { id: 'pad-6', x: 240, y: 110 },
  { id: 'pad-7', x: 560, y: 110 },
  { id: 'pad-8', x: 1120, y: 640 },
];

export function isTowerType(value: unknown): value is TowerType {
  return typeof value === 'string' && (TOWER_TYPES as readonly string[]).includes(value);
}


/** Total money paid to build `type` and reach `tier` (0..2). */
export function totalSpentFor(type: TowerType, tier: number): number {
  const spec = TOWER_DATA[type];
  let total = spec.cost;
  for (let i = 0; i < tier && i < spec.upgradeCosts.length; i++) {
    total += spec.upgradeCosts[i];
  }
  return total;
}

/** Cost to upgrade a tower currently at `tier`, or null when already max tier. */
export function upgradeCostFor(type: TowerType, tier: number): number | null {
  if (tier < 0 || tier >= MAX_TIER) return null;
  return TOWER_DATA[type].upgradeCosts[tier];
}

/** Refund for selling a tower at `tier`: 70% of everything paid, floored. */
export function sellRefundFor(type: TowerType, tier: number): number {
  return Math.floor(totalSpentFor(type, tier) * SELL_REFUND_RATIO);
}

/**
 * Create a fresh game. Starting state per contract:
 * mode 'playing', wave 0, maxWaves 12, lives 20, currency 200, speed 1,
 * no towers, no enemies.
 */
export function createGame(seed: number): GameState {
  if (!Number.isInteger(seed)) {
    throw new Error(`createGame: seed must be an integer, got ${String(seed)}`);
  }
  return {
    version: SCHEMA_VERSION,
    schema: SCHEMA_VERSION,
    mode: 'playing',
    seed,
    wave: 0,
    maxWaves: 12,
    lives: 20,
    currency: 200,
    speed: 1,
    simulationTimeMs: 0,
    buildPads: AUTHOR_PADS.map((p) => ({ ...p })),
    towers: [],
    enemies: [],
    route: AUTHOR_ROUTE.map((p) => ({ ...p })),
    pendingSpawns: [],
    waveStartMs: null,
    towerCounter: 1,
    enemyCounter: 1,
    towerCooldowns: {},
    tickCarryMs: 0,
  };
}

function buildPhaseAllowed(state: GameState): boolean {
  // Building is allowed pre-wave and while paused; never after the run ends.
  return state.mode === 'playing' || state.mode === 'paused';
}

/**
 * Place a tower on a valid, unoccupied pad. Atomic: either the full cost is
 * paid and the tower appears, or nothing changes. Never invents money.
 */
export function placeTower(state: GameState, type: TowerType, padId: string): boolean {
  if (!isTowerType(type)) return false;
  if (!buildPhaseAllowed(state)) return false;
  const pad = state.buildPads.find((p) => p.id === padId);
  if (!pad) return false;
  if (state.towers.some((t) => t.padId === padId)) return false;
  const cost = TOWER_DATA[type].cost;
  if (state.currency < cost) return false;

  state.currency -= cost;
  const id = `t${state.towerCounter}`;
  state.towerCounter += 1;
  state.towers.push({ id, type, padId, x: pad.x, y: pad.y, tier: 0 });
  return true;
}

/**
 * Upgrade an existing tower one tier (0->1->2). Atomic and paid.
 * Returns false (no state change) for unknown towers, max tier or lack of funds.
 */
export function upgradeTower(state: GameState, towerId: string): boolean {
  if (!buildPhaseAllowed(state)) return false;
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  const cost = upgradeCostFor(tower.type, tower.tier);
  if (cost === null) return false;
  if (state.currency < cost) return false;

  state.currency -= cost;
  tower.tier += 1;
  return true;
}

/**
 * Sell a tower exactly once, refunding the displayed amount (70% of spend).
 * A second sell of the same id fails and leaves state unchanged.
 */
export function sellTower(state: GameState, towerId: string): boolean {
  if (!buildPhaseAllowed(state)) return false;
  const index = state.towers.findIndex((t) => t.id === towerId);
  if (index === -1) return false;

  const [tower] = state.towers.splice(index, 1);
  state.currency += sellRefundFor(tower.type, tower.tier);
  return true;
}

/**
 * Build the deterministic pending-spawn schedule for a wave.
 * No randomness: the same wave number always produces the same enemy types
 * in the same order with the same spawn offsets, so seeds stay comparable
 * and step order is stable.
 */
function buildWaveSpawns(wave: number): PendingSpawn[] {
  const entries = WAVE_SCHEDULES[wave - 1];
  if (!entries) return [];
  const spawns: PendingSpawn[] = [];
  let offsetMs = 0;
  for (let ei = 0; ei < entries.length; ei++) {
    const { type, count } = entries[ei];
    for (let i = 0; i < count; i++) {
      spawns.push({ type, spawnAtMs: offsetMs });
      offsetMs += SPAWN_STAGGER_MS;
    }
    // Extra gap between different enemy-type groups.
    if (ei < entries.length - 1) offsetMs += ENTRY_GAP_MS;
  }
  return spawns;
}

/** Resolve all pending spawns whose time has arrived. Mutates state.enemies. */
function resolvePendingSpawns(state: GameState): void {
  if (state.pendingSpawns.length === 0 || state.waveStartMs === null) return;
  const now = state.simulationTimeMs - state.waveStartMs;
  const start = state.route[0];
  const remaining: PendingSpawn[] = [];
  for (const spawn of state.pendingSpawns) {
    if (spawn.spawnAtMs <= now) {
      const spec = ENEMY_DATA[spawn.type];
      const hp = spec.hp;
      state.enemies.push({
        id: `e${state.enemyCounter}`,
        type: spawn.type,
        x: start.x,
        y: start.y,
        hp,
        maxHp: hp,
        dist: 0,
        speed: ENEMY_BASE_SPEED_PX_PER_S * spec.speedMult,
        armor: spec.armor,
        slowMs: 0,
      });
      state.enemyCounter += 1;
    } else {
      remaining.push(spawn);
    }
  }
  state.pendingSpawns = remaining;
}


/** True when a wave is active (enemies live or pending spawns remain). */
export function waveActive(state: GameState): boolean {
  return state.enemies.length > 0 || state.pendingSpawns.length > 0;
}


/**
 * Start the next wave. Returns true when a new wave began, false otherwise
 * (wave already running, past maxWaves, or terminal state). A started wave
 * increments `wave` by exactly one and schedules that wave's staggered
 * spawns; no money is invented.
 */
export function startWave(state: GameState): boolean {
  if (state.mode !== 'playing' && state.mode !== 'paused') return false;
  if (state.wave >= state.maxWaves) return false;
  if (waveActive(state)) return false;

  state.wave += 1;
  state.pendingSpawns = buildWaveSpawns(state.wave);
  state.waveStartMs = state.simulationTimeMs;
  return true;
}

/** Precomputed segment lengths and cumulative distances for the route. */
function routeLengths(route: { x: number; y: number }[]): { segLens: number[]; total: number } {
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const dx = route[i].x - route[i - 1].x;
    const dy = route[i].y - route[i - 1].y;
    const len = Math.hypot(dx, dy);
    segLens.push(len);
    total += len;
  }
  return { segLens, total };
}

/** Position on the route at distance `dist` (clamped to the final point). */
function pointAtDistance(route: { x: number; y: number }[], dist: number): { x: number; y: number } {
  let remaining = Math.max(0, dist);
  for (let i = 1; i < route.length; i++) {
    const dx = route[i].x - route[i - 1].x;
    const dy = route[i].y - route[i - 1].y;
    const len = Math.hypot(dx, dy);
    if (remaining <= len || i === route.length - 1) {
      const t = len === 0 ? 0 : Math.min(1, remaining / len);
      return { x: route[i - 1].x + dx * t, y: route[i - 1].y + dy * t };
    }
    remaining -= len;
  }
  const last = route[route.length - 1];
  return { x: last.x, y: last.y };
}

/** Effective movement speed honoring an active slow. */
function effectiveSpeed(enemy: Enemy): number {
  if (enemy.slowMs > 0) {
    // Frost uses a fixed 55% speed multiplier while its slow is active.
    return enemy.speed * (TOWER_COMBAT.frost.slowFactor ?? 1);
  }
  return enemy.speed;
}

/** Apply armor reduction to non-rail damage. Rail ignores all armor. */
function applyArmor(baseDamage: number, armor: number, isRail: boolean): number {
  if (isRail) return baseDamage;
  return Math.max(1, baseDamage - armor);
}


/**
 * Pick the primary target for a tower: the in-range live enemy furthest
 * along the route ("lead" targeting). Deterministic: ties broken by id.
 */
function pickTarget(tower: Tower, enemies: Enemy[], range: number): Enemy | null {
  let best: Enemy | null = null;
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const dx = e.x - tower.x;
    const dy = e.y - tower.y;
    if (dx * dx + dy * dy > range * range) continue;
    if (!best || e.dist > best.dist || (e.dist === best.dist && e.id < best.id)) {
      best = e;
    }
  }
  return best;
}

/** Apply a single tower shot: primary damage, splash, slow. Returns nothing.
 *  Armor is applied per documented rules; rail ignores armor entirely. */
function applyTowerShot(tower: Tower, spec: TowerCombatSpec, tier: number, target: Enemy, enemies: Enemy[]): void {
  const baseDmg = spec.damage[tier];
  const isRail = tower.type === 'rail';
  const dmg = applyArmor(baseDmg, target.armor, isRail);
  target.hp -= dmg;

  if (spec.splashRadius !== undefined && spec.splashFraction !== undefined) {
    // Splash damage also respects each affected enemy's armor.
    for (const e of enemies) {
      if (e === target || e.hp <= 0) continue;
      const dx = e.x - target.x;
      const dy = e.y - target.y;
      if (dx * dx + dy * dy <= spec.splashRadius * spec.splashRadius) {
        const splashDmg = applyArmor(baseDmg * spec.splashFraction, e.armor, isRail);
        e.hp -= splashDmg;
      }
    }
  }

  if (spec.slowMs !== undefined && spec.slowFactor !== undefined) {
    const slowDur = spec.slowMs[tier] * frostSlowMult(target.type);
    target.slowMs = Math.max(target.slowMs, slowDur);
  }
}

/**
 * Fixed internal tick (sim ms) used to partition any requested elapsed time.
 * Documented fixed-step integration: a single call advancing by N ticks is
 * identical to N consecutive calls of one tick each, regardless of how the
 * caller partitions the same total sim time. Chosen so that every authored
 * spawn offset (multiples of 1400/2600 ms) and every tower cooldown
 * (450-2200 ms) is an exact multiple of TICK_MS, keeping spawn resolution,
 * slow decay and cooldown bookkeeping partition-invariant.
 */
const TICK_MS = 10;

/** Advance the simulation by exactly one fixed tick of simMs (sim ms).
 *  Mutates state; caller owns time accounting. Returns false if the game is
 *  in a terminal state (no further ticks should be applied). */
function stepTick(state: GameState, simMs: number): boolean {
  const dtS = simMs / 1000;
  const { total: routeTotal } = routeLengths(state.route);

  // 0. Resolve staggered spawns whose time has arrived this tick.
  resolvePendingSpawns(state);

  if (state.enemies.length === 0 && state.pendingSpawns.length === 0) {
    // No combat possible this tick. In a terminal wave the game is won; in
    // non-terminal playing mode time still elapses, so the caller must keep
    // consuming whole ticks (return true) instead of treating idle time as an
    // unprocessed fractional remainder.
    if (state.wave >= state.maxWaves) {
      state.mode = 'victory';
      return false;
    }
    return true;
  }

  // 1. Movement + slow decay.
  for (const enemy of state.enemies) {
    if (enemy.slowMs > 0) enemy.slowMs = Math.max(0, enemy.slowMs - simMs);
    enemy.dist += effectiveSpeed(enemy) * dtS;
    const p = pointAtDistance(state.route, enemy.dist);
    enemy.x = p.x;
    enemy.y = p.y;
  }

  // Resolve escapes exactly once: remove every enemy that reached the end.
  const escaped = state.enemies.filter((e) => e.dist >= routeTotal);
  if (escaped.length > 0) {
    const escapedIds = new Set(escaped.map((e) => e.id));
    state.enemies = state.enemies.filter((e) => !escapedIds.has(e.id));
    state.lives -= escaped.length;
    if (state.lives <= 0) {
      state.lives = 0;
      state.mode = 'defeat';
      return false;
    }
  }

  // 2. Tower combat: stable order by tower id for determinism.
  const towers = [...state.towers].sort((a, b) => a.id.localeCompare(b.id));
  for (const tower of towers) {
    const spec = TOWER_COMBAT[tower.type];
    const range = spec.range[tower.tier];
    const target = pickTarget(tower, state.enemies, range);
    if (!target) continue;

    // Cooldown bookkeeping lives in state.towerCooldowns so it survives
    // serialize/restore and stays deterministic.
    const now = state.simulationTimeMs;
    const lastShotAt = state.towerCooldowns[tower.id] ?? -Infinity;
    if (now - lastShotAt < spec.cooldownMs[tower.tier]) continue;
    state.towerCooldowns[tower.id] = now;

    applyTowerShot(tower, spec, tower.tier, target, state.enemies);
  }

  // 3. Resolve deaths exactly once and award each kill reward exactly once.
  const alive: Enemy[] = [];
  for (const e of state.enemies) {
    if (e.hp > 0) {
      alive.push(e);
    } else {
      const reward = ENEMY_DATA[e.type]?.reward ?? 0;
      state.currency += reward;
    }
  }
  state.enemies = alive;

  // 4. Terminal victory check: wave fully resolved (no live, no pending).
  if (
    state.enemies.length === 0 &&
    state.pendingSpawns.length === 0 &&
    state.wave >= state.maxWaves
  ) {
    state.mode = 'victory';
    return false;
  }
  return true;
}

/**
 * Advance the shared simulation by elapsedMs (real, unscaled milliseconds).
 * Rejects invalid/negative time. Paused and terminal states never advance.
 *
 * Fixed-step integration: the requested sim time is partitioned into exact
 * TICK_MS ticks (with a carry remainder for fractional partitions), so large
 * elapsed calls and equivalent fine-grained calls advance the simulation to
 * the SAME state. Order within each tick (deterministic):
 *  0. Staggered spawns whose authored offset has arrived resolve.
 *  1. Enemies move along the route at their effective speed (slows decay in
 *     sim ms); an enemy reaching the route end escapes: removed and costs
 *     exactly one life, resolved once.
 *  2. Towers fire in stable id order when their cooldown has elapsed; each
 *     shot applies documented role behavior (damage / splash / slow).
 *  3. Dead enemies are removed exactly once and pay their kill reward once.
 *  4. lives <= 0 -> 'defeat'; final wave fully resolved -> 'victory'.
 */
export function step(state: GameState, elapsedMs: number): void {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
  if (state.mode !== 'playing') return;

  const scaledMs = elapsedMs * state.speed;
  // Fixed-step integration with a persistent sub-tick carry: the requested
  // sim time is folded into the fixed TICK_MS grid via state.tickCarryMs, so
  // any partition of the same total elapsed time advances the simulation to
  // the SAME state. The leftover sub-tick is NEVER integrated as a variable
  // tick; it is carried (persisted on GameState) until enough time has
  // accumulated for another whole tick.
  let remaining = scaledMs + (state.tickCarryMs ?? 0);
  while (remaining >= TICK_MS && stepTick(state, TICK_MS)) {
    state.simulationTimeMs += TICK_MS;
    remaining -= TICK_MS;
  }
  // Stop immediately at terminal: do not process the leftover remainder
  // after victory/defeat and discard any unprocessed sub-tick time.
  state.tickCarryMs = (state.mode === 'playing') ? remaining : 0;
}

export function setPaused(state: GameState, paused: boolean): void {
  if (state.mode === 'victory' || state.mode === 'defeat') return;
  state.mode = paused ? 'paused' : 'playing';
}

export function setSpeed(state: GameState, speed: 1 | 2): void {
  if (speed !== 1 && speed !== 2) return;
  state.speed = speed;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

const MODES: readonly string[] = ['playing', 'paused', 'victory', 'defeat'];

/** Restore a serialized state. Invalid or malformed data throws a useful Error. */
export function restore(serialized: string): GameState {
  let data: unknown;
  try {
    data = JSON.parse(serialized);
  } catch {
    throw new Error('restore: serialized state is not valid JSON');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('restore: expected a game state object');
  }
  const s = data as Record<string, unknown>;

  if (s.version !== SCHEMA_VERSION) {
    throw new Error(`restore: unsupported save version ${String(s.version)}, expected ${SCHEMA_VERSION}`);
  }
  if (s.schema !== SCHEMA_VERSION) {
    throw new Error(`restore: unsupported save schema ${String(s.schema)}, expected ${SCHEMA_VERSION}`);
  }
  if (typeof s.seed !== 'number' || !Number.isFinite(s.seed)) {
    throw new Error('restore: invalid seed');
  }
  if (typeof s.mode !== 'string' || !MODES.includes(s.mode)) {
    throw new Error(`restore: invalid mode ${String(s.mode)}`);
  }
  if (typeof s.currency !== 'number' || !Number.isFinite(s.currency) || s.currency < 0) {
    throw new Error('restore: currency must be a nonnegative finite number');
  }
  if (typeof s.lives !== 'number' || !Number.isFinite(s.lives) || s.lives < 0) {
    throw new Error('restore: lives must be a nonnegative finite number');
  }
  if (s.speed !== 1 && s.speed !== 2) {
    throw new Error('restore: speed must be 1 or 2');
  }
  if (!Number.isInteger(s.wave) || (s.wave as number) < 0) {
    throw new Error('restore: wave must be a nonnegative integer');
  }
  if (!Number.isFinite(s.simulationTimeMs as number) || (s.simulationTimeMs as number) < 0) {
    throw new Error('restore: simulationTimeMs must be a nonnegative finite number');
  }
  if (typeof s.tickCarryMs !== 'number' || !Number.isFinite(s.tickCarryMs as number)
      || (s.tickCarryMs as number) < 0 || (s.tickCarryMs as number) >= TICK_MS) {
    throw new Error('restore: tickCarryMs must be a finite number in [0, ' + TICK_MS + ')');
  }
  if (!Array.isArray(s.buildPads) || !Array.isArray(s.towers) || !Array.isArray(s.enemies)) {
    throw new Error('restore: buildPads/towers/enemies must be arrays');
  }
  if (!Array.isArray(s.pendingSpawns)) {
    throw new Error('restore: pendingSpawns must be an array');
  }
  for (const ps of s.pendingSpawns as Array<Record<string, unknown>>) {
    if (!isEnemyType(ps.type) || typeof ps.spawnAtMs !== 'number' || !Number.isFinite(ps.spawnAtMs)) {
      throw new Error('restore: pendingSpawn entry missing valid type/spawnAtMs');
    }
  }
  if (s.waveStartMs !== null && (typeof s.waveStartMs !== 'number' || !Number.isFinite(s.waveStartMs))) {
    throw new Error('restore: waveStartMs must be null or a finite number');
  }
  if (typeof s.towerCooldowns !== 'object' || s.towerCooldowns === null || Array.isArray(s.towerCooldowns)) {
    throw new Error('restore: towerCooldowns must be an object');
  }
  for (const t of s.towers as Array<Record<string, unknown>>) {
    if (!isTowerType(t.type) || typeof t.id !== 'string' || typeof t.padId !== 'string') {
      throw new Error('restore: tower entry missing valid id/type/padId');
    }
    if (!Number.isInteger(t.tier) || (t.tier as number) < 0 || (t.tier as number) > MAX_TIER) {
      throw new Error('restore: tower tier must be an integer in 0..2');
    }
  }
  for (const e of s.enemies as Array<Record<string, unknown>>) {
    if (!isEnemyType(e.type) || typeof e.id !== 'string') {
      throw new Error('restore: enemy entry missing valid id/type');
    }
    if (typeof e.hp !== 'number' || !Number.isFinite(e.hp) || (e.hp as number) <= 0) {
      throw new Error('restore: enemy hp must be a positive finite number');
    }
    if (typeof e.maxHp !== 'number' || !Number.isFinite(e.maxHp) || (e.maxHp as number) <= 0) {
      throw new Error('restore: enemy maxHp must be a positive finite number');
    }
  }

  return s as unknown as GameState;
}

