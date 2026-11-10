// Relay Defense main scene: path, towers, enemies, waves, HUD, effects.
import { Scene, GameObjects } from 'phaser';
import * as CFG from '../config';
import { drawText, drawTextFit, measureText } from '../font';
import { audio } from '../audio';
import { isPath, isPad } from './Boot';

export type Tower = {
  c: number; r: number; x: number; y: number;
  kind: 'mirror' | 'driver'; level: number; cd: number;
  sprite: GameObjects.Sprite; angle: number;
};
export type Enemy = {
  type: string; hp: number; maxHp: number; seg: number; dist: number; traveled: number;
  x: number; y: number; angle: number; speed: number; flash: number;
  sprite: GameObjects.Sprite; shadow: GameObjects.Sprite; dead: boolean;
};
type Shot = { x: number; y: number; target: Enemy | null; tx: number; ty: number; dmg: number; splash: number; sprite: GameObjects.Sprite };
type Beam = { x1: number; y1: number; x2: number; y2: number; life: number; max: number; color: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: number; size: number };
type Popup = { x: number; y: number; text: string; life: number; color: number };

type QueueItem = { t: number; type: string };

export class Game extends Scene {
  state = 'idle';            // idle | running | ended
  paused = false;
  speed = 1;
  muted = false;
  funds = CFG.START_FUNDS;
  core = CFG.START_CORE;
  wave = 0;
  waveTime = 0;
  nextWaveIn = 6;
  kills = 0;
  leaks = 0;
  elapsed = 0;
  queue: QueueItem[] = [];
  towers: Tower[] = [];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  beams: Beam[] = [];
  particles: Particle[] = [];
  popups: Popup[] = [];
  buildMode: 'mirror' | 'driver' | null = null;
  selected: Tower | null = null;
  hoverTower: Tower | null = null;
  hoverCell: { c: number; r: number } | null = null;
  pathPoints: { x: number; y: number }[] = [];
  pathLen = 1;
  fx!: GameObjects.Graphics;
  hud!: GameObjects.Graphics;
  banner = { text: '', sub: '', life: 0 };
  shake = 0;
  hint = 'Pick a tower below, then click a pale pad beside the road';
  hintLife = 20;
  endTimer = 0;
  result = '';
  private lastRendered = '';
  private pointer: Phaser.Input.Pointer | null = null;

  constructor() { super('Game'); }

  init(data: { restart?: boolean } = {}) {
    void data;
    this.resetState();
  }

  private resetState() {
    this.state = 'idle';
    this.paused = false;
    this.speed = 1;
    this.funds = CFG.START_FUNDS;
    this.core = CFG.START_CORE;
    this.wave = 0;
    this.waveTime = 0;
    this.nextWaveIn = 8;
    this.kills = 0;
    this.leaks = 0;
    this.elapsed = 0;
    this.queue = [];
    this.towers = [];
    this.enemies = [];
    this.shots = [];
    this.beams = [];
    this.particles = [];
    this.popups = [];
    this.buildMode = null;
    this.selected = null;
    this.hoverTower = null;
    this.hoverCell = null;
    this.banner = { text: '', sub: '', life: 0 };
    this.shake = 0;
    this.result = '';
    this.endTimer = 0;
    this.hintLife = 22;
    this.hint = 'Pick a tower below, then click a pale pad beside the road';
  }

