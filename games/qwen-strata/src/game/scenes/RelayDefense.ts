import { Scene } from 'phaser';
import {
  CELL, CORE, GAME_HEIGHT, GAME_WIDTH, GRID_COLS, GRID_ROWS, HUD_H, MAP_H, MAP_W,
  PANEL_W, PANEL_X, PANEL, END_CARD, PATH_POINTS, cellX, cellY, isPathCell,
} from '../constants';
import { buildTextures } from '../art';
import { SoundEngine } from '../audio';
import { controls, renderControlLabels } from '../controls';

export const ENGINE = new SoundEngine();

type Kind = 'drone' | 'runner' | 'duster' | 'hauler' | 'nullifier' | 'boss';

interface EnemyDef {
  name: string; tex: string; hp: number; speed: number; reward: number;
  coreDamage: number; size: number; slowImmune: boolean;
}

const ENEMY_DEFS: Record<Kind, EnemyDef> = {
  drone: { name: 'Scavenger Drone', tex: 'enemy_drone', hp: 34, speed: 84, reward: 6, coreDamage: 1, size: 28, slowImmune: false },
  runner: { name: 'Dune Runner', tex: 'enemy_runner', hp: 42, speed: 74, reward: 7, coreDamage: 1, size: 26, slowImmune: false },
  duster: { name: 'Duster Buggy', tex: 'enemy_duster', hp: 78, speed: 58, reward: 10, coreDamage: 1, size: 32, slowImmune: false },
  hauler: { name: 'Armored Hauler', tex: 'enemy_hauler', hp: 170, speed: 42, reward: 15, coreDamage: 2, size: 38, slowImmune: true },
  nullifier: { name: 'Nullifier', tex: 'enemy_nullifier', hp: 95, speed: 50, reward: 13, coreDamage: 2, size: 30, slowImmune: true },
  boss: { name: 'Iron Warden', tex: 'enemy_boss', hp: 1150, speed: 34, reward: 60, coreDamage: 6, size: 64, slowImmune: true },
};

interface TowerDef { name: string; cost: number; range: number; damage: number; cooldown: number; role: string; }

const TOWER_DEFS: Record<'lance' | 'pulse', TowerDef> = {
  lance: { name: 'Mirror Array', cost: 70, range: 130, damage: 17, cooldown: 0.45, role: 'single-target beam' },
  pulse: { name: 'Static Coil', cost: 95, range: 104, damage: 8, cooldown: 1.0, role: 'area pulse + slow' },
};

interface Wave { name: string; groups: Array<{ kind: Kind; count: number; gap: number }>; bonus: number; }

const WAVES: Wave[] = [
  { name: 'Wave 1', groups: [{ kind: 'drone', count: 6, gap: 0.85 }], bonus: 30 },
  { name: 'Wave 2', groups: [{ kind: 'drone', count: 5, gap: 0.7 }, { kind: 'runner', count: 4, gap: 0.65 }], bonus: 35 },
  { name: 'Wave 3', groups: [{ kind: 'runner', count: 5, gap: 0.6 }, { kind: 'duster', count: 4, gap: 0.9 }], bonus: 40 },
  { name: 'Wave 4', groups: [{ kind: 'duster', count: 4, gap: 0.8 }, { kind: 'hauler', count: 2, gap: 1.3 }], bonus: 45 },
  { name: 'Wave 5', groups: [{ kind: 'hauler', count: 3, gap: 1.0 }, { kind: 'nullifier', count: 3, gap: 0.8 }, { kind: 'runner', count: 4, gap: 0.5 }], bonus: 50 },
  { name: 'Wave 6 — Iron Warden', groups: [{ kind: 'duster', count: 5, gap: 0.6 }, { kind: 'boss', count: 1, gap: 1.5 }], bonus: 0 },
];

interface Enemy {
  id: number; kind: Kind; sprite: Phaser.GameObjects.Sprite;
  hp: number; maxHp: number; speed: number; seg: number; slow: number;
  spawnTime: number; alive: boolean;
}

interface Tower {
  id: number; kind: 'lance' | 'pulse'; level: number; col: number; row: number;
  sprite: Phaser.GameObjects.Sprite; cd: number; kills: number; angle: number;
}

interface Beam { x1: number; y1: number; x2: number; y2: number; life: number; max: number; color: number; w: number; }
interface Ring { x: number; y: number; r: number; max: number; life: number; color: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: number; size: number; }

