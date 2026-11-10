/**
 * Relay Defense - browser UI layer.
 *
 * Phaser 4 Scene/Graphics render the logical 1280x720 desert playfield; real
 * HTML controls (outside/over the single canvas) drive the SAME imported
 * simulation from ./sim.ts. No second simulation, no assets, no audio code.
 */
import Phaser, { AUTO, Game, Scale, Scene } from 'phaser';
import {
  createGame,
  step,
  placeTower,
  upgradeTower,
  sellTower,
  startWave,
  waveActive,
  serialize,
  restore,
  SCHEMA_VERSION,
  setPaused,
  setSpeed,
  TOWER_TYPES,
  TOWER_DATA,
  TOWER_COMBAT,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  MAX_TIER,
  upgradeCostFor,
  sellRefundFor,
} from './sim';
import type { EnemyType, GameState, TowerType } from './sim';
import { audio } from './audio';
import type { SfxName } from './audio';
import './relay.css';

const SEED = 735882; // fixed baseline seed per interface contract

// ---- logical-state access (shared by canvas + HTML controls) ----------------

let state: GameState | null = null;
let selectedPadId: string | null = null; // pad armed for placement
let selectedTowerId: string | null = null; // tower currently selected
let chosenType: TowerType | null = null;
let hasSave = false; // a versioned checkpoint exists in localStorage

// ---- audio integration (small API calls on actual state changes) ------------

// Edge-detection memory so per-frame sync never re-triggers SFX.
// Initialized to a neutral baseline (mode 'title', no run state) and
// re-snapshotted by resetRun() from the actual fresh state, so the first
// Start/restart and any Reset are silent as events. Action handlers own the
// build/sell/next-wave success cues; syncAudio owns mode/enemy edges only.
const audioPrev = {
  mode: 'title' as string,
  wave: 0,
  towersLen: 0,
  enemiesLen: 0,
};

function sfx(name: SfxName, volumeScale = 1): void {
  if (!audio.isMuted()) audio.playEffect(name, { volumeScale });
}

/**
 * Drive the shared AudioController from real state changes. Call after any
 * action or per-frame tick; all triggers are edge-detected against the last
 * observed values so nothing re-fires while a condition persists.
 */
function syncAudio(): void {
  if (!state) return;
  const m = state.mode;
  const prev = audioPrev;

  // Mode transitions (title -> playing, pause/resume, terminal).
  if (m !== prev.mode) {
    if (m === 'playing') {
      audio.setMode('gameplay');
      if (prev.mode === 'paused') sfx('select'); // resume cue
    } else if (m === 'paused') {
      audio.pause();
      sfx('warn');
    } else if (m === 'victory' || m === 'defeat') {
      audio.setMode('terminal');
      sfx(m === 'victory' ? 'win' : 'lose', 1.2);
    }
    prev.mode = m;
  }

  // Wave number: track only (the Next Wave button is the single launch authority).
  if (state.wave !== prev.wave) prev.wave = state.wave;

  // Enemy population edges: first spawn of a wave, last enemy resolved.
  const eLen = state.enemies.length;
  if (m === 'playing' && eLen !== prev.enemiesLen) {
    if (prev.enemiesLen === 0 && eLen > 0) sfx('warn', 0.7); // first drone appears
    else if (eLen === 0 && prev.enemiesLen > 0) sfx('hit', 0.8); // wave cleared / base resolved
    prev.enemiesLen = eLen;
  }
}

// ---- versioned localStorage checkpoint (save/continue) ---------------------
//
// Save format: { app, saveVersion, savedAtMs, data } where `data` is the
// output of sim.serialize(state). Only written at a safe checkpoint:
// mode 'paused' OR (mode 'playing' AND no live enemies AND no pending spawns,
// i.e. between waves when nothing can mutate state under the player).
// Terminal states are never saved. A corrupt or obsolete save is deleted and
// reported once; Continue then recovers to a usable New Game.

const SAVE_KEY = 'relay-defense:save';
const SAVE_VERSION = 1;

function safeCheckpoint(state: GameState): boolean {
  if (state.mode === 'victory' || state.mode === 'defeat') return false;
  if (state.mode === 'paused') return true;
  return state.mode === 'playing' && !waveActive(state);
}

function saveCheckpoint(s: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      app: 'relay-defense',
      saveVersion: SAVE_VERSION,
      savedAtMs: Date.now(),
      data: serialize(s),
    }));
    hasSave = true;
  } catch { /* storage unavailable (private mode / quota): Continue falls back to New Game */ }
}

function clearSavedGame(): void {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  hasSave = false;
}