  create() {
    this.resetState();
    this.pathPoints = CFG.PATH.map(([c, r]) => ({ x: c * CFG.TILE + CFG.TILE / 2, y: CFG.MAP_Y + r * CFG.TILE + CFG.TILE / 2 }));
    for (let i = 0; i < this.pathPoints.length - 1; i++) {
      this.pathLen += Math.hypot(this.pathPoints[i + 1].x - this.pathPoints[i].x, this.pathPoints[i + 1].y - this.pathPoints[i].y);
    }

    const bg = this.add.image(CFG.W / 2, CFG.MAP_Y + CFG.MAP_H / 2, 'bg').setDepth(0);
    bg.setInteractive({ useHandCursor: true });

    this.fx = this.add.graphics().setDepth(6);
    this.hud = this.add.graphics().setDepth(10);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onClick(p));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { this.pointer = p; this.updateHover(p); });

    // Advertised controls: P pause, F speed, M mute, R restart, A/B pick tower, Enter start wave.
    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown', (e: KeyboardEvent) => {
        switch (e.code) {
          case 'KeyP': this.press('pause'); break;
          case 'KeyF': this.press('speed'); break;
          case 'KeyM': this.press('mute'); break;
          case 'KeyR': this.restart(); break; // fresh campaign (hint advertises R RESTART)
          case 'KeyA': this.press('tower_mirror'); break;
          case 'KeyB': this.press('tower_driver'); break;
          case 'Enter': case 'Space': this.press('startwave'); break;
        }
      });
    }

    this.events.on('shutdown', () => {
      this.input.off('pointerdown', this.onClick);
      this.input.off('pointermove', this.updateHover);
    });

    this.add.text(0, 0, '').setVisible(false); // keeps text metrics available

    this.hintLife = 22;
    this.nextWaveIn = 8;

    this.render();
    this.lastRendered = this.renderGameToText();
    audio.unlock();
  }

  // ---------- helpers ----------
  private towerAt(c: number, r: number) {
    return this.towers.find(t => t.c === c && t.r === r) || null;
  }

  private pop(text: string, x: number, y: number, color: number) {
    this.popups.push({ x, y, text, life: 1.2, color });
  }

  private bannerMsg(text: string, sub: string) {
    this.banner = { text, sub, life: 3.2 };
  }

  private updateHover(p: Phaser.Input.Pointer) {
    this.hoverTower = null;
    this.hoverCell = null;
    for (const t of this.towers) {
      if (Math.abs(p.x - t.x) < 18 && Math.abs(p.y - (t.y - 16)) < 22) this.hoverTower = t;
    }
    if (!this.hoverTower && p.y > CFG.MAP_Y && p.y < CFG.MAP_Y + CFG.MAP_H) {
      this.hoverCell = { c: Math.floor(p.x / CFG.TILE), r: Math.floor((p.y - CFG.MAP_Y) / CFG.TILE) };
    }
  }

  private clickedButton(p: { x: number; y: number }) {
    for (const b of CFG.BUTTONS) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.id;
    }
    return null;
  }

  private onClick(p: Phaser.Input.Pointer) {
    audio.unlock();
    const btn = this.clickedButton(p);
    if (btn) { this.press(btn); return; }

    if (p.y < CFG.MAP_Y || p.y > CFG.BAR_Y) return;
    const c = Math.floor(p.x / CFG.TILE);
    const r = Math.floor((p.y - CFG.MAP_Y) / CFG.TILE);

    const existing = this.towerAt(c, r);
    if (existing) {
      this.selected = existing;
      audio.ui();
      return;
    }
    if (this.buildMode && isPad(c, r)) {
      const def = CFG.TOWERS[this.buildMode];
      if (this.funds < def.cost) { audio.deny(); this.pop('No funds', p.x, p.y, CFG.COLORS.danger); return; }
      this.funds -= def.cost;
      const t: Tower = { c, r, x: c * CFG.TILE + CFG.TILE / 2, y: r * CFG.TILE + CFG.TILE + CFG.MAP_Y, kind: def.id, level: 1, cd: 0, angle: -90, sprite: this.add.sprite(c * CFG.TILE + CFG.TILE / 2, r * CFG.TILE + CFG.TILE + CFG.MAP_Y, `t_${def.id}1`).setOrigin(0.5, 1).setDepth(4) };
      this.towers.push(t);
      this.selected = t;
      audio.build();
      this.pop(`-${def.cost}`, t.x, t.y - 24, CFG.COLORS.gold);
      this.spawnDust(t.x, t.y - 10);
      if (this.hintLife > 0) this.hint = 'Towers only shoot roads inside their ring. Click a tower to upgrade';
    } else if (isPath(c, r)) {
      audio.deny();
      this.pop('Towers cannot go on the road', p.x, p.y, CFG.COLORS.danger);
    } else {
      audio.deny();
      this.pop('Build only on marked pads', p.x, p.y, CFG.COLORS.danger);
    }
  }

  press(id: string) {
    switch (id) {
      case 'tower_mirror': this.buildMode = this.buildMode === 'mirror' ? null : 'mirror'; audio.ui(); break;
      case 'tower_driver': this.buildMode = this.buildMode === 'driver' ? null : 'driver'; audio.ui(); break;
      case 'upgrade': this.upgrade(); break;
      case 'sell': this.sell(); break;
      case 'startwave':
        if (this.state === 'idle' && !this.result) { this.startWave(); }
        else if (this.result) { this.restart(); }
        audio.ui();
        break;
      case 'speed': this.speed = this.speed === 1 ? 2 : 1; audio.ui(); break;
      case 'pause': this.paused = !this.paused; audio.ui(); break;
      case 'mute': this.muted = !this.muted; audio.setMuted(this.muted); break;
    }
  }

  private upgrade() {
    const t = this.selected;
    if (!t) { audio.deny(); return; }
    const def = CFG.TOWERS[t.kind];
    if (t.level >= 3) { audio.deny(); this.pop('Max level', t.x, t.y - 24, CFG.COLORS.dim); return; }
    const cost = def.levels[t.level - 1].upCost;
    if (this.funds < cost) { audio.deny(); this.pop('Need more power', t.x, t.y - 24, CFG.COLORS.danger); return; }
    this.funds -= cost;
    t.level++;
    t.sprite.setTexture(`t_${t.kind}${t.level}`);
    audio.build();
    this.pop(`Lv ${t.level}`, t.x, t.y - 24, def.id === 'mirror' ? CFG.COLORS.mirror : CFG.COLORS.driver);
    this.spawnDust(t.x, t.y - 14);
  }

  private sell() {
    const t = this.selected;
    if (!t) { audio.deny(); return; }
    const def = CFG.TOWERS[t.kind];
    let spent = def.cost;
    for (let i = 1; i < t.level; i++) spent += def.levels[i - 1].upCost;
    const refund = Math.floor(spent * 0.5);
    this.funds += refund;
    this.towers = this.towers.filter(x => x !== t);
    t.sprite.destroy();
    this.selected = null;
    audio.deny();
    this.pop(`+${refund}`, t.x, t.y - 20, CFG.COLORS.gold);
  }

  restart() {
    this.scene.restart();
    audio.ui();
  }

  // ---------- waves ----------
  private startWave() {
    this.wave++;
    this.state = 'running';
    this.waveTime = 0;
    const w = CFG.WAVES[this.wave - 1];
    let t = 1.0;
    for (const g of w.groups) {
      t += g.gap;
      for (let i = 0; i < g.count; i++) { this.queue.push({ t: t + i * g.interval, type: g.type }); t = t + g.interval; }
    }
    this.queue.sort((a, b) => a.t - b.t);
    this.bannerMsg(`Wave ${this.wave}`, w.label);
    audio.ui();
  }

  private spawnEnemy(type: string) {
    const def = CFG.ENEMIES[type];
    const start = this.pathPoints[0];
    const sprite = this.add.sprite(start.x, start.y, def.texture).setDepth(5);
    const shadow = this.add.sprite(start.x, start.y + def.size / 2, 'shadow').setDepth(3);
    const e: Enemy = {
      type, hp: def.hp, maxHp: def.hp, seg: 0, dist: 0, traveled: 0,
      x: start.x, y: start.y, angle: 0, speed: def.speed, flash: 0,
      sprite, shadow, dead: false,
    };
    this.enemies.push(e);
  }

  private finishWave() {
    const w = CFG.WAVES[this.wave - 1];
    const bonus = w.bonus + Math.max(0, Math.round(this.funds * 0.05));
    this.funds += bonus;
    this.pop(`Wave bonus +${bonus}`, 512, CFG.MAP_Y + 30, CFG.COLORS.gold);
    if (this.wave >= CFG.WAVES.length) {
      this.result = 'win';
      this.state = 'ended';
      this.endTimer = 1.6;
      this.bannerMsg('Outpost secured', 'All six waves cleared');
      audio.win();
    } else {
      this.state = 'idle';
      this.nextWaveIn = 12;
      this.bannerMsg(`Wave ${this.wave} cleared`, `+${bonus} power  •  next wave in 12s`);
    }
  }

  // ---------- simulation ----------
  update(_time: number, delta: number) {
    if (!this.paused && !this.result) {
      const dt = Math.min(0.05, delta / 1000) * this.speed;
      this.elapsed += dt;
      if (this.hintLife > 0) this.hintLife -= dt;
      if (this.banner.life > 0) this.banner.life -= dt;
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);

      if (this.state === 'idle') {
        if (!this.result) {
          this.nextWaveIn -= dt;
          if (this.nextWaveIn <= 0) this.startWave();
        }
      } else if (this.state === 'running') {
        this.waveTime += dt;
        while (this.queue.length && this.queue[0].t <= this.waveTime) {
          const q = this.queue.shift()!;
          this.spawnEnemy(q.type);
        }
        if (!this.queue.length && !this.enemies.length) this.finishWave();
      }

      this.stepEnemies(dt);
      this.stepTowers(dt);
      this.stepShots(dt);
      this.stepFx(dt);

      if (this.result && this.endTimer > 0) {
        this.endTimer -= dt;
        if (this.endTimer <= 0) {
          this.scene.start('GameOver', {
            win: this.result === 'win', wave: this.wave, kills: this.kills,
            leaks: this.leaks, seconds: this.elapsed,
          });
          return;
        }
      }
    }
    this.render();
    this.lastRendered = this.renderGameToText();
  }

  private stepEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      const a = this.pathPoints[e.seg];
      const b = this.pathPoints[e.seg + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      e.dist += e.speed * dt;
      e.traveled += e.speed * dt;
      if (e.dist >= len) {
        e.dist -= len;
        e.seg++;
        if (e.seg >= this.pathPoints.length - 1) {
          const def = CFG.ENEMIES[e.type];
          this.core -= def.leaks;
          this.leaks++;
          audio.leak();
          this.shake = 1;
          this.pop(`-${def.leaks} core`, this.pathPoints[this.pathPoints.length - 1].x, this.pathPoints[this.pathPoints.length - 1].y - 20, CFG.COLORS.danger);
          this.explodeAt(e.x, e.y, 0xff6b6b, 14);
          e.dead = true;
          e.sprite.destroy(); e.shadow.destroy();
          if (this.core <= 0) {
            this.core = 0;
            this.result = 'lose';
            this.state = 'ended';
            this.endTimer = 1.4;
            this.bannerMsg('Relay lost', 'The core was overrun');
            audio.lose();
          }
          continue;
        }
      }
      const na = this.pathPoints[e.seg];
      const nb = this.pathPoints[e.seg + 1];
      const k = e.dist / Math.max(1, Math.hypot(nb.x - na.x, nb.y - na.y));
      e.x = na.x + (nb.x - na.x) * k;
      e.y = na.y + (nb.y - na.y) * k;
      e.angle = Math.atan2(nb.y - na.y, nb.x - na.x) * 180 / Math.PI;
      e.sprite.setPosition(e.x, e.y).setAngle(e.angle);
      e.shadow.setPosition(e.x, e.y + CFG.ENEMIES[e.type].size / 2);
      if (e.flash > 0) { e.flash -= dt; e.sprite.setTint(0xffffff); }
      else e.sprite.clearTint();
    }
    this.enemies = this.enemies.filter(e => !e.dead);
  }

  private bestTarget(t: Tower) {
    const def = CFG.TOWERS[t.kind];
    const range = def.levels[t.level - 1].range;
    let best: Enemy | null = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - t.x, e.y - t.y) > range) continue;
      if (!best || e.traveled > best.traveled) best = e;
    }
    return best;
  }

  private stepTowers(dt: number) {
    for (const t of this.towers) {
      const def = CFG.TOWERS[t.kind];
      const lvl = def.levels[t.level - 1];
      t.cd -= dt;
      const target = this.bestTarget(t);
      if (!target) continue;
      t.angle = Math.atan2(target.y - (t.y - 14), target.x - t.x) * 180 / Math.PI;
      t.sprite.setAngle(t.angle + 90);
      if (t.cd > 0) continue;
      t.cd = lvl.cd;
      const mx = t.x + Math.cos((t.angle) * Math.PI / 180) * 16;
      const my = (t.y - 14) + Math.sin((t.angle) * Math.PI / 180) * 16;
      if (t.kind === 'mirror') {
        this.beams.push({ x1: mx, y1: my, x2: target.x, y2: target.y, life: 0.18, max: 0.18, color: def.accent });
        this.damage(target, lvl.damage);
        this.flashAt(mx, my, def.accent);
        audio.beam(true);
      } else {
        const s = this.add.sprite(mx, my, 'slug').setDepth(5);
        this.shots.push({ x: mx, y: my, target, tx: target.x, ty: target.y, dmg: lvl.damage, splash: lvl.splash, sprite: s });
        this.flashAt(mx, my, def.accent);
        audio.mortar();
      }
    }
  }

  private stepShots(dt: number) {
    const speed = 330;
    for (const s of this.shots) {
      if (s.target && !s.target.dead) { s.tx = s.target.x; s.ty = s.target.y; }
      const dx = s.tx - s.x, dy = s.ty - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.explodeAt(s.tx, s.ty, CFG.COLORS.driver, 12);
        if (s.splash > 0) {
          for (const e of this.enemies) {
            if (e.dead) continue;
            if (Math.hypot(e.x - s.tx, e.y - s.ty) <= s.splash) this.damage(e, s.dmg);
          }
        } else if (s.target && !s.target.dead) this.damage(s.target, s.dmg);
        audio.explode();
        s.sprite.destroy();
        s.target = null;
      } else {
        s.x += dx / d * speed * dt;
        s.y += dy / d * speed * dt;
        s.sprite.setPosition(s.x, s.y).setAngle(Math.atan2(dy, dx) * 180 / Math.PI);
      }
    }
    this.shots = this.shots.filter(s => s.target !== null);
  }

  private damage(e: Enemy, amount: number) {
    const def = CFG.ENEMIES[e.type];
    const dmg = Math.max(2, amount - def.armor);
    e.hp -= dmg;
    e.flash = 0.12;
    audio.hit();
    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      this.kills++;
      this.funds += def.bounty;
      this.pop(`+${def.bounty}`, e.x, e.y - 18, CFG.COLORS.gold);
      this.explodeAt(e.x, e.y, def.boss ? 0xffb06a : 0xf0dcb4, def.boss ? 26 : 12);
      audio.explode();
      e.sprite.destroy(); e.shadow.destroy();
    }
  }

  private explodeAt(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 110;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, max: 0.7, color, size: 2 + Math.random() * 3 });
    }
  }

  private flashAt(x: number, y: number, color: number) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.14, max: 0.14, color, size: 6 });
  }

  private spawnDust(x: number, y: number) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 40 - 20, life: 0.4, max: 0.4, color: 0xd8c197, size: 2 });
    }
  }

  private stepFx(dt: number) {
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter(b => b.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.9; p.vy *= 0.9;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.popups) p.life -= dt;
    this.popups = this.popups.filter(p => p.life > 0);
  }

  // ---------- rendering ----------
  private render() {
    const fx = this.fx, hud = this.hud;
    fx.clear(); hud.clear();

    // build ghost / pad highlight
    if (this.hoverCell && this.buildMode) {
      const { c, r } = this.hoverCell;
      const ok = isPad(c, r) && !this.towerAt(c, r) && this.funds >= CFG.TOWERS[this.buildMode].cost;
      const cx = c * CFG.TILE + CFG.TILE / 2, cy = CFG.MAP_Y + r * CFG.TILE + CFG.TILE / 2;
      fx.fillStyle(ok ? 0x7fd6c9 : 0xff6b6b, 0.22).fillRect(c * CFG.TILE, CFG.MAP_Y + r * CFG.TILE, CFG.TILE, CFG.TILE);
      fx.lineStyle(2, ok ? 0x2f6f66 : 0x8a3f3f, 0.9);
      fx.strokeRect(c * CFG.TILE + 2, CFG.MAP_Y + r * CFG.TILE + 2, CFG.TILE - 4, CFG.TILE - 4);
      const def = CFG.TOWERS[this.buildMode];
      fx.lineStyle(1.5, def.accent, 0.5);
      fx.strokeCircle(cx, cy, def.levels[0].range);
    } else if (this.hoverCell && isPad(this.hoverCell.c, this.hoverCell.r)) {
      const c = this.hoverCell.c, r = this.hoverCell.r;
      fx.fillStyle(0x2f6f66, 0.12).fillRect(c * CFG.TILE, CFG.MAP_Y + r * CFG.TILE, CFG.TILE, CFG.TILE);
    }

    // selected + hovered tower ring
    for (const t of [this.selected, this.hoverTower]) {
      if (!t) continue;
      const def = CFG.TOWERS[t.kind];
      const range = def.levels[t.level - 1].range;
      fx.fillStyle(def.accent, 0.08).fillCircle(t.x, t.y - 12, range);
      fx.lineStyle(1.5, def.accent, 0.75);
      fx.strokeCircle(t.x, t.y - 12, range);
    }

    // beams
    for (const b of this.beams) {
      const a = b.life / b.max;
      fx.lineStyle(3 + a * 3, b.color, a);
      fx.lineBetween(b.x1, b.y1, b.x2, b.y2);
      fx.lineStyle(1.5, 0xffffff, a * 0.8);
      fx.lineBetween(b.x1, b.y1, b.x2, b.y2);
    }

    // particles
    for (const p of this.particles) {
      fx.fillStyle(p.color, Math.max(0, p.life / p.max));
      fx.fillCircle(p.x, p.y, p.size);
    }

    // hp bars
    for (const e of this.enemies) {
      const def = CFG.ENEMIES[e.type];
      if (e.hp >= e.maxHp && !def.boss) continue;
      const w = def.boss ? 46 : 24, h = def.boss ? 5 : 4;
      const x = e.x - w / 2, y = e.y - def.size / 2 - 10;
      fx.fillStyle(0x24313f, 0.85).fillRect(x, y, w, h);
      fx.fillStyle(def.boss ? 0xff5d5d : 0x7fd6c9, 1).fillRect(x + 1, y + 1, (w - 2) * (e.hp / e.maxHp), h - 2);
    }

    // relay hub: pulsing core, brighter when enemies close
    const hub = this.pathPoints[this.pathPoints.length - 1];
    let nearest = 9999;
    for (const e of this.enemies) nearest = Math.min(nearest, Math.hypot(e.x - hub.x, e.y - hub.y));
    const threatened = nearest < 140;
    const pulse = 0.45 + 0.35 * Math.sin(this.elapsed * 3.2);
    fx.lineStyle(2, threatened ? CFG.COLORS.danger : CFG.COLORS.mirror, pulse);
    fx.strokeCircle(hub.x, hub.y, 16 + pulse * 4);
    fx.fillStyle(threatened ? CFG.COLORS.danger : CFG.COLORS.mirror, 0.18 + pulse * 0.12).fillCircle(hub.x, hub.y, 10);

    // popups
    for (const p of this.popups) {
      hud.fillStyle(p.color, Math.min(1, p.life));
      drawText(hud, p.text, p.x - measureText(p.text, 2, 3) / 2, p.y - (1.2 - p.life) * 14, 2, 3, 2);
    }

    this.drawHUD(hud);
    this.drawBanner(hud);
  }

  private button(hud: GameObjects.Graphics, id: string, label: string, active: boolean, enabled: boolean) {
    const b = CFG.BUTTONS.find(x => x.id === id)!;
    const hover = this.pointer && this.pointer.x >= b.x && this.pointer.x <= b.x + b.w && this.pointer.y >= b.y && this.pointer.y <= b.y + b.h;
    hud.fillStyle(active ? 0x3c5163 : (enabled ? (hover ? 0x31404e : 0x273441) : 0x222c36), 1).fillRoundedRect(b.x, b.y, b.w, b.h, 6);
    hud.lineStyle(1.5, active ? CFG.COLORS.mirror : 0x3e4d5b, active ? 1 : 0.8);
    hud.strokeRoundedRect(b.x, b.y, b.w, b.h, 6);
    const w = measureText(label, 2, 3);
    hud.lineStyle(2, enabled ? CFG.COLORS.text : CFG.COLORS.dim, 1);
    drawText(hud, label, b.x + (b.w - w) / 2, b.y + (b.h - 16) / 2, 2, 3, 2);
  }

  private drawHUD(hud: GameObjects.Graphics) {
    const C = CFG.COLORS;
    hud.fillStyle(C.panel, 1).fillRect(0, 0, CFG.W, CFG.HUD_H);
    hud.fillStyle(0x1a232c, 1).fillRect(0, 0, CFG.W, 4);
    // bottom bar
    hud.fillStyle(C.panel, 1).fillRect(0, CFG.BAR_Y, CFG.W, CFG.H - CFG.BAR_Y);
    hud.fillStyle(0x1a232c, 1).fillRect(0, CFG.BAR_Y, CFG.W, 3);

    hud.lineStyle(2, C.gold, 1);
    drawText(hud, 'RELAY DEFENSE', 16, 18, 3, 4, 2);
    hud.lineStyle(2, C.dim, 1);
    drawText(hud, `Wave ${this.wave}/${CFG.WAVES.length}`, 16, 46, 2, 3, 2);

    // funds
    hud.lineStyle(2, C.gold, 0.9);
    hud.strokeCircle(160, 34, 11);
    hud.fillStyle(C.gold, 0.25).fillCircle(160, 34, 11);
    drawText(hud, '$', 154, 26, 3, 4, 2);
    hud.lineStyle(2, C.text, 1);
    drawText(hud, String(this.funds), 178, 26, 3, 4, 2);

    // core integrity bar
    hud.lineStyle(2, C.dim, 1);
    drawText(hud, 'CORE', 236, 26, 2, 3, 2);
    hud.fillStyle(0x2b3641, 1).fillRoundedRect(280, 24, 130, 20, 4);
    const pct = Math.max(0, this.core / CFG.START_CORE);
    hud.fillStyle(pct > 0.5 ? 0x7fd6c9 : pct > 0.25 ? C.gold : C.danger, 0.9).fillRoundedRect(282, 26, 126 * pct, 16, 3);
    hud.lineStyle(2, C.text, 1);
    drawText(hud, `${this.core}`, 420, 26, 2, 3, 2);

    // wave state
    const sx = 470;
    hud.lineStyle(2, C.dim, 1);
    drawText(hud, this.state === 'running' ? 'WAVE ACTIVE' : (this.result ? 'CAMPAIGN OVER' : 'NEXT WAVE IN'), sx, 26, 2, 3, 2);
    hud.lineStyle(2, C.text, 1);
    if (this.state === 'running') {
      drawText(hud, `${this.enemies.length} on road  ${CFG.WAVES[this.wave - 1].label}`, sx, 50, 2, 3, 2);
    } else {
      drawText(hud, this.result ? 'Press R or Restart' : `${Math.ceil(Math.max(0, this.nextWaveIn))}s  •  press start wave`, sx, 50, 2, 3, 2);
    }

    // buttons
    this.button(hud, 'tower_mirror', 'MIRROR ' + CFG.TOWERS.mirror.cost, this.buildMode === 'mirror', true);
    this.button(hud, 'tower_driver', 'DRIVER ' + CFG.TOWERS.driver.cost, this.buildMode === 'driver', true);
    const sel = this.selected;
    this.button(hud, 'upgrade', sel && sel.level < 3 ? `UP ${CFG.TOWERS[sel.kind].levels[sel.level - 1].upCost}` : 'UP', !!sel, !!sel);
    this.button(hud, 'sell', 'SELL', !!sel, !!sel);
    this.button(hud, 'startwave', this.result ? 'RESTART' : (this.state === 'idle' ? 'START WAVE' : 'WAVE RUNS'), this.state === 'idle' || !!this.result, true);
    this.button(hud, 'speed', `SPD x${this.speed}`, this.speed === 2, true);
    this.button(hud, 'pause', this.paused ? 'PAUSED' : 'PAUSE', this.paused, true);
    this.button(hud, 'mute', this.muted ? 'MUTED' : 'MUTE', this.muted, true);

    // selected tower / hint line
    const infoY = CFG.BAR_Y + 66;
    hud.lineStyle(2, C.dim, 1);
    if (sel) {
      const def = CFG.TOWERS[sel.kind];
      const lvl = def.levels[sel.level - 1];
      hud.lineStyle(2, def.accent, 1);
      drawText(hud, `${def.name} LV${sel.level}`, 16, infoY, 2, 3, 2);
      hud.lineStyle(2, C.dim, 1);
      hud.lineStyle(1.5, def.accent, 0.8);
      drawText(hud, `DMG ${lvl.damage}  RATE ${lvl.cd.toFixed(2)}S  RANGE ${lvl.range}${lvl.splash ? '  SPLASH' : ''}`, 170, infoY, 2, 3, 1.5);
    } else {
      hud.lineStyle(2, this.hintLife > 0 ? C.text : C.dim, 1);
      drawText(hud, this.hint, 16, infoY, 2, 3, 1.5);
    }

    // controls line (compact, keyboard hints)
    hud.lineStyle(2, 0x6c7d8a, 1);
    drawTextFit(hud, 'CLICK BUILD • CLICK TOWER • P PAUSE • F SPEED • M MUTE • R RESTART', 470, infoY, CFG.W - 486, 1.6, 2.4, 1.2);
  }

  private drawBanner(hud: GameObjects.Graphics) {
    if (this.banner.life <= 0) return;
    const a = Math.min(1, this.banner.life / 1.2);
    hud.fillStyle(0x24313f, 0.5 * a).fillRoundedRect(CFG.W / 2 - 170, CFG.MAP_Y + 14, 340, 54, 8);
    hud.lineStyle(2, CFG.COLORS.gold, a);
    const w1 = measureText(this.banner.text, 3, 4);
    drawText(hud, this.banner.text, CFG.W / 2 - w1 / 2, CFG.MAP_Y + 22, 3, 4, 2);
    hud.lineStyle(2, CFG.COLORS.text, a * 0.85);
    const w2 = measureText(this.banner.sub, 2, 3);
    drawText(hud, this.banner.sub, CFG.W / 2 - w2 / 2, CFG.MAP_Y + 48, 2, 3, 1.6);
  }

  // ---------- hooks ----------
  renderGameToText() {
    const payload = {
      coord: `origin top-left, x right ${CFG.W}px, y down ${CFG.H}px, tile ${CFG.TILE}px`,
      mode: this.result ? 'end' : this.state,
      paused: this.paused,
      speed: this.speed,
      funds: this.funds,
      core: this.core,
      wave: this.wave,
      waveTotal: CFG.WAVES.length,
      nextWaveIn: this.state === 'idle' && !this.result ? Math.ceil(Math.max(0, this.nextWaveIn)) : 0,
      kills: this.kills,
      leaks: this.leaks,
      elapsed: Math.round(this.elapsed * 10) / 10,
      buildMode: this.buildMode,
      selected: this.selected ? {
        c: this.selected.c, r: this.selected.r, kind: this.selected.kind, level: this.selected.level,
      } : null,
      enemies: this.enemies.map(e => ({
        type: e.type, x: Math.round(e.x), y: Math.round(e.y),
        hp: Math.max(0, Math.round(e.hp)), maxHp: e.maxHp, seg: e.seg,
        pctPath: Math.round((e.traveled / this.pathLen) * 100),
      })),
      towers: this.towers.map(t => ({ c: t.c, r: t.r, kind: t.kind, level: t.level, x: Math.round(t.x), y: Math.round(t.y) })),
      shots: this.shots.map(s => ({ x: Math.round(s.x), y: Math.round(s.y), splash: s.splash })),
    };
    return JSON.stringify(payload);
  }

  advanceTime(ms: number) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) this.update(0, 1000 / 60);
    return this.lastRendered;
  }
}


