type SfxKind =
    | 'click'
    | 'build'
    | 'upgrade'
    | 'sell'
    | 'deny'
    | 'beam'
    | 'pulse'
    | 'hit'
    | 'death'
    | 'leak'
    | 'wave'
    | 'clear'
    | 'win'
    | 'lose'
    | 'boss';

const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private sfxBus: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    private musicTimer: number | null = null;
    private nextNote = 0;
    private step = 0;
    private lastSfx = new Map<string, number>();
    muted = false;

    ensure(): void {
        if (!this.ctx) {
            const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return;
            const ctx = new Ctor();
            this.ctx = ctx;
            const master = ctx.createGain();
            master.gain.value = this.muted ? 0 : 0.7;
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -16;
            comp.knee.value = 18;
            comp.ratio.value = 4;
            comp.attack.value = 0.005;
            comp.release.value = 0.25;
            master.connect(comp);
            comp.connect(ctx.destination);

            const music = ctx.createGain();
            music.gain.value = 0.26;
            music.connect(master);
            const sfx = ctx.createGain();
            sfx.gain.value = 0.55;
            sfx.connect(master);

            this.master = master;
            this.musicBus = music;
            this.sfxBus = sfx;

            const len = Math.floor(ctx.sampleRate * 1.2);
            const buf = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
            this.noiseBuffer = buf;
        }
        if (this.ctx.state === 'suspended') {
            void this.ctx.resume();
        }
    }

    setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.master && this.ctx) {
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
        }
    }

    toggleMuted(): boolean {
        this.setMuted(!this.muted);
        return this.muted;
    }

    startMusic(): void {
        this.ensure();
        if (!this.ctx || this.musicTimer !== null) return;
        this.step = 0;
        this.nextNote = this.ctx.currentTime + 0.08;
        this.musicTimer = window.setInterval(() => this.schedule(), 90);
    }

    stopMusic(): void {
        if (this.musicTimer !== null) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    private schedule(): void {
        if (!this.ctx || !this.musicBus) return;
        if (this.ctx.state !== 'running') return;
        const horizon = this.ctx.currentTime + 0.22;
        let guard = 0;
        while (this.nextNote < horizon && guard < 12) {
            this.playStep(this.step, this.nextNote);
            this.nextNote += 0.15;
            this.step = (this.step + 1) % 64;
            guard++;
        }
        if (this.nextNote < this.ctx.currentTime - 0.5) {
            this.nextNote = this.ctx.currentTime + 0.05;
        }
    }

    private playStep(step: number, t: number): void {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        const roots = [50, 50, 53, 48]; // D3, D3, F3, C3
        const root = roots[bar];
        const scale = [62, 65, 67, 69, 72, 74, 77]; // D minor pentatonic-ish

        // bass
        if (s === 0 || s === 6 || s === 10) {
            this.note(midi(root - 12), t, 0.42, 'triangle', 0.16, this.musicBus!, 420);
        }
        // pad chord every bar
        if (s === 0) {
            const chords = [
                [50, 53, 57],
                [50, 55, 58],
                [46, 50, 53],
                [48, 52, 55]
            ];
            for (const n of chords[bar]) {
                this.pad(midi(n), t, 2.2, 0.035);
            }
        }
        // plucked arpeggio
        const arp = [0, 2, 4, 3, 1, 4, 2, 5];
        if (s % 2 === 0) {
            const idx = arp[(step / 2) % arp.length];
            const octave = bar >= 2 && s > 8 ? 12 : 0;
            this.pluck(midi(scale[idx] + octave), t, 0.30, 0.055 + (s % 4 === 0 ? 0.02 : 0));
        }
        // shaker
        if (s % 2 === 1) {
            this.noise(t, 0.035, 0.018, 6200);
        }
        // soft kick
        if (s === 0 || s === 8) {
            this.kick(t, 0.16);
        }
    }

    private note(freq: number, t: number, dur: number, type: OscillatorType, gain: number, dest: AudioNode | null, filter?: number): void {
        if (!dest) return;
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        if (filter) {
            const f = this.ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = filter;
            osc.connect(f);
            f.connect(g);
        } else {
            osc.connect(g);
        }
        g.connect(dest);
        osc.start(t);
        osc.stop(t + dur + 0.03);
    }

    private pad(freq: number, t: number, dur: number, gain: number): void {
        if (!this.ctx || !this.musicBus) return;
        for (const detune of [-6, 6]) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            const f = this.ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = detune;
            f.type = 'lowpass';
            f.frequency.setValueAtTime(700, t);
            f.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(gain, t + 0.35);
            g.gain.linearRampToValueAtTime(0.0001, t + dur);
            osc.connect(f);
            f.connect(g);
            g.connect(this.musicBus);
            osc.start(t);
            osc.stop(t + dur + 0.05);
        }
    }

    private pluck(freq: number, t: number, dur: number, gain: number): void {
        if (!this.ctx || !this.musicBus) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        f.type = 'lowpass';
        f.frequency.setValueAtTime(3200, t);
        f.frequency.exponentialRampToValueAtTime(900, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(gain, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(f);
        f.connect(g);
        g.connect(this.musicBus);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    private kick(t: number, gain: number): void {
        if (!this.ctx || !this.musicBus) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(g);
        g.connect(this.musicBus);
        osc.start(t);
        osc.stop(t + 0.22);
    }

    private noise(t: number, dur: number, gain: number, cutoff: number): void {
        if (!this.ctx || !this.noiseBuffer || !this.sfxBus) return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = cutoff;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.sfxBus);
        src.start(t);
        src.stop(t + dur + 0.01);
    }

    sfx(kind: SfxKind): void {
        this.ensure();
        if (!this.ctx || !this.sfxBus) return;
        const now = this.ctx.currentTime;
        const last = this.lastSfx.get(kind) ?? 0;
        const cooldown = kind === 'beam' || kind === 'hit' ? 0.045 : kind === 'death' ? 0.06 : 0.02;
        if (now - last < cooldown) return;
        this.lastSfx.set(kind, now);

        switch (kind) {
            case 'click':
                this.note(520, now, 0.06, 'square', 0.05, this.sfxBus, 2400);
                break;
            case 'build':
                this.note(180, now, 0.12, 'triangle', 0.18, this.sfxBus, 900);
                this.note(360, now + 0.05, 0.18, 'triangle', 0.12, this.sfxBus, 1600);
                break;
            case 'upgrade':
                [440, 660, 880, 1175].forEach((f, i) => this.note(f, now + i * 0.06, 0.18, 'triangle', 0.1, this.sfxBus, 4000));
                break;
            case 'sell':
                this.note(880, now, 0.08, 'square', 0.06, this.sfxBus, 3000);
                this.note(1320, now + 0.07, 0.12, 'square', 0.05, this.sfxBus, 3500);
                break;
            case 'deny':
                this.note(140, now, 0.12, 'sawtooth', 0.09, this.sfxBus, 600);
                this.note(120, now + 0.1, 0.14, 'sawtooth', 0.07, this.sfxBus, 500);
                break;
            case 'beam':
                this.note(1400, now, 0.1, 'sawtooth', 0.055, this.sfxBus, 5000);
                this.note(280, now + 0.01, 0.1, 'triangle', 0.05, this.sfxBus, 1200);
                break;
            case 'pulse':
                this.note(120, now, 0.24, 'sine', 0.22, this.sfxBus, 500);
                this.noise(now, 0.14, 0.06, 900);
                break;
            case 'hit':
                this.note(620, now, 0.045, 'square', 0.025, this.sfxBus, 2600);
                break;
            case 'death':
                this.noise(now, 0.12, 0.07, 700);
                this.note(220, now, 0.1, 'triangle', 0.06, this.sfxBus, 800);
                break;
            case 'leak':
                this.note(300, now, 0.18, 'square', 0.11, this.sfxBus, 1200);
                this.note(240, now + 0.18, 0.22, 'square', 0.09, this.sfxBus, 1000);
                break;
            case 'wave':
                this.note(196, now, 0.4, 'sawtooth', 0.07, this.sfxBus, 900);
                this.note(247, now + 0.08, 0.4, 'sawtooth', 0.06, this.sfxBus, 1000);
                this.note(294, now + 0.16, 0.55, 'sawtooth', 0.06, this.sfxBus, 1200);
                break;
            case 'clear':
                [523, 659, 784, 1047].forEach((f, i) => this.note(f, now + i * 0.08, 0.35, 'triangle', 0.09, this.sfxBus, 4000));
                break;
            case 'win':
                [523, 659, 784, 1047, 1319].forEach((f, i) => this.note(f, now + i * 0.13, 0.7, 'triangle', 0.11, this.sfxBus, 5000));
                this.note(262, now, 1.2, 'sine', 0.12, this.sfxBus, 1200);
                break;
            case 'lose':
                [392, 349, 311, 262].forEach((f, i) => this.note(f, now + i * 0.18, 0.5, 'sawtooth', 0.08, this.sfxBus, 900));
                break;
            case 'boss':
                this.note(70, now, 0.9, 'sawtooth', 0.16, this.sfxBus, 240);
                this.note(52, now + 0.15, 1.1, 'sine', 0.18, this.sfxBus, 180);
                this.noise(now, 0.6, 0.05, 220);
                break;
        }
    }
}

export const audio = new AudioEngine();
