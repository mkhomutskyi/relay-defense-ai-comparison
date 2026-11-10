import * as Phaser from 'phaser';
import { audio } from './audio';
import { createSandTexture, GAME_H, GAME_W } from './art';
import {
  ENEMIES, EnemyDef, EnemyKind, Mode, PAD_SPECS, PATH_POINTS, Phase, RELAY,
  START_INTEGRITY, START_SCRAP, SpawnGroup, TOWERS, TowerKind, UI,
  WAVES, WaveDef, inRect, upgradeCost,
} from './defs';
import {
  drawEnemyVisual, drawMap, drawMapLabels, drawPad, drawRelay, drawScrapIcon,
  drawTower, drawTowerIcon, updateTowerPips, RelayVisual,
} from './visuals';

interface Enemy {
  id: number;
  kind: EnemyKind;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  progress: number;
  offset: number;
  wobble: number;
  container: Phaser.GameObjects.Container;
  visual: Phaser.GameObjects.Container;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  hitFlash: number;
  alive: boolean;
  x: number;
  y: number;
  angle: number;
}

interface Tower {
  id: number;
  kind: TowerKind;
  x: number;
  y: number;
  level: number;
  cooldown: number;
  container: Phaser.GameObjects.Container;
  head: Phaser.GameObjects.Container;
  pips: Phaser.GameObjects.Graphics;
  angle: number;
  flash: number;
}

interface Pad {
  x: number;
  y: number;
  towerId: number | null;
  gfx: Phaser.GameObjects.Graphics;
  hover: boolean;
}

interface BeamEffect {
  type: 'beam';
  x1: number; y1: number; x2: number; y2: number;
  color: number; width: number; ttl: number; maxTtl: number;
}
interface ArcEffect {
  type: 'arc';
  points: { x: number; y: number }[];
  color: number; ttl: number; maxTtl: number;
}
interface RingEffect {
  type: 'ring';
  x: number; y: number; r0: number; r1: number;
  color: number; width: number; ttl: number; maxTtl: number;
}
interface SparkEffect {
  type: 'spark';
  x: number; y: number; vx: number; vy: number;
  color: number; size: number; ttl: number; maxTtl: number;
}
type Effect = BeamEffect | ArcEffect | RingEffect | SparkEffect;

interface Floater {
  text: Phaser.GameObjects.Text;
  ttl: number;
  maxTtl: number;
  vy: number;
}

interface Banner {
  title: string;
  sub: string;
  color: string;
  ttl: number;
  maxTtl: number;
}

export class RelayScene extends Phaser.Scene {
  private curve!: Phaser.Curves.Spline;
  private pathLength = 1;
  private tmpVec = new Phaser.Math.Vector2();
  private tmpVec2 = new Phaser.Math.Vector2();

  private mode: Mode = 'menu';
  private phase: Phase = 'build';
  private paused = false;
  private manual = false;
  private speed = 1;
  private wave = 1;
  private integrity = START_INTEGRITY;
  private scrap = START_SCRAP;
  private score = 0;
  private kills = 0;
  private leaks = 0;
  private timeNow = 0;
  private waveTime = 0;
  private clearTimer = 0;
  private nextId = 1;

  private enemies: Enemy[] = [];
  private towers: Tower[] = [];
  private pads: Pad[] = [];
  private spawnQueue: { time: number; kind: EnemyKind }[] = [];
  private effects: Effect[] = [];
  private floaters: Floater[] = [];
  private selectedBuild: TowerKind | null = null;
  private selectedTower: Tower | null = null;
  private hoverPad: Pad | null = null;
  private bossRef: Enemy | null = null;
  private banner: Banner | null = null;
  private tip = 'Pick a tower, then click a lit pad to build.';

  private uiGfx!: Phaser.GameObjects.Graphics;
  private fxGfx!: Phaser.GameObjects.Graphics;
  private rangeGfx!: Phaser.GameObjects.Graphics;
  private relayVisual!: RelayVisual;
  private menuLayer!: Phaser.GameObjects.Container;
  private pauseLayer!: Phaser.GameObjects.Container;
  private endLayer!: Phaser.GameObjects.Container;
  private txt: Record<string, Phaser.GameObjects.Text> = {};
  private endTitle!: Phaser.GameObjects.Text;
  private endSub!: Phaser.GameObjects.Text;
  private endStats!: Phaser.GameObjects.Text;

  constructor() {
    super('RelayScene');
  }

  create(): void {
    createSandTexture(this);
    this.curve = new Phaser.Curves.Spline(PATH_POINTS.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    this.pathLength = Math.max(1, this.curve.getLength());

    drawMap(this, this.curve);
    drawMapLabels(this);
    this.relayVisual = drawRelay(this);

    this.rangeGfx = this.add.graphics().setDepth(4);
    this.fxGfx = this.add.graphics().setDepth(9);
    this.uiGfx = this.add.graphics().setDepth(50);

    this.createPads();
    this.createHud();
    this.createMenu();
    this.createPause();
    this.createEnd();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.onPointerMove(p));
    this.input.mouse?.disableContextMenu();

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture(['SPACE', 'P', 'M', 'R', 'F', 'ESC', 'ONE', 'TWO']);
      kb.on('keydown-SPACE', () => this.onSpace());
      kb.on('keydown-ENTER', () => this.onEnter());
      kb.on('keydown-P', () => this.togglePause());
      kb.on('keydown-M', () => this.toggleMute());
      kb.on('keydown-R', () => this.restart());
      kb.on('keydown-F', () => this.scale.toggleFullscreen());
      kb.on('keydown-ESC', () => this.onEscape());
      kb.on('keydown-ONE', () => this.selectBuild('sunspear'));
      kb.on('keydown-TWO', () => this.selectBuild('arc'));
    }

