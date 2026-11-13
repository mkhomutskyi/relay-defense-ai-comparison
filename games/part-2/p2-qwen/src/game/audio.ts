// Relay Defense — original procedural Web Audio. No external audio files.
// Simple master clock: ambient bass pad + arpeggio lead for music, and
// synthesized SFX for build / shoot / hit / explode / wave / win / lose.

type Ctx = AudioContext;

export class AudioEngine {
    private ctx: Ctx | null = null;
    private master: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private started = false;
    private muted = false;
    private musicTimer: number | null = null;
    private step = 0;

    private ensure() {
        if (this.ctx) return;
        const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.32;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.master);
    }

    resume() {
        this.ensure();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    setMuted(m: boolean) {
        this.muted = m;
        if (this.master && this.ctx) {
            this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
        }
    }
    isMuted() { return this.muted; }

    // ---- music ------------------------------------------------------------
    startMusic() {
        this.ensure();
        this.resume();
        if (this.started || !this.ctx) return;
        this.started = true;
        const bpm = 104;
        const secPerStep = 60 / bpm / 2; // eighth notes
        const tick = () => {
            if (this.muted) return;
            this.playMusicStep(this.step);
            this.step = (this.step + 1) % 32;
        };
        tick();
        this.musicTimer = window.setInterval(tick, secPerStep * 1000);
    }

    stopMusic() {
        if (this.musicTimer !== null) { clearInterval(this.musicTimer); this.musicTimer = null; }
        this.started = false;
    }

    // Desert-ish minor pentatonic loop over a warm bass drone.
    private playMusicStep(s: number) {
        if (!this.ctx || !this.musicGain) return;
        const bassSeq = [0, 0, 7, 0, 5, 0, 3, 0];      // semitone offsets (A minor pent feel)
        const leadSeq = [12, 15, 19, 22, 19, 15, 12, 10, 12, 17, 19, 17, 15, 12, 10, 7,
                         5, 7, 10, 12, 15, 12, 10, 7, 5, 3, 5, 7, 10, 7, 5, 3];
        const root = 55; // A1
        const t = this.ctx.currentTime;
        // bass every 2 steps
        if (s % 2 === 0) {
            const idx = (s / 2) % bassSeq.length;
            this.tone(root * Math.pow(2, bassSeq[idx] / 12), t, 0.5, 'triangle', 0.5, this.musicGain);
        }
        // lead
        const semis = leadSeq[s % leadSeq.length];
        this.tone(root * 4 * Math.pow(2, semis / 12), t, 0.22, 'square', 0.12, this.musicGain);
        // soft hi-hat noise on off-beats
        if (s % 2 === 1) this.noise(t, 0.03, 0.05, 6000, this.musicGain);
    }

    // ---- tone helper ------------------------------------------------------
    private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, dest: AudioNode) {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(dest);
        o.start(t); o.stop(t + dur + 0.02);
    }

    private noise(t: number, dur: number, vol: number, hp: number, dest: AudioNode) {
        if (!this.ctx) return;
        const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'highpass'; filt.frequency.value = hp;
        const g = this.ctx.createGain(); g.gain.value = vol;
        src.connect(filt); filt.connect(g); g.connect(dest);
        src.start(t);
    }

    // ---- SFX --------------------------------------------------------------
    private sfx(fn: (t: number, dest: AudioNode) => void) {
        this.ensure();
        this.resume();
        if (!this.ctx || !this.sfxGain || this.muted) return;
        fn(this.ctx.currentTime, this.sfxGain);
    }

    shootPulse() { this.sfx((t, d) => { const o = this.ctx!.createOscillator(); const g = this.ctx!.createGain(); o.type='sawtooth'; o.frequency.setValueAtTime(880,t); o.frequency.exponentialRampToValueAtTime(320,t+0.09); g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.1); o.connect(g); g.connect(d); o.start(t); o.stop(t+0.12); }); }
    shootArc()   { this.sfx((t, d) => { this.noise(t, 0.16, 0.22, 1200, d); this.tone(1400, t, 0.12, 'square', 0.1, d); }); }
    hit()        { this.sfx((t, d) => { this.noise(t, 0.05, 0.12, 2500, d); }); }
    explode()    { this.sfx((t, d) => { this.noise(t, 0.3, 0.35, 400, d); this.tone(160, t, 0.3, 'sawtooth', 0.25, d); }); }
    build()      { this.sfx((t, d) => { this.tone(523, t, 0.1, 'triangle', 0.3, d); this.tone(784, t+0.09, 0.14, 'triangle', 0.3, d); }); }
    upgrade()    { this.sfx((t, d) => { this.tone(659, t, 0.09, 'square', 0.25, d); this.tone(880, t+0.08, 0.09, 'square', 0.25, d); this.tone(1175, t+0.16, 0.14, 'square', 0.25, d); }); }
    denied()     { this.sfx((t, d) => { this.tone(200, t, 0.14, 'sawtooth', 0.2, d); }); }
    waveStart()  { this.sfx((t, d) => { this.tone(440, t, 0.2, 'triangle', 0.3, d); this.tone(660, t+0.16, 0.24, 'triangle', 0.3, d); }); }
    boss()       { this.sfx((t, d) => { this.tone(80, t, 0.7, 'sawtooth', 0.5, d); this.tone(110, t, 0.7, 'square', 0.3, d); }); }
    win()        { this.sfx((t, d) => { [523,659,784,1047,784,1047,1319].forEach((f,i)=>this.tone(f,t+i*0.13,0.2,'triangle',0.35,d)); }); }
    lose()       { this.sfx((t, d) => { [440,349,262,196].forEach((f,i)=>this.tone(f,t+i*0.18,0.3,'sawtooth',0.3,d)); }); }
    click()      { this.sfx((t, d) => { this.tone(600, t, 0.04, 'square', 0.12, d); }); }
}

export const audio = new AudioEngine();