export class RelayDefense extends Scene {
  private state = {
    mode: 'intermission' as 'wave' | 'intermission' | 'win' | 'lose',
    paused: false,
    speed: 1,
    wave: 0,
    energy: 150,
    coreHp: 20,
    coreMax: 20,
    kills: 0,
    elapsed: 0,
    towerCount: 0,
    nextWaveAt: 0,
    queue: [] as Array<{ kind: Kind; at: number }>,
    spawnIndex: 0,
    selectedKind: 'lance' as 'lance' | 'pulse',
    selectedTower: null as Tower | null,
    tutorial: true,
  };

  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private beams: Beam[] = [];
  private rings: Ring[] = [];
  private particles: Particle[] = [];
  private nextId = 1;

  private fx!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Graphics;
  private endText!: Phaser.GameObjects.Text;
  private buildButtons: Array<{ kind: 'lance' | 'pulse'; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; key: string }> = [];
  private actionButtons: Array<{ id: string; rect: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }> = [];
  private tutorialText!: Phaser.GameObjects.Text;
  private lastHudKey = '';

  constructor() { super('RelayDefense'); }

  create() {
    buildTextures(this);
    this.fx = this.add.graphics().setDepth(30);
    this.overlay = this.add.graphics().setDepth(60);

    this.drawStaticLayer();
    this.buildHud();
    this.buildPanel();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointer(p));
    const kb = this.input.keyboard;
    if (kb) kb.on('keydown', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'p') this.pressButton('pause');
      else if (k === 'm') this.pressButton('mute');
      else if (k === 'r') this.pressButton('restart');
      else if (k === 'f') this.pressButton('speed');
      else if (k === 'v') this.toggleFullscreen();
      else if (k === '1') this.selectKind('lance');
      else if (k === '2') this.selectKind('pulse');
      else if (k === ' ' && this.state.mode === 'intermission') this.beginWave();
    });

    controls.start = () => { this.beginWave(); renderControlLabels(); };
    controls.togglePause = () => { this.togglePause(); renderControlLabels(); };
    controls.setSpeed = (v: number) => { this.state.speed = v; this.syncUi(); };
    controls.setMuted = (v: boolean) => { ENGINE.setMuted(v); this.syncButtons(); renderControlLabels(); };
    controls.restart = () => { this.restart(); renderControlLabels(); };
    controls.getState = () => ({
      mode: this.state.mode, paused: this.state.paused, speed: this.state.speed,
      muted: ENGINE.mutedFlag(), canStart: this.state.mode === 'intermission',
    });

    (window as any).render_game_to_text = () => JSON.stringify(this.snapshot());
    (window as any).advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i++) this.step((1 / 60) * this.state.speed);
    };
    (window as any).gameAPI = {
      snapshot: () => this.snapshot(),
      start: () => this.beginWave(),
      pause: (v = true) => { this.state.paused = v; this.syncUi(); },
      unpause: () => { this.state.paused = false; this.syncUi(); },
      setSpeed: (v: number) => { this.state.speed = v; this.syncUi(); },
      setMuted: (v: boolean) => { ENGINE.setMuted(v); this.syncButtons(); },
      restart: () => this.restart(),
      place: (kind: 'lance' | 'pulse', col: number, row: number) => this.placeTower(kind, col, row),
      upgradeSelected: () => this.upgradeSelected(),
    };

    ENGINE.startMusic();
    this.beginWave();
    this.syncButtons();
    this.refreshHud(true);
  }

  // ---------- layout ----------

  private drawStaticLayer() {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0xefe3c8, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // map field
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const key = isPathCell(c, r) ? 'path' : 'ground';
        this.add.image(cellX(c), cellY(r), key).setDepth(1);
      }
    }
    // subtle grid
    const grid = this.add.graphics().setDepth(2);
    grid.lineStyle(1, 0x000000, 0.06);
    for (let c = 0; c <= GRID_COLS; c++) grid.lineBetween(c * CELL, HUD_H, c * CELL, HUD_H + MAP_H);
    for (let r = 0; r <= GRID_ROWS; r++) grid.lineBetween(0, HUD_H + r * CELL, MAP_W, HUD_H + r * CELL);

    // entry marker
    const mark = this.add.graphics().setDepth(3);
    mark.fillStyle(0x4c5b6b, 0.85);
    mark.fillRect(0, cellY(3) - 8, 12, 16);
    mark.fillStyle(0xffb03a, 0.9);
    mark.fillTriangle(12, cellY(3) - 10, 26, cellY(3), 12, cellY(3) + 10);

    // relay core (fits inside the final path cell)
    const core = this.add.graphics().setDepth(3);
    core.fillStyle(0xd8d4c4, 1);
    core.fillRoundedRect(CORE.x - 22, CORE.y - 22, 44, 44, 6);
    core.fillStyle(0xbcb9a8, 1);
    core.fillRoundedRect(CORE.x - 19, CORE.y - 19, 38, 38, 5);
    core.fillStyle(0x2f3b4a, 1);
    core.fillRoundedRect(CORE.x - 14, CORE.y - 13, 28, 26, 6);
    core.fillStyle(0xf7f4e6, 1);
    core.fillRoundedRect(CORE.x - 18, CORE.y - 21, 8, 6, 2);
    core.fillRoundedRect(CORE.x + 10, CORE.y - 21, 8, 6, 2);
    core.fillStyle(0x2f3b4a, 0.7);
    core.fillRect(CORE.x - 18, CORE.y - 17, 8, 2);
    core.fillRect(CORE.x + 10, CORE.y - 17, 8, 2);
    core.fillStyle(0xffd166, 1);
    core.fillCircle(CORE.x, CORE.y, 8);
    core.fillStyle(0x2f3b4a, 1);
    core.fillRect(CORE.x - 22, CORE.y + 14, 44, 3);

    // panel backdrop (full right column, inside the canvas)
    const panel = this.add.graphics().setDepth(2);
    panel.fillStyle(0x27313c, 1);
    panel.fillRoundedRect(PANEL_X + 8, HUD_H + 8, PANEL_W - 16, GAME_HEIGHT - HUD_H - 16, 8);
    panel.fillStyle(0x1f2731, 1);
    panel.fillRoundedRect(PANEL_X + 8, HUD_H + 8, PANEL_W - 16, 32, 8);

    // hud band
    const hud = this.add.graphics().setDepth(4);
    hud.fillStyle(0x27313c, 1);
    hud.fillRect(0, 0, GAME_WIDTH, HUD_H);

    // bottom strip under the map (tutorial area)
    hud.fillStyle(0x27313c, 0.96);
    hud.fillRect(0, HUD_H + MAP_H, PANEL_X, GAME_HEIGHT - HUD_H - MAP_H);
  }

  private buildHud() {
    this.hudText = this.add.text(14, 12, '', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '19px', color: '#f4f1e8',
    }).setDepth(50);
    this.banner = this.add.text(MAP_W / 2, HUD_H + 18, '', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '16px', color: '#3c4450',
      wordWrap: { width: 800 },
    }).setOrigin(0.5, 0).setDepth(50);
    this.tutorialText = this.add.text(20, HUD_H + MAP_H + 14, '', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '13px', color: '#f2efe4', lineSpacing: 6,
      wordWrap: { width: 820 },
    }).setDepth(50);
    this.endText = this.add.text(END_CARD.x + 24, END_CARD.y + 34, '', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '15px', color: '#f4f1e8', lineSpacing: 7,
      wordWrap: { width: END_CARD.w - 48 },
    }).setDepth(61).setVisible(false);
  }

  private buildPanel() {
    this.infoText = this.add.text(PANEL_X + 16, PANEL.infoY, '', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '13px', color: '#e8e3d5', lineSpacing: 5,
      wordWrap: { width: 130 },
    }).setDepth(50);

    const mkButton = (id: string, x: number, y: number, w: number, h: number, label: string, fill: number) => {
      const rect = this.add.rectangle(x, y, w, h, fill).setInteractive().setDepth(51);
      const t = this.add.text(x, y, label, {
        fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '14px', color: '#f4f1e8',
      }).setOrigin(0.5).setDepth(52);
      rect.on('pointerdown', () => this.pressButton(id));
      this.actionButtons.push({ id, rect, label: t });
      return rect;
    };

    this.buildButtons.push({
      kind: 'lance',
      rect: this.add.rectangle(PANEL_X + 44, PANEL.padY, 64, 42, 0x3c4450).setInteractive().setDepth(51),
      key: 'tower_lance',
      label: this.add.text(PANEL_X + 44, PANEL.padY + 24, 'Mirror Array', {
        fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '12px', color: '#f4f1e8',
      }).setOrigin(0.5).setDepth(52),
    });
    this.buildButtons.push({
      kind: 'pulse',
      rect: this.add.rectangle(PANEL_X + 116, PANEL.padY, 64, 42, 0x3c4450).setInteractive().setDepth(51),
      key: 'tower_pulse',
      label: this.add.text(PANEL_X + 116, PANEL.padY + 24, 'Static Coil', {
        fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '12px', color: '#f4f1e8',
      }).setOrigin(0.5).setDepth(52),
    });
    for (const b of this.buildButtons) {
      this.add.image(PANEL_X + (b.kind === 'lance' ? 44 : 116), PANEL.padY - 8, b.key).setScale(28 / 64).setDepth(52);
      b.rect.on('pointerdown', () => this.pressButton('build_' + b.kind));
    }

    mkButton('next', PANEL_X + 80, PANEL.nextY, 132, 32, 'Send Wave', 0x2f6b52);
    mkButton('pause', PANEL_X + 44, PANEL.row1Y, 64, 30, 'Pause', 0x3c4450);
    mkButton('speed', PANEL_X + 116, PANEL.row1Y, 64, 30, 'Speed 1x', 0x3c4450);
    mkButton('mute', PANEL_X + 44, PANEL.row2Y, 64, 30, 'Mute', 0x3c4450);
    mkButton('restart', PANEL_X + 116, PANEL.row2Y, 64, 30, 'Restart', 0x6b3f3f);
    mkButton('upgrade', PANEL_X + 80, PANEL.upgradeY, 132, 32, 'Upgrade', 0x2f6b52);
    mkButton('sell', PANEL_X + 80, PANEL.sellY, 132, 28, 'Sell (60%)', 0x50484c);

    this.add.text(PANEL_X + 16, PANEL.hintY, 'keys: 1/2 build · Space send wave\nP pause · F speed · M mute · R restart', {
      fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '12px', color: '#b8c3cf', lineSpacing: 5,
      wordWrap: { width: 130 },
    }).setDepth(52);

  }

  // ---------- interactions ----------

  private pressButton(id: string) {
    ENGINE.sfx('ui');
    if (id === 'pause') this.togglePause();
    else if (id === 'mute') this.toggleMute();
    else if (id === 'speed') this.cycleSpeed();
    else if (id === 'restart') this.restart();
    else if (id === 'next' && this.state.mode === 'intermission') this.beginWave();
    else if (id === 'upgrade') this.upgradeSelected();
    else if (id === 'sell') this.sellSelected();
    else if (id.startsWith('build_')) this.selectKind(id.slice(6) as 'lance' | 'pulse');
    this.syncUi();
  }

  private onPointer(p: Phaser.Input.Pointer) {
    if (this.state.mode === 'win' || this.state.mode === 'lose') return;
    const x = p.x, y = p.y;
    if (x < MAP_W && y > HUD_H && y < HUD_H + MAP_H) {
      const col = Math.floor(x / CELL), row = Math.floor((y - HUD_H) / CELL);
      const existing = this.towers.find((t) => t.col === col && t.row === row);
      if (existing) { this.state.selectedTower = existing; ENGINE.sfx('ui'); this.refreshHud(true); return; }
      this.placeTower(this.state.selectedKind, col, row);
      this.refreshHud(true);
    }
  }

  private placeTower(kind: 'lance' | 'pulse', col: number, row: number) {
    if (col < 0 || row < 0 || col >= GRID_COLS || row >= GRID_ROWS) return false;
    if (isPathCell(col, row)) { this.flashBanner('That cell is on the relay path.'); return false; }
    if (this.towers.some((t) => t.col === col && t.row === row)) return false;
    const cost = TOWER_DEFS[kind].cost;
    if (this.state.energy < cost) { this.flashBanner('Not enough energy for ' + TOWER_DEFS[kind].name); return false; }
    this.state.energy -= cost;
    const sprite = this.add.sprite(cellX(col), cellY(row), kind === 'lance' ? 'tower_lance' : 'tower_pulse')
      .setScale(46 / 64).setDepth(10).setInteractive();
    const tower: Tower = {
      id: this.nextId++, kind, level: 1, col, row, sprite, cd: 0, kills: 0, angle: -Math.PI / 2,
    };
    sprite.on('pointerdown', () => { this.state.selectedTower = tower; this.refreshHud(true); });
    this.towers.push(tower);
    this.state.towerCount++;
    this.state.selectedTower = tower;
    ENGINE.sfx('place');
    this.burst(sprite.x, sprite.y, kind === 'lance' ? 0xffd166 : 0x9ff2fb, 10);
    return true;
  }

  private upgradeCost(t: Tower) { return t.kind === 'lance' ? [55, 80, 110][t.level - 1] : [60, 85, 115][t.level - 1]; }
  private sellValue(t: Tower) {
    const base = TOWER_DEFS[t.kind].cost;
    let spent = base;
    for (let l = 1; l < t.level; l++) spent += t.kind === 'lance' ? [55, 80, 110][l - 1] : [60, 85, 115][l - 1];
    return Math.floor(spent * 0.6);
  }

  private upgradeSelected() {
    const t = this.state.selectedTower;
    if (!t || t.level >= 4) { this.flashBanner('Tower is already level 4.'); return; }
    const cost = this.upgradeCost(t);
    if (this.state.energy < cost) { this.flashBanner('Need ' + cost + ' energy to upgrade.'); return; }
    this.state.energy -= cost;
    t.level++;
    ENGINE.sfx('upgrade');
    this.burst(t.sprite.x, t.sprite.y, 0x9ff2fb, 14);
    this.refreshHud(true);
  }

  private sellSelected() {
    const t = this.state.selectedTower;
    if (!t) return;
    this.state.energy += this.sellValue(t);
    this.towers = this.towers.filter((x) => x !== t);
    this.state.towerCount--;
    this.state.selectedTower = null;
    t.sprite.destroy();
    ENGINE.sfx('ui');
    this.refreshHud(true);
  }

  private selectKind(kind: 'lance' | 'pulse') {
    this.state.selectedKind = kind;
    this.syncUi();
  }

  // One sync path: canvas labels, HUD line and the HTML toolbar always read the same state.
  private syncUi() {
    this.syncButtons();
    renderControlLabels();
    this.refreshHud(true);
  }

  private togglePause() { this.state.paused = !this.state.paused; this.syncUi(); }
  private toggleMute() { ENGINE.setMuted(!ENGINE.mutedFlag()); this.syncUi(); }
  private cycleSpeed() { this.state.speed = this.state.speed === 1 ? 2 : 1; this.syncUi(); }
  private toggleFullscreen() {
    try { this.scale.toggleFullscreen(); } catch (e) { console.warn('fullscreen unavailable', e); }
  }

  private restart() {
    this.enemies.forEach((e) => e.sprite.destroy());
    this.towers.forEach((t) => t.sprite.destroy());
    this.enemies = []; this.towers = []; this.beams = []; this.rings = []; this.particles = [];
    this.state = {
      mode: 'intermission', paused: false, speed: this.state.speed, wave: 0, energy: 150,
      coreHp: 20, coreMax: 20, kills: 0, elapsed: 0, towerCount: 0, nextWaveAt: this.time.now + 2000,
      queue: [], spawnIndex: 0, selectedKind: this.state.selectedKind, selectedTower: null,
      tutorial: this.state.tutorial,
    };
    this.beginWave();
    this.refreshHud(true);
  }

  // ---------- waves ----------

  private beginWave() {
    // Never skip or replace a wave that is already running, and never restart after the run ended.
    if (this.state.mode === 'wave' || this.state.mode === 'win' || this.state.mode === 'lose') return;
    const w = WAVES[this.state.wave];
    if (!w) return;
    this.state.wave++;
    this.state.mode = 'wave';
    this.state.queue = [];
    let t = 0.6;
    for (const group of w.groups) {
      for (let i = 0; i < group.count; i++) {
        this.state.queue.push({ kind: group.kind, at: t });
        t += group.gap;
      }
    }
    this.state.spawnIndex = 0;
    this.state.elapsed = 0;
    this.banner.setText(`${w.name} incoming — ${w.groups.map((g) => `${g.count}× ${ENEMY_DEFS[g.kind].name}`).join(', ')}`);
    ENGINE.sfx('wave');
    this.refreshHud(true);
  }

  private spawn(kind: Kind) {
    const def = ENEMY_DEFS[kind];
    const hpScale = 1 + (this.state.wave - 1) * 0.12;
    const hp = Math.round(def.hp * hpScale);
    const jitter = (Math.random() - 0.5) * 14;
    const sprite = this.add.sprite(PATH_POINTS[0].x, PATH_POINTS[0].y + jitter, def.tex)
      .setScale(def.size / 64).setDepth(12);
    const e: Enemy = {
      id: this.nextId++, kind, sprite, hp, maxHp: hp, speed: def.speed, seg: 0, slow: 0,
      spawnTime: this.time.now, alive: true,
    };
    this.enemies.push(e);
  }

  // ---------- simulation ----------

  step(dt: number) {
    if (this.state.paused) return;
    this.state.elapsed += dt;

    if (this.state.mode === 'wave') {
      const q = this.state.queue;
      while (this.state.spawnIndex < q.length && q[this.state.spawnIndex].at <= this.state.elapsed) {
        this.spawn(q[this.state.spawnIndex].kind);
        this.state.spawnIndex++;
      }
    }

    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.slow > 0) e.slow -= dt;
      const sp = e.speed * (ENEMY_DEFS[e.kind].slowImmune ? 1 : (1 - 0.4 * Math.min(1, e.slow > 0 ? 1 : 0)));
      const sub = Math.max(1, Math.ceil((sp * dt) / 8));
      for (let s = 0; s < sub; s++) {
        const target = PATH_POINTS[e.seg + 1];
        if (!target) { this.leak(e); break; }
        const dx = target.x - e.sprite.x, dy = target.y - e.sprite.y;
        const d = Math.hypot(dx, dy);
        const move = (sp * dt) / sub;
        if (d <= move) {
          e.sprite.x = target.x; e.sprite.y = target.y; e.seg++;
          if (e.seg >= PATH_POINTS.length - 1) { this.leak(e); break; }
        } else {
          e.sprite.x += (dx / d) * move; e.sprite.y += (dy / d) * move;
        }
      }
    }

    // towers
    for (const t of this.towers) {
      t.cd -= dt;
      if (t.cd > 0) continue;
      const def = TOWER_DEFS[t.kind];
      const range = def.range + (t.level - 1) * 16;
      const inRange = this.enemies.filter((e) => e.alive && Math.hypot(e.sprite.x - t.sprite.x, e.sprite.y - t.sprite.y) <= range);
      if (!inRange.length) continue;
      const dmg = def.damage + (t.level - 1) * (t.kind === 'lance' ? 9 : 4);
      if (t.kind === 'lance') {
        const target = inRange.sort((a, b) => b.seg - a.seg)[0];
        t.angle = Math.atan2(target.sprite.y - t.sprite.y, target.sprite.x - t.sprite.x);
        t.cd = Math.max(0.12, def.cooldown - (t.level - 1) * 0.06);
        this.damage(target, dmg, t);
        this.beams.push({
          x1: t.sprite.x, y1: t.sprite.y, x2: target.sprite.x, y2: target.sprite.y,
          life: 0.14, max: 0.14, color: 0xffd166, w: t.level >= 3 ? 4 : 3,
        });
        ENGINE.sfx('beam');
        this.burst(target.sprite.x, target.sprite.y, 0xffd166, 3);
      } else {
        t.cd = Math.max(0.3, def.cooldown - (t.level - 1) * 0.13);
        this.rings.push({ x: t.sprite.x, y: t.sprite.y, r: 6, max: range, life: 0.35, color: 0x9ff2fb });
        for (const e of inRange) {
          this.damage(e, dmg, t);
          if (!ENEMY_DEFS[e.kind].slowImmune) e.slow = 1.1 + (t.level - 1) * 0.35;
        }
        ENGINE.sfx('pulse');
      }
    }

    // effects
    this.beams = this.beams.filter((b) => (b.life -= dt) > 0);
    this.rings = this.rings.filter((r) => (r.life -= dt) > 0);
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.92; p.vy *= 0.92;
      return p.life > 0;
    });

    // wave end
    if (this.state.mode === 'wave' && this.state.spawnIndex >= this.state.queue.length && !this.enemies.some((e) => e.alive)) {
      const w = WAVES[this.state.wave - 1];
      if (this.state.wave >= WAVES.length) {
        this.state.mode = 'win';
        this.banner.setText('All six waves cleared. The relay holds.');
        ENGINE.sfx('win');
      } else {
        this.state.energy += w.bonus;
        this.state.mode = 'intermission';
        this.banner.setText(`${w.name} cleared. +${w.bonus} energy — build, upgrade, then send the next wave.`);
        ENGINE.sfx('wave');
      }
      this.refreshHud(true);
    }

    this.drawFx();
    this.refreshHud(false);
  }

  update(_time: number, delta: number) {
    this.step(Math.min(delta, 100) / 1000 * this.state.speed);
  }

  private damage(e: Enemy, amount: number, source: Tower) {
    if (!e.alive) return;
    e.hp -= amount;
    if (e.hp <= 0) {
      e.alive = false;
      const def = ENEMY_DEFS[e.kind];
      this.state.energy += def.reward;
      this.state.kills++;
      if (source) source.kills++;
      this.burst(e.sprite.x, e.sprite.y, e.kind === 'boss' ? 0xf0727a : 0x6f7f92, e.kind === 'boss' ? 26 : 12);
      ENGINE.sfx('death');
      e.sprite.destroy();
    }
  }

  private leak(e: Enemy) {
    if (!e.alive) return;
    e.alive = false;
    const def = ENEMY_DEFS[e.kind];
    this.state.coreHp -= def.coreDamage;
    this.burst(CORE.x, CORE.y, 0xf0727a, 14);
    ENGINE.sfx('core');
    e.sprite.destroy();
    if (this.state.coreHp <= 0) {
      this.state.coreHp = 0;
      this.state.mode = 'lose';
      this.banner.setText('Relay core destroyed — the outpost goes dark.');
      ENGINE.sfx('lose');
    }
    this.refreshHud(true);
  }

  private burst(x: number, y: number, color: number, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.3, max: 0.6, color, size: 2 + Math.random() * 3,
      });
    }
  }

  // ---------- rendering ----------

  private drawFx() {
    const fx = this.fx;
    fx.clear();

    // selected tower range
    const sel = this.state.selectedTower;
    if (sel) {
      const def = TOWER_DEFS[sel.kind];
      const range = def.range + (sel.level - 1) * 16;
      fx.lineStyle(2, sel.kind === 'lance' ? 0x8fb3c9 : 0x53d8e6, 0.9);
      fx.strokeCircle(sel.sprite.x, sel.sprite.y, range);
      fx.fillStyle(sel.kind === 'lance' ? 0x8fb3c9 : 0x53d8e6, 0.12);
      fx.fillCircle(sel.sprite.x, sel.sprite.y, range);
      if (sel.kind === 'lance') {
        fx.lineStyle(2, 0x8fb3c9, 0.5);
        fx.lineBetween(sel.sprite.x, sel.sprite.y, sel.sprite.x + Math.cos(sel.angle) * 24, sel.sprite.y + Math.sin(sel.angle) * 24);
      }
    }

    // pulses
    for (const r of this.rings) {
      const t = 1 - r.life / 0.35;
      const rad = r.r + (r.max - r.r) * t;
      fx.lineStyle(3, r.color, 0.75 * (1 - t));
      fx.strokeCircle(r.x, r.y, rad);
    }

    // beams
    for (const b of this.beams) {
      fx.lineStyle(b.w, b.color, 0.9 * (b.life / b.max));
      fx.lineBetween(b.x1, b.y1, b.x2, b.y2);
      fx.lineStyle(b.w + 2, b.color, 0.25 * (b.life / b.max));
      fx.lineBetween(b.x1, b.y1, b.x2, b.y2);
    }

    // core pulse
    const pulse = 10 + Math.sin(this.state.elapsed * 2.2) * 2.5;
    fx.fillStyle(0xffd166, 0.5);
    fx.fillCircle(CORE.x, CORE.y, pulse);

    // health bars
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const w = ENEMY_DEFS[e.kind].size;
      const x = e.sprite.x - w / 2, y = e.sprite.y - w / 2 - 8;
      fx.fillStyle(0x2b3140, 0.9);
      fx.fillRect(x, y, w, 4);
      fx.fillStyle(e.hp / e.maxHp > 0.5 ? 0x7ec97a : (e.hp / e.maxHp > 0.25 ? 0xffb03a : 0xf0727a), 1);
      fx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
    }

    // core bar
    fx.fillStyle(0x2b3140, 0.9);
    fx.fillRect(CORE.x - 20, CORE.y + 24, 40, 4);
    fx.fillStyle(0x7ec97a, 1);
    fx.fillRect(CORE.x - 20, CORE.y + 24, 40 * (this.state.coreHp / this.state.coreMax), 4);

    // particles
    for (const p of this.particles) {
      fx.fillStyle(p.color, Math.max(0, p.life / p.max));
      fx.fillCircle(p.x, p.y, p.size);
    }

    // overlay is rebuilt every frame so it can never survive a resume or a restart
    this.overlay.clear();
    if (this.state.mode === 'win' || this.state.mode === 'lose') {
      this.overlay.fillStyle(0x1f2731, 0.86);
      this.overlay.fillRoundedRect(END_CARD.x, END_CARD.y, END_CARD.w, END_CARD.h, 10);
      this.overlay.fillStyle(this.state.mode === 'win' ? 0x7ec97a : 0xf0727a, 1);
      this.overlay.fillRect(END_CARD.x, END_CARD.y, END_CARD.w, 6);
    } else if (this.state.paused) {
      this.overlay.fillStyle(0x1f2731, 0.35);
      this.overlay.fillRect(0, HUD_H, PANEL_X, MAP_H);
    }
  }

  private flashBanner(msg: string) { this.banner.setText(msg); }

  private refreshHud(force: boolean) {
    const s = this.state;
    const key = `${s.mode}|${s.energy}|${s.coreHp}|${s.kills}|${s.wave}|${s.towerCount}|${s.paused}|${s.speed}|${s.selectedTower?.id ?? 0}`;
    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;
    renderControlLabels();
    this.hudText.setText(
      `⚡ ${s.energy}   CORE ${s.coreHp}/${s.coreMax}   ${WAVES[Math.min(s.wave, WAVES.length) - 1].name}   KILLS ${s.kills}` +
      (s.paused ? '   PAUSED' : '')
    );
    const sel = s.selectedTower;
    const def = TOWER_DEFS[s.selectedKind];
    if (sel) {
      const d = TOWER_DEFS[sel.kind];
      this.infoText.setText(
        `${d.name}  L${sel.level}\nrole: ${d.role}\nrange ${d.range + (sel.level - 1) * 16} · dmg ${d.damage + (sel.level - 1) * (sel.kind === 'lance' ? 9 : 4)}` +
        (sel.kind === 'pulse' ? ' · slow' : '') + `\nkills ${sel.kills}\nupgrade ${sel.level < 4 ? this.upgradeCost(sel) : 'max'} · sell ${this.sellValue(sel)}`
      );
    } else {
      this.infoText.setText(
        `Build: ${def.name}\ncost ${def.cost} · role ${def.role}\n\nClick a pad, then click an empty desert cell.`
      );
    }
    this.tutorialText.setText(
      'TUTORIAL: 1) click a build pad, 2) click an empty cell to pay and place, 3) click a tower to upgrade or sell.\n' +
      'Enemies follow the pale track to the relay core. Mirror Array = single beam, Static Coil = area pulse + slow.\n' +
      'Keys: 1/2 pick tower, Space sends wave, P pause, F speed, M mute, R restart, V fullscreen.'
    );

    if (s.mode === 'win' || s.mode === 'lose') {
      this.endText.setVisible(true).setText(
        (s.mode === 'win' ? 'VICTORY — the relay holds.' : 'DEFEAT — the relay core is down.') +
        `\n${s.kills} enemies destroyed · ${s.towerCount} tower${s.towerCount === 1 ? '' : 's'} standing · ${s.energy} energy left` +
        (s.mode === 'win' ? `\ncore ${s.coreHp}/${s.coreMax}` : '') +
        '\nUse Restart in the panel (or press R) to run the six waves again.'
      );
    } else {
      this.endText.setVisible(false);
    }
  }

  private syncButtons() {
    const s = this.state;
    const canUse = (id: string) => {
      if (id === 'next') return s.mode === 'intermission';
      if (id === 'upgrade') return !!s.selectedTower && s.selectedTower.level < 4 && s.energy >= this.upgradeCost(s.selectedTower);
      if (id === 'sell') return !!s.selectedTower;
      return true;
    };
    for (const b of this.actionButtons) {
      if (b.id === 'pause') b.label.setText(s.paused ? 'Resume' : 'Pause');
      if (b.id === 'mute') b.label.setText(ENGINE.mutedFlag() ? 'Unmute' : 'Mute');
      if (b.id === 'speed') b.label.setText(`Speed ${s.speed}x`);
      if (b.id === 'next') b.label.setText(s.mode === 'win' ? 'All cleared' : s.mode === 'lose' ? 'Core lost' : s.mode === 'intermission' ? 'Send Wave ▶' : 'Wave running');
      if (b.id === 'upgrade') b.label.setText(s.selectedTower && s.selectedTower.level >= 4 ? 'Max level' : 'Upgrade');
      b.rect.setAlpha(canUse(b.id) ? 1 : 0.45);
    }
    for (const b of this.buildButtons) {
      b.rect.fillColor = this.state.selectedKind === b.kind ? 0x4a6b7c : 0x3c4450;
    }
  }

  private snapshot() {
    const s = this.state;
    return {
      mode: s.mode, paused: s.paused, speed: s.speed, muted: ENGINE.mutedFlag(),
      canStart: s.mode === 'intermission',
      wave: s.wave, wavesTotal: WAVES.length, energy: s.energy, coreHp: s.coreHp, coreMax: s.coreMax,
      kills: s.kills, towerCount: s.towerCount, elapsedMs: Math.round(s.elapsed * 1000),
      pendingSpawns: s.queue.length - s.spawnIndex,
      grid: { origin: 'top-left', axes: 'x right, y down', cell: CELL, cols: GRID_COLS, hudHeight: HUD_H },
      core: { x: CORE.x, y: CORE.y },
      towers: this.towers.map((t) => ({
        id: t.id, kind: t.kind, level: t.level, col: t.col, row: t.row,
        x: Math.round(t.sprite.x), y: Math.round(t.sprite.y), kills: t.kills,
      })),
      enemies: this.enemies.filter((e) => e.alive).map((e) => ({
        id: e.id, kind: e.kind, hp: e.hp, maxHp: e.maxHp, seg: e.seg,
        x: Math.round(e.sprite.x), y: Math.round(e.sprite.y), slow: e.slow > 0,
      })),
      selected: s.selectedTower ? { id: s.selectedTower.id, kind: s.selectedTower.kind, level: s.selectedTower.level } : null,
      hud: this.hudText.text,
      banner: this.banner.text,
    };
  }
}