    this.installHooks();
    this.refreshPads();
    this.syncHud();
    this.drawEffects();
  }

  update(_time: number, delta: number): void {
    if (this.manual) return;
    this.tick(Math.min(delta / 1000, 0.05), true);
  }

  private createPads(): void {
    for (const spec of PAD_SPECS) {
      const gfx = this.add.graphics().setDepth(3).setPosition(spec.x, spec.y);
      this.pads.push({ x: spec.x, y: spec.y, towerId: null, gfx, hover: false });
    }
  }

  private label(
    x: number, y: number, text: string, size: number, color: string,
    font = '"Trebuchet MS", "Segoe UI", sans-serif', bold = true,
  ): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontFamily: font,
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
    }).setDepth(51);
    return t;
  }

  private createHud(): void {
    const cream = '#f7ecd6';
    const muted = '#a9b8ac';
    this.txt.brand = this.label(24, 10, 'RELAY DEFENSE', 23, cream, 'Georgia, serif');
    this.txt.brandSub = this.label(25, 39, 'SOLAR OUTPOST 07  ·  SECTOR 12', 10, '#e7a857');
    this.txt.brandSub.setLetterSpacing(1.2);
    this.txt.wave = this.label(300, 13, 'WAVE 1 / 6', 20, cream);
    this.txt.waveState = this.label(300, 40, 'BUILD PHASE', 11, '#ffc46b');
    this.txt.waveState.setLetterSpacing(1.3);
    this.txt.integrityLabel = this.label(500, 11, 'RELAY INTEGRITY', 10, muted);
    this.txt.integrityLabel.setLetterSpacing(1.2);
    this.txt.integrity = this.label(742, 41, '100%', 14, '#d9f0d6').setOrigin(0, 0.5);
    this.txt.scrapLabel = this.label(866, 38, 'SCRAP', 10, muted);
    this.txt.scrapLabel.setLetterSpacing(1.2);
    this.txt.scrap = this.label(884, 12, '175', 24, '#ffd37c');

    const btnDefs: [string, string, string][] = [
      ['pause', 'II', 'PAUSE'],
      ['speed', '1x', 'SPEED'],
      ['mute', '♪', 'SOUND'],
      ['restart', '↺', 'RESET'],
    ];
    for (const [key, icon, cap] of btnDefs) {
      this.txt[`btn_${key}`] = this.label(0, 0, icon, 17, cream).setOrigin(0.5);
      this.txt[`cap_${key}`] = this.label(0, 0, cap, 7, '#9fb0a4').setOrigin(0.5);
      this.txt[`cap_${key}`].setLetterSpacing(0.8);
    }

    this.txt.card1Name = this.label(78, 640, TOWERS.sunspear.name, 14, cream);
    this.txt.card1Role = this.label(78, 659, TOWERS.sunspear.role, 8, '#e7a857');
    this.txt.card1Role.setLetterSpacing(0.8);
    this.txt.card1Cost = this.label(78, 680, '70', 15, '#ffd37c');
    this.txt.card2Name = this.label(278, 640, TOWERS.arc.name, 14, cream);
    this.txt.card2Role = this.label(278, 659, TOWERS.arc.role, 8, '#6ed8c8');
    this.txt.card2Role.setLetterSpacing(0.8);
    this.txt.card2Cost = this.label(278, 680, '90', 15, '#ffd37c');
    this.txt.card1Key = this.label(34, 678, '1', 12, '#ffd37c').setOrigin(0.5);
    this.txt.card2Key = this.label(234, 678, '2', 12, '#ffd37c').setOrigin(0.5);

    this.txt.tip = this.label(446, 640, this.tip, 12, '#d8c9ab');
    this.txt.tip.setWordWrapWidth(414).setLineSpacing(3);
    this.txt.inspectName = this.label(446, 640, '', 15, cream);
    this.txt.inspectLevel = this.label(446, 660, '', 10, '#ffc46b');
    this.txt.inspectStats = this.label(446, 676, '', 11, '#d8c9ab');
    this.txt.upgrade = this.label(949, 658, '', 12, '#172724').setOrigin(0.5);
    this.txt.launch = this.label(1154, 654, 'LAUNCH WAVE', 17, '#172724').setOrigin(0.5);
    this.txt.launchSub = this.label(1154, 678, 'SPACE', 9, '#5d3a13').setOrigin(0.5);
    this.txt.launchSub.setLetterSpacing(1.5);
    this.txt.bossName = this.label(640, 80, 'DUST COLOSSUS', 13, '#ffd6a0').setOrigin(0.5);
    this.txt.bossName.setLetterSpacing(2).setVisible(false);
    this.txt.bannerTitle = this.label(640, 108, '', 28, '#fff0c8').setOrigin(0.5);
    this.txt.bannerSub = this.label(640, 140, '', 12, '#ffd37c').setOrigin(0.5);
    this.txt.bannerSub.setLetterSpacing(2);
    this.txt.bannerTitle.setVisible(false);
    this.txt.bannerSub.setVisible(false);
  }

  private createMenu(): void {
    this.menuLayer = this.add.container(0, 0).setDepth(60);
    const g = this.add.graphics();
    g.fillStyle(0x07110f, 0.34);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0x101d1a, 0.92);
    g.fillRoundedRect(64, 104, 590, 500, 10);
    g.lineStyle(2, 0xffb454, 0.75);
    g.strokeRoundedRect(64, 104, 590, 500, 10);
    g.lineStyle(1, 0xffb454, 0.18);
    g.strokeRoundedRect(74, 114, 570, 480, 7);
    g.fillStyle(0xffb454, 1);
    g.fillRect(94, 148, 52, 4);
    g.fillStyle(0x2f9b93, 1);
    g.fillRect(152, 148, 20, 4);
    g.fillStyle(0xffb454, 0.16);
    g.fillCircle(584, 154, 62);
    g.lineStyle(1.5, 0xffb454, 0.55);
    g.strokeCircle(584, 154, 44);
    g.strokeCircle(584, 154, 31);
    this.menuLayer.add(g);

    const add = (t: Phaser.GameObjects.GameObject) => { this.menuLayer.add(t); return t; };
    const kicker = this.label(94, 126, 'OUTPOST 07  ·  SECTOR 12', 11, '#ffb454');
    kicker.setLetterSpacing(2.4);
    add(kicker);
    const title1 = this.label(90, 160, 'RELAY', 74, '#f7ecd6', 'Georgia, serif');
    const title2 = this.label(90, 232, 'DEFENSE', 74, '#ffb454', 'Georgia, serif');
    add(title1); add(title2);
    const sub = this.label(94, 328, 'The sun is low. Six dust raids are coming for the solar relay.', 15, '#d8c9ab', '"Trebuchet MS", sans-serif', false);
    sub.setWordWrapWidth(500).setLineSpacing(5);
    add(sub);

    const rows: [string, string][] = [
      ['1', 'Choose SUNSPEAR or ARC PYLON from the dock below.'],
      ['2', 'Click a lit pad to build. Click a tower to upgrade it.'],
      ['3', 'Launch each wave, then hold the relay at all costs.'],
    ];
    rows.forEach(([n, text], i) => {
      const y = 392 + i * 30;
      const num = this.label(100, y - 2, n, 11, '#172724').setOrigin(0.5);
      const circle = this.add.graphics();
      circle.fillStyle(0xffb454, 1);
      circle.fillCircle(100, y + 3, 10);
      add(circle); add(num);
      const row = this.label(120, y - 2, text, 13, '#eadcc0', '"Trebuchet MS", sans-serif', false);
      add(row);
    });

    const startBg = this.add.graphics();
    startBg.fillStyle(0xffb454, 1);
    startBg.fillRoundedRect(UI.start.x, UI.start.y, UI.start.w, UI.start.h, 7);
    startBg.lineStyle(2, 0xffe0a3, 0.9);
    startBg.strokeRoundedRect(UI.start.x, UI.start.y, UI.start.w, UI.start.h, 7);
    add(startBg);
    const start = this.label(UI.start.x + UI.start.w / 2, UI.start.y + 19, 'START DEFENSE', 20, '#172724').setOrigin(0.5);
    start.setLetterSpacing(1.5);
    add(start);
    const startSub = this.label(UI.start.x + UI.start.w / 2, UI.start.y + 44, 'CLICK OR PRESS SPACE', 9, '#5d3a13').setOrigin(0.5);
    startSub.setLetterSpacing(1.6);
    add(startSub);
    const ctrl = this.label(94, 584, 'SPACE launch  ·  1 / 2 towers  ·  P pause  ·  M mute  ·  F fullscreen', 10, '#9fb0a4');
    add(ctrl);

    this.tweens.add({
      targets: start,
      alpha: { from: 1, to: 0.72 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private createPause(): void {
    this.pauseLayer = this.add.container(0, 0).setDepth(70).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x0d1917, 0.62);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0x142522, 0.97);
    g.fillRoundedRect(412, 208, 456, 300, 10);
    g.lineStyle(2, 0xffb454, 0.7);
    g.strokeRoundedRect(412, 208, 456, 300, 10);
    this.pauseLayer.add(g);
    const title = this.label(640, 246, 'PAUSED', 38, '#f7ecd6', 'Georgia, serif').setOrigin(0.5);
    const sub = this.label(640, 292, 'The relay holds its breath.', 13, '#a9b8ac', '"Trebuchet MS", sans-serif', false).setOrigin(0.5);
    this.pauseLayer.add(title); this.pauseLayer.add(sub);
    this.pauseLayer.add(this.label(640, 322, 'P / ESC to resume', 10, '#ffb454').setOrigin(0.5));

    const btn = (r: { x: number; y: number; w: number; h: number }, text: string, fill: number, color: string) => {
      const bg = this.add.graphics();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(r.x, r.y, r.w, r.h, 6);
      bg.lineStyle(1.5, 0xffe0a3, 0.7);
      bg.strokeRoundedRect(r.x, r.y, r.w, r.h, 6);
      this.pauseLayer.add(bg);
      const t = this.label(r.x + r.w / 2, r.y + r.h / 2, text, 15, color).setOrigin(0.5);
      this.pauseLayer.add(t);
    };
    btn(UI.resume, 'RESUME', 0xffb454, '#172724');
    btn(UI.restartPause, 'RESTART RUN', 0x2b403a, '#f7ecd6');
  }

  private createEnd(): void {
    this.endLayer = this.add.container(0, 0).setDepth(70).setVisible(false);
    const g = this.add.graphics();
    g.fillStyle(0x0d1917, 0.7);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0x142522, 0.98);
    g.fillRoundedRect(374, 172, 532, 380, 10);
    g.lineStyle(2, 0xffb454, 0.75);
    g.strokeRoundedRect(374, 172, 532, 380, 10);
    g.lineStyle(1, 0xffb454, 0.2);
    g.strokeRoundedRect(384, 182, 512, 360, 7);
    this.endLayer.add(g);
    this.endTitle = this.label(640, 212, '', 42, '#f7ecd6', 'Georgia, serif').setOrigin(0.5);
    this.endSub = this.label(640, 266, '', 14, '#d8c9ab', '"Trebuchet MS", sans-serif', false).setOrigin(0.5);
    this.endStats = this.label(640, 322, '', 15, '#eadcc0').setOrigin(0.5);
    this.endStats.setAlign('center').setLineSpacing(8);
    this.endLayer.add(this.endTitle);
    this.endLayer.add(this.endSub);
    this.endLayer.add(this.endStats);

    const bg = this.add.graphics();
    bg.fillStyle(0xffb454, 1);
    bg.fillRoundedRect(UI.restartEnd.x, UI.restartEnd.y, UI.restartEnd.w, UI.restartEnd.h, 6);
    bg.lineStyle(1.5, 0xffe0a3, 0.8);
    bg.strokeRoundedRect(UI.restartEnd.x, UI.restartEnd.y, UI.restartEnd.w, UI.restartEnd.h, 6);
    this.endLayer.add(bg);
    const btn = this.label(640, UI.restartEnd.y + 27, 'RUN IT AGAIN', 16, '#172724').setOrigin(0.5);
    this.endLayer.add(btn);
    const hint = this.label(640, 512, 'ENTER / R', 9, '#9fb0a4').setOrigin(0.5);
    this.endLayer.add(hint);
  }

  private installHooks(): void {
    const w = window as unknown as {
      advanceTime?: (ms: number) => Promise<void>;
      render_game_to_text?: () => string;
    };
    w.advanceTime = async (ms: number) => {
      this.manual = true;
      let left = Math.min(Math.max(ms, 0) / 1000, 30);
      while (left > 0) {
        const step = Math.min(left, 0.05);
        this.tick(step, false);
        left -= step;
      }
      this.syncHud();
      this.drawEffects();
    };
    w.render_game_to_text = () => this.textState();
  }

  private textState(): string {
    return JSON.stringify({
      mode: this.mode,
      phase: this.phase,
      paused: this.paused,
      speed: this.speed,
      muted: audio.muted,
      wave: this.wave,
      waveTime: Number(this.waveTime.toFixed(2)),
      integrity: Math.round(this.integrity),
      scrap: Math.round(this.scrap),
      score: this.score,
      kills: this.kills,
      leaks: this.leaks,
      selectedBuild: this.selectedBuild,
      selectedTower: this.selectedTower
        ? { id: this.selectedTower.id, kind: this.selectedTower.kind, level: this.selectedTower.level }
        : null,
      spawnRemaining: this.spawnQueue.length,
      enemies: this.enemies.filter((e) => e.alive).map((e) => ({
        id: e.id, kind: e.kind, hp: Math.max(0, Math.round(e.hp)),
        maxHp: e.maxHp, progress: Number((e.progress / this.pathLength).toFixed(3)),
        x: Math.round(e.x), y: Math.round(e.y),
      })),
      towers: this.towers.map((t) => ({
        id: t.id, kind: t.kind, level: t.level,
        x: Math.round(t.x), y: Math.round(t.y),
      })),
      pads: this.pads.map((p) => ({ x: p.x, y: p.y, occupied: p.towerId !== null })),
      bossAlive: this.bossRef !== null && this.bossRef.alive,
      tip: this.tip,
    });
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    if (p.rightButtonDown()) {
      this.selectedBuild = null;
      this.selectedTower = null;
      this.refreshRange();
      this.refreshPads();
      this.syncHud();
      return;
    }
    const x = p.x;
    const y = p.y;

    if (this.mode === 'menu') {
      if (inRect(x, y, UI.start)) this.startGame();
      return;
    }
    if (this.mode === 'won' || this.mode === 'lost') {
      if (inRect(x, y, UI.restartEnd)) this.restart();
      return;
    }
    if (this.paused) {
      if (inRect(x, y, UI.resume)) this.togglePause();
      else if (inRect(x, y, UI.restartPause)) this.restart();
      return;
    }

    if (inRect(x, y, UI.pause)) { this.togglePause(); return; }
    if (inRect(x, y, UI.speed)) { this.toggleSpeed(); return; }
    if (inRect(x, y, UI.mute)) { this.toggleMute(); return; }
    if (inRect(x, y, UI.restart)) { this.restart(); return; }
    if (inRect(x, y, UI.card1)) { this.selectBuild('sunspear'); return; }
    if (inRect(x, y, UI.card2)) { this.selectBuild('arc'); return; }
    if (inRect(x, y, UI.launch)) { this.launchWave(); return; }
    if (this.selectedTower && inRect(x, y, UI.upgrade)) { this.upgradeSelected(); return; }

    const pad = this.padAt(x, y);
    if (pad) {
      this.clickPad(pad);
    } else {
      this.selectedTower = null;
      this.selectedBuild = null;
      this.tip = 'Pick a tower, then click a lit pad to build.';
      this.refreshRange();
      this.refreshPads();
      this.syncHud();
    }
  }

  private onPointerMove(p: Phaser.Input.Pointer): void {
    if (this.mode !== 'playing' || this.paused) return;
    const pad = this.padAt(p.x, p.y);
    if (pad === this.hoverPad) return;
    if (this.hoverPad) this.hoverPad.hover = false;
    this.hoverPad = pad;
    if (pad) pad.hover = true;
    this.refreshPads();
    this.refreshRange();
  }

  private padAt(x: number, y: number): Pad | null {
    for (const pad of this.pads) {
      if (Phaser.Math.Distance.Between(x, y, pad.x, pad.y) <= 33) return pad;
    }
    return null;
  }

  private selectBuild(kind: TowerKind): void {
    if (this.mode !== 'playing' || this.paused) return;
    this.selectedBuild = this.selectedBuild === kind ? null : kind;
    this.selectedTower = null;
    if (this.selectedBuild) {
      const d = TOWERS[kind];
      this.tip = `${d.name} selected — click an empty pad. ${d.blurb}`;
    } else {
      this.tip = 'Pick a tower, then click a lit pad to build.';
    }
    audio.play('click');
    this.refreshPads();
    this.refreshRange();
    this.syncHud();
  }

  private clickPad(pad: Pad): void {
    const existing = pad.towerId !== null ? this.towers.find((t) => t.id === pad.towerId) : null;
    if (this.selectedBuild) {
      if (existing) {
        this.selectedTower = existing;
        this.selectedBuild = null;
        this.tip = `${TOWERS[existing.kind].name} selected. Upgrade it below.`;
        audio.play('click');
      } else {
        const def = TOWERS[this.selectedBuild];
        if (this.scrap < def.cost) {
          this.tip = `Not enough scrap for ${def.name}. Clear raiders to earn more.`;
          audio.play('error');
        } else {
          this.buildTower(pad, this.selectedBuild);
        }
      }
    } else if (existing) {
      this.selectedTower = existing;
      this.tip = `${TOWERS[existing.kind].name} selected. Upgrade it below.`;
      audio.play('click');
    } else {
      this.tip = 'Empty pad. Choose a tower from the dock first.';
      audio.play('error');
    }
    this.refreshPads();
    this.refreshRange();
    this.syncHud();
  }

  private buildTower(pad: Pad, kind: TowerKind): void {
    const def = TOWERS[kind];
    this.scrap -= def.cost;
    const visual = drawTower(this, kind, 1);
    visual.container.setPosition(pad.x, pad.y);
    const tower: Tower = {
      id: this.nextId++,
      kind,
      x: pad.x,
      y: pad.y,
      level: 1,
      cooldown: 0.15,
      container: visual.container,
      head: visual.head,
      pips: visual.pips,
      angle: -0.4,
      flash: 0,
    };
    this.towers.push(tower);
    pad.towerId = tower.id;
    this.selectedBuild = null;
    this.selectedTower = tower;
    this.tip = `${def.name} online. Click UPGRADE to strengthen it.`;
    this.ring(pad.x, pad.y, 18, 54, def.light, 0.4, 2.5);
    this.burst(pad.x, pad.y + 8, 0xc8a36a, 9);
    audio.play('build');
    this.syncHud();
  }

  private upgradeSelected(): void {
    const tower = this.selectedTower;
    if (!tower) return;
    const cost = upgradeCost(tower.kind, tower.level);
    if (cost === null) {
      this.tip = 'This tower is already at maximum level.';
      audio.play('error');
      return;
    }
    if (this.scrap < cost) {
      this.tip = `Upgrade needs ${cost} scrap. Clear more raiders first.`;
      audio.play('error');
      return;
    }
    this.scrap -= cost;
    tower.level++;
    const def = TOWERS[tower.kind];
    updateTowerPips(tower.pips, tower.level, def.color);
    tower.head.setScale(1 + tower.level * 0.05);
    this.ring(tower.x, tower.y, 22, 66, def.light, 0.45, 3);
    this.addFloater(tower.x, tower.y - 34, `LEVEL ${tower.level}`, '#ffe0a3', 14);
    this.tip = `${def.name} upgraded to level ${tower.level}.`;
    audio.play('upgrade');
    this.syncHud();
  }

  private togglePause(): void {
    if (this.mode !== 'playing') return;
    this.paused = !this.paused;
    this.pauseLayer.setVisible(this.paused);
    audio.play('click');
    this.syncHud();
  }

  private toggleSpeed(): void {
    if (this.mode !== 'playing') return;
    this.speed = this.speed === 1 ? 2 : 1;
    this.tip = `Game speed ${this.speed}x.`;
    audio.play('click');
    this.syncHud();
  }

  private toggleMute(): void {
    audio.start();
    const muted = audio.toggleMute();
    this.tip = muted ? 'Sound muted.' : 'Sound on.';
    if (!muted) audio.play('click');
    this.syncHud();
  }

  private onSpace(): void {
    if (this.mode === 'menu') { this.startGame(); return; }
    if (this.mode === 'won' || this.mode === 'lost') { this.restart(); return; }
    if (this.paused) { this.togglePause(); return; }
    if (this.phase === 'build') this.launchWave();
  }

  private onEnter(): void {
    if (this.mode === 'menu') this.startGame();
    else if (this.mode === 'won' || this.mode === 'lost') this.restart();
    else if (this.paused) this.togglePause();
    else if (this.phase === 'build') this.launchWave();
  }

  private onEscape(): void {
    if (this.paused) { this.togglePause(); return; }
    this.selectedBuild = null;
    this.selectedTower = null;
    this.refreshPads();
    this.refreshRange();
    this.syncHud();
  }

  private startGame(): void {
    audio.start();
    this.resetWorld();
    this.mode = 'playing';
    this.menuLayer.setVisible(false);
    this.pauseLayer.setVisible(false);
    this.endLayer.setVisible(false);
    this.showBanner('WAVE 1', 'BUILD PHASE · PLACE YOUR TOWERS', '#ffd37c', 2.8);
    this.tip = 'Build two towers before launching. Sunspear hits hard; Arc Pylon chains.';
    audio.play('wave');
    this.syncHud();
  }

  private restart(): void {
    audio.start();
    this.resetWorld();
    this.mode = 'playing';
    this.menuLayer.setVisible(false);
    this.pauseLayer.setVisible(false);
    this.endLayer.setVisible(false);
    this.showBanner('WAVE 1', 'BUILD PHASE · PLACE YOUR TOWERS', '#ffd37c', 2.4);
    this.tip = 'Build two towers before launching. Sunspear hits hard; Arc Pylon chains.';
    audio.play('click');
    this.syncHud();
  }

  private resetWorld(): void {
    for (const e of this.enemies) e.container.destroy();
    for (const t of this.towers) t.container.destroy();
    for (const f of this.floaters) f.text.destroy();
    this.enemies = [];
    this.towers = [];
    this.effects = [];
    this.floaters = [];
    this.spawnQueue = [];
    this.bossRef = null;
    this.banner = null;
    this.selectedBuild = null;
    this.selectedTower = null;
    this.hoverPad = null;
    this.phase = 'build';
    this.paused = false;
    this.speed = 1;
    this.wave = 1;
    this.integrity = START_INTEGRITY;
    this.scrap = START_SCRAP;
    this.score = 0;
    this.kills = 0;
    this.leaks = 0;
    this.waveTime = 0;
    this.clearTimer = 0;
    for (const pad of this.pads) {
      pad.towerId = null;
      pad.hover = false;
    }
    this.refreshPads();
    this.refreshRange();
    this.drawEffects();
  }

  private launchWave(): void {
    if (this.mode !== 'playing' || this.paused) return;
    if (this.phase !== 'build') {
      this.tip = 'This wave is already on the move.';
      audio.play('error');
      return;
    }
    this.phase = 'wave';
    this.waveTime = 0;
    this.clearTimer = 0;
    this.spawnQueue = [];
    const waveDef: WaveDef = WAVES[this.wave - 1];
    for (const group of waveDef.groups as SpawnGroup[]) {
      for (let i = 0; i < group.count; i++) {
        this.spawnQueue.push({ time: group.delay + i * group.interval, kind: group.kind });
      }
    }
    this.spawnQueue.sort((a, b) => a.time - b.time);
    this.selectedBuild = null;
    this.showBanner(`WAVE ${this.wave}`, waveDef.label, '#ffb454', 2.6);
    this.tip = this.wave === 6
      ? 'Final wave. The Dust Colossus is coming. Hold the relay.'
      : 'Wave incoming. Towers fire automatically.';
    audio.play('wave');
    this.refreshRange();
    this.syncHud();
  }

  private tick(dt: number, doSync: boolean): void {
    if (this.mode !== 'playing' || this.paused) {
      if (doSync) this.syncHud();
      return;
    }
    this.timeNow += dt;
    const sdt = dt * this.speed;
    this.updateSpawner(sdt);
    this.updateEnemies(sdt);
    this.updateTowers(sdt);
    this.updateEffects(sdt);
    this.updateFloaters(sdt);
    this.updateBanner(sdt);
    if (doSync) {
      this.syncHud();
      this.drawEffects();
    }
  }

  private updateSpawner(dt: number): void {
    if (this.phase !== 'wave') return;
    this.waveTime += dt;
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].time <= this.waveTime) {
      const next = this.spawnQueue.shift();
      if (next) this.spawnEnemy(next.kind);
    }
    if (this.phase === 'wave' && this.spawnQueue.length === 0) {
      if (!this.enemies.some((e) => e.alive)) {
        this.clearTimer += dt;
        if (this.clearTimer >= 0.85) this.completeWave();
      } else {
        this.clearTimer = 0;
      }
    }
  }

  private updateEnemies(dt: number): void {
    const keep: Enemy[] = [];
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.progress += e.def.speed * dt;
      if (e.progress >= this.pathLength) {
        this.leakEnemy(e);
        continue;
      }
      const u = Phaser.Math.Clamp(e.progress / this.pathLength, 0, 1);
      this.curve.getPointAt(u, this.tmpVec);
      this.curve.getTangentAt(u, this.tmpVec2);
      const nx = -this.tmpVec2.y;
      const ny = this.tmpVec2.x;
      const wob = Math.sin(this.timeNow * 3.6 + e.wobble) * e.offset;
      e.x = this.tmpVec.x + nx * wob;
      e.y = this.tmpVec.y + ny * wob;
      e.angle = Math.atan2(this.tmpVec2.y, this.tmpVec2.x);
      e.container.setPosition(e.x, e.y);
      e.visual.setRotation(e.angle);
      const bob = e.kind === 'boss' ? 1 : 1 + Math.sin(this.timeNow * 9 + e.wobble) * 0.025;
      e.visual.setScale(bob);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.visual.setAlpha(e.hitFlash > 0 ? 0.55 : 1);
      const ratio = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
      const barY = -e.def.radius - (e.kind === 'boss' ? 34 : 17);
      e.barBg.setPosition(0, barY).setVisible(e.hp < e.maxHp || e.kind === 'boss');
      e.barFill.setPosition(-e.def.barWidth / 2, barY).setVisible(e.hp < e.maxHp || e.kind === 'boss');
      e.barFill.setDisplaySize(Math.max(0, e.def.barWidth * ratio), 4);
      e.barFill.setFillStyle(ratio > 0.55 ? 0x9fe08a : ratio > 0.25 ? 0xffc46b : 0xff6b5b, 1);
      keep.push(e);
    }
    this.enemies = keep;
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      const def = TOWERS[t.kind];
      t.cooldown = Math.max(0, t.cooldown - dt);
      t.flash = Math.max(0, t.flash - dt);
      const range = def.range[t.level - 1];
      const target = this.findTarget(t, range);
      if (target) {
        const desired = Math.atan2(target.y - t.y, target.x - t.x);
        t.angle = Phaser.Math.Angle.RotateTo(t.angle, desired, dt * (t.kind === 'sunspear' ? 9 : 5));
        if (t.cooldown <= 0) {
          t.cooldown = def.rate[t.level - 1];
          t.flash = 0.15;
          if (t.kind === 'sunspear') this.fireSunspear(t, target);
          else this.fireArc(t, target);
        }
      } else if (t.kind === 'sunspear') {
        t.angle = Phaser.Math.Angle.RotateTo(t.angle, -0.5, dt * 2.5);
      } else {
        t.angle += dt * 0.9;
      }
      t.head.setRotation(t.angle);
      t.head.setScale(1 + t.flash * 0.12);
    }
  }

  private findTarget(t: Tower, range: number): Enemy | null {
    let best: Enemy | null = null;
    const r2 = range * range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - t.x;
      const dy = e.y - t.y;
      if (dx * dx + dy * dy <= r2) {
        if (!best || e.progress > best.progress) best = e;
      }
    }
    return best;
  }

  private nearestUnhit(x: number, y: number, range: number, hit: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range * range;
    for (const e of this.enemies) {
      if (!e.alive || hit.includes(e)) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private fireSunspear(t: Tower, target: Enemy): void {
    const def = TOWERS.sunspear;
    const mx = t.x + Math.cos(t.angle) * 34;
    const my = t.y + Math.sin(t.angle) * 34;
    this.beam(mx, my, target.x, target.y, def.light, 4.5, 0.17);
    this.ring(mx, my, 2, 18, def.light, 0.22, 2);
    this.burst(target.x, target.y, def.light, 3);
    this.damageEnemy(target, def.damage[t.level - 1], '#fff0c8', true);
    audio.play('laser');
  }

  private fireArc(t: Tower, target: Enemy): void {
    const def = TOWERS.arc;
    const chain = def.chain[t.level - 1];
    const dmg = def.damage[t.level - 1];
    const hit: Enemy[] = [];
    const points = [{ x: t.x, y: t.y }];
    let current: Enemy | null = target;
    for (let i = 0; i < chain && current; i++) {
      points.push({ x: current.x, y: current.y });
      hit.push(current);
      this.damageEnemy(current, Math.max(1, Math.round(dmg * Math.pow(0.82, i))), '#a9fff0', false);
      this.burst(current.x, current.y, def.light, 4);
      current = this.nearestUnhit(current.x, current.y, def.chainRange, hit);
    }
    this.effects.push({ type: 'arc', points, color: def.light, ttl: 0.2, maxTtl: 0.2 });
    this.ring(t.x, t.y, 6, 36, def.light, 0.24, 2);
    audio.play('arc');
  }

  private damageEnemy(e: Enemy, amount: number, color: string, showNumber: boolean): void {
    if (!e.alive) return;
    const actual = Math.max(1, Math.round(amount - e.def.armor));
    e.hp -= actual;
    e.hitFlash = 0.11;
    if (showNumber) {
      this.addFloater(e.x + (Math.random() * 10 - 5), e.y - e.def.radius - 16, `${actual}`, color, 11);
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    this.kills++;
    this.scrap += e.def.reward;
    this.score += e.def.reward * 10;
    this.burst(e.x, e.y, e.def.accent, e.kind === 'boss' ? 26 : 9);
    this.ring(e.x, e.y, 6, e.kind === 'boss' ? 120 : 36, e.def.accent, 0.35, e.kind === 'boss' ? 6 : 2.5);
    this.addFloater(e.x, e.y - e.def.radius - 12, `+${e.def.reward}`, '#ffd37c', e.kind === 'boss' ? 20 : 13);
    if (e.kind === 'boss') {
      this.score += 500;
      this.bossRef = null;
      this.cameras.main.shake(420, 0.012);
      this.showBanner('COLOSSUS DOWN', 'THE DUST SETTLES', '#ffd37c', 3.2);
    } else {
      this.cameras.main.shake(45, 0.0012);
    }
    audio.play('death');
    e.container.destroy();
  }

  private leakEnemy(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    this.leaks++;
    this.integrity = Math.max(0, this.integrity - e.def.damage);
    this.score = Math.max(0, this.score - 40);
    this.ring(RELAY.x, RELAY.y - 18, 16, 92, 0xff6b5b, 0.5, 4);
    this.burst(RELAY.x, RELAY.y - 18, 0xff8b6a, 11);
    this.addFloater(RELAY.x, RELAY.y - 64, `-${e.def.damage}`, '#ff8b7a', 18);
    this.cameras.main.shake(220, 0.006);
    audio.play('leak');
    e.container.destroy();
    this.tip = `${e.def.label} broke through. Relay integrity ${Math.round(this.integrity)}%.`;
    if (this.integrity <= 0) this.lose();
  }

  private spawnEnemy(kind: EnemyKind): void {
    const def = ENEMIES[kind];
    const visual = drawEnemyVisual(this, kind);
    const container = this.add.container(0, 0).setDepth(kind === 'boss' ? 8 : 7);
    container.add(visual);
    const barBg = this.add.rectangle(0, 0, def.barWidth + 5, 7, 0x1a100c, 0.82).setOrigin(0.5);
    const barFill = this.add.rectangle(0, 0, def.barWidth, 4, 0x9fe08a, 1).setOrigin(0, 0.5);
    barBg.setVisible(false);
    barFill.setVisible(false);
    container.add(barBg);
    container.add(barFill);
    const e: Enemy = {
      id: this.nextId++,
      kind,
      def,
      hp: def.hp,
      maxHp: def.hp,
      progress: 0,
      offset: kind === 'boss' ? 0 : (Math.random() * 2 - 1) * 7,
      wobble: Math.random() * Math.PI * 2,
      container,
      visual,
      barBg,
      barFill,
      hitFlash: 0,
      alive: true,
      x: -40,
      y: 520,
      angle: 0,
    };
    this.enemies.push(e);
    this.curve.getPointAt(0, this.tmpVec);
    container.setPosition(this.tmpVec.x, this.tmpVec.y);
    this.ring(this.tmpVec.x, this.tmpVec.y, 2, 24, def.accent, 0.3, 2);
    if (kind === 'boss') {
      this.bossRef = e;
      this.cameras.main.shake(300, 0.006);
      this.showBanner('DUST COLOSSUS', 'FINAL WAVE · HOLD THE LINE', '#ff9b6b', 3.2);
      audio.play('boss');
    }
  }

  private completeWave(): void {
    if (this.mode !== 'playing') return;
    if (this.wave >= WAVES.length) {
      this.win();
      return;
    }
    const bonus = WAVES[this.wave - 1].bonus;
    this.scrap += bonus;
    this.score += bonus * 5;
    this.wave++;
    this.phase = 'build';
    this.waveTime = 0;
    this.clearTimer = 0;
    this.selectedBuild = null;
    this.selectedTower = null;
    this.tip = `Wave clear. +${bonus} scrap. Build or upgrade, then launch wave ${this.wave}.`;
    this.showBanner('WAVE CLEAR', `+${bonus} SCRAP · WAVE ${this.wave} READY`, '#a9fff0', 2.8);
    this.refreshPads();
    this.refreshRange();
    audio.play('upgrade');
  }

  private win(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'won';
    this.paused = false;
    this.phase = 'build';
    this.selectedBuild = null;
    this.selectedTower = null;
    this.tip = 'Relay held. All six dust raids are broken.';
    this.refreshRange();
    audio.play('win');
    this.showEnd(true);
  }

  private lose(): void {
    if (this.mode !== 'playing') return;
    this.mode = 'lost';
    this.paused = false;
    this.phase = 'build';
    this.selectedBuild = null;
    this.selectedTower = null;
    this.tip = 'The relay went dark. The raiders roll on.';
    this.refreshRange();
    audio.play('lose');
    this.showEnd(false);
  }

  private showEnd(won: boolean): void {
    this.endTitle.setText(won ? 'RELAY HELD' : 'RELAY LOST');
    this.endTitle.setColor(won ? '#ffd37c' : '#ff8b7a');
    this.endSub.setText(won
      ? 'The dust settles. Outpost 07 keeps the lights on.'
      : 'The relay went dark. The raiders roll on.');
    this.endStats.setText([
      `WAVES HELD   ${won ? WAVES.length : this.wave - 1} / ${WAVES.length}`,
      `RAIDERS DESTROYED   ${this.kills}`,
      `RELAY INTEGRITY   ${Math.max(0, Math.round(this.integrity))}%`,
      `SCORE   ${this.score}`,
    ].join('\n'));
    this.endLayer.setVisible(true);
    this.syncHud();
  }

  private showBanner(title: string, sub: string, color: string, ttl: number): void {
    this.banner = { title, sub, color, ttl, maxTtl: ttl };
  }

  private updateBanner(dt: number): void {
    if (!this.banner) return;
    this.banner.ttl -= dt;
    if (this.banner.ttl <= 0) this.banner = null;
  }

  private updateEffects(dt: number): void {
    for (const e of this.effects) {
      e.ttl -= dt;
      if (e.type === 'spark') {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vy += 80 * dt;
        e.vx *= 0.98;
      }
    }
    this.effects = this.effects.filter((e) => e.ttl > 0);
  }

  private drawEffects(): void {
    const g = this.fxGfx;
    g.clear();
    for (const e of this.effects) {
      const a = Phaser.Math.Clamp(e.ttl / e.maxTtl, 0, 1);
      if (e.type === 'beam') {
        g.lineStyle(e.width * 3.2, e.color, a * 0.18);
        g.beginPath(); g.moveTo(e.x1, e.y1); g.lineTo(e.x2, e.y2); g.strokePath();
        g.lineStyle(e.width, e.color, a * 0.95);
        g.beginPath(); g.moveTo(e.x1, e.y1); g.lineTo(e.x2, e.y2); g.strokePath();
        g.fillStyle(0xffffff, a * 0.9);
        g.fillCircle(e.x2, e.y2, e.width * 1.1);
      } else if (e.type === 'arc') {
        for (let pass = 0; pass < 2; pass++) {
          g.lineStyle(pass === 0 ? 7 : 2, e.color, pass === 0 ? a * 0.2 : a);
          g.beginPath();
          g.moveTo(e.points[0].x, e.points[0].y);
          for (let i = 1; i < e.points.length; i++) {
            const p = e.points[i];
            const prev = e.points[i - 1];
            const mx = (prev.x + p.x) / 2 + (Math.random() * 10 - 5);
            const my = (prev.y + p.y) / 2 + (Math.random() * 10 - 5);
            g.lineTo(mx, my);
            g.lineTo(p.x, p.y);
          }
          g.strokePath();
        }
        for (const p of e.points) {
          g.fillStyle(0xffffff, a * 0.8);
          g.fillCircle(p.x, p.y, 2.4);
        }
      } else if (e.type === 'ring') {
        const p = 1 - a;
        const r = e.r0 + (e.r1 - e.r0) * p;
        g.lineStyle(e.width, e.color, a);
        g.strokeCircle(e.x, e.y, r);
      } else {
        g.fillStyle(e.color, a);
        g.fillCircle(e.x, e.y, e.size * (0.4 + a * 0.6));
      }
    }
  }

  private ring(x: number, y: number, r0: number, r1: number, color: number, ttl: number, width: number): void {
    this.effects.push({ type: 'ring', x, y, r0, r1, color, width, ttl, maxTtl: ttl });
  }

  private beam(x1: number, y1: number, x2: number, y2: number, color: number, width: number, ttl: number): void {
    this.effects.push({ type: 'beam', x1, y1, x2, y2, color, width, ttl, maxTtl: ttl });
  }

  private burst(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 25 + Math.random() * 95;
      const ttl = 0.28 + Math.random() * 0.3;
      this.effects.push({
        type: 'spark', x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 18,
        color, size: 1.2 + Math.random() * 2.2, ttl, maxTtl: ttl,
      });
    }
  }

  private addFloater(x: number, y: number, text: string, color: string, size: number): void {
    const t = this.add.text(x, y, text, {
      fontFamily: '"Trebuchet MS", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold',
      stroke: '#1a100c',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(12);
    this.floaters.push({ text: t, ttl: 0.85, maxTtl: 0.85, vy: -34 });
  }

  private updateFloaters(dt: number): void {
    const keep: Floater[] = [];
    for (const f of this.floaters) {
      f.ttl -= dt;
      if (f.ttl <= 0) {
        f.text.destroy();
        continue;
      }
      f.text.y += f.vy * dt;
      const a = Phaser.Math.Clamp(f.ttl / f.maxTtl, 0, 1);
      f.text.setAlpha(a);
      f.text.setScale(1 + (1 - a) * 0.12);
      keep.push(f);
    }
    this.floaters = keep;
  }

  private syncHud(): void {
    if (!this.txt.brand) return;
    const g = this.uiGfx;
    g.clear();
    const cream = '#f7ecd6';

    // Top command bar.
    g.fillStyle(0x16241f, 1);
    g.fillRect(0, 0, GAME_W, 68);
    g.fillStyle(0x0f1a17, 0.7);
    g.fillRect(0, 64, GAME_W, 4);
    g.lineStyle(1, 0xffb454, 0.22);
    g.beginPath(); g.moveTo(0, 67.5); g.lineTo(GAME_W, 67.5); g.strokePath();
    g.fillStyle(0xffb454, 1);
    g.fillRect(24, 34, 92, 2);
    for (const x of [286, 480, 850, 1016]) {
      g.lineStyle(1, 0xffffff, 0.07);
      g.beginPath(); g.moveTo(x, 12); g.lineTo(x, 56); g.strokePath();
    }

    const ratio = Phaser.Math.Clamp(this.integrity / START_INTEGRITY, 0, 1);
    const integrityColor = ratio > 0.5 ? 0x8fd694 : ratio > 0.25 ? 0xffc46b : 0xff6b5b;
    g.fillStyle(0x2b3a35, 1);
    g.fillRoundedRect(500, 34, 230, 14, 7);
    if (ratio > 0) {
      g.fillStyle(integrityColor, 1);
      g.fillRoundedRect(500, 34, Math.max(8, 230 * ratio), 14, 7);
    }
    g.lineStyle(1, 0xffffff, 0.1);
    g.strokeRoundedRect(500, 34, 230, 14, 7);

    drawScrapIcon(g, 852, 28, 0.8);

    const buttons: { key: string; r: { x: number; y: number; w: number; h: number }; icon: string; cap: string }[] = [
      { key: 'pause', r: UI.pause, icon: this.paused ? '▶' : 'II', cap: this.paused ? 'RESUME' : 'PAUSE' },
      { key: 'speed', r: UI.speed, icon: `${this.speed}x`, cap: 'SPEED' },
      { key: 'mute', r: UI.mute, icon: '♪', cap: audio.muted ? 'MUTED' : 'SOUND' },
      { key: 'restart', r: UI.restart, icon: '↺', cap: 'RESET' },
    ];
    for (const b of buttons) {
      const active = (b.key === 'pause' && this.paused)
        || (b.key === 'speed' && this.speed === 2)
        || (b.key === 'mute' && audio.muted);
      g.fillStyle(active ? 0x3a5a4c : 0x22332e, 1);
      g.fillRoundedRect(b.r.x, b.r.y, b.r.w, b.r.h, 6);
      g.lineStyle(1, active ? 0xffd37c : 0x3b5048, active ? 0.9 : 0.7);
      g.strokeRoundedRect(b.r.x, b.r.y, b.r.w, b.r.h, 6);
      const icon = this.txt[`btn_${b.key}`];
      const cap = this.txt[`cap_${b.key}`];
      icon.setText(b.icon).setPosition(b.r.x + b.r.w / 2, b.r.y + 15).setColor(active ? '#ffe0a3' : cream);
      cap.setText(b.cap).setPosition(b.r.x + b.r.w / 2, b.r.y + 34).setColor(active ? '#ffd37c' : '#9fb0a4');
      if (b.key === 'mute' && audio.muted) {
        g.lineStyle(2, 0xff8b7a, 0.9);
        g.beginPath();
        g.moveTo(b.r.x + 17, b.r.y + 9);
        g.lineTo(b.r.x + 35, b.r.y + 29);
        g.strokePath();
      }
    }

    this.txt.wave.setText(`WAVE ${this.wave} / ${WAVES.length}`);
    this.txt.waveState.setText(this.phase === 'build' ? 'BUILD PHASE' : 'RAID IN PROGRESS');
    this.txt.waveState.setColor(this.phase === 'build' ? '#ffc46b' : '#ff8b7a');
    this.txt.integrity.setText(`${Math.max(0, Math.round(this.integrity))}%`);
    this.txt.integrity.setColor(ratio > 0.5 ? '#d9f0d6' : ratio > 0.25 ? '#ffd37c' : '#ff8b7a');
    this.txt.scrap.setText(`${Math.round(this.scrap)}`);

    // Bottom dock.
    g.fillStyle(0x14221e, 1);
    g.fillRect(0, 624, GAME_W, 96);
    g.fillStyle(0xffb454, 0.35);
    g.fillRect(0, 624, GAME_W, 2);

    const cards: { kind: TowerKind; r: { x: number; y: number; w: number; h: number }; key: string }[] = [
      { kind: 'sunspear', r: UI.card1, key: 'card1Key' },
      { kind: 'arc', r: UI.card2, key: 'card2Key' },
    ];
    for (const card of cards) {
      const def = TOWERS[card.kind];
      const selected = this.selectedBuild === card.kind;
      const afford = this.scrap >= def.cost;
      g.fillStyle(selected ? 0x2b4038 : 0x1b2c27, 1);
      g.fillRoundedRect(card.r.x, card.r.y, card.r.w, card.r.h, 7);
      g.lineStyle(selected ? 2 : 1, selected ? def.light : 0x3b5048, selected ? 1 : 0.75);
      g.strokeRoundedRect(card.r.x, card.r.y, card.r.w, card.r.h, 7);
      drawTowerIcon(g, card.kind, card.r.x + 30, card.r.y + 38, 0.72);
      g.fillStyle(selected ? def.light : 0x2a3f39, 1);
      g.fillCircle(card.r.x + card.r.w - 16, card.r.y + 15, 9);
      const keyText = this.txt[card.key];
      keyText.setPosition(card.r.x + card.r.w - 16, card.r.y + 15)
        .setColor(selected ? '#172724' : '#eadcc0');
      g.fillStyle(0x0f1a17, 0.55);
      g.fillRoundedRect(card.r.x + 44, card.r.y + 43, 58, 23, 5);
      drawScrapIcon(g, card.r.x + 55, card.r.y + 54, 0.55);
      const costText = card.kind === 'sunspear' ? this.txt.card1Cost : this.txt.card2Cost;
      costText.setText(`${def.cost}`)
        .setOrigin(0, 0.5)
        .setPosition(card.r.x + 68, card.r.y + 54)
        .setColor(afford ? '#ffd37c' : '#9c7750');
    }
    this.txt.card1Name.setColor(cream);
    this.txt.card2Name.setColor(cream);
    this.txt.card1Role.setText(TOWERS.sunspear.role);
    this.txt.card2Role.setText(TOWERS.arc.role);

    // Inspector / tip panel.
    const ir = UI.inspect;
    g.fillStyle(0x182823, 0.94);
    g.fillRoundedRect(ir.x, ir.y, ir.w, ir.h, 7);
    g.lineStyle(1, 0x3b5048, 0.8);
    g.strokeRoundedRect(ir.x, ir.y, ir.w, ir.h, 7);

    const tower = this.selectedTower;
    this.txt.tip.setVisible(!tower);
    this.txt.inspectName.setVisible(!!tower);
    this.txt.inspectLevel.setVisible(!!tower);
    this.txt.inspectStats.setVisible(!!tower);
    this.txt.upgrade.setVisible(!!tower);

    if (tower) {
      const def = TOWERS[tower.kind];
      g.fillStyle(def.light, 0.9);
      g.fillRect(ir.x, ir.y + 9, 3, ir.h - 18);
      drawTowerIcon(g, tower.kind, ir.x + 26, ir.y + 40, 0.82);
      this.txt.inspectName.setText(def.name).setPosition(ir.x + 52, ir.y + 8).setColor(cream);
      this.txt.inspectLevel.setText(`LEVEL ${tower.level} / 3  ·  ${def.role}`)
        .setPosition(ir.x + 52, ir.y + 31).setColor('#ffc46b');
      const statLine = tower.kind === 'sunspear'
        ? `DMG ${def.damage[tower.level - 1]}   RANGE ${def.range[tower.level - 1]}   RATE ${def.rate[tower.level - 1].toFixed(2)}s`
        : `DMG ${def.damage[tower.level - 1]}   CHAIN ${def.chain[tower.level - 1]}   RANGE ${def.range[tower.level - 1]}   RATE ${def.rate[tower.level - 1].toFixed(2)}s`;
      this.txt.inspectStats.setText(statLine).setPosition(ir.x + 52, ir.y + 51).setColor('#d8c9ab');

      const cost = upgradeCost(tower.kind, tower.level);
      const can = cost !== null && this.scrap >= cost;
      const ur = UI.upgrade;
      g.fillStyle(cost === null ? 0x3a3a33 : can ? 0xffb454 : 0x4a3a2a, 1);
      g.fillRoundedRect(ur.x, ur.y, ur.w, ur.h, 6);
      g.lineStyle(1.5, cost === null ? 0x5a5a4a : can ? 0xffe0a3 : 0x6b543a, 0.8);
      g.strokeRoundedRect(ur.x, ur.y, ur.w, ur.h, 6);
      if (cost !== null) drawScrapIcon(g, ur.x + 22, ur.y + 27, 0.62);
      this.txt.upgrade
        .setText(cost === null ? 'MAX LEVEL' : `UPGRADE  ${cost}`)
        .setPosition(ur.x + ur.w / 2 + (cost === null ? 0 : 8), ur.y + ur.h / 2)
        .setColor(cost !== null && can ? '#172724' : '#d6c19c');
    } else {
      this.txt.tip.setText(this.tip).setPosition(ir.x + 16, ir.y + 15);
    }

    // Launch button.
    const lr = UI.launch;
    const playable = this.mode === 'playing';
    const build = playable && this.phase === 'build';
    g.fillStyle(build ? 0xffb454 : 0x29403a, 1);
    g.fillRoundedRect(lr.x, lr.y, lr.w, lr.h, 7);
    g.lineStyle(2, build ? 0xffe0a3 : 0x46645a, build ? 1 : 0.8);
    g.strokeRoundedRect(lr.x, lr.y, lr.w, lr.h, 7);
    for (let i = 0; i < WAVES.length; i++) {
      const done = i + 1 < this.wave;
      const current = i + 1 === this.wave;
      g.fillStyle(done ? 0x2f6f64 : current ? (build ? 0x8a4a18 : 0xffb454) : 0x3b5a51, 1);
      g.fillRoundedRect(lr.x + 18 + i * 30, lr.y + 11, 22, 4, 2);
    }
    const launchText = this.mode === 'menu'
      ? 'AWAITING START'
      : this.mode === 'won'
        ? 'CAMPAIGN COMPLETE'
        : this.mode === 'lost'
          ? 'OUTPOST LOST'
          : build
            ? (this.wave === WAVES.length ? 'LAUNCH FINAL WAVE' : 'LAUNCH WAVE')
            : 'WAVE ACTIVE';
    this.txt.launch
      .setText(launchText)
      .setColor(build ? '#172724' : playable ? '#f7ecd6' : '#b8c4bc')
      .setPosition(lr.x + lr.w / 2, lr.y + 34);
    const inbound = this.enemies.filter((e) => e.alive).length + this.spawnQueue.length;
    const launchSubText = this.mode === 'menu'
      ? 'CLICK START'
      : !playable
        ? 'ENTER / R'
        : build
          ? 'SPACE'
          : `${inbound} INBOUND`;
    this.txt.launchSub
      .setText(launchSubText)
      .setColor(build ? '#5d3a13' : playable ? '#9fe4d7' : '#8c9a93')
      .setPosition(lr.x + lr.w / 2, lr.y + 60);

    // Boss bar and banner.
    const boss = this.bossRef;
    const bossAlive = !!boss && boss.alive;
    this.txt.bossName.setVisible(bossAlive).setPosition(640, 78);
    if (bossAlive && boss) {
      const br = Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      g.fillStyle(0x160f0c, 0.86);
      g.fillRoundedRect(410, 68, 460, 34, 8);
      g.lineStyle(1, 0xffb454, 0.4);
      g.strokeRoundedRect(410, 68, 460, 34, 8);
      g.fillStyle(0x160f0c, 0.92);
      g.fillRoundedRect(420, 88, 440, 12, 6);
      if (br > 0) {
        g.fillStyle(0xff6b4a, 1);
        g.fillRoundedRect(422, 90, Math.max(4, 436 * br), 8, 4);
      }
      g.lineStyle(1, 0xffb08a, 0.85);
      g.strokeRoundedRect(420, 88, 440, 12, 6);
    }

    const banner = this.banner;
    if (banner) {
      const a = Phaser.Math.Clamp(banner.ttl / banner.maxTtl, 0, 1);
      const alpha = Math.min(1, a * 2.4);
      g.fillStyle(0x101d1a, 0.82 * alpha);
      g.fillRoundedRect(392, 98, 496, 66, 8);
      g.lineStyle(1, 0xffb454, 0.35 * alpha);
      g.strokeRoundedRect(392, 98, 496, 66, 8);
      this.txt.bannerTitle
        .setText(banner.title).setColor(banner.color).setAlpha(alpha).setVisible(true)
        .setPosition(640, 116);
      this.txt.bannerSub
        .setText(banner.sub).setAlpha(alpha).setVisible(true)
        .setPosition(640, 146);
    } else {
      this.txt.bannerTitle.setVisible(false);
      this.txt.bannerSub.setVisible(false);
    }

    const coreColor = this.integrity > 50 ? 0xffcf7a : this.integrity > 25 ? 0xffa45c : 0xff6b5b;
    this.relayVisual.core.setFillStyle(coreColor, 1);
    this.relayVisual.glow.setFillStyle(coreColor, 0.2);
  }

  private refreshPads(): void {
    for (const pad of this.pads) {
      const selected = !!this.selectedTower && this.selectedTower.id === pad.towerId;
      drawPad(pad.gfx, pad.hover, pad.towerId !== null, selected);
    }
  }

  private refreshRange(): void {
    const g = this.rangeGfx;
    g.clear();
    let x = 0;
    let y = 0;
    let range = 0;
    let color = 0xffd37c;
    if (this.selectedTower) {
      const def = TOWERS[this.selectedTower.kind];
      x = this.selectedTower.x;
      y = this.selectedTower.y;
      range = def.range[this.selectedTower.level - 1];
      color = def.light;
    } else if (this.selectedBuild && this.hoverPad && this.hoverPad.towerId === null) {
      x = this.hoverPad.x;
      y = this.hoverPad.y;
      range = TOWERS[this.selectedBuild].range[0];
      color = TOWERS[this.selectedBuild].light;
    } else {
      return;
    }
    g.fillStyle(color, 0.045);
    g.fillCircle(x, y, range);
    g.lineStyle(2, color, 0.52);
    for (let i = 0; i < 32; i += 2) {
      const a0 = (i / 32) * Math.PI * 2;
      const a1 = a0 + Math.PI / 32;
      g.beginPath();
      g.arc(x, y, range, a0, a1);
      g.strokePath();
    }
    g.lineStyle(1, color, 0.25);
    g.strokeCircle(x, y, range - 5);
  }
}
