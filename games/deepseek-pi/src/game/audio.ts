/**
 * Relay Defense audio: an original procedural desert-synth score and effects.
 * Everything is synthesized locally with the Web Audio API.
 */

type SfxName =
  | 'click'
  | 'build'
  | 'upgrade'
  | 'laser'
  | 'arc'
  | 'hit'
  | 'death'
  | 'leak'
  | 'wave'
  | 'boss'
  | 'win'
  | 'lose'
  | 'error';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private delay: DelayNode | null = null;
  private step = 0;
  private nextTime = 0;
  private noise: AudioBuffer | null = null;
  private started = false;
  muted = false;

  start(): void {
    if (this.started) {
      void this.ctx?.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.started = true;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.16;
    this.musicBus.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.34;
    this.sfxBus.connect(this.master);

    // A soft echo gives the arpeggio some desert distance.
    this.delay = ctx.createDelay(0.6);
    this.delay.delayTime.value = 0.28;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.delay.connect(feedback);
    feedback.connect(this.delay);
    this.delay.connect(wet);
    wet.connect(this.musicBus);

    this.noise = this.makeNoise(ctx);
    this.nextTime = ctx.currentTime + 0.08;
    this.step = 0;
    window.setInterval(() => this.schedule(), 90);
    this.schedule();
    void ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.03);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Schedule a little original cue: 8 bars of 8th notes over Dm / Bb / F / C. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    if (this.muted) return;
    const bpm = 92;
    const eighth = 60 / bpm / 2;
    while (this.nextTime < ctx.currentTime + 0.4) {
      const bar = Math.floor(this.step / 8) % 4;
      const pos = this.step % 8;
      const roots = [146.83, 116.54, 174.61, 130.81]; // D3, Bb2, F3, C3
      const chords = [
        [293.66, 349.23, 440.0],
        [233.08, 293.66, 349.23],
        [349.23, 440.0, 523.25],
        [261.63, 329.63, 392.0],
      ];
      const root = roots[bar];
      const chord = chords[bar];
      const arp = [0, 1, 2, 1, 2, 1, 0, 1];
      const freq = chord[arp[pos]] * (pos === 6 ? 2 : 1);
      this.pluck(freq, this.nextTime, 0.36, 0.09, 'triangle');
      if (pos === 0 || pos === 3 || pos === 6) {
        this.bass(root, this.nextTime, pos === 0 ? 0.6 : 0.4);
      }
      if (pos === 0 || pos === 4) this.kick(this.nextTime, 0.18);
      if (pos % 2 === 0) this.shaker(this.nextTime, pos === 4 ? 0.05 : 0.035);
      if (bar === 3 && pos === 7) this.pluck(chord[2] * 2, this.nextTime + eighth * 0.5, 0.5, 0.05, 'sine');
      this.step++;
      this.nextTime += eighth;
    }
  }

  private pluck(freq: number, at: number, dur: number, vol: number, type: OscillatorType): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2400;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    if (this.delay) gain.connect(this.delay);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private bass(freq: number, at: number, dur: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 280;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq / 2, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.12, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    osc.start(at);
    osc.stop(at + dur + 0.02);
  }

  private kick(at: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start(at);
    osc.stop(at + 0.2);
  }

  private shaker(at: number, vol: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);
    src.start(at);
    src.stop(at + 0.08);
  }

  private tone(freq: number, endFreq: number, dur: number, vol: number, type: OscillatorType, at?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus) return;
    const t = at ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(dur: number, vol: number, cutoff: number, at?: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || !this.noise) return;
    const t = at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * 0.25), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.muted) return;
    const now = ctx.currentTime;
    switch (name) {
      case 'click':
        this.tone(660, 520, 0.05, 0.08, 'square');
        break;
      case 'build':
        this.tone(330, 520, 0.13, 0.12, 'triangle');
        this.tone(520, 880, 0.18, 0.1, 'sine', now + 0.08);
        this.noiseBurst(0.18, 0.09, 1200);
        break;
      case 'upgrade':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f * 1.01, 0.22, 0.09, 'triangle', now + i * 0.065));
        break;
      case 'laser':
        this.tone(1500, 420, 0.11, 0.09, 'sawtooth');
        this.noiseBurst(0.08, 0.05, 5000);
        break;
      case 'arc':
        this.tone(980, 180, 0.14, 0.07, 'square');
        this.noiseBurst(0.12, 0.06, 4200);
        break;
      case 'hit':
        this.noiseBurst(0.07, 0.05, 2400);
        break;
      case 'death':
        this.tone(180, 55, 0.24, 0.1, 'sawtooth');
        this.noiseBurst(0.2, 0.08, 1400);
        break;
      case 'leak':
        this.tone(220, 110, 0.4, 0.12, 'square');
        this.tone(165, 82, 0.5, 0.1, 'sawtooth', now + 0.12);
        break;
      case 'wave':
        this.tone(110, 112, 0.7, 0.11, 'sawtooth');
        this.tone(165, 166, 0.7, 0.08, 'triangle', now + 0.1);
        this.tone(220, 221, 0.6, 0.06, 'triangle', now + 0.2);
        break;
      case 'boss':
        this.tone(70, 45, 1.4, 0.18, 'sawtooth');
        this.tone(105, 52, 1.2, 0.1, 'square', now + 0.2);
        this.noiseBurst(0.9, 0.08, 500);
        break;
      case 'win':
        [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.6, 0.1, 'triangle', now + i * 0.13));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.98, 0.7, 0.11, 'sawtooth', now + i * 0.18));
        break;
      case 'error':
        this.tone(150, 110, 0.16, 0.1, 'square');
        break;
    }
  }
}

export const audio = new AudioEngine();