/**
 * Load and validate a saved checkpoint. Returns the restored state, or null
 * when no save exists, it is corrupt/obsolete, or restore throws. Any
 * unusable save is deleted so subsequent Continue presses cannot loop on the
 * same bad data.
 */
function loadSavedGame(): GameState | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { return null; }
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as { app?: unknown; saveVersion?: unknown; data?: unknown };
    if (envelope.app !== 'relay-defense' || envelope.saveVersion !== SAVE_VERSION) throw new Error('obsolete save format');
    const restored = restore(String(envelope.data));
    // Only resume from a state that is still playable.
    if (restored.mode !== 'playing' && restored.mode !== 'paused') {
      clearSavedGame();
      return null;
    }
    return restored;
  } catch {
    clearSavedGame(); // corrupt or obsolete: recover to New Game, no repeated error loop
    return null;
  }
}

function resetRun(): void {
  state = createGame(SEED);
  selectedPadId = null;
  selectedTowerId = null;
  clearSavedGame(); // New Game clears the previous save
  // Re-baseline the audio observer from the actual fresh state so this run's
  // first sync is silent; the Start/Restart button owns the UI cue.
  audioPrev.mode = state.mode;
  audioPrev.wave = state.wave;
  audioPrev.enemiesLen = state.enemies.length;
}

// ---- window automation hooks (frozen contract) ------------------------------

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}

function installWindowHooks(): void {
  window.render_game_to_text = (): string => {
    if (!state) return JSON.stringify({ mode: 'title', note: 'logical 1280x720, origin top-left, x right, y down' });
    const s = state;
    return JSON.stringify({
      version: s.version,
      schema: s.schema,
      mode: s.mode,
      waveActive: waveActive(s),
      pendingSpawns: s.pendingSpawns.length,
      seed: s.seed,
      wave: s.wave,
      maxWaves: s.maxWaves,
      lives: s.lives,
      currency: s.currency,
      speed: s.speed,
      simulationTimeMs: s.simulationTimeMs,
      buildPads: s.buildPads.map((p) => ({ id: p.id, x: p.x, y: p.y })),
      towers: s.towers.map((t) => ({ id: t.id, type: t.type, padId: t.padId, x: t.x, y: t.y, tier: t.tier })),
      enemies: s.enemies.map((e) => ({ id: e.id, type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp })),
      note: 'coordinates are logical 1280x720, origin top-left, x right, y down',
    });
  };

  window.advanceTime = (ms: number): void => {
    if (!state) return;
    step(state, ms);
    syncUi();
  };
}

// ---- HTML control panel ------------------------------------------------------

