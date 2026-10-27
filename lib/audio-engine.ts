import type { SongMoodProfile } from "./game-rules";
import { getOriginalGroove, type OriginalGroove } from "./cleared-catalog.ts";

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

export type HapticPattern = "selection" | "light" | "medium" | "heavy" | "success" | "error";

export class WaveletAudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freqData: Uint8Array<ArrayBuffer> | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private isMuted = false;
  private volume = 0.7;
  private soundEffectsEnabled = true;
  private hapticsEnabled = true;
  private masterGain: GainNode | null = null;
  private uiBuffers = new Map<string, AudioBuffer>();
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
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
        this.masterGain.connect(this.ctx.destination);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.78;
        this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
        // Sound Lab exports are decoded after a user gesture, using the same mixer.
        if (typeof this.ctx.decodeAudioData === "function") {
          const context = this.ctx;
          for (const name of ["felt", "nib", "clasp", "unclasp", "bloom", "shrug"]) {
            void fetch(`/sounds/${name}.wav`)
              .then((response) => {
                if (!response.ok) throw new Error("Sound unavailable");
                return response.arrayBuffer();
              })
              .then((data) => context.decodeAudioData(data))
              .then((buffer) => this.uiBuffers.set(name, buffer))
              .catch(() => {});
          }
        }
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public triggerHaptic(pattern: HapticPattern = "light") {
    if (!this.hapticsEnabled) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    try {
      switch (pattern) {
        case "selection":
          navigator.vibrate(5);
          break;
        case "light":
          navigator.vibrate(10);
          break;
        case "medium":
          navigator.vibrate(18);
          break;
        case "heavy":
          navigator.vibrate([24, 30, 16]);
          break;
        case "success":
          navigator.vibrate([12, 35, 22, 35, 30]);
          break;
        case "error":
          navigator.vibrate([35, 45, 50]);
          break;
      }
    } catch {
      // Ignore on unsupported browsers
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain)
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.015);
    if (this.audioEl) {
      this.audioEl.muted = muted;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(volume: number) {
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.7;
    if (this.ctx && this.masterGain)
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
        0.015,
      );
    if (this.audioEl) this.audioEl.volume = this.volume * 0.85;
  }

  public setSoundEffectsEnabled(enabled: boolean) {
    this.soundEffectsEnabled = enabled;
  }
  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  private playStudioSound(name: string, pitch = 1): boolean {
    const buffer = this.uiBuffers.get(name);
    if (!buffer || !this.ctx || !this.masterGain) return false;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.6, Math.min(1.6, pitch));
    source.connect(this.masterGain);
    source.onended = () => source.disconnect();
    source.start();
    return true;
  }

  public playDiscovery(companion = false) {
    this.triggerHaptic("success");
    if (this.isMuted || !this.soundEffectsEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const notes = companion ? [659.25, 783.99, 987.77] : [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();
      const start = ctx.currentTime + index * 0.085;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(0.11, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.36);
      oscillator.connect(envelope);
      envelope.connect(this.masterGain!);
      oscillator.start(start);
      oscillator.stop(start + 0.38);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
    });
  }

  /**
   * Tactile micro-interaction sound + synchronized haptic pulse.
   * Crafted like a warm acoustic woodblock / mechanical switch click.
   */
  public playUiTick(pitchMultiplier = 1, haptic: HapticPattern = "selection") {
    this.triggerHaptic(haptic);
    if (this.isMuted || !this.soundEffectsEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.playStudioSound(haptic === "selection" ? "nib" : "felt", pitchMultiplier)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(640 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(210 * pitchMultiplier, now + 0.036);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800, now);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.042);
  }

  /**
   * Two-note warm harmonic pop for tab switches and drawer openings.
   */
  public playTabSwitch(opening = true) {
    this.triggerHaptic("light");
    if (this.isMuted || !this.soundEffectsEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.playStudioSound(opening ? "unclasp" : "clasp")) return;

    const now = ctx.currentTime;
    const freqs = opening ? [440, 587.33] : [587.33, 440];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.075);
    });
  }

  public playNeedleDrop() {
    this.triggerHaptic("medium");
    if (this.isMuted || !this.soundEffectsEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(44, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playCorrectFanfare(streak = 1) {
    this.triggerHaptic("success");
    if (this.isMuted || !this.soundEffectsEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.playStudioSound("bloom", 1 + Math.min(streak - 1, 4) * 0.04)) return;

    const now = ctx.currentTime;
    const rootShift = Math.min(streak, 5) * 18;
    const freqs = [523.25 + rootShift, 659.25 + rootShift, 783.99 + rootShift, 1046.5 + rootShift];

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const start = now + idx * 0.052;
      osc.frequency.setValueAtTime(f, start);

      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  }

  public playWrongScratch() {
    this.triggerHaptic("error");
    if (this.isMuted || !this.soundEffectsEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.playStudioSound("shrug")) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.linearRampToValueAtTime(135, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.33);
  }

  public playSnippet(params: {
    previewUrl: string;
    durationSec: number;
    mood: SongMoodProfile;
    onEnded?: () => void;
  }) {
    this.stopSnippet();
    // Never load arbitrary user/API previews. Original compositions are
    // verified against the committed allowlist before touching audio playback.
    const groove = getOriginalGroove(params.previewUrl);
    if (!groove) {
      params.onEnded?.();
      return;
    }
    const ctx = this.ensureContext();

    this.snippetTargetDuration = params.durationSec;
    this.snippetStartTime = performance.now();
    this.isPlayingSnippet = true;
    this.currentBpm = params.mood.bpm || 120;
    this.onSnippetEndCallback = params.onEnded || null;

    this.playNeedleDrop();

    this.startOriginalGroove(ctx, groove);

    this.snippetStopTimer = setTimeout(() => {
      this.stopSnippet(true);
    }, params.durationSec * 1000);
  }

  private startOriginalGroove(ctx: AudioContext | null, groove: OriginalGroove) {
    this.usingFallbackSynth = true;
    if (!ctx || !this.masterGain) return;

    const beatMs = 30000 / groove.bpm;
    let step = 0;
    const note = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
    const strike = (frequency: number, wave: OscillatorType, level: number, length: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = wave;
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(Math.max(0.001, level), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + length);
      osc.connect(gain);
      if (this.analyser) gain.connect(this.analyser);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + length + 0.01);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    };
    const advance = () => {
      if (!this.isPlayingSnippet || this.isMuted) {
        step++;
        return;
      }
      const index = step % groove.melody.length;
      // Each original loop has its own notes, timbre and tempo. No samples.
      strike(note(groove.melody[index]), groove.wave, 0.085, 0.22);
      if (step % 2 === 0) strike(60, "sine", 0.15, 0.13);
      if (step % 4 === 2) strike(185, "triangle", 0.045, 0.055);
      step++;
    };
    advance();
    this.synthBeatTimer = setInterval(advance, beatMs);
  }

  private startProceduralGroove(ctx: AudioContext | null, mood: SongMoodProfile) {
    this.usingFallbackSynth = true;
    if (!ctx) return;

    const beatIntervalMs = Math.max(240, Math.round((60 / (mood.bpm || 120)) * 500));
    let step = 0;
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440];

    const triggerStep = () => {
      if (!this.isPlayingSnippet || this.isMuted || !this.ctx) return;
      const now = this.ctx.currentTime;

      if (step % 2 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = "sine";
        kickOsc.frequency.setValueAtTime(135, now);
        kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
        kickGain.gain.setValueAtTime(0.2, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        kickOsc.connect(kickGain);
        if (this.analyser) kickGain.connect(this.analyser);
        kickGain.connect(this.masterGain!);
        kickOsc.start(now);
        kickOsc.stop(now + 0.17);
      }

      const note = scale[(step * 2 + Math.floor(mood.energy * 5)) % scale.length];
      const synthOsc = this.ctx.createOscillator();
      const synthGain = this.ctx.createGain();
      synthOsc.type = step % 4 === 0 ? "sawtooth" : "triangle";
      synthOsc.frequency.setValueAtTime(note, now);
      synthGain.gain.setValueAtTime(0.075, now);
      synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      synthOsc.connect(synthGain);
      if (this.analyser) synthGain.connect(this.analyser);
      synthGain.connect(this.masterGain!);
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
        this.audioEl.src = "";
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

      const analyzerVal = this.freqData && this.freqData[i] ? this.freqData[i] / 255 : 0;
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

export const audioEngine = new WaveletAudioEngine();
