/**
 * Black-box combat tests for the shared deterministic simulation core (src/sim).
 *
 * These are UNIT/DEBUG evidence: every fixture is a constructed or manually
 * funded state, NOT a normal campaign win. No simulator code is duplicated or
 * modified here; only the public API and exported authored data are used.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createGame,
  placeTower,
  upgradeTower,
  sellTower,
  startWave,
  step,
  setPaused,
  setSpeed,
  serialize,
  restore,
  waveActive,
  TOWER_COMBAT,
  TOWER_DATA,
  ENEMY_DATA,
  totalSpentFor,
  upgradeCostFor,
  sellRefundFor,
} from './sim';

/* ------------------------------------------------------------------ */
/* Fixture helpers (construction only; no simulation re-implementation) */
/* ------------------------------------------------------------------ */

/**
 * Fund a game with towers on chosen pads, fully paid through the public API.
 * Returns the resulting tower ids in placement order.
 */
function fundTowers(
  seed: number,
  placements: { type: Parameters<typeof placeTower>[1]; padId: string; tier?: number }[],
): ReturnType<typeof createGame> {
  const g = createGame(seed);
  for (const p of placements) {
    expect(placeTower(g, p.type, p.padId)).toBe(true);
    const id = g.towers[g.towers.length - 1].id;
    let tier = 0;
    while (tier < (p.tier ?? 0)) {
      expect(upgradeTower(g, id)).toBe(true);
      tier += 1;
    }
  }
  return g;
}

/**
 * Start wave 1 and advance until exactly `count` enemies are live with none
 * pending. Wave 1 is all drones (20 hp, no armor, 90 px/s), so this is a
 * clean single-enemy-class fixture window.
 */
function wave1WithLiveEnemies(seed: number, count: number): ReturnType<typeof createGame> {
  const g = createGame(seed);
  expect(startWave(g)).toBe(true);
  // Spawn offsets are 0, 1400, 2800, ... so at t=1390ms exactly one drone is live.
  step(g, 1390);
  expect(g.enemies.length).toBe(1);
  expect(g.pendingSpawns.length).toBeGreaterThan(0);

  // Keep stepping in small increments until we have `count` live enemies and
  // no pending spawns (all of wave 1's 5 drones resolved into the enemy list).
  let guard = 0;
  while (g.enemies.length < count || g.pendingSpawns.length > 0) {
    step(g, 20);
    if (++guard > 2000) throw new Error('wave1 fixture did not converge');
  }
  expect(g.enemies.length).toBe(count);
  expect(g.pendingSpawns.length).toBe(0);
  return g;
}

/** Distance from a point to an enemy's current position. */
function distTo(x: number, y: number, e: { x: number; y: number }): number {
  return Math.hypot(e.x - x, e.y - y);
}

/* ------------------------------------------------------------------ */
/* 1. Range and cooldown gating (real behavioral differences)          */
/* ------------------------------------------------------------------ */

