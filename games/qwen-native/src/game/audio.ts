// Original procedural Web Audio: ambient desert music + combat SFX. No external assets.

type Ctx = AudioContext;

const SCALE = [220, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

export class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private timer: number | null = null;
  private step = 0;
  muted = false;
  started = false;

  /** AudioContext must be created from a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.28;
    this.master.connect(ctx.destination);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.master);

    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;

    this.started = true;
    this.startMusic();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.28, this.ctx.currentTime, 0.05);
    }
  }

  private startMusic() {
    if (!this.ctx || this.timer !== null) return;
    const stepMs = 170;
    this.timer = window.setInterval(() => this.musicStep(), stepMs);
    this.musicStep();
  }

  private musicStep() {
    const ctx = this.ctx;
    if (!ctx || this.muted || !this.musicGain) return;
    const s = this.step % 32;
    const t = ctx.currentTime;

    // Drone every 8 steps
    if (s % 8 === 0) {
      const base = s === 16 ? 110 : 146.83;
      this.tone(base, t, 1.45, 0.16, 'sawtooth', this.musicGain, 400);
      this.tone(base * 1.5, t, 1.2, 0.06, 'sine', this.musicGain, 900);
    }
    // Plucked arp pattern (pentatonic, sparse)
    const pattern = [0, -1, 3, -1, 5, 2, -1, 4, 1, -1, 6, -1, 3, 5, -1, 2, 0, -1, 4, -1, 7, -1, 5, 3, -1, 2, -1, 6, 1, -1, 4, -1];
    const idx = pattern[s];
    if (idx >= 0) {
      const f = SCALE[idx] * (s > 20 ? 1.5 : 1);
      this.tone(f, t, 0.34, 0.12, 'triangle', this.musicGain, 1800);
    }
    // Soft hiss texture
    if (s % 4 === 2) this.noiseBurst(t, 0.12, 0.035, 1400, this.musicGain);
    this.step++;
  }

  private tone(freq: number, t: number, dur: number, gain: number, type: OscillatorType, dest: AudioNode, cutoff: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = cutoff;
    osc.connect(g);
    g.connect(flt);
    flt.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noiseBurst(t: number, dur: number, gain: number, cutoff: number, dest: AudioNode, sweepTo?: number) {
    const ctx = this.ctx;
    if (!ctx || !this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(cutoff, t);
    if (sweepTo) flt.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private lastPlay: Record<string, number> = {};
  private ok(key: string) {
    const now = performance.now();
    if (this.lastPlay[key] && now - this.lastPlay[key] < 45) return false;
    this.lastPlay[key] = now;
    return true;
  }

  private d() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  beam(fast: boolean) {
    if (!this.started || this.muted || !this.ok('beam')) return;
    const t = this.d();
    const dest = this.sfxGain!;
    const osc = this.ctx!.createOscillator();
    osc.type = fast ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(fast ? 1400 : 700, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.09);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    const flt = this.ctx!.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.value = 1200;
    osc.connect(g); g.connect(flt); flt.connect(dest);
    osc.start(t); osc.stop(t + 0.12);
  }

  mortar() {
    if (!this.started || this.muted || !this.ok('mortar')) return;
    const t = this.d();
    const dest = this.sfxGain!;
    this.tone(140, t, 0.22, 0.14, 'sine', dest, 300);
    this.noiseBurst(t, 0.14, 0.09, 900, dest, 120);
  }

  hit() {
    if (!this.started || this.muted || !this.ok('hit')) return;
    this.noiseBurst(this.d(), 0.05, 0.05, 1800, this.sfxGain!, 400);
  }

  explode() {
    if (!this.started || this.muted || !this.ok('explode')) return;
    const t = this.d();
    this.noiseBurst(t, 0.3, 0.12, 1200, this.sfxGain!, 90);
    this.tone(70, t, 0.3, 0.1, 'sine', this.sfxGain!, 200);
  }

  build() {
    if (!this.started || this.muted) return;
    const t = this.d();
    this.tone(392, t, 0.12, 0.1, 'triangle', this.sfxGain!, 2000);
    this.tone(587.33, t + 0.09, 0.16, 0.09, 'triangle', this.sfxGain!, 2200);
  }

  ui() {
    if (!this.started || this.muted) return;
    this.tone(660, this.d(), 0.07, 0.06, 'square', this.sfxGain!, 2500);
  }

  deny() {
    if (!this.started || this.muted) return;
    this.tone(150, this.d(), 0.18, 0.09, 'square', this.sfxGain!, 600);
  }

  leak() {
    if (!this.started || this.muted) return;
    const t = this.d();
    this.tone(196, t, 0.4, 0.12, 'sawtooth', this.sfxGain!, 500);
    this.tone(98, t + 0.12, 0.5, 0.1, 'sawtooth', this.sfxGain!, 400);
  }

  win() {
    if (!this.started || this.muted) return;
    const t = this.d();
    [523.25, 659.25, 784, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.16, 0.5, 0.12, 'triangle', this.sfxGain!, 3000));
  }

  lose() {
    if (!this.started || this.muted) return;
    const t = this.d();
    [392, 329.63, 261.63, 174.6].forEach((f, i) => this.tone(f, t + i * 0.22, 0.7, 0.12, 'sawtooth', this.sfxGain!, 900));
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const audio = new AudioEngine();
