/**
 * Relay Defense — original procedural Web Audio score and effects.
 * No samples, no remote assets. Everything is synthesised on the AMD machine.
 */

type OscType = OscillatorType;

const CHORDS: number[][] = [
    [146.83, 174.61, 220.0, 293.66], // Dm
    [116.54, 146.83, 174.61, 233.08], // Bb
    [87.31, 130.81, 174.61, 220.0],  // F
    [130.81, 164.81, 196.0, 261.63], // C
];
const ROOTS = [73.42, 58.27, 65.41, 65.41];
const MELODY = [587.33, 698.46, 783.99, 880.0, 698.46, 587.33, 523.25, 440.0];

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private sfxBus: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    private timer: number | null = null;
    private nextTime = 0;
    private step = 0;
    private running = false;
    private muted = false;

    get isMuted(): boolean {
        return this.muted;
    }

    init(): void {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') void this.ctx.resume();
            return;
        }
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        this.ctx = ctx;
        const master = ctx.createGain();
        master.gain.value = this.muted ? 0 : 0.55;
        master.connect(ctx.destination);
        this.master = master;

        const music = ctx.createGain();
        music.gain.value = 0.22;
        music.connect(master);
        this.musicBus = music;

        const sfx = ctx.createGain();
        sfx.gain.value = 0.42;
        sfx.connect(master);
        this.sfxBus = sfx;

        // A short stereo-ish noise bed for shakers and impacts.
        const len = Math.floor(ctx.sampleRate * 1.2);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            last = last * 0.86 + white * 0.14;
            data[i] = last * 1.8;
        }
        this.noiseBuffer = buf;
    }

    startMusic(): void {
        this.init();
        if (!this.ctx || this.running) return;
        this.running = true;
        this.nextTime = this.ctx.currentTime + 0.12;
        this.step = 0;
        this.timer = window.setInterval(() => this.schedule(), 120);
        this.schedule();
    }

    stopMusic(): void {
        this.running = false;
        if (this.timer !== null) {
            window.clearInterval(this.timer);
            this.timer = null;
        }
    }

    setMuted(muted: boolean): void {
        this.muted = muted;
        if (this.master && this.ctx) {
            this.master.gain.cancelScheduledValues(this.ctx.currentTime);
            this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, this.ctx.currentTime + 0.08);
        }
    }

    play(name: string): void {
        this.init();
        switch (name) {
            case 'build': this.build(); break;
            case 'upgrade': this.upgrade(); break;
            case 'beam': this.beam(); break;
            case 'arc': this.arc(); break;
            case 'kill': this.kill(); break;
            case 'relayHit': this.relayHit(); break;
            case 'wave': this.wave(); break;
            case 'win': this.win(); break;
            case 'lose': this.lose(); break;
            case 'sell': this.sell(); break;
            case 'deny': this.deny(); break;
        }
    }

    sell(): void {
        this.tone(520, 0, 0.1, 0.05, 'triangle', 780);
        this.tone(780, 0.07, 0.12, 0.04, 'sine', 1040);
    }

    deny(): void {
        this.tone(140, 0, 0.14, 0.05, 'square', 110, this.sfxBus, 700);
    }

    setPaused(paused: boolean): void {
        if (!this.ctx || !this.musicBus) return;
        const now = this.ctx.currentTime;
        this.musicBus.gain.cancelScheduledValues(now);
        this.musicBus.gain.linearRampToValueAtTime(paused ? 0.055 : 0.22, now + 0.18);
    }

    private schedule(): void {
        const ctx = this.ctx;
        if (!ctx || !this.running || !this.musicBus) return;
        const eighth = 60 / 88 / 2; // 88 bpm, eighth notes
        while (this.nextTime < ctx.currentTime + 0.35) {
            const t = this.nextTime;
            const s = this.step;
            const bar = Math.floor(s / 8) % 4;
            const beat = s % 8;
            const chord = CHORDS[bar];
            const root = ROOTS[bar];

            // Warm pad at the top of each bar.
            if (beat === 0) {
                for (let i = 0; i < chord.length; i++) {
                    this.pad(chord[i], t, eighth * 8.2, 0.038, i === 0 ? 'sine' : 'triangle');
                }
            }

            // Bass pulse.
            if (beat === 0 || beat === 4) {
                this.tone(root, t, eighth * 1.7, 0.11, 'sine', root * 0.98, this.musicBus);
            }
            if (beat === 6) {
                this.tone(root * 2, t, eighth * 0.6, 0.045, 'triangle', root, this.musicBus);
            }

            // Sparse plucked melody with an echo.
            if (beat === 0 || beat === 2 || beat === 3 || beat === 5 || beat === 6) {
                const note = MELODY[(s + bar * 2) % MELODY.length];
                this.pluck(note, t, 0.055);
                if (beat === 2) this.pluck(note * 0.5, t + eighth * 0.5, 0.028);
            }

            // Dusty shaker on the off-beats.
            if (beat % 2 === 1) {
                this.noise(t, 0.035, 0.022, 3800);
            }
            // Soft frame drum.
            if (beat === 0 || beat === 4) {
                this.kick(t, 0.05);
            }

            this.step++;
            this.nextTime += eighth;
        }
    }

    private tone(
        freq: number, when: number, dur: number, gain: number,
        type: OscType = 'sine', endFreq = freq, bus: GainNode | null = this.sfxBus,
        filterFreq = 0
    ): void {
        const ctx = this.ctx;
        if (!ctx || !bus) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(20, freq), when);
        if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), when + dur);
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + Math.min(0.025, dur * 0.25));
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        if (filterFreq > 0) {
            const f = ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = filterFreq;
            osc.connect(f);
            f.connect(g);
        } else {
            osc.connect(g);
        }
        g.connect(bus);
        osc.start(when);
        osc.stop(when + dur + 0.03);
    }

    private pad(freq: number, when: number, dur: number, gain: number, type: OscType): void {
        this.tone(freq, when, dur, gain, type, freq, this.musicBus, 900);
        this.tone(freq * 1.004, when, dur, gain * 0.55, type, freq * 1.004, this.musicBus, 750);
    }

    private pluck(freq: number, when: number, gain: number): void {
        this.tone(freq, when, 0.34, gain, 'triangle', freq, this.musicBus, 2400);
        this.tone(freq * 2.01, when, 0.18, gain * 0.24, 'sine', freq * 2.01, this.musicBus);
    }

    private noise(when: number, dur: number, gain: number, filterFreq: number): void {
        const ctx = this.ctx;
        if (!ctx || !this.noiseBuffer || !this.musicBus) return;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = filterFreq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(gain, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.musicBus);
        src.start(when);
        src.stop(when + dur + 0.02);
    }

    private kick(when: number, gain: number): void {
        this.tone(105, when, 0.24, gain, 'sine', 42, this.musicBus);
    }

    // ---- SFX -------------------------------------------------------------

    build(): void {
        this.tone(392, 0, 0.12, 0.10, 'triangle', 392);
        this.tone(587, 0.09, 0.18, 0.10, 'triangle', 587);
    }

    upgrade(): void {
        this.tone(523.25, 0, 0.12, 0.09, 'triangle');
        this.tone(659.25, 0.08, 0.12, 0.09, 'triangle');
        this.tone(783.99, 0.16, 0.24, 0.10, 'triangle');
    }

    beam(): void {
        this.tone(1500, 0, 0.09, 0.055, 'sawtooth', 260, this.sfxBus, 4200);
        this.tone(900, 0, 0.05, 0.035, 'square', 300, this.sfxBus);
    }

    arc(): void {
        this.tone(760, 0, 0.16, 0.06, 'square', 140, this.sfxBus, 3000);
        this.noiseSfx(0.13, 0.045, 2400);
    }

    kill(): void {
        this.tone(180, 0, 0.18, 0.06, 'sine', 58);
        this.noiseSfx(0.16, 0.035, 1200);
    }

    relayHit(): void {
        this.tone(96, 0, 0.5, 0.18, 'sine', 34);
        this.tone(150, 0.02, 0.3, 0.08, 'sawtooth', 50, this.sfxBus, 600);
        this.noiseSfx(0.35, 0.09, 500);
    }

    wave(): void {
        this.tone(196, 0, 0.28, 0.08, 'triangle', 196);
        this.tone(293.66, 0.16, 0.42, 0.08, 'triangle', 293.66);
        this.tone(392, 0.32, 0.5, 0.07, 'triangle', 392);
    }

    win(): void {
        const notes = [293.66, 349.23, 440, 587.33, 698.46];
        notes.forEach((n, i) => {
            this.tone(n, i * 0.13, 0.55, 0.10, 'triangle');
            this.tone(n * 2, i * 0.13, 0.4, 0.04, 'sine');
        });
    }

    lose(): void {
        const notes = [293.66, 246.94, 196, 146.83];
        notes.forEach((n, i) => {
            this.tone(n, i * 0.22, 0.7, 0.10, 'sawtooth', n * 0.97, this.sfxBus, 900);
        });
    }

    private noiseSfx(dur: number, gain: number, filterFreq: number): void {
        const ctx = this.ctx;
        if (!ctx || !this.noiseBuffer || !this.sfxBus) return;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = filterFreq;
        const g = ctx.createGain();
        const now = ctx.currentTime;
        g.gain.setValueAtTime(gain, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.sfxBus);
        src.start(now);
        src.stop(now + dur + 0.02);
    }
}