interface PanelRefs {
  wave: HTMLElement;
  lives: HTMLElement;
  currency: HTMLElement;
  mode: HTMLElement;
  towerInfo: HTMLElement;
  btnStart: HTMLButtonElement;
  btnContinue: HTMLButtonElement;
  btnNextWave: HTMLButtonElement;
  btnPause: HTMLButtonElement;
  btnRestart: HTMLButtonElement;
  btnSpeed: HTMLButtonElement;
  btnUpgrade: HTMLButtonElement;
  btnSell: HTMLButtonElement;
  towerButtons: Record<TowerType, HTMLButtonElement>;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string>, text?: string): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildPanel(): PanelRefs {
  const panel = el('div', { id: 'relay-panel', class: 'relay-panel' }, '');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Relay Defense controls and status');

  // Layout: keep panel + canvas within the viewport.
  const style = document.createElement('style');
  style.textContent = `
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #1a1208; }
    body { display: flex; flex-direction: column; font-family: monospace; color: #f5e6c8; }
    .relay-panel {
      flex: 0 0 auto;
      max-height: 45vh;
      overflow-y: auto;
      padding: 8px 12px;
      background: #2a1f14;
      border-bottom: 2px solid #8a6f4d;
      font-size: 13px;
    }
    .relay-panel h1 { margin: 0 0 4px; font-size: 18px; }
    .relay-mode { font-weight: bold; margin-bottom: 4px; }
    .relay-stat { display: inline-block; margin-right: 12px; }
    .relay-help { font-size: 11px; color: #d9c7a0; margin: 4px 0; }
    .relay-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0; align-items: center; }
    .relay-btn {
      padding: 4px 10px;
      background: #5a4632;
      color: #f5e6c8;
      border: 1px solid #8a6f4d;
      border-radius: 4px;
      cursor: pointer;
      font-family: monospace;
      font-size: 12px;
    }
    .relay-btn:hover { background: #7a5f42; }
    .relay-btn:disabled { opacity: 0.4; cursor: default; }
    .relay-tower-info { font-size: 12px; color: #d9c7a0; margin: 4px 0; min-height: 16px; }
    .relay-audio input[type=range] { width: 80px; }
    #game-container {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    #game-container canvas { max-width: 100%; max-height: 100%; }
  `;
  document.head.insertBefore(style, document.head.firstChild);

  const h1 = el('h1', { class: 'relay-title' }, 'Relay Defense');
  const mode = el('div', { id: 'relay-mode', class: 'relay-mode' }, 'Title screen - press Start');
  const wave = el('div', { id: 'relay-wave', class: 'relay-stat' }, 'Wave: 0 / 12');
  const lives = el('div', { id: 'relay-lives', class: 'relay-stat' }, 'Lives: 20');
  const currency = el('div', { id: 'relay-currency', class: 'relay-stat' }, 'Credits: 200');

  const instructions = el(
    'p',
    { id: 'relay-instructions', class: 'relay-help' },
    'Build towers on glowing pads to stop drones crossing the desert. Choose a tower type, then click an empty pad to build it (paid). Click a built tower to select it, then upgrade or sell (70% refund). Start the next wave when ready; paused runs never advance. Survive all 12 waves.'
  );

  const btn = (id: string, label: string, ariaLabel: string): HTMLButtonElement => {
    const b = el('button', { id, 'data-testid': id, class: 'relay-btn' }, label) as HTMLButtonElement;
    b.setAttribute('aria-label', ariaLabel);
    return b;
  };

  const btnStart = btn('start-game', 'Start Game', 'Start a new game');

  const towerButtons = {} as Record<TowerType, HTMLButtonElement>;
  for (const type of TOWER_TYPES) {
    const spec = TOWER_DATA[type];
    const b = btn(`tower-${type}`, `${spec.name} (${spec.cost})`, `Select ${spec.name}, cost ${spec.cost} credits`);
    towerButtons[type] = b;
  }

  const btnContinue = btn('continue-game', 'Continue', 'Continue the paused game');
  const btnNextWave = btn('next-wave', 'Next Wave', 'Start the next wave');
  const btnPause = btn('pause', 'Pause', 'Pause or resume the game');
  const btnRestart = btn('restart', 'Restart', 'Restart the run from the title screen');
  const btnSpeed = btn('speed-toggle', 'Speed: x1', 'Toggle game speed between 1x and 2x');
  const btnUpgrade = btn('upgrade-tower', 'Upgrade', 'Upgrade the selected tower to the next tier');
  const btnSell = btn('sell-tower', 'Sell', 'Sell the selected tower for a 70% refund');

  // Audio controls: wired to the real AudioController (src/audio.ts).
  const muteAll = el('button', { id: 'mute-all', 'data-testid': 'mute-all', class: 'relay-btn' }, 'Mute All (off)') as HTMLButtonElement;
  muteAll.setAttribute('aria-label', 'Toggle all audio');
  const musicVolume = el('input', { id: 'music-volume', 'data-testid': 'music-volume', type: 'range', min: '0', max: '100', value: String(Math.round(audio.getMusicVolume() * 100)) }) as HTMLInputElement;
  musicVolume.setAttribute('aria-label', 'Music volume');
  const sfxVolume = el('input', { id: 'sfx-volume', 'data-testid': 'sfx-volume', type: 'range', min: '0', max: '100', value: String(Math.round(audio.getSfxVolume() * 100)) }) as HTMLInputElement;
  sfxVolume.setAttribute('aria-label', 'Sound effects volume');
  const towerInfo = el('div', { id: 'relay-tower-info', class: 'relay-tower-info' }, 'No tower selected.');

  const row1 = el('div', { class: 'relay-row' });
  row1.append(btnStart, btnContinue, btnNextWave);
  const row2 = el('div', { class: 'relay-row' });
  row2.append(btnPause, btnSpeed, btnRestart);
  const row3 = el('div', { class: 'relay-row relay-tower-select' });
  row3.append(towerButtons.pulse, towerButtons.cannon, towerButtons.frost, towerButtons.rail);
  const row4 = el('div', { class: 'relay-row' });
  row4.append(btnUpgrade, btnSell);
  const rowAudio = el('div', { class: 'relay-row relay-audio' });
  rowAudio.append(musicVolume, sfxVolume, muteAll);

  panel.append(h1, mode, wave, lives, currency, instructions, row1, row2, row3, row4, towerInfo, rowAudio);

  document.body.appendChild(panel);

  // Wire audio controls to the shared AudioController (0..100 slider -> 0..1).
  musicVolume.addEventListener('input', () => {
    const v = Number(musicVolume.value) / 100;
    audio.setMusicVolume(v);
  });
  sfxVolume.addEventListener('input', () => {
    const v = Number(sfxVolume.value) / 100;
    audio.setSfxVolume(v);
  });
  muteAll.addEventListener('click', () => {
    const m = !audio.isMuted();
    audio.setMuted(m);
    muteAll.textContent = m ? 'Mute All (on)' : 'Mute All (off)';
    // Reflect mute state in the sliders' effective output without moving thumbs.
    musicVolume.setAttribute('aria-valuetext', m ? 'muted' : String(Math.round(audio.getMusicVolume() * 100)));
    sfxVolume.setAttribute('aria-valuetext', m ? 'muted' : String(Math.round(audio.getSfxVolume() * 100)));
  });

  return { wave, lives, currency, mode, towerInfo, btnStart, btnContinue, btnNextWave, btnPause, btnRestart, btnSpeed, btnUpgrade, btnSell, towerButtons };
}

