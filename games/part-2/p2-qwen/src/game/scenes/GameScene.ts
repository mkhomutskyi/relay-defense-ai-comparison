import { Scene, GameObjects } from 'phaser';
import { Sim, type Tower } from '../sim';
import { audio } from '../audio';
import {
    TOWERS, ENEMIES, WAVES, CELL, PLAY_TOP, VIEW_W, VIEW_H, GRID_COLS, GRID_ROWS,
    type TowerKind,
} from '../data';

interface Btn { obj: GameObjects.Container; label: GameObjects.Text; x: number; y: number; w: number; h: number; fn: () => void; bg: GameObjects.Rectangle; base: number; }

export class GameScene extends Scene {
    sim = new Sim();
    private fxG!: GameObjects.Graphics;
    private selG!: GameObjects.Graphics;
    private hudT!: Record<string, GameObjects.Text>;
    private enemyViews = new Map<number, GameObjects.Image>();
    private towerViews = new Map<number, GameObjects.Image>();
    private bulletViews = new Map<number, GameObjects.Image>();
    private relay!: GameObjects.Image;

    private buildKind: TowerKind | null = null;
    private selectedTower: Tower | null = null;
    private paused = false;
    private speed = 1;
    private muted = false;
    private endBanner: GameObjects.Container | null = null;
    private tutOpen = true;
    private buttons: Btn[] = [];
    private useManualStep = false;
    private hoverCell: { c: number; r: number } | null = null;

    constructor() { super('Game'); }

