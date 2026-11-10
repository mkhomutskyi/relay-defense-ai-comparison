/** Shared control bridge so the HTML toolbar and the Phaser scenes drive the same game. */

export type ControlState = {
  mode: string;
  paused: boolean;
  speed: number;
  muted: boolean;
  canStart: boolean;
};

export const controls: {
  start: (() => void) | null;
  togglePause: (() => void) | null;
  setSpeed: ((v: number) => void) | null;
  setMuted: ((v: boolean) => void) | null;
  restart: (() => void) | null;
  getState: (() => ControlState) | null;
} = {
  start: null, togglePause: null, setSpeed: null, setMuted: null, restart: null, getState: null,
};

export function renderControlLabels() {
  const set = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  const s = controls.getState ? controls.getState() : { mode: 'menu', paused: false, speed: 1, muted: false, canStart: true };
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.textContent = s.mode === 'menu' ? 'Start' : 'Send Wave';
    // Start must not skip or replace a wave that is already running.
    (startBtn as HTMLButtonElement).disabled = !s.canStart;
  }
  set('pause-btn', s.paused ? 'Resume' : 'Pause');
  set('speed-btn', `Speed ${s.speed}x`);
  set('mute-btn', s.muted ? 'Unmute' : 'Mute');
  set('restart-btn', 'Restart');
}

export function wireControls() {
  const bind = (id: string, fn: () => void) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => { fn(); renderControlLabels(); });
  };
  // Every handler routes through the scene, and the scene is the single source of truth:
  // it refreshes canvas buttons, the HUD line and these HTML labels together.
  bind('start-btn', () => { if (controls.getState?.().canStart) controls.start?.(); });
  bind('pause-btn', () => controls.togglePause?.());
  bind('speed-btn', () => controls.setSpeed?.(controls.getState?.().speed === 1 ? 2 : 1));
  bind('mute-btn', () => controls.setMuted?.(!controls.getState?.().muted));
  bind('restart-btn', () => controls.restart?.());
  renderControlLabels();
}
