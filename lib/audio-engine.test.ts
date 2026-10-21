import test from 'node:test';
import assert from 'node:assert/strict';
import { WaveletAudioEngine } from './audio-engine.ts';
import type { SongMoodProfile } from './game-rules.ts';

test('only approved original loops play; mute/haptics/effects remain separate', async t => {
  let contexts = 0;
  let notes = 0;
  let vibrations = 0;
  let remoteAudioConstructed = 0;
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
  const node = () => ({ connect() {}, disconnect() {}, start() {}, stop() {}, gain: param(), frequency: param(), onended: null as null | (() => void) });
  class Context {
    currentTime = 0;
    state = 'running';
    destination = {};
    constructor() { contexts++; }
    createGain = node;
    createBiquadFilter = node;
    createAnalyser = () => ({ frequencyBinCount: 32 });
    createOscillator() { notes++; return node(); }
  }
  const replace = (key: string, value: unknown) => {
    const old = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => old ? Object.defineProperty(globalThis, key, old) : Reflect.deleteProperty(globalThis, key));
  };
  replace('window', { AudioContext: Context });
  replace('Audio', class { constructor() { remoteAudioConstructed++; } });
  replace('navigator', { vibrate() { vibrations++; } });

  const engine = new WaveletAudioEngine();
  t.after(() => engine.stopSnippet());
  engine.setSoundEffectsEnabled(false);
  engine.setHapticsEnabled(false);
  engine.playUiTick();
  assert.equal(contexts, 0);

  engine.playSnippet({ previewUrl: 'https://audio-ssl.itunes.apple.com/clip.m4a', durationSec: 5, mood: { bpm: 120 } as SongMoodProfile });
  assert.equal(contexts, 0, 'an external URL does not even initialize playback');
  engine.playSnippet({ previewUrl: 'wavelet-original:neon-drift', durationSec: 5, mood: { bpm: 122, energy: 0.5 } as SongMoodProfile });
  assert.equal(contexts, 1);
  assert.ok(notes > 0, 'original melody is rendered by oscillators');
  assert.equal(remoteAudioConstructed, 0, 'HTMLAudioElement is never constructed');

  const beforeMute = notes;
  engine.setMuted(true);
  await new Promise(resolve => setTimeout(resolve, 280));
  assert.equal(notes, beforeMute, 'muted synthesizer stays silent');
  engine.setMuted(false);
  await new Promise(resolve => setTimeout(resolve, 280));
  assert.ok(notes > beforeMute, 'unmuting resumes original notes');
  engine.stopSnippet();

  engine.setSoundEffectsEnabled(true);
  engine.setHapticsEnabled(true);
  const before = notes;
  engine.playDiscovery();
  assert.equal(notes, before + 5, 'studio effects play separately');
  assert.equal(vibrations, 1);
});
