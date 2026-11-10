// audio.ts — original local Qwen audio module for relay-defense (AMD AI370)
// Original, non-silent note patterns and SFX presets composed locally by the
// local qwen/qwen3.8-27b model. Synth engine: ZzFX v1.4.0 (MIT, Frank Force)
// from vendor/zzfx/ZzFX.js — used unchanged via its public API (buildSamples /
// playSamples). No assets, no cloud AI, no dependencies added.

import { ZZFX } from '../vendor/zzfx/ZzFX.js';

export type AudioMode = 'idle' | 'menu' | 'gameplay' | 'paused' | 'terminal';

export interface AudioConfig {
  musicVolume: number; // 0..1, relative to the shared ZZFX master volume
  sfxVolume: number;   // 0..1, relative to the shared ZZFX master volume
  muted: boolean;
}

// A single note/preset spec is exactly a ZZFX.buildSamples argument list.
type Preset = Parameters<typeof ZZFX.buildSamples>;

const N = (semitone: number, root = 440): number => ZZFX.getNote(semitone, root);

function mul(a: Float32Array, b: Float32Array, k: number): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) * k;
  return out;
}

function concat(channels: Float32Array[]): Float32Array {
  let len = 0;
  for (const c of channels) len += c.length;
  const out = new Float32Array(len);
  let o = 0;
  for (const c of channels) { out.set(c, o); o += c.length; }
  return out;
}

// Build a small note-pattern loop from an array of notes. Each note is a short
// pluck (sine with attack/decay/release). Notes are concatenated into one
// buffer that loops cleanly (each note has its own envelope, so boundaries are
// silent and the loop point is clean).
function buildLoop(notes: number[], opts?: { sustain?: number; shape?: number }): Float32Array {
  const sustain = opts?.sustain ?? 0.18;
  const shape = opts?.shape ?? 0;
  const parts: Float32Array[] = [];
  for (const f of notes) {
    parts.push(ZZFX.buildSamples(
      0.9,        // volume
      0,          // randomness (deterministic loop)
      f,          // frequency
      0.015,      // attack
      sustain,    // sustain
      0.24,       // release
      shape,      // shape
      1,          // shapeCurve
      0, 0,       // slide / deltaSlide
      0, 0,       // pitchJump / time
      0,          // repeatTime
      0,          // noise
      0,          // modulation
      0,          // bitCrush
      0,          // delay
      0.7,        // sustainVolume
      0,          // decay
      0,          // tremolo
      0           // filter
    ));
  }
  return concat(parts);
}

// Original non-silent patterns (distinct from each other).
const MENU_LOOP: Float32Array = buildLoop(
  [N(-12), N(-9), N(-5), N(-12), N(-14), N(-9), N(-7), N(-12)],
  { sustain: 0.2, shape: 1 } // triangle-ish, calm menu feel
);

const GAMEPLAY_LOOP: Float32Array = buildLoop(
  [N(-12), N(-12), N(-7), N(-5), N(-12), N(-9), N(-7), N(-10), N(-12), N(-12), N(-8), N(-5)],
  { sustain: 0.14, shape: 0 } // sine, busier gameplay feel
);

// Distinct useful SFX presets (>=8). Each is a single buildSamples call list.
const SFX = {
  click:        [0.6, 0, N(3),   0.005, 0.02, 0.12, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0] as Preset,
  select:       [0.7, 0, N(5),   0.01,  0.05, 0.2,  1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0] as Preset,
  launch:       [0.7, 0, N(-2),  0.01,  0.05, 0.3,  0, 1, -0.4, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0] as Preset,
  hit:          [0.8, 0, N(-7),  0.005, 0.04, 0.25, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0] as Preset,
  explode:      [0.8, 0, N(-12), 0.005, 0.1, 0.5,   4, 1, -0.6, 0, 0, 0, 0, 0.3, 0, 0, 0, 0.9, 0, 0, 0] as Preset,
  shield:       [0.6, 0, N(7),   0.02,  0.1, 0.35,  2, 1, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0] as Preset,
  powerup:      [0.7, 0, N(0),   0.01,  0.08, 0.4,  0, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0] as Preset,
  warn:         [0.7, 0, N(-4),  0.01,  0.06, 0.3,  2, 1, -0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.85, 0, 0, 0] as Preset,
  win:          [0.7, 0, N(9),   0.01,  0.12, 0.6,  0, 1, 0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0] as Preset,
  lose:         [0.7, 0, N(-16), 0.02,  0.15, 0.8,  3, 1, -0.5, 0, 0, 0, 0, 0.2, 0, 0, 0, 0.9, 0, 0, 0] as Preset,
} as const;

export type SfxName = keyof typeof SFX;

// The public audio controller.
export class AudioController {
  private musicVolume: number;
  private sfxVolume: number;
  private muted: boolean;

  private mode: AudioMode = 'idle';
  private musicSource: AudioBufferSourceNode | null = null;
  private activeSfx: Set<AudioBufferSourceNode> = new Set();

