// Original procedural Web Audio engine for Relay Defense.

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  muted = false;
  private step = 0;
  private started = false;

  ensure() {
    if (this.ctx) return;
    try {
      const AC: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
    } catch { this.ctx = null; }
  }

  resume() {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  startMusic() {
    this.ensure();
    if (!this.ctx || this.started) return;
    this.started = true;
    const tick = () => {
      if (!this.ctx) return;
      const s = this.step++;
      // 110 bpm eighth-note groove over a desert pad
      const beat = s % 8;
      if (beat === 0) this.pad();
      if (s % 2 === 0) this.bass();
      if (beat === 2 || beat === 6) this.tickHat();
      const mel = [0, 3, 7, 10, 12, 10, 7, 3];
      if (beat === 0 || beat === 4) this.pluck(mel[(s / 4) % 8 | 0]);
      window.setTimeout(tick, (60 / 110 / 2) * 1000);
    };
    tick();
  }

  private note(n: number) { return 220 * Math.pow(2, n / 12); }

  private pad() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    [0, 7, 15].forEach((iv, i) => {
      const o = this.ctx!.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = this.note(iv - 12) * (i === 2 ? 0.5 : 1);
      const g = this.ctx!.createGain();
      const flt = this.ctx!.createBiquadFilter();
      flt.type = 'lowpass'; flt.frequency.value = 900;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08, t + 1.2);
      g.gain.linearRampToValueAtTime(0.05, t + 3.6);
      g.gain.linearRampToValueAtTime(0, t + 4.3);
      o.connect(flt); flt.connect(g); g.connect(this.musicGain!);
      o.start(t); o.stop(t + 4.4);
    });
  }

  private bass() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = this.note(-24 + ((this.step >> 3) % 4 === 3 ? 5 : 0));
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.25);
  }

  private tickHat() {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const len = 0.05, sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(f); f.connect(g); g.connect(this.musicGain);
    src.start(t);
  }

  private pluck(n: number) {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = this.note(n);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.4);
  }

  ui(freq: number, up = false) { this.blip(freq, 0.09, 'triangle', 0.09, up ? 140 : -70); }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
    this.ensure();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number) {
    this.ensure();
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  }

  shoot() { this.blip(880, 0.08, 'square', 0.12, -300); }
  lance() { this.blip(180, 0.3, 'sawtooth', 0.16, -80); this.noise(0.25, 0.14, 2400); }
  hit() { this.noise(0.08, 0.1, 3200); }
  kill() { this.blip(520, 0.15, 'triangle', 0.14, -320); this.noise(0.1, 0.08, 1800); }
  place() { this.blip(300, 0.12, 'triangle', 0.15, 220); }
  upgrade() { this.blip(440, 0.12, 'triangle', 0.14, 260); setTimeout(() => this.blip(660, 0.14, 'triangle', 0.14, 260), 90); }
  deny() { this.blip(140, 0.16, 'square', 0.13, -50); }
  leak() { this.blip(200, 0.4, 'sawtooth', 0.2, -140); this.noise(0.3, 0.15, 900); }
  waveStart() { this.blip(330, 0.2, 'triangle', 0.15, 130); setTimeout(() => this.blip(495, 0.25, 'triangle', 0.15, 130), 160); }
  boss() { this.blip(90, 0.7, 'sawtooth', 0.25, -30); this.noise(0.6, 0.12, 500); }
  win() { [0, 4, 7, 12].forEach((n, i) => setTimeout(() => this.blip(this.note(n + 12), 0.35, 'triangle', 0.16), i * 160)); }
  lose() { [0, -2, -5, -12].forEach((n, i) => setTimeout(() => this.blip(this.note(n), 0.5, 'sawtooth', 0.16), i * 220)); }
}

export const audio = new AudioEngine();