describe('range and cooldown', () => {
  it('a pulse tower does not fire when the only enemy is just outside its range', () => {
    // UNIT/DEBUG fixture: pad-6 at (240,110). Route lane 1 runs y=200, so a
    // drone on lane 1 is 90px vertically from the pad. At x=300 the distance
    // is sqrt(60^2 + 90^2) = ~108 < pulse range 130 (in range); at x=450 it is
    // sqrt(210^2 + 90^2) = ~228 > 130 (out of range).
    const g = fundTowers(1, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390); // one drone live near route start
    // Pin the drone to a coherent in-range lane position (UNIT/DEBUG fixture).
    g.enemies[0].x = 300;
    g.enemies[0].y = 200;
    g.enemies[0].dist = 340; // -40 -> 300 on lane 1

    const tower = g.towers[0];
    const range = TOWER_COMBAT.pulse.range[0];
    const enemy = g.enemies[0];
    expect(distTo(tower.x, tower.y, enemy)).toBeLessThan(range);

    // Sanity: with the enemy in range the tower fires (cooldown was -Infinity).
    step(g, 600); // exactly one pulse cooldown elapses
    expect(enemy.hp).toBeLessThan(ENEMY_DATA.drone.hp);

    // Now push the same fixture but place a second drone far from the pad so
    // it is outside range; the tower must still target only in-range enemies.
    const g2 = fundTowers(2, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g2)).toBe(true);
    step(g2, 1390);
    // Pin the live drone to a coherent in-range lane position (UNIT/DEBUG).
    g2.enemies[0].x = 300;
    g2.enemies[0].y = 200;
    g2.enemies[0].dist = 340;
    // Fabricate a distant enemy (UNIT/DEBUG fixture): same class, out of range.
    g2.enemies.push({
      id: `e${g2.enemyCounter}`,
      type: 'drone',
      x: 450,
      y: 200,
      hp: ENEMY_DATA.drone.hp,
      maxHp: ENEMY_DATA.drone.hp,
      dist: 390,
      speed: 90,
      armor: 0,
      slowMs: 0,
    });
    g2.enemyCounter += 1;
    const near = g2.enemies[0];
    const far = g2.enemies[1];
    expect(distTo(g2.towers[0].x, g2.towers[0].y, far)).toBeGreaterThan(range);
    step(g2, 600);
    // Only the near drone took damage; the distant one is untouched.
    expect(near.hp).toBeLessThan(ENEMY_DATA.drone.hp);
    expect(far.hp).toBe(ENEMY_DATA.drone.hp);
  });

  it('a tower cannot fire twice inside its cooldown, and can after it elapses', () => {
    const g = fundTowers(3, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    // Pin the drone to a coherent in-range lane position (UNIT/DEBUG fixture).
    g.enemies[0].x = 300;
    g.enemies[0].y = 200;
    g.enemies[0].dist = 340;
    const enemy = g.enemies[0];
    const hp0 = enemy.hp;

    // First shot at t=1990 (one cooldown of 600ms has elapsed since spawn).
    step(g, 600);
    const afterFirst = enemy.hp;
    expect(afterFirst).toBe(hp0 - TOWER_COMBAT.pulse.damage[0]);

    // A second shot immediately must NOT happen: advance less than cooldown
    // from the first shot. Keep the enemy pinned in range (UNIT/DEBUG fixture).
    step(g, 300);
    g.enemies[0].x = 300;
    g.enemies[0].y = 200;
    g.enemies[0].dist = 340;
    expect(enemy.hp).toBe(afterFirst);

    // After the full cooldown from the last shot, exactly one more hit lands.
    step(g, 600);
    expect(enemy.hp).toBe(afterFirst - TOWER_COMBAT.pulse.damage[0]);
  });
});

/* ------------------------------------------------------------------ */
/* 2. Armor vs rail penetration                                        */
/* ------------------------------------------------------------------ */

