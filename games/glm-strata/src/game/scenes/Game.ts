import { Scene, GameObjects } from 'phaser';
type Graphics = Phaser.GameObjects.Graphics;
type Text = Phaser.GameObjects.Text;
import {
  W, H, HUD_H, PATH, CORE, TOWERS, ENEMIES, WAVES, MAX_TOWER_LEVEL,
  TowerKind, EnemyKind, EnemyDef, START_ENERGY, START_LIVES, WAVE_BONUS, TowerDef,
} from '../state';
import { audio } from '../audio';

interface Enemy {
  kind: EnemyKind; def: EnemyDef; hp: number; maxHp: number;
  seg: number; t: number; // path progress (seg index + 0..1 along segment)
  x: number; y: number; ang: number;
  alive: boolean; slow: number;
  gfx: GameObjects.Shape; bar: Graphics; flash: number;
}

interface Tower {
  kind: TowerKind; level: number;
  x: number; y: number; cd: number;
  gfx: Graphics; ring: Graphics;
}

interface Shot {
  x: number; y: number; tx: number; ty: number;
  target: Enemy | null; dmg: number; air: boolean; kind: TowerKind;
  gfx: GameObjects.Arc | GameObjects.Rectangle; life: number; ang: number;
}

interface FloatText { obj: Text; life: number }

export class Game extends Scene {
  energy = START_ENERGY;
  lives = START_LIVES;
  waveIdx = 0; // waves completed
  inWave = false;
  waveT = 0;
  spawnQueue: { kind: EnemyKind; at: number }[] = [];
  enemies: Enemy[] = [];
  towers: Tower[] = [];
  shots: Shot[] = [];
  floats: FloatText[] = [];
  selected: TowerKind = 'pulse';
  paused = false;
  speed = 1;
  over: '' | 'win' | 'lose' = '';
  mode = 'menu';
  runId = 0;

  private acc = 0;
  private bg!: Graphics;
  private pathPts = PATH.map(p => ({ x: p.x, y: p.y }));
  private segLens: number[] = [];
  private totalLen = 0;
  private hudE!: Text; private hudW!: Text; private hudL!: Text;
  private hudInfo!: Text;
  private btnPause!: Text; private btnSpeed!: Text; private btnMute!: Text; private btnRestart!: Text;
  private ghost!: Graphics; private rangeRing!: Graphics;
  private toast!: Text;
  private toastT = 0;
  private shakeT = 0;
  private banner!: Text;

  constructor() { super('Game'); }

