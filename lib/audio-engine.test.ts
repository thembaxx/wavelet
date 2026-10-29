import test from "node:test";
import assert from "node:assert/strict";
import { WaveletAudioEngine } from "./audio-engine.ts";
import type { SongMoodProfile } from "./game-rules.ts";

test("original loops play, invalid remote URLs fail, and audio preferences remain separate", async (t) => {
  let contexts = 0;
  let notes = 0;
  let vibrations = 0;
  let remoteAudioConstructed = 0;
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    setTargetAtTime() {},
    exponentialRampToValueAtTime() {},
    linearRampToValueAtTime() {},
  });
  const node = () => ({
    connect() {},
    disconnect() {},
    start() {},
    stop() {},
    gain: param(),
    frequency: param(),
    onended: null as null | (() => void),
  });
  class Context {
    currentTime = 0;
    state = "running";
    destination = {};
    constructor() {
      contexts++;
    }
    createGain = node;
    createBiquadFilter = node;
    createAnalyser = () => ({ frequencyBinCount: 32 });
    createOscillator() {
      notes++;
      return node();
    }
  }
  const replace = (key: string, value: unknown) => {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() =>
      old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key),
    );
  };
  replace("window", { AudioContext: Context });
  replace(
    "Audio",
    class {
      constructor() {
        remoteAudioConstructed++;
      }
    },
  );
  replace("navigator", {
    vibrate() {
      vibrations++;
    },
  });

  const engine = new WaveletAudioEngine();
  t.after(() => engine.stopSnippet());
  engine.setSoundEffectsEnabled(false);
  engine.setHapticsEnabled(false);
  engine.playUiTick();
  assert.equal(contexts, 0);

  engine.playSnippet({
    previewUrl: "https://audio-ssl.itunes.apple.com/clip.m4a",
    durationSec: 5,
    mood: { bpm: 120 } as SongMoodProfile,
  });
  assert.equal(contexts, 0, "an external URL does not even initialize playback");
  engine.playSnippet({
    previewUrl: "wavelet-original:neon-drift",
    durationSec: 5,
    mood: { bpm: 122, energy: 0.5 } as SongMoodProfile,
  });
  assert.equal(contexts, 1);
  assert.ok(notes > 0, "original melody is rendered by oscillators");
  assert.equal(remoteAudioConstructed, 0, "HTMLAudioElement is never constructed");

  const beforeMute = notes;
  engine.setMuted(true);
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.equal(notes, beforeMute, "muted synthesizer stays silent");
  engine.setMuted(false);
  await new Promise((resolve) => setTimeout(resolve, 280));
  assert.ok(notes > beforeMute, "unmuting resumes original notes");
  engine.stopSnippet();

  engine.setSoundEffectsEnabled(true);
  engine.setHapticsEnabled(true);
  const before = notes;
  engine.playDiscovery();
  assert.equal(notes, before + 5, "studio effects play separately");
  assert.equal(vibrations, 1);
});

test("commercial playback waits for audio, obeys cut length and controls, and cancels stale playback", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Audio");
  let resolvePlay: () => void = () => {};
  let rejectPlay: (error: Error) => void = () => {};
  const instances: FakeAudio[] = [];
  class FakeAudio {
    src = "";
    volume = 1;
    muted = false;
    preload = "";
    onerror: null | (() => void) = null;
    onended: null | (() => void) = null;
    paused = false;
    constructor() {
      instances.push(this);
    }
    play() {
      return new Promise<void>((resolve, reject) => {
        resolvePlay = resolve;
        rejectPlay = reject;
      });
    }
    pause() {
      this.paused = true;
    }
  }
  Object.defineProperty(globalThis, "Audio", { configurable: true, value: FakeAudio });
  t.after(() =>
    previous
      ? Object.defineProperty(globalThis, "Audio", previous)
      : Reflect.deleteProperty(globalThis, "Audio"),
  );
  const engine = new WaveletAudioEngine();
  t.after(() => engine.stopSnippet());
  let started = 0;
  let ended = 0;
  let errors = 0;
  const params = {
    previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/test/clip.m4a",
    durationSec: 3,
    mood: { bpm: 120 } as SongMoodProfile,
    onStarted: () => started++,
    onEnded: () => ended++,
    onError: () => errors++,
  };
  engine.setMuted(true);
  engine.playSnippet(params);
  assert.equal(instances[0].muted, true);
  t.mock.timers.tick(4000);
  assert.equal(ended, 0, "cut timer does not consume buffering time");
  resolvePlay();
  await Promise.resolve();
  assert.equal(started, 1);
  engine.setMuted(false);
  engine.setVolume(0.5);
  assert.equal(instances[0].muted, false);
  assert.equal(instances[0].volume, 0.425);
  t.mock.timers.tick(3000);
  assert.equal(ended, 1);
  assert.equal(instances[0].paused, true);
  assert.equal(instances[0].src, "");

  engine.playSnippet(params);
  const stale = resolvePlay;
  engine.playSnippet(params);
  stale();
  await Promise.resolve();
  assert.equal(started, 1, "a stopped preview cannot restart the next round's clock");
  rejectPlay(new Error("blocked"));
  await Promise.resolve();
  assert.equal(errors, 1);
  assert.equal(ended, 2);
  engine.playSnippet(params);
  t.mock.timers.tick(12000);
  assert.equal(errors, 2, "a stalled network load reports an error");
  assert.equal(ended, 3);
  t.mock.timers.tick(30000);
  assert.equal(ended, 3, "completion fires only once per preview");
});
