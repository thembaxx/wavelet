import { type SongMoodProfile } from './game-rules';

export interface AudioSpectrumFrame {
  bass: number;
  mid: number;
  treble: number;
  energy: number;
  bins: Float32Array;
  isPlaying: boolean;
  elapsedSec: number;
  durationSec: number;
}

class VinylAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private isMuted = false;
  private isPlayingSnippet = false;
  private snippetStartTime = 0;
  private snippetTargetDuration = 5;
  private snippetStopTimer: ReturnType<typeof setTimeout> | null = null;
  private synthBeatTimer: ReturnType<typeof setInterval> | null = null;
  private currentBpm = 120;
  private usingFallbackSynth = false;
  private onSnippetEndCallback: (() => void) | null = null;
  private bins = new Float32Array(16);

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.78;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audioEl) {
      this.audioEl.muted = muted;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playUiTick(pitchMultiplier = 1) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(180 * pitchMultiplier, now + 0.045);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playNeedleDrop() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Soft thud + vinyl pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playCorrectFanfare(streak = 1) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const rootShift = Math.min(streak, 5) * 18;
    const freqs = [523.25 + rootShift, 659.25 + rootShift, 783.99 + rootShift, 1046.5 + rootShift];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.055;
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playWrongScratch() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.32);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playSnippet(params: {
    previewUrl: string;
    durationSec: number;
    mood: SongMoodProfile;
    onEnded?: () => void;
  }) {
    this.stopSnippet();
    const ctx = this.ensureContext();

    this.snippetTargetDuration = params.durationSec;
    this.snippetStartTime = performance.now();
    this.isPlayingSnippet = true;
    this.currentBpm = params.mood.bpm || 120;
    this.onSnippetEndCallback = params.onEnded || null;

    this.playNeedleDrop();

    if (params.previewUrl && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = params.previewUrl;
        audio.muted = this.isMuted;
        audio.volume = 0.85;
        this.audioEl = audio;
        this.usingFallbackSynth = false;

        audio.play().catch(() => {
          // If external preview is blocked or offline, trigger rhythmic synth groove
          this.startProceduralGroove(ctx, params.mood);
        });
      } catch {
        this.startProceduralGroove(ctx, params.mood);
      }
    } else {
      this.startProceduralGroove(ctx, params.mood);
    }

    this.snippetStopTimer = setTimeout(() => {
      this.stopSnippet(true);
    }, params.durationSec * 1000);
  }

  private startProceduralGroove(ctx: AudioContext | null, mood: SongMoodProfile) {
    this.usingFallbackSynth = true;
    if (!ctx || this.isMuted) return;

    const beatIntervalMs = Math.max(240, Math.round((60 / (mood.bpm || 120)) * 500));
    let step = 0;
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440];

    const triggerStep = () => {
      if (!this.isPlayingSnippet || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Kick on even steps
      if (step % 2 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(135, now);
        kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        kickGain.gain.setValueAtTime(0.22, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        kickOsc.connect(kickGain);
        if (this.analyser) kickGain.connect(this.analyser);
        kickGain.connect(this.ctx.destination);
        kickOsc.start(now);
        kickOsc.stop(now + 0.17);
      }

      // Synth chord stab
      const note = scale[(step * 2 + Math.floor(mood.energy * 5)) % scale.length];
      const synthOsc = this.ctx.createOscillator();
      const synthGain = this.ctx.createGain();
      synthOsc.type = step % 4 === 0 ? 'sawtooth' : 'triangle';
      synthOsc.frequency.setValueAtTime(note, now);
      synthGain.gain.setValueAtTime(0.08, now);
      synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      synthOsc.connect(synthGain);
      if (this.analyser) synthGain.connect(this.analyser);
      synthGain.connect(this.ctx.destination);
      synthOsc.start(now);
      synthOsc.stop(now + 0.19);

      step++;
    };

    triggerStep();
    this.synthBeatTimer = setInterval(triggerStep, beatIntervalMs);
  }

  public stopSnippet(fireCallback = false) {
    if (this.snippetStopTimer) {
      clearTimeout(this.snippetStopTimer);
      this.snippetStopTimer = null;
    }
    if (this.synthBeatTimer) {
      clearInterval(this.synthBeatTimer);
      this.synthBeatTimer = null;
    }
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.src = '';
      } catch {}
      this.audioEl = null;
    }
    const wasPlaying = this.isPlayingSnippet;
    this.isPlayingSnippet = false;
    if (fireCallback && wasPlaying && this.onSnippetEndCallback) {
      const cb = this.onSnippetEndCallback;
      this.onSnippetEndCallback = null;
      cb();
    }
  }

  public sampleSpectrum(timeSec: number): AudioSpectrumFrame {
    const elapsedSec = this.isPlayingSnippet
      ? Math.min(this.snippetTargetDuration, (performance.now() - this.snippetStartTime) / 1000)
      : 0;

    if (!this.isPlayingSnippet) {
      // Gentle idle breathing wave when waiting
      for (let i = 0; i < 16; i++) {
        this.bins[i] = 0.08 + 0.05 * Math.sin(timeSec * 2.2 + i * 0.45);
      }
      return {
        bass: 0.12 + 0.04 * Math.sin(timeSec * 2),
        mid: 0.1,
        treble: 0.08,
        energy: 0.1,
        bins: this.bins,
        isPlaying: false,
        elapsedSec: 0,
        durationSec: this.snippetTargetDuration,
      };
    }

    // Rhythmic pulse synchronized to current BPM
    const beatFreq = (this.currentBpm / 60) * Math.PI * 2;
    const beatPulse = Math.pow(0.5 + 0.5 * Math.sin(timeSec * beatFreq), 2);
    const offbeatPulse = Math.pow(0.5 + 0.5 * Math.cos(timeSec * beatFreq * 2), 2);

    if (this.analyser && this.freqData && this.usingFallbackSynth) {
      this.analyser.getByteFrequencyData(this.freqData);
    }

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < 16; i++) {
      const freqRatio = i / 15;
      const wave =
        i < 4
          ? 0.35 + 0.62 * beatPulse
          : i < 10
          ? 0.25 + 0.55 * offbeatPulse * Math.abs(Math.sin(timeSec * 5 + i))
          : 0.2 + 0.5 * Math.abs(Math.cos(timeSec * 8 + i * 0.7));

      const analyzerVal =
        this.freqData && this.freqData[i] ? this.freqData[i] / 255 : 0;
      const val = Math.min(1, Math.max(wave, analyzerVal));
      this.bins[i] = val;

      if (freqRatio < 0.25) bassSum += val;
      else if (freqRatio < 0.7) midSum += val;
      else trebleSum += val;
    }

    const bass = bassSum / 4;
    const mid = midSum / 7;
    const treble = trebleSum / 5;
    const energy = bass * 0.5 + mid * 0.35 + treble * 0.15;

    return {
      bass,
      mid,
      treble,
      energy,
      bins: this.bins,
      isPlaying: true,
      elapsedSec,
      durationSec: this.snippetTargetDuration,
    };
  }
}

export const audioEngine = new VinylAudioEngine();
