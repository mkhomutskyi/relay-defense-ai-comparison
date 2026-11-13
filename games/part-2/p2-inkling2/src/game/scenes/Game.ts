import { Scene } from 'phaser';
import { audio } from '../audio';

// ---------- World layout ----------
const W = 1280;
const H = 720;
const HUD_H = 56;
const TILE = 64;
const COLS = 20;
const ROWS = 10;
const rowY = (r: number) => HUD_H + TILE / 2 + r * TILE;
const colX = (c: number) => TILE / 2 + c * TILE;

const PATH_POINTS = [
  { x: -50, y: 176 }, { x: 268, y: 176 }, { x: 268, y: 462 }, { x: 592, y: 462 },
  { x: 592, y: 148 }, { x: 884, y: 148 }, { x: 884, y: 548 }, { x: 1330, y: 548 },
];

type TowerKind = 'lancer' | 'mortar';
type EnemyKind = 'skitter' | 'raider' | 'bulwark' | 'boss';
type Phase = 'build' | 'wave' | 'won' | 'lost';

interface TowerDef {
  name: string; cost: number; range: number; damage: number; rate: number;
  upgrades: { cost: number; damage: number; rate: number; range: number; aoe?: number }[];
}
const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  lancer: {
    name: 'Solar Lancer', cost: 60, range: 155, damage: 9, rate: 2.1,
    upgrades: [
      { cost: 45, damage: 15, rate: 2.7, range: 165 },
      { cost: 75, damage: 24, rate: 3.4, range: 180 },
    ],
  },
  mortar: {
    name: 'Sunburst Mortar', cost: 110, range: 175, damage: 26, rate: 0.72,
    upgrades: [
      { cost: 80, damage: 42, rate: 0.8, range: 185, aoe: 78 },
      { cost: 125, damage: 64, rate: 0.9, range: 200, aoe: 95 },
    ],
  },
};
const TOWER_AOE: Record<TowerKind, number> = { lancer: 0, mortar: 58 };

interface EnemyDef { name: string; hp: number; speed: number; reward: number; damage: number; radius: number; score: number }
const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  skitter: { name: 'Skitter', hp: 32, speed: 96, reward: 8, damage: 1, radius: 11, score: 10 },
  raider: { name: 'Dune Raider', hp: 78, speed: 63, reward: 14, damage: 1, radius: 14, score: 20 },
  bulwark: { name: 'Bulwark', hp: 250, speed: 34, reward: 30, damage: 2, radius: 19, score: 45 },
  boss: { name: 'Dust Tyrant', hp: 1750, speed: 26, reward: 300, damage: 5, radius: 30, score: 500 },
};

interface SpawnEntry { kind: EnemyKind; at: number }
const sk = (_i: number, at: number): SpawnEntry => ({ kind: 'skitter', at });
const rd = (_i: number, at: number): SpawnEntry => ({ kind: 'raider', at });
const bk = (_i: number, at: number): SpawnEntry => ({ kind: 'bulwark', at });
const WAVES: SpawnEntry[][] = [
  [...Array(8)].map((_, i) => sk(i, i * 1.05)),
  [...[...Array(10)].map((_, i) => sk(i, i * 0.8)), ...[...Array(4)].map((_, i) => rd(i, 2 + i * 1.6))],
  [...[...Array(6)].map((_, i) => rd(i, i * 1.15)), ...[...Array(3)].map((_, i) => bk(i, 3 + i * 3.2))],
  [...[...Array(14)].map((_, i) => sk(i, i * 0.45)), ...[...Array(8)].map((_, i) => rd(i, 1.5 + i * 1.05))],
  [...[...Array(6)].map((_, i) => bk(i, i * 2.6)), ...[...Array(8)].map((_, i) => rd(i, 1 + i * 1.2))],
  [{ kind: 'boss', at: 3.5 }, { kind: 'boss', at: 30 }, ...[...Array(6)].map((_, i) => rd(i, i * 1.7)), ...[...Array(6)].map((_, i) => sk(i, 6 + i * 0.6))],
];
const WAVE_BONUS = [40, 55, 70, 90, 120, 0];

interface Enemy {
  id: number; kind: EnemyKind; hp: number; maxHp: number; dist: number;
  x: number; y: number; speed: number; reward: number; damage: number; radius: number; score: number;
  flash: number; dead: boolean;
}
interface Tower {
  id: number; kind: TowerKind; col: number; row: number; x: number; y: number;
  level: number; cooldown: number; angle: number; invested: number;
}
interface Projectile {
  x: number; y: number; target: Enemy | null;
  tx: number; ty: number; speed: number; damage: number; aoe: number; kind: TowerKind; life: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: number }