  create() {
    // fresh entry: clear stale custom fields (the Scene instance persists across
    // starts) and destroy any leftovers BEFORE constructing the new scene objects
    this.resetRun(true);
    this.cameras.main.setBackgroundColor('#f4c889');
    this.buildPath();
    this.buildBackground();
    this.buildHud();
    this.buildGhost();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      audio.resume();
      const wx = p.worldX, wy = p.worldY;
      if (wy < HUD_H) return;
      if (this.over) return;
      // clicked a tower? -> upgrade
      for (const tw of this.towers) {
        if (Math.hypot(tw.x - wx, tw.y - wy) < 26) { this.tryUpgrade(tw); return; }
      }
      this.tryPlace(wx, wy);
    });

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === '1') this.setSelected('pulse');
      else if (k === '2') this.setSelected('lance');
      else if (k === 'p' || k === ' ') this.togglePause();
      else if (k === 't') this.toggleSpeed();
      else if (k === 'm') this.toggleMute();
      else if (k === 'r') this.restart();
    });

    this.mode = 'playing';
    audio.startMusic();
    this.startWave(0);
    (window as any).render_game_to_text = () => this.renderStateText();
    (window as any).advanceTime = (ms: number) => this.advanceTimeExternal(ms);
  }

  // ---------- build ----------

  private buildPath() {
    this.segLens = [];
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      const a = this.pathPts[i], b = this.pathPts[i + 1];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      this.segLens.push(l); this.totalLen += l;
    }
  }

  private pathAt(seg: number, t: number): { x: number; y: number; ang: number } {
    const a = this.pathPts[Math.min(seg, this.pathPts.length - 2)];
    const b = this.pathPts[Math.min(seg + 1, this.pathPts.length - 1)];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  }

  private distToPath(px: number, py: number): number {
    let best = 1e9;
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      const a = this.pathPts[i], b = this.pathPts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy;
      let t = ((px - a.x) * dx + (py - a.y) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      best = Math.min(best, Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t)));
    }
    return best;
  }

  private buildBackground() {
    this.bg = this.add.graphics();
    const g = this.bg;
    // bright desert base
    g.fillStyle(0xf7d09a); g.fillRect(0, HUD_H, W, H - HUD_H);
    // soft dune bands
    const bands = [[0xf2c48c, 70], [0xefba7e, 90], [0xf5d7a5, 60]];
    let y = HUD_H + 30;
    for (const [col, hh] of bands) {
      g.fillStyle(col as number);
      for (let x = 0; x <= W; x += 32) {
        const yy = y + Math.sin((x + y) * 0.008) * 22;
        g.fillRect(x, yy, 32, hh as number);
      }
      y += (hh as number) + 46;
    }
    // rock clusters
    for (let i = 0; i < 26; i++) {
      const x = 30 + Math.random() * (W - 60), yy = HUD_H + 30 + Math.random() * (H - HUD_H - 80);
      if (this.distToPath(x, yy) < 60) continue;
      const c = 0xb07a4e;
      g.fillStyle(c); g.fillEllipse(x, yy, 18 + Math.random() * 22, 10 + Math.random() * 12);
      g.fillStyle(0xc98f5c); g.fillEllipse(x - 4, yy - 3, 10, 6);
    }
    // path ribbon: sand track with darker edges
    g.lineStyle(14, 0x9a6b3c, 1);
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      g.lineBetween(this.pathPts[i].x, this.pathPts[i].y, this.pathPts[i + 1].x, this.pathPts[i + 1].y);
    }
    g.lineStyle(10, 0xd9b98a, 1);
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      g.lineBetween(this.pathPts[i].x, this.pathPts[i].y, this.pathPts[i + 1].x, this.pathPts[i + 1].y);
    }
    // dashed center marks
    g.lineStyle(2, 0xffffff, 0.5);
    let dist = 0;
    for (let i = 0; i < this.pathPts.length - 1; i++) {
      const a = this.pathPts[i], b = this.pathPts[i + 1];
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      for (let s = 0; s < l; s += 26) {
        if ((dist + s) % 52 < 26) {
          const t = s / l;
          const mx = a.x + (b.x - a.x) * t, my = a.y + (b.y - a.y) * t;
          g.lineBetween(mx, my, mx + (b.x - a.x) / l * 10, my + (b.y - a.y) / l * 10);
        }
      }
      dist += l;
    }
    // solar arrays flanking the core (decorative, original procedural art)
    for (const sx of [760, 850]) {
      const sy = 180;
      g.fillStyle(0x2b3d55);
      for (let r = 0; r < 3; r++) g.fillRect(sx - 55, sy + r * 26 + 6, 110, 18);
      g.fillStyle(0x4d7fd6);
      for (let r = 0; r < 3; r++) g.fillRect(sx - 55, sy + r * 26, 110, 16);
      g.fillStyle(0x8fc0ff);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) g.fillRect(sx - 51 + c * 27, sy + r * 26 + 2, 22, 12);
      }
    }
    // relay station at core
    g.fillStyle(0x8c6f4d); g.fillEllipse(CORE.x, CORE.y + 18, 130, 46);
    g.fillStyle(0xd9d2c4); g.fillCircle(CORE.x, CORE.y, CORE.r);
    g.fillStyle(0xf4efe2); g.fillCircle(CORE.x, CORE.y, CORE.r - 8);
    g.fillStyle(0xffc84d); g.fillCircle(CORE.x, CORE.y, 22);
    g.fillStyle(0xffffff); g.fillCircle(CORE.x - 6, CORE.y - 8, 8);
    // dish
    g.fillStyle(0xded9cb);
    g.fillEllipse(CORE.x - 34, CORE.y - 34, 62, 40);
    g.fillStyle(0xb9b3a2); g.fillCircle(CORE.x - 34, CORE.y - 34, 9);
    g.lineStyle(3, 0x6b5a41, 1);
    g.lineBetween(CORE.x - 34, CORE.y - 34, CORE.x, CORE.y + 12);
    // decorative relay antennas
    for (const ax of [CORE.x - 70, CORE.x + 55]) {
      g.lineStyle(4, 0x6b5a41, 1);
      g.lineBetween(ax, CORE.y + 20, ax, CORE.y - 44);
      g.fillStyle(0xff6a5e); g.fillCircle(ax, CORE.y - 46, 5);
    }
  }

  private buildHud() {
    this.add.rectangle(W / 2, HUD_H / 2, W, HUD_H, 0x2b2622).setDepth(10);
    this.add.rectangle(W / 2, HUD_H - 1, W, 2, 0xffc84d).setDepth(10);
    const st = { fontFamily: 'Arial Black', fontSize: '14px', color: '#fff8e8' } as Phaser.Types.GameObjects.Text.TextStyle;
    this.hudE = this.add.text(12, 7, '', st).setDepth(11);
    this.hudW = this.add.text(200, 7, '', st).setDepth(11);
    this.hudL = this.add.text(360, 7, '', st).setDepth(11);
    this.hudInfo = this.add.text(452, 7, '', st).setDepth(11);
    const btn = (x: number, y: number, label: string, fn: () => void, color = '#ffe9b8') => {
      const t = this.add.text(x, y, label, { ...st, color }).setDepth(11).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => { audio.resume(); fn(); });
      return t;
    };
    this.btnPause = btn(744, 7, 'II Pause', () => this.togglePause());
    this.btnSpeed = btn(818, 7, '1x', () => this.toggleSpeed());
    this.btnMute = btn(852, 7, 'Snd:On', () => this.toggleMute());
    this.btnRestart = btn(916, 7, 'Restart', () => this.restart());
    const sel = (x: number, kind: TowerKind) => {
      const def = TOWERS[kind];
      const t = btn(x, 26, `Key ${def.key}: ${def.name.split(' ')[0]} ${def.cost}`,
        () => this.setSelected(kind), def.kind === this.selected ? '#ffd257' : '#cfc4ae');
      return t;
    };
    this.selBtns = [sel(12, 'pulse'), sel(200, 'lance')];
    this.banner = this.add.text(W / 2, HUD_H + 34, '',
      { fontFamily: 'Arial Black', fontSize: '26px', color: '#ffd257', stroke: '#3a2a12', strokeThickness: 6 })
      .setOrigin(0.5).setDepth(20);
    this.toast = this.add.text(W / 2, H - 24, '',
      { fontFamily: 'Arial Black', fontSize: '15px', color: '#fff3d0', stroke: '#2b1d0c', strokeThickness: 5 })
      .setOrigin(0.5).setDepth(20);
    this.refreshHud();
  }

  private selBtns: Text[] = [];

  private buildGhost() {
    this.ghost = this.add.graphics().setDepth(5);
    this.rangeRing = this.add.graphics().setDepth(4);
  }

  private setSelected(kind: TowerKind) {
    this.selected = kind;
    for (let i = 0; i < this.selBtns.length; i++) {
      const def = TOWERS[i === 0 ? 'pulse' : 'lance'];
      this.selBtns[i].setColor(def.kind === kind ? '#ffd257' : '#cfc4ae');
    }
    this.ghost.clear();
    const def = TOWERS[kind];
    this.ghost.fillStyle(def.color, 0.35);
    this.ghost.fillCircle(0, 0, 10);
    this.refreshHud();
  }

  private refreshHud() {
    const waveNo = Math.min(this.waveIdx + (this.inWave ? 1 : 0), WAVES.length);
    this.hudE.setText(`Energy ${this.energy}`);
    this.hudW.setText(`Wave ${waveNo}/${WAVES.length}`);
    this.hudL.setText(`Relay ${this.lives}/${START_LIVES}`);
    const def = TOWERS[this.selected];
    this.hudInfo.setText(`Build: ${def.name.split(' ')[0]} - ${def.blurb}`);
    if (this.btnSpeed) this.btnSpeed.setText(this.speed === 1 ? '1x' : '2x');
    if (this.btnPause) this.btnPause.setText(this.paused ? '> Resume' : 'II Pause');
    if (this.btnMute) this.btnMute.setText(audio.muted ? 'Snd:Off' : 'Snd:On');
    if (this.btnRestart) this.btnRestart.setColor(this.over ? '#ff6a5e' : '#ffe9b8');
  }

  private showToast(msg: string) { this.toast.setText(msg); this.toastT = 2.6; }

  private addFloat(x: number, y: number, msg: string, color = '#fff3d0') {
    const t = this.add.text(x, y, msg,
      { fontFamily: 'Arial Black', fontSize: '13px', color, stroke: '#2b1d0c', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(18);
    this.floats.push({ obj: t, life: 0.9 });
  }

  private tryPlace(wx: number, wy: number) {
    if (this.over) return;
    const def = TOWERS[this.selected];
    if (this.energy < def.cost) { audio.deny(); this.showToast(`Not enough energy for ${def.name} (${def.cost})`); return; }
    if (this.distToPath(wx, wy) < 34) { audio.deny(); this.showToast('Too close to the enemy track'); return; }
    if (Math.hypot(wx - CORE.x, wy - CORE.y) < CORE.r + 24) { audio.deny(); this.showToast('Keep clear of the relay core'); return; }
    for (const tw of this.towers) if (Math.hypot(tw.x - wx, tw.y - wy) < 30) { audio.deny(); this.showToast('Tower already here'); return; }
    if (wx < 6 || wx > W - 6 || wy < HUD_H + 6 || wy > H - 8) { audio.deny(); this.showToast('Out of bounds'); return; }
    this.energy -= def.cost;
    this.makeTower(def, wx, wy);
    audio.place();
    this.addFloat(wx, wy - 20, `-${def.cost}`, '#ffc84d');
    this.refreshHud();
  }

  private makeTower(def: TowerDef, x: number, y: number) {
    const gfx = this.add.graphics().setDepth(6);
    gfx.fillStyle(0x6b5a41); gfx.fillEllipse(x, y + 10, 30, 14);
    gfx.fillStyle(0x4a4034); gfx.fillCircle(x, y, 13);
    gfx.fillStyle(def.color); gfx.fillCircle(x, y, 9);
    gfx.fillStyle(0xffffff, 0.85); gfx.fillCircle(x - 3, y - 3, 3);
    const ring = this.add.graphics().setDepth(7);
    ring.lineStyle(2, def.color, 0.9); ring.strokeCircle(x, y, 13);
    this.towers.push({ kind: def.kind, level: 1, x, y, cd: 0, gfx, ring });
  }

  private upgradeCost(tw: Tower) { return Math.round(TOWERS[tw.kind].cost * 0.8 * tw.level); }

  private tryUpgrade(tw: Tower) {
    if (this.over) return;
    if (tw.level >= MAX_TOWER_LEVEL) { audio.deny(); this.showToast('Tower fully upgraded'); return; }
    const cost = this.upgradeCost(tw);
    if (this.energy < cost) { audio.deny(); this.showToast(`Upgrade costs ${cost} energy`); return; }
    this.energy -= cost;
    tw.level++;
    audio.upgrade();
    this.addFloat(tw.x, tw.y - 26, `Lv ${tw.level}`, '#7ef2c3');
    tw.gfx.clear();
    const def = TOWERS[tw.kind];
    tw.gfx.fillStyle(0x6b5a41); tw.gfx.fillEllipse(tw.x, tw.y + 10, 30, 14);
    tw.gfx.fillStyle(0x4a4034); tw.gfx.fillCircle(tw.x, tw.y, 13);
    tw.gfx.fillStyle(def.color); tw.gfx.fillCircle(tw.x, tw.y, 9);
    tw.gfx.fillStyle(0xffffff, 0.85); tw.gfx.fillCircle(tw.x - 3, tw.y - 3, 3);
    for (let p = 0; p < tw.level - 1; p++) tw.gfx.fillStyle(0xffd257), tw.gfx.fillCircle(tw.x - 6 + p * 6, tw.y - 14, 2.4);
    tw.ring.clear(); tw.ring.lineStyle(2, def.color, 0.9); tw.ring.strokeCircle(tw.x, tw.y, 13);
    this.refreshHud();
  }

  private startWave(i: number) {
    if (i >= WAVES.length) return;
    this.inWave = true;
    this.waveIdx = i;
    this.waveT = 0;
    this.spawnQueue = [];
    const w = WAVES[i];
    for (const gr of w.groups) {
      for (let n = 0; n < gr.count; n++) this.spawnQueue.push({ kind: gr.kind, at: gr.delay + n * gr.gap });
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    audio.waveStart();
    if (w.groups.some(g => g.kind === 'boss')) setTimeout(() => audio.boss(), 600);
    this.banner.setText(`Wave ${i + 1}: ${w.label}`);
    this.bannerT = 3.2;
    this.refreshHud();
  }

  private bannerT = 0;

  private togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    audio.ui(this.paused ? 220 : 440);
    this.showToast(this.paused ? 'Paused - press Resume or P' : 'Resumed');
    this.refreshHud();
  }

  private toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    audio.ui(660);
    this.showToast(`Speed ${this.speed}x`);
    this.refreshHud();
  }

  private toggleMute() {
    audio.setMuted(!audio.muted);
    audio.ui(audio.muted ? 220 : 660);
    this.showToast(audio.muted ? 'Sound muted' : 'Sound on');
    this.refreshHud();
  }

  private resetRun(keepObjects: boolean) {
    this.runId++;
    this.energy = START_ENERGY;
    this.lives = START_LIVES;
    this.waveIdx = 0;
    this.inWave = false;
    this.waveT = 0;
    this.spawnQueue = [];
    this.enemies = [];
    this.towers = [];
    this.shots = [];
    this.floats = [];
    this.selected = 'pulse';
    this.paused = false;
    this.speed = 1;
    this.over = '';
    this.acc = 0;
    this.toastT = 0;
    this.bannerT = 0;
    this.shakeT = 0;
    if (keepObjects) {
      // fresh entry: destroy leftovers, then discard the stale references
      for (const s of this.shots) s.gfx.destroy();
      for (const f of this.floats) f.obj.destroy();
      for (const t of this.towers) { t.gfx.destroy(); t.ring.destroy(); }
      for (const e of this.enemies) { e.gfx.destroy(); e.bar.destroy(); }
      for (const obj of this.children.list.slice()) obj.destroy();
      this.selBtns = [];
    }
  }

  private restart() {
    // in-place R: run cleanup against the live arrays first, then reset fields
    for (const s of this.shots) s.gfx.destroy();
    for (const f of this.floats) f.obj.destroy();
    for (const t of this.towers) { t.gfx.destroy(); t.ring.destroy(); }
    for (const e of this.enemies) { e.gfx.destroy(); e.bar.destroy(); }
    this.resetRun(false);
    this.toast.setText('');
    this.banner.setText('');
    for (const t of this.selBtns) t.setColor('#cfc4ae');
    this.selBtns[0].setColor('#ffd257');
    audio.waveStart();
    this.refreshHud();
    this.startWave(0);
  }

  private step(dt: number) {
    // spawns
    this.waveT += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.waveT) {
      const s = this.spawnQueue.shift()!;
      this.spawnEnemy(s.kind);
    }
    // enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      let move = e.def.speed * dt * (e.slow > 0 ? 0.55 : 1);
      if (e.slow > 0) e.slow -= dt;
      while (move > 0 && e.seg < this.pathPts.length - 1) {
        const segL = this.segLens[e.seg];
        const rem = segL * (1 - e.t);
        if (move < rem) { e.t += move / segL; move = 0; }
        else { move -= rem; e.seg++; e.t = 0; }
      }
      if (e.seg >= this.pathPts.length - 1) {
        e.alive = false;
        e.gfx.destroy();
        e.bar.destroy();
        this.lives -= e.def.damage;
        audio.leak();
        this.shakeT = 0.35;
        this.addFloat(CORE.x, CORE.y - 60, `Relay -${e.def.damage}`, '#ff6a5e');
        this.refreshHud();
        if (this.lives <= 0) this.endGame('lose');
        continue;
      }
      const p = this.pathAt(e.seg, e.t);
      e.x = p.x; e.y = p.y + (e.def.air ? -26 : 0); e.ang = p.ang;
      e.flash = Math.max(0, e.flash - dt);
    }
    // towers fire
    for (const tw of this.towers) {
      tw.cd -= dt;
      if (tw.cd > 0) continue;
      const def = TOWERS[tw.kind];
      const rate = def.rate * (1 + 0.22 * (tw.level - 1));
      const range = def.range * (1 + 0.12 * (tw.level - 1));
      const dmg = def.damage * (1 + 0.55 * (tw.level - 1));
      const cands = this.enemies.filter(e => e.alive && (def.hitsAir || !e.def.air) && Math.hypot(e.x - tw.x, e.y - tw.y) <= range);
      if (!cands.length) continue;
      const tgt = cands.sort((a, b) => (b.hp / b.maxHp) - (a.hp / a.maxHp))[0];
      tw.cd = 1 / rate;
      if (def.kind === 'lance') {
        audio.lance();
        const beam = this.add.rectangle(tw.x, tw.y, Math.hypot(tgt.x - tw.x, tgt.y - tw.y), 4, 0xffe9b8)
          .setOrigin(0, 0.5).setRotation(Math.atan2(tgt.y - tw.y, tgt.x - tw.x)).setDepth(8);
        this.shots.push({ x: tw.x, y: tw.y, tx: tgt.x, ty: tgt.y, target: null, dmg, air: true, kind: 'lance', gfx: beam, life: 0.16, ang: 0 });
        this.damageEnemy(tgt, dmg);
      } else {
        audio.shoot();
        const b = this.add.circle(tw.x, tw.y, 4, 0xffffff).setDepth(8);
        this.shots.push({ x: tw.x, y: tw.y, tx: tgt.x, ty: tgt.y, target: tgt, dmg, air: true, kind: 'pulse', gfx: b, life: 2, ang: 0 });
      }
    }
    // shots
    for (const s of this.shots) {
      if (s.kind === 'pulse') {
        if (s.target && s.target.alive) { s.tx = s.target.x; s.ty = s.target.y; }
        const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
        const spd = 460 * dt;
        if (d < spd + 4) {
          if (s.target && s.target.alive) this.damageEnemy(s.target, s.dmg);
          s.life = 0;
          s.gfx.destroy();
        } else { s.x += dx / d * spd; s.y += dy / d * spd; s.gfx.setPosition(s.x, s.y); }
      } else {
        s.life -= dt;
        if (s.life <= 0) s.gfx.destroy();
      }
    }
    this.shots = this.shots.filter(s => s.life > 0);
    // floats
    for (const f of this.floats) { f.life -= dt; f.obj.y -= 34 * dt; f.obj.alpha = Math.max(0, f.life / 0.9); }
    this.floats = this.floats.filter(f => { if (f.life <= 0) { f.obj.destroy(); return false; } return true; });
    // toast / banner
    if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.toast.setText(''); }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.banner.setText(''); }
    if (this.shakeT > 0) { this.shakeT -= dt; const m = this.shakeT * 14; this.cameras.main.setScroll((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m); } else this.cameras.main.setScroll(0, 0);
    // purge dead bodies so bars/graphics never linger into the next frame
    this.enemies = this.enemies.filter(e => e.alive);
    // wave end
    if (this.inWave && !this.spawnQueue.length && !this.enemies.length && !this.over) {
      this.inWave = false;
      const bonus = WAVE_BONUS(this.waveIdx + 1);
      this.energy += bonus;
      audio.kill();
      this.addFloat(W / 2, H / 2 - 40, `Wave ${this.waveIdx + 1} cleared! +${bonus} energy`, '#7ef2c3');
      this.refreshHud();
      if (this.waveIdx + 1 >= WAVES.length) { this.endGame('win'); }
      else { const rid = this.runId; setTimeout(() => { if (!this.over && this.runId === rid && this.mode === 'playing') this.startWave(this.waveIdx + 1); }, 1400); }
    }
  }

  private spawnEnemy(kind: EnemyKind) {
    const def = ENEMIES[kind];
    const gfx = this.add.circle(-30, PATH[0].y + (def.air ? -26 : 0), def.r, def.color).setDepth(9);
    gfx.setStrokeStyle(2, 0x2b1d0c, 0.9);
    const bar = this.add.graphics().setDepth(19);
    this.enemies.push({ kind, def, hp: def.hp, maxHp: def.hp, seg: 0, t: 0, x: -30, y: PATH[0].y, ang: 0, alive: true, slow: 0, gfx, bar, flash: 0 });
    if (kind === 'boss') audio.boss();
  }

  private damageEnemy(e: Enemy, dmg: number) {
    e.hp -= dmg;
    e.flash = 0.08;
    audio.hit();
    if (e.hp <= 0 && e.alive) {
      e.alive = false;
      this.energy += e.def.bounty;
      this.addFloat(e.x, e.y - 20, `+${e.def.bounty}`, '#ffc84d');
      audio.kill();
      this.refreshHud();
      const eg = e.gfx, eb = e.bar;
      e.gfx.setAlpha(0.35);
      e.bar.clear();
      const rid = this.runId;
      setTimeout(() => { if (this.runId === rid) { eg.destroy(); eb.destroy(); } }, 260);
    }
  }

  private endGame(res: 'win' | 'lose') {
    // guard: an already-decided outcome cannot be flipped in the same frame
    if (this.over) return;
    this.over = res;
    this.paused = false;
    this.mode = 'over';
    this.inWave = false;
    const rid = this.runId;
    setTimeout(() => { if (this.runId === rid) this.scene.start('GameOver', { win: res === 'win', wave: this.waveIdx + 1, energy: this.energy }); }, 1500);
    if (res === 'win') audio.win(); else audio.lose();
    this.refreshHud();
  }

  private renderStateText(): string {
    return JSON.stringify({
      mode: this.over || (this.paused ? 'paused' : this.mode),
      wave: `${this.waveIdx + 1}/${WAVES.length}`,
      energy: this.energy, lives: this.lives,
      enemies: this.enemies.filter(e => e.alive).map(e => e.kind),
      towers: this.towers.map(t => `${t.kind} lv${t.level}`),
      selected: this.selected, speed: this.speed, muted: audio.muted,
      bossHp: (() => { const b = this.enemies.find(e => e.kind === 'boss' && e.alive); return b ? `${b.hp}/${b.maxHp}` : null; })(),
    });
  }

  // actual-time harness hook: honor real pause/speed/end-state semantics
  private advanceTimeExternal(ms: number) {
    if (this.paused || this.over) return;
    const budget = ms * this.speed;
    const stepMs = 1000 / 60;
    const steps = Math.min(Math.floor(budget / stepMs), 3600);
    for (let i = 0; i < steps; i++) this.step(stepMs / 1000);
  }

  update(_time: number, delta: number) {
    if (this.paused || this.over) { this.drawBars(); this.drawGhost(); return; }
    this.acc += delta * this.speed;
    while (this.acc >= 16.6667) { this.step(16.6667 / 1000); this.acc -= 16.6667; }
    this.drawBars();
    this.drawGhost();
  }

  private drawBars() {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.bar.clear();
      if (e.hp < e.maxHp) {
        const w = Math.max(24, e.def.r * 2.4);
        e.bar.fillStyle(0x2b1d0c, 0.7); e.bar.fillRect(e.x - w / 2, e.y - e.def.r - 9, w, 5);
        e.bar.fillStyle(e.def.air ? 0x7ef2c3 : 0xffd257, 1);
        e.bar.fillRect(e.x - w / 2, e.y - e.def.r - 9, w * (e.hp / e.maxHp), 5);
      }
      e.gfx.setPosition(e.x, e.y);
      e.gfx.setRotation(e.kind === 'runner' ? e.ang : 0);
    }
    // core damage flash ring
    if (this.shakeT > 0) {
      const g = this.bg;
      g.clear();
      this.buildBackground();
    }
  }

  private drawGhost() {
    this.ghost.clear();
    this.rangeRing.clear();
    const p = this.input.activePointer;
    if (this.over || p.worldY < HUD_H + 8 || p.worldX < 0 || p.worldX > W) return;
    const def = TOWERS[this.selected];
    const ok = this.energy >= def.cost && this.distToPath(p.worldX, p.worldY) >= 34
      && Math.hypot(p.worldX - CORE.x, p.worldY - CORE.y) > CORE.r + 24
      && !this.towers.some(t => Math.hypot(t.x - p.worldX, t.y - p.worldY) < 30);
    this.rangeRing.lineStyle(2, ok ? def.color : 0xff6a5e, 0.7);
    this.rangeRing.strokeCircle(p.worldX, p.worldY, def.range * (1 + 0.12 * 0));
    this.ghost.fillStyle(ok ? def.color : 0xff6a5e, 0.4);
    this.ghost.fillCircle(p.worldX, p.worldY, 11);
    this.ghost.lineStyle(2, 0xffffff, 0.8);
    this.ghost.strokeCircle(p.worldX, p.worldY, 11);
  }
}