// ---- UI text sync (truthful values from sim state) ---------------------------

function describeTower(state: GameState): string {
  const t = state.towers.find((x) => x.id === selectedTowerId);
  if (!t) return 'No tower selected.';
  const spec = TOWER_DATA[t.type];
  const combat = TOWER_COMBAT[t.type];
  const upCost = upgradeCostFor(t.type, t.tier);
  const refund = sellRefundFor(t.type, t.tier);
  const parts = [`${spec.name} - tier ${t.tier}/${MAX_TIER}`, `range ${combat.range[t.tier]}px`, `damage ${combat.damage[t.tier]}`];
  if (upCost !== null) parts.push(`upgrade cost ${upCost}`);
  else parts.push('max tier');
  parts.push(`sell refund ${refund}`);
  return parts.join(' | ');
}

let panelRefs: PanelRefs | null = null;

function syncUi(): void {
  if (panelRefs) {
    const refs = panelRefs;
    // Keep body data-mode truthful on every call, including the initial
    // title screen before the early return below.
    document.body.dataset.mode = state ? state.mode : 'title';
  }
  if (!state || !panelRefs) return;
  const refs = panelRefs;
  refs.wave.textContent = `Wave: ${state.wave} / ${state.maxWaves}`;
  refs.lives.textContent = `Lives: ${state.lives}`;
  refs.currency.textContent = `Credits: ${state.currency}`;
  refs.btnSpeed.textContent = `Speed: x${state.speed}`;
  const modeText: Record<string, string> = {
    playing: 'Playing',
    paused: 'Paused - press Continue',
    victory: 'Victory! All waves cleared.',
    defeat: 'Defeat. Press Restart to try again.',
  };
  refs.mode.textContent = modeText[state.mode] ?? state.mode;
  document.body.dataset.mode = state.mode;
  // Continue is available only from real saved/in-memory state, never on the
  // title screen or after a terminal run.
  const canContinue = (state.mode === 'paused' || state.mode === 'playing') && (hasSave || !!state);
  refs.btnContinue.disabled = !canContinue;
  refs.towerInfo.textContent = describeTower(state);

  const terminal = state.mode === 'victory' || state.mode === 'defeat';
  // Next Wave is available only when no wave is active (no live AND no
  // pending spawns), not merely when the live enemy list happens to be empty.
  refs.btnNextWave.disabled = terminal || waveActive(state) || state.wave >= state.maxWaves;
  refs.btnUpgrade.disabled = !selectedTowerId;
  refs.btnSell.disabled = !selectedTowerId;
}

// ---- Phaser scene -------------------------------------------------------------

class RelayScene extends Scene {
  private terrainGfx: Phaser.GameObjects.Graphics | null = null; // static: drawn once
  private terrainDrawn = false;
  private padGfx: Phaser.GameObjects.Graphics | null = null;
  private towerGfx: Phaser.GameObjects.Graphics | null = null;
  private enemyGfx: Phaser.GameObjects.Graphics | null = null;
  private flashGfx: Phaser.GameObjects.Graphics | null = null; // transient muzzle flashes
  private rangeCircle: Phaser.GameObjects.Arc | null = null;
  public titleText: Phaser.GameObjects.Text | null = null;
  public subtitleText: Phaser.GameObjects.Text | null = null;
  private reducedMotion = false;
  private flashEvents: { x: number; y: number; atMs: number }[] = [];

  constructor() {
    super({ key: 'RelayScene' });
  }

