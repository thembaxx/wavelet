import test from "node:test";
import assert from "node:assert/strict";
import { WaveletAudioEngine } from "./audio-engine.ts";
import type { SongMoodProfile } from "./game-rules.ts";

test("effects, preview volume, mute, and haptics remain independent", async (t) => {
  let contexts = 0;
  let notes = 0;
  let vibrations = 0;
  const previews: Preview[] = [];
  const parameter = () => ({
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
    gain: parameter(),
    frequency: parameter(),
  });
  class Context {
    currentTime = 0;
    state = "running";
    destination = {};
    constructor() {
      contexts += 1;
    }
    createGain = node;
    createBiquadFilter = node;
    createAnalyser = () => ({ frequencyBinCount: 32 });
    createOscillator() {
      notes += 1;
      return node();
    }
  }
  class Preview {
    src = "";
    crossOrigin = "";
    muted = false;
    volume = 1;
    paused = false;
    constructor() {
      previews.push(this);
    }
    play() {
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  const replaceGlobal = (key: string, value: unknown) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  };
  replaceGlobal("window", { AudioContext: Context });
  replaceGlobal("Audio", Preview);
  replaceGlobal("navigator", {
    vibrate() {
      vibrations += 1;
    },
  });

  const engine = new WaveletAudioEngine();
  assert.equal(contexts, 0, "no audio context is created on load");
  engine.setSoundEffectsEnabled(false);
  engine.setHapticsEnabled(false);
  engine.playUiTick();
  engine.playDiscovery();
  assert.equal(contexts, 0);
  assert.equal(vibrations, 0);

  engine.setVolume(0.4);
  engine.playSnippet({
    previewUrl: "https://example.com/clip.m4a",
    durationSec: 30,
    mood: { bpm: 120 } as SongMoodProfile,
  });
  t.after(() => engine.stopSnippet());
  assert.equal(contexts, 1, "music remains playable with UI effects off");
  assert.equal(notes, 0, "the needle-drop effect is disabled");
  assert.equal(previews[0].volume, 0.34);
  engine.setMuted(true);
  assert.equal(previews[0].muted, true);
  engine.setVolume(0.2);
  assert.equal(previews[0].volume, 0.17);
  engine.setMuted(false);
  assert.equal(previews[0].muted, false);

  engine.setSoundEffectsEnabled(true);
  engine.playDiscovery();
  assert.equal(notes, 5);
  assert.equal(vibrations, 0, "sound effects do not override disabled haptics");
  engine.setHapticsEnabled(true);
  engine.setMuted(true);
  engine.playDiscovery();
  assert.equal(notes, 5, "mute suppresses the discovery sound");
  assert.equal(vibrations, 1, "haptics stay independent of audio mute");
  engine.stopSnippet();
  assert.equal(previews[0].paused, true);

  engine.playSnippet({
    previewUrl: "",
    durationSec: 30,
    mood: { bpm: 120, energy: 0.5 } as SongMoodProfile,
  });
  assert.equal(notes, 5, "a muted procedural preview remains silent");
  engine.setMuted(false);
  await new Promise((resolve) => setTimeout(resolve, 270));
  assert.ok(notes > 5, "unmuting resumes a procedural preview without requiring replay");
  engine.stopSnippet();
});
