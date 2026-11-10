/** Original Web Audio engine: procedural ambient loop + short SFX. No samples. */

type Ctx = AudioContext;

export class SoundEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private muted = false;
  private started = false;
  private step = 0;
  private nextStepTime = 0;
  private timer: number | null = null;

  mutedFlag() { return this.muted; }

  private ensure(): Ctx | null {
    if (this.ctx) return this.ctx;
    const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);
      const music = ctx.createGain();
      music.gain.value = 0.22;
      music.connect(master);
      this.ctx = ctx; this.master = master; this.musicGain = music;
    } catch (e) {
      console.warn('audio unavailable', e);
      return null;
    }
    return this.ctx;
  }

  /** Original desert loop: slow D-pad pulse + filtered noise wind. */
  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.started) return;
    this.started = true;
    // wind
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
    noise.buffer = buf;
    noise.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 420;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.12;
    noise.connect(filt).connect(windGain).connect(this.musicGain!);
    noise.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(filt.frequency);
    lfo.start();

    this.nextStepTime = ctx.currentTime + 0.2;
    this.timer = window.setInterval(() => this.schedule(), 120);
  }

  private schedule() {
    if (!this.ctx || !this.musicGain) return;
    const spb = 0.46;
    while (this.nextStepTime < this.ctx.currentTime + 0.35) {
      const pattern = [0, 3, 7, 10, 7, 3, 5, 0];
      const t = this.nextStepTime;
      if (this.step % 2 === 0) {
        const o = this.tone(196 * Math.pow(2, pattern[this.step % pattern.length] / 12), spb * 1.6, 0.16, 'triangle', t);
        if (o) o.connect(this.musicGain);
      }
      if (this.step % 8 === 5) {
        const o = this.tone(98, spb * 1.2, 0.2, 'sine', t);
        if (o) o.connect(this.musicGain);
      }
      if (this.step % 4 === 2) {
        const o = this.tone(880 + (this.step % 16) * 40, 0.14, 0.05, 'square', t);
        if (o) o.connect(this.musicGain);
      }
      this.step++;
      this.nextStepTime += spb;
    }
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType, when?: number) {
    if (!this.ctx || !this.master) return null;
    const t = when ?? this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private noiseBurst(dur: number, gain: number, freq: number, q = 1) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    const buf = this.ctx.createBuffer(1, Math.max(1, Math.floor(this.ctx.sampleRate * dur)), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    n.connect(f).connect(g).connect(this.master);
    n.start(t);
  }

  sfx(kind: string) {
    if (this.muted || !this.ctx) return;
    switch (kind) {
      case 'beam': this.tone(760, 0.12, 0.14, 'square'); this.noiseBurst(0.06, 0.05, 2600, 3); break;
      case 'pulse': this.tone(180, 0.28, 0.16, 'sine'); this.noiseBurst(0.16, 0.09, 900, 1.2); break;
      case 'death': this.tone(210, 0.18, 0.11, 'sawtooth'); this.noiseBurst(0.12, 0.08, 1200, 1); break;
      case 'place': this.tone(330, 0.16, 0.14, 'triangle'); this.tone(660, 0.12, 0.08, 'triangle'); break;
      case 'upgrade': this.tone(440, 0.14, 0.12, 'triangle'); this.tone(880, 0.2, 0.1, 'triangle'); break;
      case 'core': this.tone(120, 0.4, 0.2, 'sawtooth'); this.noiseBurst(0.25, 0.12, 400, 0.7); break;
      case 'ui': this.tone(520, 0.06, 0.08, 'square'); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, 0.12, 'triangle', this.ctx!.currentTime + i * 0.13)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, 0.12, 'sawtooth', this.ctx!.currentTime + i * 0.16)); break;
      case 'wave': this.tone(330, 0.25, 0.1, 'triangle'); this.tone(495, 0.25, 0.08, 'triangle', this.ctx.currentTime + 0.12); break;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.28, this.ctx.currentTime, 0.05);
  }

  stop() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    if (this.ctx) { try { this.ctx.close(); } catch { /* ignore */ } }
    this.ctx = null; this.master = null; this.musicGain = null; this.started = false;
  }
}