  // Tracks the last-applied master volume so we can re-apply to live nodes.
  private appliedMusicGain = -1;
  private appliedSfxGain = -1;

  constructor(cfg?: Partial<AudioConfig>) {
    this.musicVolume = cfg?.musicVolume ?? 0.6;
    this.sfxVolume = cfg?.sfxVolume ?? 0.8;
    this.muted = cfg?.muted ?? false;
  }

  // Must be called from a user gesture to unlock the shared AudioContext.
  activate(): void {
    if (ZZFX.audioContext.state === 'suspended') {
      void ZZFX.audioContext.resume();
    }
  }

  setMode(mode: AudioMode): void {
    this.mode = mode;
    if (mode === 'menu' || mode === 'gameplay') {
      this.startMusicLoop();
    } else {
      // paused / terminal / idle: stop the loop (paused keeps state for resume)
      this.stopMusicLoop();
    }
  }

  pause(): void {
    if (this.mode === 'menu' || this.mode === 'gameplay') {
      this.setMode('paused');
    }
  }

  focus(): void {
    // Re-enter the previous non-paused mode. If we were idle, do nothing.
    if (this.mode === 'paused') {
      this.setMode('menu');
    } else if (this.mode === 'idle') {
      this.setMode('menu');
    }
  }

  restart(): void {
    // Restart the current mode's loop cleanly (stop old, start new).
    const m = this.mode;
    this.stopMusicLoop();
    if (m === 'menu' || m === 'gameplay') this.startMusicLoop();
  }

  stop(): void {
    this.stopMusicLoop();
    this.stopAllSfx();
    this.mode = 'idle';
  }

  getMode(): AudioMode { return this.mode; }

  // Play a named SFX. Returns the source node (or null if muted/unsupported).
  playEffect(name: SfxName, opts?: { volumeScale?: number; pan?: number }): AudioBufferSourceNode | null {
    const preset = SFX[name];
    if (!preset) return null;

    // Build samples deterministically and play through the shared context.
    const samples = ZZFX.buildSamples(...preset);
    const vol = this.muted ? 0 : clamp01(this.sfxVolume) * (opts?.volumeScale ?? 1);
    const source = ZZFX.playSamples([samples], vol, 1, opts?.pan ?? 0, false);

    // Track for cleanup on stop / ended.
    this.activeSfx.add(source);
    source.onended = () => { this.activeSfx.delete(source); };
    return source;
  }

  // Independent music volume (0..1). Affects currently playing nodes.
  setMusicVolume(v: number): void {
    this.musicVolume = clamp01(v);
    this.applyMasterVolumes();
  }

  // Independent SFX volume (0..1). Affects future plays and live SFX.
  setSfxVolume(v: number): void {
    this.sfxVolume = clamp01(v);
    this.applyMasterVolumes();
  }

  getMusicVolume(): number { return this.musicVolume; }
  getSfxVolume(): number { return this.sfxVolume; }

  // Mute / unmute. Affects currently playing nodes via the shared master gain.
  setMuted(m: boolean): void {
    this.muted = m;
    this.applyMasterVolumes();
  }

  isMuted(): boolean { return this.muted; }

  // ---- internals ----------------------------------------------------------

  private startMusicLoop(): void {
    // Avoid duplicate loops: stop any existing music source first.
    this.stopMusicLoop();

    const samples = this.mode === 'gameplay' ? GAMEPLAY_LOOP : MENU_LOOP;
    const vol = this.muted ? 0 : clamp01(this.musicVolume);
    const source = ZZFX.playSamples([samples], vol, 1, 0, true); // loop=true
    this.musicSource = source;
    this.appliedMusicGain = vol;
  }

  private stopMusicLoop(): void {
    if (this.musicSource) {
      try { this.musicSource.stop(); } catch { /* already stopped */ }
      this.musicSource.onended = null;
      this.musicSource = null;
    }
  }

  private stopAllSfx(): void {
    for (const s of this.activeSfx) {
      try { s.stop(); } catch { /* ignore */ }
    }
    this.activeSfx.clear();
  }

  // Re-apply current volumes to live nodes so mute/volume changes take effect
  // immediately, not just on the next play.
  private applyMasterVolumes(): void {
    const mv = this.muted ? 0 : clamp01(this.musicVolume) * ZZFX.volume;
    if (this.musicSource && (this.musicSource as any).gainNode) {
      (this.musicSource as any).gainNode.gain.value = mv;
    }
    this.appliedMusicGain = mv;

    const sv = this.muted ? 0 : clamp01(this.sfxVolume) * ZZFX.volume;
    for (const s of this.activeSfx) {
      const gn = (s as any).gainNode;
      if (gn) gn.gain.value = sv;
    }
    this.appliedSfxGain = sv;
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// Convenience singleton for renderer integration (NEXT step).
export const audio = new AudioController();