  create(): void {
    activeScene = this;
    this.reducedMotion = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.terrainGfx = this.add.graphics(); // static, drawn once
    this.padGfx = this.add.graphics();
    this.towerGfx = this.add.graphics();
    this.enemyGfx = this.add.graphics();
    this.flashGfx = this.add.graphics();
    this.rangeCircle = this.add.circle(0, 0, 10, 0x33ff88, 0.25);
    this.rangeCircle.setVisible(false);
    // Static terrain: sand, dunes, solar arrays, relay-base pad + thick route.
    if (state) this.drawTerrain(state.route);

    // Title overlay: removed when Start Game is pressed.
    this.titleText = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40, 'RELAY DEFENSE', {
      fontFamily: 'monospace',
      fontSize: '48px',
      color: '#f5e6c8',
    });
    this.titleText.setOrigin(0.5);
    this.subtitleText = this.add.text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 30, 'Press Start Game to begin', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#d9c7a0',
    });
    this.subtitleText.setOrigin(0.5);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!state || state.mode === 'victory' || state.mode === 'defeat') return;
      // Phaser 4 reports logical canvas coordinates in `position` for a fixed
      // 1280x720 game size; use the same source for every pointer action so
      // mapping stays correct across resize/fullscreen.
      const x = pointer.position.x;
      const y = pointer.position.y;

      // 1. Clicking a built tower selects it (and cancels pad placement).
      for (const t of state.towers) {
        if (Math.hypot(t.x - x, t.y - y) <= 24) {
          selectedTowerId = t.id;
          selectedPadId = null;
          syncUi();
          return;
        }
      }

      // 2. Clicking a valid empty pad places the chosen tower type (paid).
      if (chosenType) {
        for (const pad of state.buildPads) {
          if (Math.hypot(pad.x - x, pad.y - y) <= 30) {
            const occupied = state.towers.some((t) => t.padId === pad.id);
            if (!occupied && placeTower(state, chosenType, pad.id)) {
              selectedPadId = null;
              sfx('shield'); // single build authority (paid placement succeeded)
              syncUi();
              syncAudio();
              return;
            }
          }
        }
      }

      // 3. Otherwise clear selections.
      selectedTowerId = null;
      selectedPadId = null;
      syncUi();
    });
  }

    update(_time: number, deltaMs: number): void {
    if (!state) return;
    const wasActive = waveActive(state);
    if (state.mode === 'playing') {
      step(state, deltaMs);
    }
    this.draw();
    syncUi();
    syncAudio(); // edge-detected; safe to call every frame
    // Safe checkpoint: the wave just became fully inactive (no live enemies,
    // no pending spawns) while still playing. This is the documented save
    // point between waves; pausing saves via the Pause button handler.
    if (wasActive && state.mode === 'playing' && !waveActive(state)) {
      saveCheckpoint(state);
    }
  }

    /**
   * Static desert terrain: bright sand, dune shading, solar arrays flanking
   * the route, a relay-base pad at the route end, and a thick readable route.
   * Drawn ONCE (create / first draw) and never cleared again.
   */
  private drawTerrain(route: { x: number; y: number }[]): void {
    const g = this.terrainGfx!;
    // Bright sand base.
    g.fillStyle(0xd8b46a, 1).fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Dune shading: soft dark bands along the route's vertical direction.
    const end = route[route.length - 1];
    const up = end.y < LOGICAL_HEIGHT / 2;
    g.fillStyle(0xc49a52, 0.6);
    if (up) {
      g.fillRect(0, 0, LOGICAL_WIDTH, 70);
      g.fillRect(0, 130, LOGICAL_WIDTH, 34);
    } else {
      g.fillRect(0, LOGICAL_HEIGHT - 70, LOGICAL_WIDTH, 70);
      g.fillRect(0, LOGICAL_HEIGHT - 164, LOGICAL_WIDTH, 34);
    }

    // Solar arrays flanking the route: dark blue panels with a light frame.
    const panel = (cx: number, cy: number): void => {
      g.fillStyle(0x2f5d8a, 1).fillRect(cx - 26, cy - 14, 52, 28);
      g.lineStyle(2, 0xbfd9ff, 1).strokeRect(cx - 26, cy - 14, 52, 28);
      g.lineBetween(cx, cy - 14, cx, cy + 14);
    };
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1];
      const b = route[i];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      // Perpendicular offset places panels to the side of the route.
      panel(mx + (-dy / len) * 52, my + (dx / len) * 52);
      panel(mx + (dy / len) * 52, my + (-dx / len) * 52);
    }

    // Relay-base pad at the route end: bright square with a beacon dot.
    g.fillStyle(0x9fb8d4, 1).fillRect(end.x - 30, end.y - 30, 60, 60);
    g.lineStyle(3, 0xffffff, 1).strokeRect(end.x - 30, end.y - 30, 60, 60);
    g.fillStyle(0x33ff88, 1).fillCircle(end.x, end.y, 7);

    // Thick readable route: dark casing + bright center line.
    const seg = (i: number): void => {
      const a = route[i - 1];
      const b = route[i];
      g.lineBetween(a.x, a.y, b.x, b.y);
    };
    for (let i = 1; i < route.length; i++) {
      g.lineStyle(14, 0x6b4f2a, 1); seg(i);
    }
    for (let i = 1; i < route.length; i++) {
      g.lineStyle(8, 0xffe9b0, 1); seg(i);
    }
  }

  /** Draw one tower as a distinct silhouette per role; tier adds size + ring. */
  private drawTower(g: Phaser.GameObjects.Graphics, t: { type: TowerType; x: number; y: number; tier: number }): void {
    const r = 10 + t.tier * 2;
    switch (t.type) {
      case 'pulse': // small twin-antenna turret
        g.fillStyle(0x4da6ff, 1).fillCircle(t.x, t.y, r);
        g.lineStyle(3, 0x4da6ff, 1);
        g.lineBetween(t.x - r * 0.5, t.y, t.x - r * 0.5, t.y - r * 1.7);
        g.lineBetween(t.x + r * 0.5, t.y, t.x + r * 0.5, t.y - r * 1.7);
        g.fillStyle(0xffffff, 1).fillCircle(t.x, t.y, r * 0.35);
        break;
      case 'cannon': // wide squat base with a heavy barrel
        g.fillStyle(0xff7043, 1).fillRect(t.x - r * 1.2, t.y - r * 0.6, r * 2.4, r * 1.2);
        g.lineStyle(5, 0xff7043, 1); g.lineBetween(t.x, t.y, t.x + r * 1.8, t.y);
        g.fillStyle(0x2a1f14, 1).fillCircle(t.x, t.y, r * 0.5);
        break;
      case 'frost': // crystal diamond
        g.fillStyle(0x80deea, 1).fillTriangle(t.x, t.y - r * 1.3, t.x + r, t.y, t.x, t.y + r * 1.3);
        g.fillStyle(0xb2f5fb, 1).fillTriangle(t.x, t.y - r * 1.3, t.x - r, t.y, t.x, t.y + r * 1.3);
        break;
      case 'rail': // tall lance with a glowing tip
        g.fillStyle(0xba68c8, 1).fillRect(t.x - r * 0.45, t.y - r, r * 0.9, r * 2);
        g.lineStyle(3, 0xe1bee7, 1); g.lineBetween(t.x, t.y - r, t.x, t.y - r * 1.9);
        g.fillStyle(0xffffff, 1).fillCircle(t.x, t.y - r * 1.9, 3);
        break;
    }
    if (t.tier > 0) {
      g.lineStyle(2, 0xffffff, 0.8).strokeCircle(t.x, t.y, r + 4 + t.tier);
    }
  }

  /** Draw one enemy as a distinct shape per class; HP bar uses real maxHp. */
  private drawEnemy(g: Phaser.GameObjects.Graphics, e: { type: EnemyType; x: number; y: number; hp: number; maxHp: number }): void {
    const frac = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
    switch (e.type) {
      case 'drone': // small circle
        g.fillStyle(0xe53935, 1).fillCircle(e.x, e.y, 8);
        break;
      case 'runner': // forward triangle (fast)
        g.fillStyle(0xffa726, 1).fillTriangle(e.x + 12, e.y, e.x - 9, e.y - 9, e.x - 9, e.y + 9);
        break;
      case 'tank': // heavy square
        g.fillStyle(0x8d6e63, 1).fillRect(e.x - 12, e.y - 12, 24, 24);
        g.lineStyle(2, 0x5d4037, 1).strokeRect(e.x - 12, e.y - 12, 24, 24);
        break;
      case 'shielder': // hexagon with a shield ring
        g.fillStyle(0x7e57c2, 1); g.fillPoints([
          new Phaser.Math.Vector2(e.x + 11, e.y),
          new Phaser.Math.Vector2(e.x + 5.5, e.y - 9.5),
          new Phaser.Math.Vector2(e.x - 5.5, e.y - 9.5),
          new Phaser.Math.Vector2(e.x - 11, e.y),
          new Phaser.Math.Vector2(e.x - 5.5, e.y + 9.5),
          new Phaser.Math.Vector2(e.x + 5.5, e.y + 9.5),
        ], true);
        g.lineStyle(2, 0xd1c4e9, 0.9).strokeCircle(e.x, e.y, 15);
        break;
      case 'boss': // large layered core
        g.fillStyle(0xb71c1c, 1).fillCircle(e.x, e.y, 20);
        g.lineStyle(4, 0xffd54f, 1).strokeCircle(e.x, e.y, 20);
        g.fillStyle(0xffffff, 1).fillCircle(e.x, e.y, 6);
        break;
    }
    // HP bar above the enemy, width scaled by real maxHp fraction.
    const w = e.type === 'boss' ? 44 : 24;
    g.fillStyle(0x333333, 1).fillRect(e.x - w / 2, e.y - (e.type === 'boss' ? 34 : 22), w, 4);
    g.fillStyle(0x66bb6a, 1).fillRect(e.x - w / 2, e.y - (e.type === 'boss' ? 34 : 22), w * frac, 4);
  }

  private draw(): void {
    if (!state) return;

    // Static terrain: paint once on the first frame after a fresh state.
    if (!this.terrainGfx || !this.terrainDrawn) {
      this.drawTerrain(state.route);
      this.terrainDrawn = true;
    }

    // Build pads: empty = glowing amber ring; occupied = dim base.
    const pg = this.padGfx!;
    pg.clear();
    for (const pad of state.buildPads) {
      const occupied = state.towers.some((t) => t.padId === pad.id);
      if (occupied) {
        pg.fillStyle(0x5a4632, 1).fillCircle(pad.x, pad.y, 18);
      } else {
        pg.lineStyle(4, 0xffc94d, 1).strokeCircle(pad.x, pad.y, 22);
        if (pad.id === selectedPadId) {
          pg.fillStyle(0x33ff88, 0.35).fillCircle(pad.x, pad.y, 22);
        }
      }
    }

    // Towers: distinct silhouette per role; tier adds size + ring.
    const tg = this.towerGfx!;
    tg.clear();
    for (const t of state.towers) {
      this.drawTower(tg, t);
      if (t.id === selectedTowerId) {
        tg.lineStyle(3, 0xffffff, 1).strokeCircle(t.x, t.y, 18 + t.tier * 3);
      }
    }

    // Muzzle flashes from real tower cooldown timestamps.
    const fg = this.flashGfx!;
    fg.clear();
    const now = this.time.now;
    for (const t of state.towers) {
      if (t.lastShotAt && now - t.lastShotAt < 90) {
        fg.fillStyle(0xfff176, 0.9).fillCircle(t.x, t.y - (t.type === 'rail' ? 24 : 8), 5);
      }
    }

    // Selected tower range circle.
    const sel = state.towers.find((t) => t.id === selectedTowerId);
    if (sel && this.rangeCircle) {
      const range = TOWER_COMBAT[sel.type].range[sel.tier];
      this.rangeCircle.setPosition(sel.x, sel.y);
      this.rangeCircle.setRadius(range);
      this.rangeCircle.setVisible(true);
    } else if (this.rangeCircle) {
      this.rangeCircle.setVisible(false);
    }

    // Enemies: distinct silhouette per class with real maxHp bar.
    const eg = this.enemyGfx!;
    eg.clear();
    for (const e of state.enemies) {
      this.drawEnemy(eg, e);
    }
  }
}