interface FloatText { obj: Phaser.GameObjects.Text; life: number }
interface Ring { x: number; y: number; r: number; maxR: number; color: number; width: number; life: number }
interface Button {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
}
export class Game extends Scene {
  phase: Phase = 'build';
  gold = 170; lives = 20; score = 0; wave = 0;
  paused = false; speed = 1; muted = false;
  enemies: Enemy[] = [];
  towers: Tower[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  rings: Ring[] = [];
  spawnQueue: SpawnEntry[] = [];
  waveTime = 0;
  selectedBuild: TowerKind | null = null;
  selectedTower: Tower | null = null;
  hoverCell: { col: number; row: number } | null = null;
  hintStage = 0;
  shake = 0;
  relayFlash = 0;
  elapsed = 0;
  private idCounter = 1;

  private dynGfx!: Phaser.GameObjects.Graphics;
  private towerGfx!: Phaser.GameObjects.Graphics;
  private enemyGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private buttons: Record<string, Button> = {};
  private buildCards: Partial<Record<TowerKind, { bg: Phaser.GameObjects.Rectangle }>> = {};
  private hintText!: Phaser.GameObjects.Text;
  private selectionPanel!: Phaser.GameObjects.Container;
  private selectionText!: Phaser.GameObjects.Text;
  private upgradeBtn!: Button;
  private sellBtn!: Button;
  private overlayContainer: Phaser.GameObjects.Container | null = null;
  private overlayButton: Button | null = null;
  private pathLengths: number[] = [];
  private totalPath = 0;
  private pathCells: boolean[][] = [];

  constructor() { super('Game'); }

  create() {
    this.resetState();
    this.computePath();
    this.drawBackground();
    this.createHud();
    this.createBuildPanel();
    this.createSelectionPanel();
    this.bindInput();
    this.exposeHooks();
    audio.ensure();
    this.showHint('Build defenses, then press START WAVE');
  }

  resetState() {
    this.phase = 'build'; this.gold = 170; this.lives = 20; this.score = 0; this.wave = 0;
    this.paused = false; this.speed = 1;
    this.enemies = []; this.towers = []; this.projectiles = [];
    this.particles = []; this.texts = []; this.rings = []; this.spawnQueue = []; this.waveTime = 0;
    this.selectedBuild = null; this.selectedTower = null; this.hintStage = 0;
    this.elapsed = 0; this.shake = 0; this.relayFlash = 0; this.overlayContainer = null; this.overlayButton = null;
  }

  computePath() {
    this.pathLengths = [0];
    let total = 0;
    for (let i = 1; i < PATH_POINTS.length; i++) {
      total += Math.hypot(PATH_POINTS[i].x - PATH_POINTS[i - 1].x, PATH_POINTS[i].y - PATH_POINTS[i - 1].y);
      this.pathLengths.push(total);
    }
    this.totalPath = total;
    this.pathCells = [];
    for (let r = 0; r < ROWS; r++) {
      this.pathCells[r] = [];
      for (let c = 0; c < COLS; c++) this.pathCells[r][c] = this.distToPath(colX(c), rowY(r)) < 46;
    }
  }

  distToPath(x: number, y: number): number {
    let best = Infinity;
    for (let i = 1; i < PATH_POINTS.length; i++) {
      const ax = PATH_POINTS[i - 1].x, ay = PATH_POINTS[i - 1].y;
      const bx = PATH_POINTS[i].x, by = PATH_POINTS[i].y;
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
    }
    return best;
  }

  pathPos(dist: number): { x: number; y: number; angle: number } {
    const d = Math.max(0, Math.min(dist, this.totalPath - 0.001));
    let i = 1;
    while (i < this.pathLengths.length - 1 && this.pathLengths[i] < d) i++;
    const segStart = this.pathLengths[i - 1];
    const segLen = this.pathLengths[i] - segStart;
    const t = segLen === 0 ? 0 : (d - segStart) / segLen;
    const a = PATH_POINTS[i - 1], b = PATH_POINTS[i];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  private rand(seed: number) { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  // ---------- Background (drawn once) ----------
  drawBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xf2d59a, 0xf2d59a, 0xe0b26e, 0xe0b26e, 1);
    bg.fillRect(0, HUD_H, W, H - HUD_H);
    const duneColors = [0xeccb8d, 0xe8c47e, 0xf6dda6];
    for (let i = 0; i < 9; i++) {
      const cx = this.rand(i * 3 + 1) * W;
      const cy = HUD_H + this.rand(i * 3 + 2) * (H - HUD_H);
      const rw = 130 + this.rand(i * 3 + 3) * 220;
      bg.fillStyle(duneColors[i % 3], 0.55);
      bg.fillEllipse(cx, cy, rw, rw * 0.32);
    }
    for (let i = 0; i < 700; i++) {
      const x = this.rand(1000 + i) * W, y = HUD_H + this.rand(2000 + i) * (H - HUD_H);
      bg.fillStyle(this.rand(3000 + i) > 0.5 ? 0xd9b36c : 0xfbf0cd, 0.6);
      bg.fillCircle(x, y, 0.8 + this.rand(4000 + i) * 1.6);
    }
    const stroke = (width: number, color: number, alpha: number) => {
      bg.lineStyle(width, color, alpha);
      bg.beginPath();
      bg.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
      for (let i = 1; i < PATH_POINTS.length; i++) bg.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
      bg.strokePath();
    };
    stroke(64, 0xb98a4e, 1);
    stroke(52, 0xd9b47c, 1);
    bg.lineStyle(3, 0xc4a06a, 0.8);
    for (let d = 30; d < this.totalPath - 30; d += 46) {
      const p = this.pathPos(d);
      const nx = Math.cos(p.angle + Math.PI / 2), ny = Math.sin(p.angle + Math.PI / 2);
      bg.beginPath();
      bg.moveTo(p.x - nx * 12, p.y - ny * 12);
      bg.lineTo(p.x + nx * 12, p.y + ny * 12);
      bg.strokePath();
    }
    for (let i = 0; i < 26; i++) {
      const x = 40 + this.rand(5000 + i) * (W - 80), y = HUD_H + 40 + this.rand(6000 + i) * (H - HUD_H - 80);
      if (this.distToPath(x, y) < 62) continue;
      if (this.rand(7000 + i) > 0.42) {
        bg.fillStyle(0xc9a06a, 1);
        bg.fillEllipse(x, y, 22 + this.rand(i + 11) * 14, 15 + this.rand(i + 12) * 9);
        bg.fillStyle(0xe0bd8a, 1);
        bg.fillEllipse(x - 3, y - 3, 12, 7);
      } else {
        bg.fillStyle(0x4e8f4a, 1);
        bg.fillRoundedRect(x - 4, y - 16, 8, 24, 4);
        bg.fillRoundedRect(x - 13, y - 10, 9, 5, 2.5);
        bg.fillRoundedRect(x + 4, y - 13, 9, 5, 2.5);
        bg.fillRect(x - 13, y - 10, 4, 8);
        bg.fillRect(x + 9, y - 13, 4, 9);
      }
    }
    this.drawSolarPanel(110, 300, 0.9, bg);
    this.drawSolarPanel(163, 256, 0.75, bg);
    // relay pad
    bg.fillStyle(0x8a6a3a, 1);
    bg.fillEllipse(W - 52, 548, 96, 122);
    bg.fillStyle(0xa8845a, 1);
    bg.fillEllipse(W - 52, 548, 70, 98);
    // HUD backdrop
    bg.fillStyle(0x241a10, 1);
    bg.fillRect(0, 0, W, HUD_H);
    bg.fillStyle(0x3a2b1c, 1);
    bg.fillRect(0, HUD_H - 4, W, 4);
    bg.fillStyle(0xffd166, 1);
    bg.fillRect(0, HUD_H - 2, W, 2);

    this.dynGfx = this.add.graphics();
    this.towerGfx = this.add.graphics();
    this.enemyGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
  }

  drawSolarPanel(x: number, y: number, s: number, g: Phaser.GameObjects.Graphics) {
    g.save();
    g.translateCanvas(x, y);
    g.scaleCanvas(s, s);
    g.fillStyle(0x5a4632, 1);
    g.fillRect(-3, 0, 6, 18);
    g.fillStyle(0x274b73, 1);
    g.fillRoundedRect(-26, -16, 52, 18, 2);
    g.fillStyle(0x3f6ea6, 1);
    for (let i = -1; i <= 1; i++) g.fillRect(i * 16 - 6, -14, 12, 14);
    g.lineStyle(1.5, 0x8fc3e8, 0.9);
    for (let i = -1; i <= 1; i++) g.strokeRect(i * 16 - 6, -14, 12, 14);
    g.restore();
  }
  // ---------- HUD ----------
  createHud() {
    const mk = (x: number, y: number, text: string, size: number, color: string, origin = 0) => {
      const t = this.add.text(x, y, text, { fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: `${size}px`, color, fontStyle: 'bold' }).setOrigin(origin, 0.5).setDepth(20);
      return t;
    };
    mk(16, 28, 'RELAY DEFENSE', 19, '#ffd166');
    this.hudTexts.wave = mk(196, 28, 'WAVE 1/6', 16, '#ffe9b8');
    const pill = (x: number, w: number) => {
      this.add.rectangle(x, 28, w, 34, 0x33261a, 0.95).setStrokeStyle(1.5, 0x6b5233).setOrigin(0, 0.5).setDepth(15);
    };
    pill(330, 132); pill(474, 126); pill(612, 148);
    mk(344, 28, '◉', 18, '#ffd166');
    this.hudTexts.gold = mk(368, 28, '170', 18, '#ffd166');
    mk(486, 28, '♥', 18, '#ff7a6b');
    this.hudTexts.lives = mk(510, 28, '20', 18, '#ffb3a6');
    mk(624, 28, '★', 16, '#9adcff');
    this.hudTexts.score = mk(648, 28, '0', 18, '#bfe9ff');

    this.buttons.pause = this.makeButton(846, 8, 44, 40, 'II', 0x33261a, 0xffd166, () => this.togglePause());
    this.buttons.speed = this.makeButton(898, 8, 52, 40, '1×', 0x33261a, 0xffd166, () => this.toggleSpeed());
    this.buttons.mute = this.makeButton(958, 8, 44, 40, '♪', 0x33261a, 0xffd166, () => this.toggleMute());
    this.buttons.restart = this.makeButton(1010, 8, 44, 40, '↻', 0x33261a, 0xffd166, () => this.scene.restart());
    const start = this.makeButton(W - 200, H - 78, 176, 58, 'START WAVE', 0xb3541e, 0xffe9b8, () => this.startWave());
    start.container.setDepth(25);
    start.label.setFontSize(19);
    this.buttons.start = start;
  }

  makeButton(x: number, y: number, w: number, h: number, label: string, bg: number, fg: number, onClick: () => void): Button {
    const container = this.add.container(x, y).setDepth(20);
    const bgRect = this.add.rectangle(0, 0, w, h, bg, 0.96).setStrokeStyle(1.5, 0x8a6a3a).setOrigin(0, 0);
    const text = this.add.text(w / 2, h / 2, label, { fontFamily: 'Trebuchet MS, Verdana, sans-serif', fontSize: '17px', color: '#' + fg.toString(16).padStart(6, '0'), fontStyle: 'bold' }).setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bgRect.setFillStyle(0x4a3826, 1));
    hit.on('pointerout', () => bgRect.setFillStyle(bg, 0.96));
    hit.on('pointerdown', (p: Phaser.Input.Pointer) => { p.event?.stopPropagation(); onClick(); });
    container.add([bgRect, text, hit]);
    return { container, bg: bgRect, label: text, hit };
  }

