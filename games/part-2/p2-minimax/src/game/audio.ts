/**
 * Original procedural audio: a looping desert-synth soundtrack and arcade SFX,
 * synthesised live with the Web Audio API. No sample files are used.
 */

type SfxName =
    | 'place' | 'upgrade' | 'sell' | 'deny' | 'beam' | 'arc' | 'hit'
    | 'kill' | 'coreHit' | 'waveStart' | 'win' | 'lose' | 'click';

const SCALE = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private sfxBus: GainNode | null = null;
    private timer: number | null = null;
    private step = 0;
    private nextTime = 0;
    muted = false;

    get ready(): boolean { return this.ctx !== null; }

    /** Must be called from a user gesture. */
    unlock(): void {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') void this.ctx.resume();
            return;
        }
        const Ctor: typeof AudioContext =
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? window.AudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.musicBus.gain.value = 0.32;
        this.musicBus.connect(this.master);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 0.75;
        this.sfxBus.connect(this.master);
        this.nextTime = this.ctx.currentTime + 0.1;
    }

    setMuted(m: boolean): void {
        this.muted = m;
        if (this.master && this.ctx) {
            this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
        }
    }

    /* --------------------------------------------------------------- music */

    startMusic(): void {
        if (!this.ctx || this.timer !== null) return;
        this.step = 0;
        this.nextTime = this.ctx.currentTime + 0.08;
        this.timer = window.setInterval(() => this.schedule(), 60);
    }

    stopMusic(): void {
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }

    private schedule(): void {
        if (!this.ctx || !this.musicBus) return;
        const beat = 0.2083; // ~144 BPM eighth notes
        while (this.nextTime < this.ctx.currentTime + 0.35) {
            this.playStep(this.step, this.nextTime, beat);
            this.step = (this.step + 1) % 64;
            this.nextTime += beat;
        }
    }

    private playStep(step: number, when: number, dur: number): void {
        if (!this.ctx || !this.musicBus) return;
        const bar = Math.floor(step / 16);
        const s = step % 16;

        // Bass line: root on the downbeat with a walking fifth.
        if (s % 4 === 0) {
            const root = [110, 98, 130.81, 116.54][bar % 4];
            this.tone(root, 'triangle', dur * 3.1, 0.5, when, this.musicBus, 0, 0.9);
        }
        // Counter melody.
        const melody = [0, 4, 2, 5, 3, 6, 4, 7, 0, 5, 2, 4, 3, 6, 2, 1];
        if (s % 2 === 0 || (s % 8 === 3)) {
            const n = SCALE[melody[(step + bar * 3) % melody.length] % SCALE.length];
            const vol = s % 4 === 0 ? 0.18 : 0.11;
            this.tone(n, 'square', dur * 1.6, vol, when, this.musicBus, 0, 0.4);
        }
        // Hat on offbeats.
        if (s % 4 === 2) this.noise(0.05, 0.06, when, this.musicBus, 2600);
        // Snare-ish accent each bar.
        if (s === 8) this.noise(0.12, 0.1, when, this.musicBus, 1400);
    }

    /* ----------------------------------------------------------------- sfx */

    private tone(
        freq: number, type: OscillatorType, dur: number, vol: number,
        when: number, dest: AudioNode, slideTo = 0, detune = 0
    ): void {
        if (!this.ctx) return;
        const t = Math.max(when, this.ctx.currentTime);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
        osc.detune.setValueAtTime(detune, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    private noise(dur: number, vol: number, when: number, dest: AudioNode, cutoff = 1200): void {
        if (!this.ctx) return;
        const t = Math.max(when, this.ctx.currentTime);
        const frames = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, t);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filter).connect(gain).connect(dest);
        src.start(t);
    }

    sfx(name: SfxName): void {
        if (!this.ctx || !this.sfxBus) return;
        const t = this.ctx.currentTime;
        const bus = this.sfxBus;
        switch (name) {
            case 'place':
                this.tone(392, 'square', 0.1, 0.2, t, bus);
                this.tone(587, 'square', 0.16, 0.18, t + 0.07, bus);
                break;
            case 'upgrade':
                this.tone(523, 'square', 0.09, 0.18, t, bus);
                this.tone(659, 'square', 0.09, 0.18, t + 0.07, bus);
                this.tone(880, 'square', 0.2, 0.18, t + 0.14, bus);
                break;
            case 'sell':
                this.tone(520, 'square', 0.1, 0.16, t, bus, 260);
                break;
            case 'deny':
                this.tone(180, 'sawtooth', 0.14, 0.16, t, bus, 110);
                break;
            case 'click':
                this.tone(880, 'square', 0.04, 0.1, t, bus);
                break;
            case 'beam':
                this.tone(1180, 'sawtooth', 0.13, 0.12, t, bus, 460);
                this.noise(0.06, 0.05, t, bus, 4200);
                break;
            case 'arc':
                this.tone(660, 'square', 0.1, 0.1, t, bus, 220);
                this.noise(0.09, 0.07, t, bus, 5200);
                break;
            case 'hit':
                this.noise(0.05, 0.09, t, bus, 2400);
                break;
            case 'kill':
                this.noise(0.2, 0.13, t, bus, 900);
                this.tone(300, 'sawtooth', 0.18, 0.09, t, bus, 90);
                break;
            case 'coreHit':
                this.tone(140, 'sine', 0.4, 0.3, t, bus, 60);
                this.noise(0.25, 0.14, t, bus, 500);
                break;
            case 'waveStart':
                this.tone(330, 'sawtooth', 0.22, 0.16, t, bus);
                this.tone(440, 'sawtooth', 0.3, 0.16, t + 0.18, bus);
                break;
            case 'win':
                [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 'square', 0.26, 0.18, t + i * 0.14, bus));
                break;
            case 'lose':
                [440, 349, 261, 175].forEach((f, i) => this.tone(f, 'sawtooth', 0.34, 0.18, t + i * 0.18, bus));
                break;
        }
    }
}

export const audio = new AudioEngine();