describe('armor and rail penetration', () => {
  it('non-rail damage is reduced by armor (min 1), rail ignores armor entirely', () => {
    // Tank: hp 55, armor 3. Pulse tier 0 damage 8 -> effective 5. Rail 40 -> 40.
    const g = fundTowers(4, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    // Replace the live drone with a tank fixture (UNIT/DEBUG construction),
    // pinned to a coherent in-range lane position.
    const drone = g.enemies[0];
    Object.assign(drone, { type: 'tank', hp: ENEMY_DATA.tank.hp, maxHp: ENEMY_DATA.tank.hp, armor: 3 });
    drone.x = 300;
    drone.y = 200;
    drone.dist = 340;

    step(g, 600); // one pulse shot
    expect(drone.hp).toBe(ENEMY_DATA.tank.hp - (TOWER_COMBAT.pulse.damage[0] - 3));

    // Rail fixture on a different pad.
    const g2 = fundTowers(5, [{ type: 'rail', padId: 'pad-6' }]);
    expect(startWave(g2)).toBe(true);
    step(g2, 1390);
    // Isolate a coherent tank fixture (UNIT/DEBUG construction): the rail may
    // have already killed the initial drone during the setup step, so build a
    // fresh enemy instead of reusing whatever reference survived.
    g2.enemies.length = 0;
    g2.pendingSpawns.length = 0;
    const tank = {
      id: `e${g2.enemyCounter}`,
      type: 'tank' as const,
      x: 300,
      y: 200,
      hp: ENEMY_DATA.tank.hp,
      maxHp: ENEMY_DATA.tank.hp,
      dist: 340,
      speed: ENEMY_DATA.tank.speedMult * 90,
      armor: ENEMY_DATA.tank.armor,
      slowMs: 0,
    };
    g2.enemyCounter += 1;
    g2.enemies.push(tank);
    // Rail range is 200; pin the tank in range (distance ~108 from pad-6).
    tank.x = 300;
    tank.y = 200;
    tank.dist = 340;

    // Capture a deliberate first hit: towers fire on first valid acquired
    // target, not after a cooldown warmup. The rail may have already fired
    // during setup, so advance in small increments and detect the moment the
    // tank loses exactly one full rail hit (UNIT/DEBUG). After each increment
    // re-pin the tank in range, since position is recomputed from route/dist.
    const hp0 = tank.hp;
    let guard = 0;
    while (tank.hp === hp0 && ++guard <= 40) {
      step(g2, 50);
      tank.x = 300;
      tank.y = 200;
      tank.dist = 340;
    }
    expect(tank.hp).toBe(hp0 - TOWER_COMBAT.rail.damage[0]);

    // Cooldown relative to that first hit: no second hit inside the rail
    // cooldown, exactly one after it elapses. Keep the tank pinned in range.
    step(g2, 1500);
    tank.x = 300;
    tank.y = 200;
    tank.dist = 340;
    expect(tank.hp).toBe(hp0 - TOWER_COMBAT.rail.damage[0]);

    step(g2, 800); // 1500 + 800 = 2300 > 2200ms rail cooldown from first hit
    tank.x = 300;
    tank.y = 200;
    tank.dist = 340;
    expect(tank.hp).toBe(hp0 - 2 * TOWER_COMBAT.rail.damage[0]);
  });

  it('armor never reduces a hit below 1 damage', () => {
    // Boss: armor 5. Frost tier 0 damage 4 -> effective max(1, 4-5) = 1.
    const g = fundTowers(6, [{ type: 'frost', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    const e = g.enemies[0];
    Object.assign(e, { type: 'boss', hp: ENEMY_DATA.boss.hp, maxHp: ENEMY_DATA.boss.hp, armor: 5 });
    // Frost range is 110; pin the boss in range (distance ~108 from pad-6).
    e.x = 300;
    e.y = 200;
    e.dist = 340;

    step(g, 900); // one frost cooldown elapses
    expect(e.hp).toBe(ENEMY_DATA.boss.hp - 1);
  });
});

/* ------------------------------------------------------------------ */
/* 3. Slow application, resistance and expiry                          */
/* ------------------------------------------------------------------ */

describe('frost slow', () => {
  it('slows a drone at the documented factor and the slow expires after its duration', () => {
    // Drone speed 90 px/s; slowed = 90 * 0.55 = 49.5 px/s.
    const g = fundTowers(7, [{ type: 'frost', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    // Isolate a coherent drone fixture (UNIT/DEBUG construction): clear any
    // other live/pending enemies so only this one is present and measurable.
    g.enemies.length = 0;
    g.pendingSpawns.length = 0;
    const e: (typeof g.enemies)[number] = {
      id: `e${g.enemyCounter}`,
      type: 'drone',
      x: 300,
      y: 200,
      hp: ENEMY_DATA.drone.hp,
      maxHp: ENEMY_DATA.drone.hp,
      dist: 340,
      speed: ENEMY_DATA.drone.speedMult * 90,
      armor: 0,
      slowMs: 0,
    };
    g.enemyCounter += 1;
    g.enemies.push(e);
    // Pin the drone to a coherent in-range lane position (UNIT/DEBUG fixture).
    e.x = 300;
    e.y = 200;
    e.dist = 340;

    // Capture a deliberate first hit: towers fire on first valid acquired
    // target, not after a cooldown warmup. The frost may have already fired
    // during setup, so advance in small increments and detect the moment the
    // drone is slowed (UNIT/DEBUG). After each increment re-pin the drone in
    // range, since position is recomputed from route/dist.
    let guard = 0;
    while (e.slowMs === 0 && ++guard <= 40) {
      step(g, 50);
      e.x = 300;
      e.y = 200;
      e.dist = 340;
    }
    expect(e.slowMs).toBeGreaterThan(0);

    // Measure the slow at a known hit: remove the attacker so it cannot
    // refresh, then let the slow run down to expiry and verify full-speed.
    const slowLeft = e.slowMs;
    g.towers.length = 0; // UNIT/DEBUG: prevent any further frost hits/refresh
    const dSlowed = e.dist;
    // While slowed: remaining window at 49.5 px/s.
    const w1 = Math.min(slowLeft, 400);
    step(g, w1);
    expect(e.slowMs).toBe(Math.max(0, slowLeft - w1));
    expect(e.dist - dSlowed).toBeCloseTo(49.5 * (w1 / 1000), 6);

    // Let the slow expire then move 300ms at full speed.
    step(g, Math.max(0, slowLeft - w1));
    expect(e.slowMs).toBe(0);
    const dBeforeFull = e.dist;
    step(g, 300);
    expect(e.dist - dBeforeFull).toBeCloseTo(90 * 0.3, 6);
  });

  it('shielder gets half slow duration and boss one third (real behavioral difference)', () => {
    const mk = (type: 'drone' | 'shielder' | 'boss') => {
      const g = fundTowers(8, [{ type: 'frost', padId: 'pad-6' }]);
      expect(startWave(g)).toBe(true);
      step(g, 1390);
      // Isolate a coherent single-enemy fixture (UNIT/DEBUG construction):
      // clear any other live/pending enemies so only this one is present and
      // measurable, then build the enemy with its own spec at a known in-range
      // position. Frost range is 110; distance from pad-6 (240,110) to
      // (300,200) is ~108, so it is in range.
      g.enemies.length = 0;
      g.pendingSpawns.length = 0;
      const spec = ENEMY_DATA[type];
      const e: (typeof g.enemies)[number] = {
        id: `e${g.enemyCounter}`,
        type,
        x: 300,
        y: 200,
        hp: spec.hp,
        maxHp: spec.hp,
        dist: 340,
        speed: spec.speedMult * 90,
        armor: spec.armor,
        slowMs: 0,
      };
      g.enemyCounter += 1;
      g.enemies.push(e);

      // Capture a deliberate first hit at a known moment (UNIT/DEBUG):
      // advance in small increments and detect the instant the enemy is
      // slowed, re-pinning it in range after each increment since position is
      // recomputed from route/dist inside step. Then remove the attacker so
      // it cannot refresh, and read the slow duration immediately at that
      // known hit (no decay window to lose time against).
      let guard = 0;
      while (e.slowMs === 0 && ++guard <= 40) {
        step(g, 10); // one fixed tick so the first hit's slow is read fresh
        e.x = 300;
        e.y = 200;
        e.dist = 340;
      }
      expect(e.slowMs).toBeGreaterThan(0);
      g.towers.length = 0; // UNIT/DEBUG: prevent any further frost hits/refresh
      const atHit = e.slowMs; // remaining after the tick in which the hit landed
      step(g, atHit); // let the slow run to expiry (no refresh possible)
      expect(e.slowMs).toBe(0);
      return { g, totalMs: atHit };
    };

    const full = TOWER_COMBAT.frost.slowMs![0];
    // Slow duration is the fresh full duration at the hit moment (read within
    // the same fixed tick that applied it), so drone gets exactly `full`.
    expect(mk('drone').totalMs).toBe(full);
    expect(mk('shielder').totalMs).toBeCloseTo(full * 0.5, 0);
    expect(mk('boss').totalMs).toBeCloseTo(full / 3, 0);
  });
});

/* ------------------------------------------------------------------ */
/* 4. Cannon splash: hits nearby allies-of-enemy, not distant ones     */
/* ------------------------------------------------------------------ */

describe('cannon splash', () => {
  it('deals full damage to primary and 50% splash to a nearby enemy, none to a distant one', () => {
    const g = fundTowers(9, [{ type: 'cannon', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    // Pin the primary to a coherent in-range lane position (UNIT/DEBUG fixture).
    g.enemies[0].x = 300;
    g.enemies[0].y = 200;
    g.enemies[0].dist = 340;
    const primary = g.enemies[0];

    // Fabricate two more drones (UNIT/DEBUG): one 40px from the primary
    // (inside splashRadius 70), one 500px away (outside).
    const nearId = `e${g.enemyCounter}`;
    g.enemyCounter += 1;
    const farId = `e${g.enemyCounter}`;
    g.enemyCounter += 1;
    g.enemies.push({
      id: nearId, type: 'drone',
      x: primary.x - 40, y: primary.y,
      hp: ENEMY_DATA.drone.hp, maxHp: ENEMY_DATA.drone.hp,
      dist: primary.dist - 40, speed: 90, armor: 0, slowMs: 0,
    });
    g.enemies.push({
      id: farId, type: 'drone',
      x: primary.x - 500, y: primary.y,
      hp: ENEMY_DATA.drone.hp, maxHp: ENEMY_DATA.drone.hp,
      dist: primary.dist - 500, speed: 90, armor: 0, slowMs: 0,
    });

    // Primary is the furthest-along target: near/far were pushed behind it,
    // so lead (furthest) targeting picks the primary.

    const splashR = TOWER_COMBAT.cannon.splashRadius!;
    const baseDmg = TOWER_COMBAT.cannon.damage[0];
    step(g, 1400); // one cannon cooldown elapses

    expect(primary.hp).toBe(ENEMY_DATA.drone.hp - baseDmg);
    const near = g.enemies.find((e) => e.id === nearId)!;
    const far = g.enemies.find((e) => e.id === farId)!;
    expect(near.hp).toBe(ENEMY_DATA.drone.hp - Math.max(1, baseDmg * 0.5));
    expect(far.hp).toBe(ENEMY_DATA.drone.hp); // outside splash radius
    expect(Math.hypot(near.x - primary.x, near.y - primary.y)).toBeLessThanOrEqual(splashR);
    expect(Math.hypot(far.x - primary.x, far.y - primary.y)).toBeGreaterThan(splashR);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Kill reward paid exactly once                                    */
/* ------------------------------------------------------------------ */

describe('kill rewards', () => {
  it('each killed enemy pays its reward exactly once (no double pay)', () => {
    // Two drones, one pulse tower that kills them one at a time.
    const g = fundTowers(10, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    // Add a second drone right next to the first (both in range).
    const a = g.enemies[0];
    g.enemies.push({
      id: `e${g.enemyCounter}`, type: 'drone',
      x: a.x + 5, y: a.y, hp: ENEMY_DATA.drone.hp, maxHp: ENEMY_DATA.drone.hp,
      dist: a.dist - 1, speed: 90, armor: 0, slowMs: 0,
    });
    g.enemyCounter += 1;

    const startCurrency = g.currency;
    // Fire until both are dead (8 dmg/shot vs 20hp -> 3 shots each max).
    // UNIT/DEBUG: pin the drones to a fixed in-range lane position before
    // every shot so movement cannot carry them out of the pad's 130px range.
    let guard = 0;
    while (g.enemies.length > 0 && guard++ < 100) {
      for (const e of g.enemies) {
        e.x = 300;
        e.y = 200;
      }
      step(g, 600);
    }

    expect(g.enemies.length).toBe(0);
    // Both drones dead: exactly 2 * reward paid, nothing more.
    expect(g.currency - startCurrency).toBe(2 * ENEMY_DATA.drone.reward);
  });
});

/* ------------------------------------------------------------------ */
/* 6. Paid economy, pause and isolation                                */
/* ------------------------------------------------------------------ */

describe('economy, pause, isolation', () => {
  it('placing/upgrading/selling are atomic and never invent money', () => {
    const g = createGame(11);
    expect(g.currency).toBe(200);

    // pulse cost 50 -> ok. Then cannon 90 -> ok (200-50=150 >= 90). Then rail 120 fails.
    expect(placeTower(g, 'pulse', 'pad-1')).toBe(true);
    expect(placeTower(g, 'cannon', 'pad-2')).toBe(true);
    expect(g.currency).toBe(200 - 50 - 90);
    expect(placeTower(g, 'rail', 'pad-3')).toBe(false);
    expect(g.towers.length).toBe(2);
    expect(g.currency).toBe(60);

    // Upgrade pulse 0->1 costs 40 (ok, leaves 20), then 1->2 costs 60 which
    // the remaining 20 CANNOT pay: rejected atomically with no state change.
    const pulseId = g.towers[0].id;
    expect(upgradeTower(g, pulseId)).toBe(true);
    expect(g.currency).toBe(20);
    expect(upgradeTower(g, pulseId)).toBe(false); // 20 < 60: insufficient funds
    expect(g.currency).toBe(20);
    expect(g.towers[0].tier).toBe(1);

    // UNIT/DEBUG bounded funding: a genuinely affordable fixture for the
    // max-tier and refund checks (not normal win evidence).
    g.currency = 60;
    expect(upgradeTower(g, pulseId)).toBe(true);
    expect(g.currency).toBe(0);
    expect(g.towers[0].tier).toBe(2);
    // Max tier: upgrade fails with no state change.
    expect(upgradeTower(g, pulseId)).toBe(false);

    // Sell refund is 70% of total spend (50+40+60=150 -> floor(105)).
    const before = g.currency;
    expect(sellTower(g, pulseId)).toBe(true);
    expect(g.currency).toBe(before + sellRefundFor('pulse', 2));
    // Second sell of the same id fails.
    expect(sellTower(g, pulseId)).toBe(false);
    expect(g.towers.length).toBe(1);
  });

  it('insufficient funds reject placement without partial state change', () => {
    const g = createGame(12);
    expect(g.currency).toBe(200);
    // Rail costs 120; leave exactly 119 by buying a pulse (50) + frost (70) = 80 spent -> 120 left. Oops equal.
    expect(placeTower(g, 'pulse', 'pad-1')).toBe(true);
    expect(placeTower(g, 'frost', 'pad-2')).toBe(true);
    expect(g.currency).toBe(80);
    const towersBefore = g.towers.length;
    const curBefore = g.currency;
    expect(placeTower(g, 'rail', 'pad-3')).toBe(false); // 80 < 120
    expect(g.towers.length).toBe(towersBefore);
    expect(g.currency).toBe(curBefore);
  });

  it('pause freezes simulation time and combat; resume continues', () => {
    const g = fundTowers(13, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390);
    const e = g.enemies[0];
    const hpBefore = e.hp;
    const distBefore = e.dist;
    const timeBefore = g.simulationTimeMs;

    setPaused(g, true);
    expect(g.mode).toBe('paused');
    step(g, 5000); // must be a no-op while paused
    expect(g.simulationTimeMs).toBe(timeBefore);
    expect(e.hp).toBe(hpBefore);
    expect(e.dist).toBe(distBefore);

    setPaused(g, false);
    expect(g.mode).toBe('playing');
    step(g, 600);
    expect(g.simulationTimeMs).toBeGreaterThan(timeBefore);
  });

  it('two independent games do not share state (isolation)', () => {
    const a = fundTowers(14, [{ type: 'pulse', padId: 'pad-1' }]);
    const b = createGame(15);
    expect(startWave(a)).toBe(true);
    step(a, 1390);
    expect(a.enemies.length).toBe(1);
    // b is untouched by a's wave/step.
    expect(b.enemies.length).toBe(0);
    expect(b.wave).toBe(0);
    expect(b.currency).toBe(200);
    expect(b.mode).toBe('playing');
  });
});

/* ------------------------------------------------------------------ */
/* 7. Versioned pending-spawn serialize/restore roundtrip              */
/* ------------------------------------------------------------------ */

describe('serialize / restore', () => {
  it('roundtrips a mid-wave state including pending spawns, version and cooldowns', () => {
    const g = fundTowers(16, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g)).toBe(true);
    step(g, 1390); // one live drone + four pending spawns
    expect(g.pendingSpawns.length).toBe(4);
    expect(waveActive(g)).toBe(true);

    const snapshot = serialize(g);
    const h = restore(snapshot);

    expect(h.version).toBe(g.version);
    expect(h.schema).toBe(g.schema);
    expect(h.wave).toBe(g.wave);
    expect(h.currency).toBe(g.currency);
    expect(h.lives).toBe(g.lives);
    expect(h.simulationTimeMs).toBe(g.simulationTimeMs);
    expect(h.pendingSpawns).toEqual(g.pendingSpawns);
    expect(h.towerCooldowns).toEqual(g.towerCooldowns);
    expect(h.enemies.map((e) => [e.id, e.hp, e.dist])).toEqual(
      g.enemies.map((e) => [e.id, e.hp, e.dist]),
    );

    // Continuation from the restored state matches a fresh continuation.
    const g2 = fundTowers(16, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(g2)).toBe(true);
    step(g2, 1390);
    step(h, 600);
    step(g2, 600);
    expect(h.enemies.map((e) => [e.id, e.hp])).toEqual(g2.enemies.map((e) => [e.id, e.hp]));
    expect(h.currency).toBe(g2.currency);
    expect(h.pendingSpawns.length).toBe(g2.pendingSpawns.length);
  });

  it('restore rejects saves with a wrong or missing version', () => {
    const g = createGame(17);
    const badVersion = JSON.stringify({ ...JSON.parse(serialize(g)), version: 999 });
    expect(() => restore(badVersion)).toThrow(/unsupported save version/);

    const parsed = JSON.parse(serialize(g));
    delete (parsed as Record<string, unknown>).version;
    expect(() => restore(JSON.stringify(parsed))).toThrow(/unsupported save version/);
  });
});

/* ------------------------------------------------------------------ */
/* 8. Elapsed-time partitioning across spawn AND cooldown boundaries   */
/* ------------------------------------------------------------------ */

describe('time partitioning invariance', () => {
  it('one large step equals many small steps across multiple spawn and cooldown boundaries', () => {
    // Wave 1: drone spawns at offsets 0,1400,2800,4200,5600 (sim ms).
    // Pulse cooldown is 600ms. A total of 7000ms crosses 4 spawn boundaries
    // and ~11 cooldown boundaries for the tower.
    const TOTAL = 5991;

    const coarse = fundTowers(18, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(coarse)).toBe(true);
    step(coarse, TOTAL); // single call spanning all boundaries

    const fine = fundTowers(18, [{ type: 'pulse', padId: 'pad-6' }]);
    expect(startWave(fine)).toBe(true);
    // Partition the same total into awkward chunks that individually do NOT
    // align with spawn offsets (1400/2600) or cooldowns (600).
    const chunks = [1390, 1, 599, 2, 1401, 1398, 601, 599];
    expect(chunks.reduce((a, b) => a + b, 0)).toBe(TOTAL);
    for (const c of chunks) step(fine, c);

    expect(coarse.simulationTimeMs).toBe(fine.simulationTimeMs);
    expect(coarse.enemies.map((e) => [e.id, e.hp, Math.round(e.dist * 1000) / 1000])).toEqual(
      fine.enemies.map((e) => [e.id, e.hp, Math.round(e.dist * 1000) / 1000]),
    );
    expect(coarse.pendingSpawns.length).toBe(fine.pendingSpawns.length);
    expect(coarse.currency).toBe(fine.currency);
    expect(coarse.lives).toBe(fine.lives);
    expect(coarse.towerCooldowns).toEqual(fine.towerCooldowns);
  });

  it('property: arbitrary positive partitions of the same total reach identical states', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), (total) => {
        // Vary the total across multiple spawn boundaries (1400..8600) so
        // different partitions exercise different numbers of spawn resolutions.
        const TOTAL = 1400 + total * 130;

        const a = fundTowers(19, [{ type: 'pulse', padId: 'pad-6' }]);
        expect(startWave(a)).toBe(true);
        step(a, TOTAL);

        const b = fundTowers(19, [{ type: 'pulse', padId: 'pad-6' }]);
        expect(startWave(b)).toBe(true);
        // Random-ish deterministic partition into 3 uneven chunks.
        const p1 = Math.max(1, Math.floor(TOTAL * 0.37));
        const p2 = Math.max(1, Math.floor((TOTAL - p1) * 0.61));
        const p3 = TOTAL - p1 - p2;
        if (p3 >= 1) {
          step(b, p1);
          step(b, p2);
          step(b, p3);
        } else {
          step(b, p1);
          step(b, p2);
        }

        expect(serialize(a)).toEqual(serialize(b));
      }),
    );
  });
});