    create() {
        this.sim.reset();
        this.add.image(VIEW_W / 2, VIEW_H / 2, 'bg').setDepth(0);
        const last = { x: VIEW_W - 40, y: PLAY_TOP + 224 };
        this.relay = this.add.image(last.x, last.y - 26, 'relay').setDepth(2);

        // layers
        this.towerLayerGfx();
        this.fxG = this.add.graphics().setDepth(6);
        this.selG = this.add.graphics().setDepth(5);

        this.buildHud();
        this.buildOverlays();

        // input
        this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
            const cell = this.sim.cellFromXY(p.x, p.y);
            this.hoverCell = cell;
        });
        this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p));
        const kb = this.input.keyboard!;
        kb.on('keydown-ONE', () => this.selectBuild('pulse'));
        kb.on('keydown-TWO', () => this.selectBuild('arc'));
        kb.on('keydown-SPACE', () => this.tryStartWave());
        kb.on('keydown-P', () => this.togglePause());
        kb.on('keydown-S', () => this.toggleSpeed());
        kb.on('keydown-M', () => this.toggleMute());
        kb.on('keydown-R', () => this.restart());
        kb.on('keydown-ESC', () => { this.buildKind = null; this.selectedTower = null; });

        audio.startMusic();
        this.installHooks();
    }

    private towerLayerGfx() { void 0; }

    // ---------------------------------------------------------------- HUD
    private mkBtn(x: number, y: number, w: number, h: number, base: number, label: string, color: number, fn: () => void, fontSize = 15): Btn {
        const c = this.add.container(x, y).setDepth(20);
        const bg = this.add.rectangle(0, 0, w, h, base).setStrokeStyle(2, color);
        const t = this.add.text(0, 0, label, { fontFamily: 'Arial', fontSize, color: '#ffffff', align: 'center' }).setOrigin(0.5);
        c.add([bg, t]);
        c.setSize(w, h).setInteractive({ useHandCursor: true });
        const btn: Btn = { obj: c, label: t, x, y, w, h, fn, bg, base };
        c.on('pointerdown', () => { audio.click(); fn(); });
        this.buttons.push(btn);
        return btn;
    }

    private buildHud() {
        // translucent backdrop bar so HUD text stays readable over the desert
        const bar = this.add.graphics().setDepth(19);
        bar.fillStyle(0x140c26, 0.82).fillRect(0, 0, VIEW_W, PLAY_TOP);
        bar.lineStyle(2, 0x3a2a5e, 1).lineBetween(0, PLAY_TOP, VIEW_W, PLAY_TOP);
        bar.lineStyle(2, 0x3a2a5e, 1).lineBetween(250, 8, 250, PLAY_TOP - 8);
        bar.lineStyle(2, 0x3a2a5e, 1).lineBetween(500, 8, 500, PLAY_TOP - 8);

        this.hudT = {
            money: this.hudText(16, 14, '#ffd24a'),
            lives: this.hudText(16, 36, '#ff7a7a'),
            wave: this.hudText(128, 14, '#cfe6ff'),
            phase: this.hudText(128, 36, '#9be8b0'),
        };
        // tower shop (two roles)
        this.shopPulse = this.mkBtn(312, 32, 120, 44, 0x2a1c47, 'Pulse 70', TOWERS.pulse.color, () => this.selectBuild('pulse'));
        this.shopArc = this.mkBtn(436, 32, 120, 44, 0x16394a, 'Arc 95', TOWERS.arc.color, () => this.selectBuild('arc'));
        // right control cluster
        this.startBtn = this.mkBtn(572, 32, 120, 44, 0x1c5a2a, 'START WAVE', 0x7dffa0, () => this.tryStartWave(), 14);
        this.mkBtn(710, 32, 54, 40, 0x33334f, 'P', 0x9aa0c0, () => this.togglePause());
        this.speedBtn = this.mkBtn(772, 32, 66, 40, 0x33334f, 'x1', 0x9aa0c0, () => this.toggleSpeed());
        this.mkBtn(846, 32, 54, 40, 0x33334f, 'M', 0x9aa0c0, () => this.toggleMute());
        this.mkBtn(914, 32, 70, 40, 0x33334f, 'RST', 0x9aa0c0, () => this.restart());
    }
    private shopPulse!: Btn; private shopArc!: Btn; private startBtn!: Btn; private speedBtn!: Btn;

    private hudText(x: number, y: number, color: string) {
        return this.add.text(x, y, '', { fontFamily: 'Arial Black, Arial', fontSize: 20, color, stroke: '#1a1030', strokeThickness: 4 }).setDepth(20);
    }

    // ---------------------------------------------------------- Overlays
    private buildOverlays() {
        this.tutPanel = this.add.container(VIEW_W / 2, PLAY_TOP + 250).setDepth(25);
        const tp = this.add.rectangle(0, 0, 480, 180, 0x160f28, 0.94).setStrokeStyle(2, 0xff9d4a);
        const tt = this.add.text(-230, -78, 'HOW TO DEFEND', { fontFamily: 'Arial Black, Arial', fontSize: 24, color: '#ffe8c7' });
        const body = this.add.text(-230, -44,
            '1  Pick a tower (Pulse or Arc) then click open sand to build.\n' +
            '2  Click a built tower to Upgrade (boosts) or Sell (70%).\n' +
            '3  Press START WAVE (or Space) to send the next assault.\n' +
            '4  Stop enemies before they reach the relay on the right.\n' +
            'Survive all 6 waves — the last one has a boss.', {
            fontFamily: 'Arial', fontSize: 16, color: '#cfe6ff', lineSpacing: 8 });
        const ok = this.add.text(0, 70, 'Click to begin', { fontFamily: 'Arial Black, Arial', fontSize: 18, color: '#7dffa0' }).setOrigin(0.5);
        this.tutPanel.add([tp, tt, body, ok]);
        this.tutPanel.setSize(480, 180).setInteractive();
        this.tutPanel.on('pointerdown', () => { this.closeTut(); });
    }
    private tutPanel!: GameObjects.Container;
    private closeTut() { if (this.tutOpen) { this.tutOpen = false; audio.click(); } this.tutPanel.setVisible(false); }

    // ------------------------------------------------------------- Input
    private selectBuild(k: TowerKind) {
        if (this.sim.phase === 'won' || this.sim.phase === 'lost') return;
        this.closeTut();
        this.buildKind = (this.buildKind === k) ? null : k;
        this.selectedTower = null;
    }
    private tryStartWave() {
        if (this.sim.phase === 'build' || this.sim.phase === 'intermission') {
            if (this.sim.startWave()) { audio.waveStart(); this.closeTut(); }
        }
    }
    private togglePause() { this.paused = !this.paused; }
    private toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; }
    private toggleMute() { this.muted = !this.muted; audio.setMuted(this.muted); }
    private restart() {
        this.sim.reset();
        this.paused = false; this.speed = 1; this.buildKind = null; this.selectedTower = null;
        this.tutOpen = true; this.tutPanel.setVisible(true);
        this.enemyViews.forEach(v => v.destroy()); this.enemyViews.clear();
        this.towerViews.forEach(v => v.destroy()); this.towerViews.clear();
        this.bulletViews.forEach(v => v.destroy()); this.bulletViews.clear();
        if (this.endBanner) { this.endBanner.destroy(); this.endBanner = null; }
        audio.click();
    }

    private onPointerDown(p: Phaser.Input.Pointer) {
        if (p.y < PLAY_TOP) return; // HUD bar handled by interactive buttons
        // If the pointer is over any interactive UI object (panels, buttons),
        // let that object handle it and skip map placement/selection.
        if (this.input.hitTestPointer(p).length > 0) return;
        const cell = this.sim.cellFromXY(p.x, p.y);
        if (!cell) return;
        // clicked existing tower?
        const id = this.sim.towerAt[cell.r][cell.c];
        if (id !== null) {
            const t = this.sim.towers.find(x => x.id === id) || null;
            this.selectedTower = t; this.buildKind = null; this.closeTut();
            return;
        }
        // build
        if (this.buildKind) {
            const def = TOWERS[this.buildKind];
            if (this.sim.isBuildable(cell.c, cell.r) && this.sim.money >= def.buildCost) {
                this.sim.placeTower(this.buildKind, cell.c, cell.r);
                audio.build();
            } else {
                audio.denied();
            }
        } else {
            this.selectedTower = null;
        }
    }

    // ------------------------------------------------------------ update
    update(_t: number, deltaMs: number) {
        if (!this.useManualStep) {
            if (!this.paused && this.sim.phase !== 'won' && this.sim.phase !== 'lost') {
                // fixed steps for stable physics at x1/x2
                let dt = Math.min(deltaMs, 50) / 1000 * this.speed;
                const steps = this.speed > 1 ? 2 : 1;
                for (let i = 0; i < steps; i++) this.sim.step(dt / steps);
            }
            this.renderFrame();
        }
        this.checkEnd();
    }

    private renderFrame() {
        const sim = this.sim;
        // idle animation on the relay core
        this.relay.setScale(1 + Math.sin(sim.time * 3) * 0.04);
        // HUD numbers
        this.hudT.money.setText('$ ' + sim.money);
        this.hudT.lives.setText('♦ ' + sim.lives);
        this.hudT.wave.setText('Wave ' + Math.min(sim.waveIndex + 1, WAVES.length) + '/' + WAVES.length + (sim.waveActive ? '' : ''));
        const ph: Record<string, string> = { build: 'BUILD PHASE', combat: 'COMBAT', intermission: 'GET READY', won: 'VICTORY', lost: 'DEFEAT' };
        this.hudT.phase.setText(ph[sim.phase] || sim.phase);
        // start button label + shop highlight
        const canStart = sim.phase === 'build' || sim.phase === 'intermission';
        this.startBtn.bg.setFillStyle(canStart ? 0x1c7a3a : 0x2a2a3a);
        this.startBtn.label.setText(canStart ? 'START WAVE' : (sim.waveActive ? 'WAVE LIVE' : ph[sim.phase]));
        this.shopPulse.bg.setFillStyle(this.buildKind === 'pulse' ? TOWERS.pulse.color : 0x2a1c47);
        this.shopArc.bg.setFillStyle(this.buildKind === 'arc' ? TOWERS.arc.color : 0x16394a);
        this.speedBtn.label.setText('x' + this.speed);

        // tower views
        this.syncMap(this.towerViews, sim.towers.map(t => ({ id: t.id, kind: t.kind, x: t.x, y: t.y, level: t.level, muzzle: t.muzzle })),
            (o) => this.add.image(o.x, o.y, 'tower_' + o.kind).setDepth(2),
            (img, o) => { img.setTexture('tower_' + (o as any).kind); img.setPosition((o as any).x, (o as any).y); });

        // enemy views + health bars handled in fxG
        this.syncMap(this.enemyViews, sim.enemies.filter(e => e.alive).map(e => ({ id: e.id, kind: e.kind, x: e.x, y: e.y })),
            (o) => this.add.image(o.x, o.y, 'enemy_' + o.kind).setDepth(3),
            (img, o) => { img.setPosition((o as any).x, (o as any).y); });

        // bullet views
        this.syncMap(this.bulletViews, sim.bullets.map(b => ({ id: b.id, x: b.x, y: b.y })),
            (o) => this.add.image(o.x, o.y, 'bullet').setDepth(4),
            (img, o) => { img.setPosition((o as any).x, (o as any).y); });

        // flash + slow tint on enemies
        for (const e of sim.enemies) {
            const img = this.enemyViews.get(e.id);
            if (!img) continue;
            if (e.flash > 0) img.setTint(0xffffff);
            else if (e.slow < 1) img.setTint(0x9fe6ff);
            else img.clearTint();
        }

        // fx graphics
        const g = this.fxG; g.clear();
        // selection / build range + cell highlight
        this.selG.clear();
        if (this.buildKind && this.hoverCell) {
            const { c, r } = this.hoverCell;
            const okc = sim.isBuildable(c, r);
            const cx = c * CELL, cy = PLAY_TOP + r * CELL;
            const afford = sim.money >= TOWERS[this.buildKind].buildCost;
            this.selG.fillStyle(okc && afford ? 0x7dffa0 : 0xff5a6a, 0.35).fillRect(cx, cy, CELL, CELL);
            if (okc) {
                const rng = TOWERS[this.buildKind].levels[0].range;
                this.selG.lineStyle(2, 0xffffff, 0.5);
                this.selG.strokeCircle(cx + CELL / 2, cy + CELL / 2, rng);
            }
        }
        if (this.selectedTower) {
            const t = this.selectedTower;
            const rng = TOWERS[t.kind].levels[t.level].range;
            this.selG.lineStyle(2, 0xffffff, 0.6);
            this.selG.strokeCircle(t.x, t.y, rng);
            this.selG.fillStyle(0xffd24a, 0.25).fillRect(t.col * CELL, PLAY_TOP + t.row * CELL, CELL, CELL);
        }

        // range ring on relay
        // health bars
        for (const e of sim.enemies) {
            if (!e.alive) continue;
            const img = this.enemyViews.get(e.id);
            if (!img) continue;
            const w = ENEMIES[e.kind].radius * 2;
            const ratio = Math.max(0, e.hp / e.maxHp);
            const bx = e.x - w / 2, by = e.y - ENEMIES[e.kind].radius - 10;
            g.fillStyle(0x000000, 0.55).fillRect(bx - 1, by - 1, w + 2, 5);
            g.fillStyle(e.boss ? 0xff3355 : ratio > 0.5 ? 0x7dffa0 : ratio > 0.25 ? 0xffd24a : 0xff5a3c, 1)
                .fillRect(bx, by, w * ratio, 3);
        }
        // muzzle flashes
        for (const t of sim.towers) {
            if (t.muzzle > 0) { g.fillStyle(0xfff2c0, 0.9).fillCircle(t.x, t.y - 14, 5); }
        }
        // lightning bolts (jagged)
        for (const b of sim.bolts) {
            const a = b.life / b.max;
            g.lineStyle(3, b.color, a);
            for (let i = 0; i < b.pts.length - 2; i += 2) {
                const x1 = b.pts[i], y1 = b.pts[i + 1], x2 = b.pts[i + 2], y2 = b.pts[i + 3];
                const midx = (x1 + x2) / 2 + (Math.random() - 0.5) * 12;
                const midy = (y1 + y2) / 2 + (Math.random() - 0.5) * 12;
                g.lineBetween(x1, y1, midx, midy); g.lineBetween(midx, midy, x2, y2);
            }
        }
        // particles
        for (const p of sim.particles) {
            const a = Math.max(0, p.life / p.max);
            if (p.kind === 'spark') { g.fillStyle(p.color, a).fillCircle(p.x, p.y, p.size); }
            else if (p.kind === 'ring') { g.lineStyle(3, p.color, a).strokeCircle(p.x, p.y, (1 - a) * 46 + 6); }
        }

        // selected-tower action panel is drawn as text near tower
        this.drawTowerPanel();
    }

    private panelObjs: GameObjects.GameObject[] = [];
    private drawTowerPanel() {
        this.panelObjs.forEach(o => o.destroy()); this.panelObjs = [];
        const t = this.selectedTower; if (!t) return;
        const def = TOWERS[t.kind];
        const px = Math.min(Math.max(t.x, 130), VIEW_W - 130);
        const py = t.y < PLAY_TOP + 150 ? t.y + 70 : t.y - 70;
        const panel = this.add.container(px, py).setDepth(26);
        const bg = this.add.rectangle(0, 0, 240, 96, 0x160f28, 0.95).setStrokeStyle(2, def.color);
        const title = this.add.text(-114, -40, def.name + '  Lv ' + (t.level + 1), { fontFamily: 'Arial Black, Arial', fontSize: 15, color: '#ffe8c7' });
        const dmg = def.levels[t.level];
        const stat = this.add.text(-114, -18, 'DMG ' + dmg.damage + '  RNG ' + dmg.range + '  ' + dmg.cooldown.toFixed(2) + 's', { fontFamily: 'Arial', fontSize: 12, color: '#cfe6ff' });
        panel.add([bg, title, stat]);
        const upCost = this.sim.upgradeCost(t);
        const ub = this.add.container(-56, 26);
        const ubg = this.add.rectangle(0, 0, 104, 34, upCost && this.sim.money >= upCost ? 0x1c7a3a : 0x3a3a4a).setStrokeStyle(2, 0x7dffa0);
        const ut = this.add.text(0, 0, upCost ? 'Upgrade ' + upCost : 'MAX', { fontFamily: 'Arial', fontSize: 13, color: '#fff' }).setOrigin(0.5);
        ub.add([ubg, ut]); ub.setSize(104, 34); panel.add(ub);
        ub.setInteractive({ useHandCursor: true });
        ub.on('pointerdown', () => { if (this.sim.upgradeTower(t)) { audio.upgrade(); } else audio.denied(); });
        const sv = this.sim.sellValue(t);
        const sb = this.add.container(66, 26);
        const sbg = this.add.rectangle(0, 0, 84, 34, 0x7a2436).setStrokeStyle(2, 0xff7a7a);
        const st = this.add.text(0, 0, 'Sell ' + sv, { fontFamily: 'Arial', fontSize: 13, color: '#fff' }).setOrigin(0.5);
        sb.add([sbg, st]); sb.setSize(84, 34); panel.add(sb);
        sb.setInteractive({ useHandCursor: true });
        sb.on('pointerdown', () => { const tt = this.selectedTower!; this.selectedTower = null; this.sim.sellTower(tt); audio.build(); });
        this.panelObjs.push(panel);
    }

    // generic diff-sync of image views by id
    private syncMap<T extends { id: number }>(
        map: Map<number, GameObjects.Image>, items: T[],
        create: (o: T) => GameObjects.Image,
        update: (img: GameObjects.Image, o: T) => void,
    ) {
        const seen = new Set<number>();
        for (const o of items) {
            seen.add(o.id);
            let img = map.get(o.id);
            if (!img) { img = create(o); map.set(o.id, img); }
            update(img, o);
        }
        for (const [id, img] of map) { if (!seen.has(id)) { img.destroy(); map.delete(id); } }
    }

    private checkEnd() {
        if ((this.sim.phase === 'won' || this.sim.phase === 'lost') && !this.endBanner) {
            this.showEnd();
        }
    }

    private showEnd() {
        audio.stopMusic();
        if (this.sim.phase === 'won') audio.win(); else audio.lose();
        const win = this.sim.phase === 'won';
        const c = this.add.container(VIEW_W / 2, VIEW_H / 2).setDepth(40);
        const shade = this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x0a0616, 0.78);
        const title = this.add.text(0, -70, win ? 'RELAY SECURED' : 'RELAY OVERRUN', {
            fontFamily: 'Arial Black, Arial', fontSize: 52, color: win ? '#7dffa0' : '#ff5a6a',
            stroke: '#1a1030', strokeThickness: 8 }).setOrigin(0.5);
        const stats = this.add.text(0, 0, `Waves cleared: ${this.sim.waveIndex} / ${WAVES.length}\nKills: ${this.sim.kills}   Leaks: ${this.sim.leaks}   Lives left: ${this.sim.lives}`, {
            fontFamily: 'Arial', fontSize: 18, color: '#cfe6ff', align: 'center', lineSpacing: 6 }).setOrigin(0.5);
        const btn = this.add.rectangle(0, 80, 220, 52, 0xff6a3d).setStrokeStyle(3, 0xffd9a0).setInteractive({ useHandCursor: true });
        const btnT = this.add.text(0, 80, 'PLAY AGAIN', { fontFamily: 'Arial Black, Arial', fontSize: 22, color: '#1a0d05' }).setOrigin(0.5);
        c.add([shade, title, stats, btn, btnT]);
        c.setSize(VIEW_W, VIEW_H);
        btn.on('pointerdown', () => { this.restart(); });
        this.endBanner = c;
    }

    // ------------------------------------------------------------- Hooks
    private installHooks() {
        const w = window as any;
        w.render_game_to_text = () => JSON.stringify(this.sim.renderToText());
        w.advanceTime = (ms: number) => {
            this.useManualStep = true;
            const slice = 1000 / 60;
            let remaining = Math.max(1, ms);
            while (remaining > 0) { this.sim.step(Math.min(slice, remaining) / 1000); remaining -= slice; }
            this.renderFrame();
        };
        w.__relaySim = this.sim;
    }
}

// keep TS from flagging unused imports
void GRID_COLS; void GRID_ROWS;
