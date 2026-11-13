// Procedural Web Audio: desert-dusk synth loop + SFX. No external assets.

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private droneNodes: OscillatorNode[] = [];
  private nextStepTime = 0;
  private step = 0;
  muted = false;

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.startDrone();
    this.nextStepTime = this.ctx.currentTime + 0.1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(m ? 0 : 0.9, this.ctx.currentTime);
  }

  private startDrone() {
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 6;
    filter.connect(this.musicGain);
    [55, 55.4, 110.2].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.05 : 0.035;
      o.connect(g); g.connect(filter);
      o.start();
      this.droneNodes.push(o);
    });
    // slow LFO on the filter for a breathing desert wind feel
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
    this.droneNodes.push(lfo);
  }

  // Called every frame; schedules music steps slightly ahead of time.
  update() {
    if (!this.ctx || !this.musicGain) return;
    const stepDur = 60 / 96 / 2; // 96 BPM, eighth notes
    while (this.nextStepTime < this.ctx.currentTime + 0.25) {
      this.scheduleStep(this.step, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % 64; // 4 bars of 16 eighths
    }
  }

  private scheduleStep(step: number, t: number, stepDur: number) {
    // A minor pentatonic dusk groove. Bass on quarters, plucked melody sparse.
    const bass = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 73.4, 0, 65.4, 0];
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const b = bass[s16];
    if (b) this.tone(b * (bar === 2 ? 0.89 : 1), t, stepDur * 1.8, 'triangle', 0.16, this.musicGain!);
    const melody: (number | null)[] = [
      220, null, null, 261.6, null, 293.7, null, null,
      329.6, null, 293.7, null, 261.6, null, 220, null,
    ];
    const m = melody[(s16 + bar * 5) % 16];
    if (m && (bar !== 3 || s16 < 12)) {
      this.tone(m * (bar === 1 ? 1.335 : 1), t, stepDur * 1.1, 'square', 0.028, this.musicGain!);
      this.tone(m * 2, t, stepDur * 0.6, 'sine', 0.05, this.musicGain!);
    }
    // hat tick on offbeats
    if (s16 % 2 === 1) this.noise(t, 0.03, 0.025, 6000, this.musicGain!);
  }

  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: GainNode) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private noise(t: number, dur: number, vol: number, freq: number, dest: GainNode) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(dest);
    src.start(t);
  }

  private now() { return this.ctx ? this.ctx.currentTime : 0; }

  sfxShoot() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(880, t, 0.09, 'square', 0.06, this.sfxGain); this.tone(1760, t, 0.05, 'sine', 0.05, this.sfxGain); }
  sfxMortar() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(95, t, 0.28, 'sine', 0.32, this.sfxGain); this.noise(t, 0.12, 0.12, 300, this.sfxGain); }
  sfxExplosion() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.noise(t, 0.4, 0.3, 220, this.sfxGain); this.tone(70, t, 0.4, 'sine', 0.28, this.sfxGain); }
  sfxCoin() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(1320, t, 0.07, 'sine', 0.09, this.sfxGain); this.tone(1980, t + 0.06, 0.12, 'sine', 0.09, this.sfxGain); }
  sfxBuild() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(520, t, 0.09, 'triangle', 0.16, this.sfxGain); this.tone(780, t + 0.07, 0.14, 'triangle', 0.16, this.sfxGain); }
  sfxUpgrade() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); [660, 880, 1100].forEach((f, i) => this.tone(f, t + i * 0.07, 0.12, 'triangle', 0.13, this.sfxGain!)); }
  sfxError() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(140, t, 0.18, 'sawtooth', 0.12, this.sfxGain); }
  sfxLeak() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(180, t, 0.3, 'sawtooth', 0.2, this.sfxGain); this.noise(t, 0.2, 0.15, 500, this.sfxGain); }
  sfxSelect() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); this.tone(980, t, 0.05, 'sine', 0.06, this.sfxGain); }
  sfxWin() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.16, 0.34, 'triangle', 0.16, this.sfxGain!)); }
  sfxLose() { if (!this.ctx || !this.sfxGain) return; const t = this.now(); [392, 330, 262, 196].forEach((f, i) => this.tone(f, t + i * 0.2, 0.4, 'sawtooth', 0.1, this.sfxGain!)); }
}

export const audio = new AudioEngine();