  // ---------- Build panel ----------
  createBuildPanel() {
    const defs: TowerKind[] = ['lancer', 'mortar'];
    defs.forEach((kind, i) => {
      const x = 16 + i * 200;
      const y = H - 76;
      const card = this.add.rectangle(x, y, 188, 64, 0x2c2117, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0x6b5233).setDepth(20).setInteractive({ useHandCursor: true });
      const icon = this.add.graphics().setDepth(21);
      this.drawTowerIcon(icon, kind, x + 33, y + 33, 1);
      this.add.text(x + 64, y + 8, TOWER_DEFS[kind].name, { fontFamily: 'Trebuchet MS', fontSize: '13px', color: '#ffe9b8', fontStyle: 'bold' }).setDepth(21);
      this.add.text(x + 64, y + 27, kind === 'lancer' ? 'Rapid single-target' : 'Splash damage', { fontFamily: 'Trebuchet MS', fontSize: '10px', color: '#c9b18a' }).setDepth(21);
      this.add.text(x + 64, y + 42, `◉ ${TOWER_DEFS[kind].cost}`, { fontFamily: 'Trebuchet MS', fontSize: '14px', color: '#ffd166', fontStyle: 'bold' }).setDepth(21);
      card.on('pointerover', () => { if (this.selectedBuild !== kind) card.setStrokeStyle(2, 0xa8824f); });
      card.on('pointerout', () => { if (this.selectedBuild !== kind) card.setStrokeStyle(2, 0x6b5233); });
      card.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event?.stopPropagation();
        audio.ensure(); audio.sfxSelect();
        this.selectedBuild = this.selectedBuild === kind ? null : kind;
        this.selectedTower = null;
        this.refreshBuildPanel(); this.refreshSelectionPanel();
      });
      this.buildCards[kind] = { bg: card };
    });
    this.hintText = this.add.text(W / 2, HUD_H + 10, '', {
      fontFamily: 'Trebuchet MS', fontSize: '14px', color: '#fff6d8', fontStyle: 'bold',
      backgroundColor: 'rgba(36,26,16,0.78)', padding: { x: 14, y: 6 },
    }).setOrigin(0.5, 0).setDepth(18);
  }

  drawTowerIcon(g: Phaser.GameObjects.Graphics, kind: TowerKind, x: number, y: number, s: number) {
    g.save(); g.translateCanvas(x, y); g.scaleCanvas(s, s);
    if (kind === 'lancer') {
      g.fillStyle(0x8a6a3a, 1); g.fillCircle(0, 4, 15);
      g.fillStyle(0xd9c08a, 1); g.fillCircle(0, 2, 11);
      g.fillStyle(0x59d6ff, 1); g.fillCircle(0, -2, 6.5);
      g.fillStyle(0xd8f6ff, 1); g.fillCircle(-2, -4, 2.4);
    } else {
      g.fillStyle(0x6e4a2a, 1); g.fillCircle(0, 5, 15);
      g.fillStyle(0xb0763a, 1); g.fillCircle(0, 3, 11);
      g.fillStyle(0x3a2a1c, 1); g.fillCircle(0, 0, 6.5);
      g.lineStyle(4, 0xd9c08a, 1); g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -13); g.strokePath();
    }
    g.restore();
  }

  refreshBuildPanel() {
    (Object.keys(this.buildCards) as TowerKind[]).forEach((kind) => {
      const card = this.buildCards[kind]; if (!card) return;
      const sel = this.selectedBuild === kind;
      card.bg.setStrokeStyle(3, sel ? 0xffd166 : 0x6b5233);
      card.bg.setFillStyle(sel ? 0x453322 : 0x2c2117, 0.96);
    });
  }
  // ---------- Selection panel (upgrade / sell) ----------
  createSelectionPanel() {
    this.selectionPanel = this.add.container(424, H - 80).setDepth(22).setVisible(false);
    const bg = this.add.rectangle(0, 0, 320, 68, 0x2c2117, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0xffd166);
    this.selectionText = this.add.text(12, 6, '', { fontFamily: 'Trebuchet MS', fontSize: '12px', color: '#ffe9b8', fontStyle: 'bold', lineSpacing: 3 });
    this.selectionPanel.add([bg, this.selectionText]);
    this.upgradeBtn = this.makeButton(436, H - 44, 150, 26, 'UPGRADE', 0x2f5d34, 0xa8f0b0, () => this.upgradeSelected());
    this.upgradeBtn.container.setDepth(23); this.upgradeBtn.label.setFontSize(12);
    this.sellBtn = this.makeButton(592, H - 44, 116, 26, 'SELL', 0x5d2f2f, 0xffb0a0, () => this.sellSelected());
    this.sellBtn.container.setDepth(23); this.sellBtn.label.setFontSize(12);
    this.upgradeBtn.container.setVisible(false);
    this.sellBtn.container.setVisible(false);
  }

  refreshSelectionPanel() {
    const t = this.selectedTower;
    const show = !!t;
    this.selectionPanel.setVisible(show);
    this.upgradeBtn.container.setVisible(show);
    this.sellBtn.container.setVisible(show);
    if (!t) return;
    const def = TOWER_DEFS[t.kind];
    const maxed = t.level >= 3;
    this.selectionText.setText(`${def.name}  ·  Lv ${t.level}\nDamage ${this.towerDamage(t)} · Range ${Math.round(this.towerRange(t))}`);
    this.upgradeBtn.label.setText(maxed ? 'MAX LEVEL' : `UPGRADE ◉${def.upgrades[t.level - 1].cost}`);
    this.sellBtn.label.setText(`SELL ◉${this.sellValue(t)}`);
  }

  // ---------- Overlay (pause / win / lose) ----------
  showOverlay(title: string, subtitle: string, accent: string, buttonLabel: string, onButton: () => void) {
    this.hideOverlay();
    const c = this.add.container(0, 0).setDepth(40);
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x140d08, 0.72);
    const accentColor = parseInt(accent.replace('#', ''), 16);
    const panel = this.add.rectangle(W / 2, H / 2, 540, 260, 0x2c2117, 0.98).setStrokeStyle(3, accentColor);
    const t = this.add.text(W / 2, H / 2 - 76, title, { fontFamily: 'Georgia, serif', fontSize: '42px', color: accent, fontStyle: 'bold' }).setOrigin(0.5);
    const s = this.add.text(W / 2, H / 2 - 14, subtitle, { fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#ffe9b8', align: 'center', lineSpacing: 6 }).setOrigin(0.5);
    c.add([dim, panel, t, s]);
    const btn = this.makeButton(W / 2 - 110, H / 2 + 48, 220, 52, buttonLabel, 0xb3541e, 0xffe9b8, onButton);
    btn.container.setDepth(41);
    btn.label.setFontSize(19);
    this.overlayContainer = c;
    this.overlayButton = btn;
  }

  hideOverlay() {
    if (this.overlayContainer) { this.overlayContainer.destroy(); this.overlayContainer = null; }
    if (this.overlayButton) { this.overlayButton.container.destroy(); this.overlayButton = null; }
  }

  // ---------- Input ----------
  bindInput() {
    this.input.mouse?.disableContextMenu();
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.hoverCell = this.cellAt(p.x, p.y); });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.ensure();
      if (p.rightButtonDown()) {
        this.selectedBuild = null; this.selectedTower = null;
        this.refreshBuildPanel(); this.refreshSelectionPanel(); return;
      }
      if (p.y < HUD_H || p.y > H - 84) return; // UI zones handle their own clicks
      const cell = this.cellAt(p.x, p.y);
      if (this.selectedBuild && cell) { this.tryPlace(cell.col, cell.row); return; }
      const t = this.towerAt(p.x, p.y);
      this.selectedTower = t;
      if (t) { audio.sfxSelect(); this.selectedBuild = null; }
      this.refreshBuildPanel(); this.refreshSelectionPanel();
    });
    this.input.keyboard?.on('keydown-ESC', () => { this.selectedBuild = null; this.selectedTower = null; this.refreshBuildPanel(); this.refreshSelectionPanel(); });
    this.input.keyboard?.on('keydown-SPACE', (e: KeyboardEvent) => { e.preventDefault(); if (this.phase === 'build') this.startWave(); else this.togglePause(); });
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-M', () => this.toggleMute());
    this.input.keyboard?.on('keydown-ONE', () => { this.selectedBuild = 'lancer'; this.refreshBuildPanel(); });
    this.input.keyboard?.on('keydown-TWO', () => { this.selectedBuild = 'mortar'; this.refreshBuildPanel(); });
  }

  cellAt(x: number, y: number): { col: number; row: number } | null {
    if (y < HUD_H) return null;
    const col = Math.floor(x / TILE), row = Math.floor((y - HUD_H) / TILE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }

  towerAt(x: number, y: number): Tower | null {
    for (const t of this.towers) if (Math.hypot(t.x - x, t.y - y) < 30) return t;
    return null;
  }

  towerDamage(t: Tower) { const d = TOWER_DEFS[t.kind]; return t.level === 1 ? d.damage : d.upgrades[t.level - 2].damage; }
  towerRate(t: Tower) { const d = TOWER_DEFS[t.kind]; return t.level === 1 ? d.rate : d.upgrades[t.level - 2].rate; }
  towerRange(t: Tower) { const d = TOWER_DEFS[t.kind]; return t.level === 1 ? d.range : d.upgrades[t.level - 2].range; }
  towerAoe(t: Tower) { return t.kind === 'lancer' ? 0 : (t.level === 1 ? TOWER_AOE.mortar : (TOWER_DEFS.mortar.upgrades[t.level - 2].aoe ?? 70)); }
  sellValue(t: Tower) { return Math.floor(t.invested * 0.7); }

  canPlace(col: number, row: number): boolean {
    if (this.pathCells[row][col]) return false;
    return !this.towers.some(t => t.col === col && t.row === row);
  }

  tryPlace(col: number, row: number) {
    const kind = this.selectedBuild!;
    const def = TOWER_DEFS[kind];
    if (!this.canPlace(col, row)) { this.flashHint('Blocked — build on open sand, not the road'); audio.sfxError(); return; }
    if (this.gold < def.cost) { this.flashHint('Not enough gold'); audio.sfxError(); return; }
    this.gold -= def.cost;
    this.towers.push({ id: this.idCounter++, kind, col, row, x: colX(col), y: rowY(row), level: 1, cooldown: 0, angle: -Math.PI / 2, invested: def.cost });
    audio.sfxBuild();
    this.burst(colX(col), rowY(row), 10, 0xffd166, 120);
    this.selectedBuild = null;
    this.refreshBuildPanel();
    if (this.hintStage === 0) { this.hintStage = 1; this.showHint('Nice! Press START WAVE when your defenses are ready'); }
  }

  upgradeSelected() {
    const t = this.selectedTower; if (!t) return;
    const def = TOWER_DEFS[t.kind];
    if (t.level >= 3) { audio.sfxError(); return; }
    const cost = def.upgrades[t.level - 1].cost;
    if (this.gold < cost) { this.flashHint('Not enough gold to upgrade'); audio.sfxError(); return; }
    this.gold -= cost; t.invested += cost; t.level += 1;
    audio.sfxUpgrade();
    this.burst(t.x, t.y, 14, 0x9adcff, 150);
    this.rings.push({ x: t.x, y: t.y, r: 8, maxR: 46, color: 0x9adcff, width: 3, life: 0.5 });
    this.refreshSelectionPanel();
  }

  sellSelected() {
    const t = this.selectedTower; if (!t) return;
    this.gold += this.sellValue(t);
    this.towers = this.towers.filter(x => x !== t);
    audio.sfxCoin();
    this.burst(t.x, t.y, 8, 0xd9c08a, 100);
    this.selectedTower = null;
    this.refreshSelectionPanel();
  }

  showHint(msg: string) { this.hintText.setText(msg).setVisible(true).setAlpha(1); }
  flashHint(msg: string) { this.showHint(msg); }
  togglePause() {
    if (this.phase === 'won' || this.phase === 'lost') return;
    this.paused = !this.paused;
    audio.ensure(); audio.sfxSelect();
    if (this.paused) this.showOverlay('PAUSED', 'The desert waits.\nPress P or tap RESUME to continue.', '#ffd166', 'RESUME', () => this.togglePause());
    else this.hideOverlay();
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    this.buttons.speed.label.setText(this.speed === 1 ? '1×' : '2×');
    audio.ensure(); audio.sfxSelect();
  }

  toggleMute() {
    this.muted = !this.muted;
    audio.ensure(); audio.setMuted(this.muted);
    this.buttons.mute.label.setText(this.muted ? '✕' : '♪');
  }

  startWave() {
    if (this.phase !== 'build') return;
    audio.ensure();
    this.phase = 'wave';
    this.waveTime = 0;
    this.spawnQueue = WAVES[this.wave].map(e => ({ ...e }));
    this.selectedBuild = null;
    this.refreshBuildPanel();
    this.showHint(`Wave ${this.wave + 1} of ${WAVES.length} — hold the relay!`);
    audio.sfxUpgrade();
  }

  // ---------- Simulation ----------
  stepSim(dt: number) {
    this.elapsed += dt;
    if (this.paused) return;
    if (this.phase === 'wave') {
      this.waveTime += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveTime) {
        this.spawnEnemy(this.spawnQueue.shift()!.kind);
      }
    }
    if (this.phase === 'build' || this.phase === 'wave') {
      for (const t of this.towers) {
        t.cooldown -= dt;
        const range = this.towerRange(t);
        let best: Enemy | null = null, bestDist = -1;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          if (d <= range && e.dist > bestDist) { bestDist = e.dist; best = e; }
        }
        if (best) {
          t.angle = Math.atan2(best.y - t.y, best.x - t.x);
          if (t.cooldown <= 0) { t.cooldown = 1 / this.towerRate(t); this.fire(t, best); }
        }
      }
    }
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step || p.life <= 0) { this.impact(p); p.life = -1; }
      else { p.x += (dx / d) * step; p.y += (dy / d) * step; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    for (const e of this.enemies) {
      e.dist += e.speed * dt;
      e.flash = Math.max(0, e.flash - dt);
      const pos = this.pathPos(e.dist);
      e.x = pos.x; e.y = pos.y;
      if (e.dist >= this.totalPath - 4 && !e.dead) {
        e.dead = true;
        this.lives = Math.max(0, this.lives - e.damage);
        this.relayFlash = 0.6;
        this.shake = Math.max(this.shake, 0.35);
        this.rings.push({ x: W - 52, y: 548, r: 20, maxR: 90, color: 0xff6b57, width: 5, life: 0.6 });
        audio.sfxLeak();
        if (this.lives <= 0) this.loseGame();
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);
    if (this.phase === 'wave' && this.spawnQueue.length === 0 && this.enemies.length === 0) {
      const bonus = WAVE_BONUS[this.wave] ?? 0;
      this.gold += bonus;
      this.score += 100 * (this.wave + 1);
      if (this.wave >= WAVES.length - 1) { this.winGame(); }
      else {
        this.wave += 1;
        this.phase = 'build';
        this.showHint(`Wave cleared! +${bonus}g bonus — reinforce, then START WAVE`);
        audio.sfxCoin();
      }
    }
    this.updateFx(dt);
  }

  spawnEnemy(kind: EnemyKind) {
    const def = ENEMY_DEFS[kind];
    const hpScale = 1 + this.wave * 0.22;
    const hp = Math.round(def.hp * hpScale);
    const pos = this.pathPos(0);
    this.enemies.push({
      id: this.idCounter++, kind, hp, maxHp: hp, dist: 0, x: pos.x, y: pos.y,
      speed: def.speed, reward: def.reward, damage: def.damage, radius: def.radius, score: def.score,
      flash: 0, dead: false,
    });
  }

  fire(t: Tower, target: Enemy) {
    const dmg = this.towerDamage(t);
    if (t.kind === 'lancer') {
      const ang = Math.atan2(target.y - t.y, target.x - t.x);
      this.projectiles.push({ x: t.x + Math.cos(ang) * 14, y: t.y + Math.sin(ang) * 14, target, tx: target.x, ty: target.y, speed: 540, damage: dmg, aoe: 0, kind: 'lancer', life: 2 });
      this.rings.push({ x: t.x + Math.cos(ang) * 16, y: t.y + Math.sin(ang) * 16, r: 3, maxR: 10, color: 0x9be8ff, width: 2, life: 0.18 });
      audio.sfxShoot();
    } else {
      this.projectiles.push({ x: t.x, y: t.y - 6, target: null, tx: target.x, ty: target.y, speed: 320, damage: dmg, aoe: this.towerAoe(t), kind: 'mortar', life: 3 });
      audio.sfxMortar();
    }
  }

  impact(p: Projectile) {
    if (p.aoe > 0) {
      audio.sfxExplosion();
      this.rings.push({ x: p.tx, y: p.ty, r: 8, maxR: p.aoe, color: 0xffc46b, width: 5, life: 0.45 });
      this.burst(p.tx, p.ty, 16, 0xffb257, 170);
      this.burst(p.tx, p.ty, 8, 0x8a5a2a, 120);
      this.shake = Math.max(this.shake, 0.12);
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.aoe + e.radius) this.damageEnemy(e, p.damage);
      }
    } else if (p.target && !p.target.dead) {
      this.damageEnemy(p.target, p.damage);
      this.burst(p.tx, p.ty, 4, 0x9be8ff, 90);
    }
  }

  damageEnemy(e: Enemy, dmg: number) {
    e.hp -= dmg;
    e.flash = 0.09;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.gold += e.reward;
      this.score += e.score;
      const ft = this.add.text(e.x, e.y - 16, `+${e.reward}`, { fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#ffd166', fontStyle: 'bold', stroke: '#241a10', strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
      this.texts.push({ obj: ft, life: 0.9 });
      this.burst(e.x, e.y, e.kind === 'boss' ? 30 : 10, e.kind === 'boss' ? 0xc084fc : 0xff9d5c, 150);
      this.rings.push({ x: e.x, y: e.y, r: 6, maxR: e.kind === 'boss' ? 80 : 26, color: 0xffe1a8, width: 3, life: 0.4 });
      audio.sfxCoin();
      if (e.kind === 'boss') { this.shake = Math.max(this.shake, 0.6); audio.sfxExplosion(); }
    }
  }

  burst(x: number, y: number, n: number, color: number, speed: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.55 + Math.random() * 0.3, maxLife: 0.85, size: 2 + Math.random() * 3, color });
    }
  }

  updateFx(dt: number) {
    for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const t of this.texts) { t.life -= dt; t.obj.y -= 34 * dt; t.obj.setAlpha(Math.min(1, t.life / 0.5)); }
    for (const t of this.texts) if (t.life <= 0) t.obj.destroy();
    this.texts = this.texts.filter(t => t.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.maxR - r.r) * 6 * dt; }
    this.rings = this.rings.filter(r => r.life > 0);
    this.shake = Math.max(0, this.shake - dt);
    this.relayFlash = Math.max(0, this.relayFlash - dt);
  }

  winGame() {
    this.phase = 'won';
    this.score += this.lives * 50;
    audio.sfxWin();
    this.showOverlay('RELAY SECURED', `The desert line holds.\nFinal score ${this.score}  ·  ${this.lives} lives left`, '#ffd166', 'PLAY AGAIN', () => this.scene.restart());
  }

  loseGame() {
    this.phase = 'lost';
    audio.sfxLose();
    this.showOverlay('RELAY OVERRUN', `The swarm breached the relay on wave ${this.wave + 1}.\nScore ${this.score}`, '#ff8a70', 'TRY AGAIN', () => this.scene.restart());
  }
  // ---------- Frame loop ----------
  update() {
    const dt = Math.min(this.game.loop.delta / 1000, 0.05);
    if (!this.paused) this.stepSim(dt * this.speed);
    audio.update();
    this.render();
    this.refreshHud();
  }

  refreshHud() {
    this.hudTexts.gold.setText(String(this.gold));
    this.hudTexts.lives.setText(String(this.lives));
    this.hudTexts.score.setText(String(this.score));
    this.hudTexts.wave.setText(`WAVE ${Math.min(this.wave + 1, WAVES.length)}/${WAVES.length}`);
    const startBtn = this.buttons.start;
    if (this.phase === 'build') {
      startBtn.label.setText(this.wave === 0 ? 'START WAVE' : `START WAVE ${this.wave + 1}`);
      startBtn.bg.setFillStyle(0xb3541e, 0.96);
    } else if (this.phase === 'wave') {
      startBtn.label.setText(`WAVE ${this.wave + 1}… ${this.enemies.length + this.spawnQueue.length} left`);
      startBtn.bg.setFillStyle(0x4a3826, 0.96);
    } else {
      startBtn.label.setText(this.phase === 'won' ? 'VICTORY' : 'DEFEAT');
      startBtn.bg.setFillStyle(0x4a3826, 0.96);
    }
    if (this.phase !== 'build' && this.hintText.visible && this.phase === 'wave') {
      // fade hint during waves after a few seconds
      if (this.waveTime > 3.5) this.hintText.setAlpha(Math.max(0, this.hintText.alpha - 0.02));
    } else if (this.phase === 'build') {
      this.hintText.setAlpha(1);
    }
  }

  render() {
    this.dynGfx.clear(); this.towerGfx.clear(); this.enemyGfx.clear(); this.fxGfx.clear();
    if (this.shake > 0) {
      this.cameras.main.setScroll((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 14);
    } else {
      this.cameras.main.setScroll(0, 0);
    }
    this.drawRelay();
    // hover ghost / selection ring
    if (this.selectedBuild && this.hoverCell) {
      const { col, row } = this.hoverCell;
      const ok = this.canPlace(col, row) && this.gold >= TOWER_DEFS[this.selectedBuild].cost;
      const x = colX(col), y = rowY(row);
      this.dynGfx.fillStyle(ok ? 0x7dff8a : 0xff6b57, 0.26);
      this.dynGfx.fillRect(col * TILE, HUD_H + row * TILE, TILE, TILE);
      this.dynGfx.lineStyle(2, ok ? 0x7dff8a : 0xff6b57, 0.9);
      this.dynGfx.strokeRect(col * TILE + 1, HUD_H + row * TILE + 1, TILE - 2, TILE - 2);
      this.dynGfx.fillStyle(0x9be8ff, 0.08);
      this.dynGfx.fillCircle(x, y, TOWER_DEFS[this.selectedBuild].range);
      this.dynGfx.lineStyle(2, 0x9be8ff, 0.5);
      this.dynGfx.strokeCircle(x, y, TOWER_DEFS[this.selectedBuild].range);
      this.drawTowerShape(this.dynGfx, this.selectedBuild, x, y, -Math.PI / 2, 1, 0.55);
    } else if (this.selectedTower) {
      const t = this.selectedTower;
      this.dynGfx.lineStyle(2, 0xffd166, 0.9);
      this.dynGfx.strokeCircle(t.x, t.y, 26);
      this.dynGfx.fillStyle(0xffd166, 0.07);
      this.dynGfx.fillCircle(t.x, t.y, this.towerRange(t));
      this.dynGfx.lineStyle(1.5, 0xffd166, 0.45);
      this.dynGfx.strokeCircle(t.x, t.y, this.towerRange(t));
    }
    for (const t of this.towers) this.drawTowerShape(this.towerGfx, t.kind, t.x, t.y, t.angle, t.level, 1);
    for (const e of this.enemies) this.drawEnemy(e);
    for (const p of this.projectiles) {
      if (p.kind === 'lancer') {
        this.fxGfx.fillStyle(0x9be8ff, 1); this.fxGfx.fillCircle(p.x, p.y, 3.4);
        this.fxGfx.fillStyle(0xffffff, 1); this.fxGfx.fillCircle(p.x, p.y, 1.5);
      } else {
        this.fxGfx.fillStyle(0x3a2a1c, 1); this.fxGfx.fillCircle(p.x, p.y, 5);
        this.fxGfx.fillStyle(0xffb257, 1); this.fxGfx.fillCircle(p.x - 1, p.y - 1, 2);
      }
    }
    for (const p of this.particles) {
      this.fxGfx.fillStyle(p.color, Math.max(0, p.life / p.maxLife));
      this.fxGfx.fillCircle(p.x, p.y, p.size);
    }
    for (const r of this.rings) {
      this.fxGfx.lineStyle(r.width, r.color, Math.max(0, r.life / 0.5));
      this.fxGfx.strokeCircle(r.x, r.y, r.r);
    }
  }

  drawRelay() {
    const g = this.dynGfx;
    const x = W - 52, y = 548;
    const pulse = 1 + Math.sin(this.elapsed * 2.4) * 0.08;
    const flash = this.relayFlash > 0 ? this.relayFlash : 0;
    // mast
    g.fillStyle(0x6b5233, 1);
    g.fillRect(x - 7, y - 120, 14, 128);
    g.fillStyle(0x8a6a3a, 1);
    g.fillRect(x - 16, y - 4, 32, 12);
    // cross arms
    g.fillStyle(0x8a6a3a, 1);
    g.fillRect(x - 34, y - 96, 68, 7);
    g.fillRect(x - 24, y - 62, 48, 6);
    // dish
    g.fillStyle(0xd9c08a, 1);
    g.fillEllipse(x - 30, y - 100, 26, 18);
    g.fillStyle(0xb09468, 1);
    g.fillEllipse(x - 30, y - 100, 15, 10);
    // glowing core
    const coreR = 13 * pulse + flash * 10;
    g.fillStyle(flash > 0 ? 0xff8a70 : 0xffd166, 0.35 + flash * 0.5);
    g.fillCircle(x, y - 132, coreR + 10);
    g.fillStyle(flash > 0 ? 0xffb09a : 0xffe9a8, 1);
    g.fillCircle(x, y - 132, coreR);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x - 3, y - 136, coreR * 0.4);
    // energy beam hint upward
    g.lineStyle(2, 0xffe9a8, 0.35 + 0.25 * Math.sin(this.elapsed * 2.4) + flash * 0.4);
    g.beginPath(); g.moveTo(x, y - 144); g.lineTo(x, HUD_H + 6); g.strokePath();
  }
  drawTowerShape(g: Phaser.GameObjects.Graphics, kind: TowerKind, x: number, y: number, angle: number, level: number, alpha: number) {
    g.save();
    g.translateCanvas(x, y);
    g.setAlpha(alpha);
    // base
    g.fillStyle(0x5a4632, 1);
    g.fillCircle(0, 0, 21);
    g.fillStyle(kind === 'lancer' ? 0xd9c08a : 0xb0763a, 1);
    g.fillCircle(0, 0, 17);
    g.fillStyle(kind === 'lancer' ? 0xb89a62 : 0x8a5a2a, 1);
    g.fillCircle(0, 0, 12.5);
    // barrel / turret rotated toward target
    g.save();
    g.rotateCanvas(angle + Math.PI / 2);
    if (kind === 'lancer') {
      g.fillStyle(0x59d6ff, 1);
      g.fillRoundedRect(-3.5, -22, 7, 18, 2);
      g.fillStyle(0xd8f6ff, 1);
      g.fillRect(-1.2, -24, 2.4, 6);
    } else {
      g.fillStyle(0x3a2a1c, 1);
      g.fillRoundedRect(-6, -24, 12, 20, 3);
      g.fillStyle(0x241812, 1);
      g.fillRect(-4.5, -26, 9, 5);
    }
    g.restore();
    // core
    if (kind === 'lancer') {
      g.fillStyle(0x59d6ff, 1);
      g.fillCircle(0, 0, 7.5);
      g.fillStyle(0xd8f6ff, 1);
      g.fillCircle(-2, -2, 3);
    } else {
      g.fillStyle(0x241812, 1);
      g.fillCircle(0, 0, 8);
      g.fillStyle(0xffb257, 1);
      g.fillCircle(0, 0, 3.4);
    }
    // level pips
    for (let i = 0; i < level; i++) {
      g.fillStyle(0xffd166, 1);
      g.fillCircle(-8 + i * 8, 13.5, 2.1);
    }
    g.restore();
    g.setAlpha(1);
  }

  drawEnemy(e: Enemy) {
    const g = this.enemyGfx;
    const flash = e.flash > 0;
    const body = (c: number) => (flash ? 0xffffff : c);
    g.save();
    g.translateCanvas(e.x, e.y);
    if (e.kind === 'skitter') {
      // skittering legs
      const wig = Math.sin(this.elapsed * 14 + e.id * 1.7) * 3;
      g.lineStyle(2.4, body(0x7a4a2a), 1);
      for (const s of [-1, 1]) {
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(i * 6, 0);
          g.lineTo(i * 8 + s * 11, (i * 6) + wig * s + 8);
          g.strokePath();
        }
      }
      g.fillStyle(body(0xa85f34), 1);
      g.fillEllipse(0, 0, 20, 13);
      g.fillStyle(body(0xc97f4e), 1);
      g.fillEllipse(3, -2, 11, 8);
      g.fillStyle(body(0x2a1a10), 1);
      g.fillCircle(7, -2, 1.8);
    } else if (e.kind === 'raider') {
      g.fillStyle(body(0x8a3b2e), 1);
      g.fillEllipse(0, 4, 22, 14);
      g.fillStyle(body(0xb8552f), 1);
      g.fillRoundedRect(-8, -12, 16, 12, 4);
      g.fillStyle(body(0xe0b06a), 1);
      g.fillTriangle(-8, -10, 0, -20, 8, -10);
      g.fillStyle(body(0x2a1a10), 1);
      g.fillCircle(-4, -6, 1.6); g.fillCircle(4, -6, 1.6);
    } else if (e.kind === 'bulwark') {
      g.fillStyle(body(0x4a4a52), 1);
      g.fillRoundedRect(-17, -16, 34, 30, 6);
      g.fillStyle(body(0x6a6a76), 1);
      g.fillRoundedRect(-13, -12, 26, 22, 4);
      g.fillStyle(body(0x35353d), 1);
      g.fillRect(-13, 2, 26, 5);
      g.fillStyle(body(0xffd166), 1);
      g.fillCircle(-6, -4, 2.2); g.fillCircle(6, -4, 2.2);
    } else {
      // boss: Dust Tyrant
      const pulse = 1 + Math.sin(this.elapsed * 3) * 0.05;
      g.fillStyle(body(0x3d2a52), 1);
      g.fillCircle(0, 0, 30 * pulse);
      g.fillStyle(body(0x5a3f7a), 1);
      g.fillCircle(0, 0, 23 * pulse);
      // crown horns
      g.fillStyle(body(0xc084fc), 1);
      for (let i = -1; i <= 1; i++) {
        g.fillTriangle(i * 14 - 6, -18, i * 14, -36 - (i === 0 ? 8 : 0), i * 14 + 6, -18);
      }
      g.fillStyle(body(0xe9d5ff), 1);
      g.fillCircle(-9, -4, 4); g.fillCircle(9, -4, 4);
      g.fillStyle(body(0x1a1024), 1);
      g.fillCircle(-9, -4, 1.8); g.fillCircle(9, -4, 1.8);
      g.fillStyle(body(0x2a1a38), 1);
      g.fillRoundedRect(-12, 8, 24, 7, 3);
    }
    g.restore();
    // health bar
    const w = e.kind === 'boss' ? 56 : 30;
    const h = e.kind === 'boss' ? 6 : 4;
    const pct = Math.max(0, e.hp / e.maxHp);
    const yOff = -(e.radius + 12);
    g.fillStyle(0x241a10, 0.9);
    g.fillRect(e.x - w / 2, e.y + yOff, w, h);
    g.fillStyle(pct > 0.5 ? 0x7dff8a : pct > 0.25 ? 0xffd166 : 0xff6b57, 1);
    g.fillRect(e.x - w / 2 + 0.5, e.y + yOff + 0.5, (w - 1) * pct, h - 1);
  }

  // ---------- Test hooks ----------
  exposeHooks() {
    const w = window as unknown as Record<string, unknown>;
    w.render_game_to_text = () => this.renderGameToText();
    w.advanceTime = (ms: number) => {
      const step = 1000 / 60;
      let remaining = ms;
      while (remaining > 0) {
        const dt = Math.min(step, remaining);
        this.stepSim(dt / 1000);
        remaining -= dt;
      }
      this.render();
      this.refreshHud();
    };
  }

  renderGameToText(): string {
    const state = {
      phase: this.phase,
      paused: this.paused,
      speed: this.speed,
      wave: this.wave + 1,
      totalWaves: WAVES.length,
      gold: this.gold,
      lives: this.lives,
      score: this.score,
      enemies: this.enemies.map(e => ({ kind: e.kind, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp), maxHp: e.maxHp, dist: Math.round(e.dist) })),
      towers: this.towers.map(t => ({ kind: t.kind, col: t.col, row: t.row, level: t.level, x: Math.round(t.x), y: Math.round(t.y) })),
      spawnQueue: this.spawnQueue.length,
      selectedBuild: this.selectedBuild,
      selectedTower: this.selectedTower ? { kind: this.selectedTower.kind, level: this.selectedTower.level } : null,
    };
    return JSON.stringify(state);
  }
}