// ---- bootstrap ----------------------------------------------------------------

let activeScene: RelayScene | null = null;

function clearTitleOverlay(): void {
  if (!activeScene) return;
  if (activeScene.titleText) {
    activeScene.titleText.setVisible(false);
    activeScene.titleText = null;
  }
  if (activeScene.subtitleText) {
    activeScene.subtitleText.setVisible(false);
    activeScene.subtitleText = null;
  }
}

function startRelayDefense(): void {
  installWindowHooks();

  // Menu audio begins only after a user gesture (body click or EnableSound),
  // which also unlocks the shared AudioContext. Idempotent: later gestures
  // just re-resume if suspended.
  const unlockAudio = (): void => {
    audio.activate();
    if (audio.getMode() === 'idle') audio.setMode('menu');
  };
  window.addEventListener('pointerdown', unlockAudio);

  panelRefs = buildPanel();

  const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#2a1f14',
    pixelArt: true,
    scale: {
      mode: Scale.FIT,
      autoCenter: Scale.CENTER_BOTH,
    },
    scene: [RelayScene],
  };
  new Game(config);

  const wire = (id: string, fn: () => void) => {
    const b = document.getElementById(id) as HTMLButtonElement | null;
    if (b) b.addEventListener('click', fn);
  };

  // ---- fullscreen (F to enter, Escape exits; canvas AND HTML controls) -----
  const root = document.body; // panel + #game-container both live under <body>
  let fsHandler: (() => void) | null = null;
  const toggleFullscreen = (): void => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => { /* ignore */ });
    } else {
      void root.requestFullscreen().catch(() => { /* unsupported: no-op */ });
    }
  };
  const onFsChange = (): void => {
    // Pointer mapping is coordinate-based (logical canvas units) and the
    // panel reflows via CSS, so nothing else needs to change here.
    if (!document.fullscreenElement && fsHandler) {
      document.removeEventListener('fullscreenchange', fsHandler);
      fsHandler = null;
    }
  };
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else if (e.key === 'Escape' && document.fullscreenElement) {
      // Explicit exit: some engines don't auto-exit on Escape; call the real API.
      void document.exitFullscreen().catch(() => { /* ignore */ });
    }
  };
  window.addEventListener('keydown', onKeyDown); // single handler
  root.addEventListener('fullscreenchange', onFsChange);

  // Offer Continue only when a valid checkpoint or in-memory run actually
  // exists; kept truthful by syncUi on every state change.
  const hasContinueSource = loadSavedGame() !== null;
  if (hasContinueSource) hasSave = true;

  wire('start-game', () => {
    audio.activate(); // user gesture: unlock context, then switch to game track
    audio.setMode('gameplay');
    sfx('select');
    resetRun(); // clears the previous save
    clearTitleOverlay();
    syncUi();
    syncAudio();
  });

  wire('continue-game', () => {
    // Real Continue: load the versioned checkpoint (or the in-memory state if
    // this tab still holds it) and resume. A corrupt/obsolete save was already
    // deleted by loadSavedGame(), so we recover to a usable New Game instead
    // of looping on repeated errors.
    const saved = state ? null : loadSavedGame();
    if (saved) {
      state = saved;
      selectedPadId = null;
      selectedTowerId = null;
      audioPrev.mode = state.mode;
      audioPrev.wave = state.wave;
      audioPrev.enemiesLen = state.enemies.length;
    }
    if (!state) {
      // No in-memory run and no usable save: recover to New Game.
      resetRun();
      clearTitleOverlay();
      syncUi();
      return;
    }
    if (state.mode === 'paused') setPaused(state, false);
    audio.setMode('gameplay'); // resume game track (was paused)
    sfx('select');
    clearTitleOverlay();
    syncUi();
    syncAudio();
  });
  wire('next-wave', () => {
    if (!state) return;
    const ok = startWave(state);
    if (ok) sfx('launch'); // single launch authority for an accepted wave
    else sfx('warn', 0.8); // invalid: wave already active / terminal
    syncUi();
    syncAudio();
  });
  wire('pause', () => {
    if (!state) return;
    const paused = state.mode === 'paused';
    setPaused(state, !paused);
    if (paused) audio.setMode('gameplay'); // resuming
    else audio.pause(); // pausing: stop music loop, keep mode for resume
    sfx(paused ? 'select' : 'warn');
    syncUi();
    syncAudio();
    // Pausing is a documented safe checkpoint (simulation frozen).
    if (!paused) saveCheckpoint(state);
  });
  wire('restart', () => {
    resetRun();
    audio.setMode('gameplay'); // fresh game track; no duplicate loop (setMode stops old)
    sfx('select');
    syncUi();
    syncAudio();
  });
  wire('speed-toggle', () => {
    if (!state) return;
    setSpeed(state, state.speed === 1 ? 2 : 1);
    syncUi();
  });

  for (const type of TOWER_TYPES) {
    wire(`tower-${type}`, () => {
      chosenType = type;
      selectedTowerId = null;
      // arm the first empty pad as a visual hint (not required by sim).
      if (state) {
        const empty = state.buildPads.find((p) => !state!.towers.some((t) => t.padId === p.id));
        selectedPadId = empty ? empty.id : null;
      }
      syncUi();
    });
  }

  wire('upgrade-tower', () => {
    if (!state || !selectedTowerId) return;
    const ok = upgradeTower(state, selectedTowerId);
    sfx(ok ? 'powerup' : 'warn', ok ? 1 : 0.8);
    syncUi();
    syncAudio();
  });
  wire('sell-tower', () => {
    if (!state || !selectedTowerId) return;
    const id = selectedTowerId;
    const ok = sellTower(state, id);
    sfx(ok ? 'explode' : 'warn', ok ? 0.9 : 0.8);
    if (ok) selectedTowerId = null;
    syncUi();
    syncAudio();
  });

  // Terminal states: stop the music loop once, no duplicate tracks.
  const onVisibility = (): void => {
    if (!state) return;
    if (document.hidden) audio.pause();
    else if (state.mode === 'playing') audio.setMode('gameplay');
  };
  document.addEventListener('visibilitychange', onVisibility);

  syncUi();
}

export default startRelayDefense;
