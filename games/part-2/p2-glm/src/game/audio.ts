// Procedural Web Audio music + SFX for Relay Defense. No external assets.

type SfxName =
    | 'shoot'
    | 'zap'
    | 'hit'
    | 'boom'
    | 'build'
    | 'upgrade'
    | 'error'
    | 'wave'
    | 'leak'
    | 'win'
    | 'lose'
    | 'ui';

export class AudioManager
{
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private noiseBuf: AudioBuffer | null = null;
    private schedulerId: number | null = null;
    private nextNoteTime = 0;
    private step = 0;
    muted = false;

    ensure(): void
    {
        if (this.ctx)
        {
            if (this.ctx.state === 'suspended') { void this.ctx.resume(); }
            return;
        }
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.16;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.master);

        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) { d[i] = Math.random() * 2 - 1; }
    }

    setMuted(m: boolean): void
    {
        this.muted = m;
        if (this.master && this.ctx)
        {
            this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
        }
    }

    // ==== Music: desert-synth loop, scheduled with lookahead ====
    startMusic(): void
    {
        this.ensure();
        if (!this.ctx || this.schedulerId !== null) { return; }
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.step = 0;
        this.schedulerId = window.setInterval(() => this.schedule(), 90);
    }

    stopMusic(): void
    {
        if (this.schedulerId !== null)
        {
            window.clearInterval(this.schedulerId);
            this.schedulerId = null;
        }
    }

    private schedule(): void
    {
        if (!this.ctx) { return; }
        const spb = 60 / 112 / 2; // eighth notes at 112 bpm
        while (this.nextNoteTime < this.ctx.currentTime + 0.3)
        {
            this.playStep(this.step, this.nextNoteTime);
            this.nextNoteTime += spb;
            this.step = (this.step + 1) % 32;
        }
    }

    private playStep(step: number, t: number): void
    {
        if (!this.ctx || !this.musicGain) { return; }
        // Bass (root pulses)
        if (step % 8 === 0)
        {
            const roots = [55, 55, 65.4, 49]; // A, A, C, G
            this.tone(roots[(step / 8) | 0], t, 0.42, 'triangle', 0.5, this.musicGain);
        }
        // Arpeggio (A minor pentatonic)
        const scale = [220, 261.6, 293.7, 329.6, 392, 440];
        const pat = [0, 3, 2, 4, 1, 4, 3, 5, 0, 4, 2, 5, 1, 3, 4, 2];
        if (step % 2 === 0)
        {
            const f = scale[pat[(step / 2) % 16]] * (step >= 16 ? 2 : 1);
            this.tone(f, t, 0.18, 'square', 0.08, this.musicGain, 1200);
        }
        // Hat
        if (step % 4 === 2) { this.noise(t, 0.03, 0.05, 6000, this.musicGain); }
    }

    private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode, filterHz?: number): void
    {
        if (!this.ctx) { return; }
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        let node: AudioNode = g;
        if (filterHz)
        {
            const f = this.ctx.createBiquadFilter();
            f.type = 'lowpass';
            f.frequency.value = filterHz;
            g.connect(f);
            node = f;
        }
        o.connect(g);
        node.connect(dest);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    private noise(t: number, dur: number, vol: number, hpHz: number, dest: AudioNode, sweepTo?: number): void
    {
        if (!this.ctx || !this.noiseBuf) { return; }
        const s = this.ctx.createBufferSource();
        s.buffer = this.noiseBuf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        const f = this.ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.setValueAtTime(hpHz, t);
        if (sweepTo) { f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur); }
        s.connect(f);
        f.connect(g);
        g.connect(dest);
        s.start(t);
        s.stop(t + dur + 0.02);
    }

    // ==== SFX ====
    sfx(name: SfxName): void
    {
        this.ensure();
        if (!this.ctx || !this.sfxGain) { return; }
        const t = this.ctx.currentTime;
        const d = this.sfxGain;
        switch (name)
        {
            case 'shoot':
                this.tone(760, t, 0.07, 'square', 0.12, d, 2400);
                break;
            case 'zap':
                this.noise(t, 0.12, 0.2, 2000, d, 8000);
                this.tone(220, t, 0.1, 'sawtooth', 0.1, d, 1200);
                break;
            case 'hit':
                this.noise(t, 0.05, 0.1, 1500, d);
                break;
            case 'boom':
                this.noise(t, 0.35, 0.4, 120, d, 60);
                this.tone(90, t, 0.3, 'triangle', 0.3, d);
                break;
            case 'build':
                this.tone(330, t, 0.09, 'square', 0.15, d);
                this.tone(495, t + 0.09, 0.12, 'square', 0.15, d);
                break;
            case 'upgrade':
                this.tone(440, t, 0.08, 'square', 0.14, d);
                this.tone(660, t + 0.07, 0.08, 'square', 0.14, d);
                this.tone(880, t + 0.14, 0.14, 'square', 0.14, d);
                break;
            case 'error':
                this.tone(160, t, 0.14, 'sawtooth', 0.14, d, 500);
                break;
            case 'wave':
                this.tone(392, t, 0.14, 'triangle', 0.2, d);
                this.tone(523, t + 0.13, 0.22, 'triangle', 0.2, d);
                break;
            case 'leak':
                this.tone(180, t, 0.3, 'sawtooth', 0.25, d, 400);
                break;
            case 'win':
                [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.12, 0.3, 'triangle', 0.22, d));
                break;
            case 'lose':
                [330, 262, 196, 131].forEach((f, i) => this.tone(f, t + i * 0.16, 0.35, 'sawtooth', 0.16, d, 900));
                break;
            case 'ui':
                this.tone(600, t, 0.05, 'square', 0.08, d, 1800);
                break;
        }
    }
}

export const audio = new AudioManager();
