import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { diagnostics, trackMultiplayerConnection } from "./feedback.ts";
import { WaveletAudioEngine } from "./audio-engine.ts";
import { deriveSongMood, type GameSessionState } from "./game-rules.ts";
import { completeSoloRound } from "./game-feedback.ts";
import { FREE_GAME_TRACKS } from "./cleared-catalog.ts";

test("synthetic audio, round and reconnect diagnostics use the runtime instrumentation", async (t) => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const replaceWindow = (value: unknown) =>
    Object.defineProperty(globalThis, "window", { configurable: true, value });
  t.after(() => {
    diagnostics.setEnabled(false);
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  });
  diagnostics.setEnabled(false);
  diagnostics.record("audio_start", "success", { code: "audio_running" });
  assert.equal(diagnostics.exportJSONL(), "", "diagnostics are off by default");
  diagnostics.setEnabled(true, "synthetic");

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
  let notes = 0;
  class AudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    createGain = node;
    createAnalyser = () => ({ frequencyBinCount: 32, getByteFrequencyData() {} });
    createOscillator() {
      notes++;
      return node();
    }
  }
  const track = FREE_GAME_TRACKS[0];
  const params = {
    previewUrl: track.previewUrl,
    durationSec: 5,
    mood: deriveSongMood(track),
  };
  replaceWindow({ AudioContext });
  const engine = new WaveletAudioEngine();
  engine.setSoundEffectsEnabled(false);
  engine.setHapticsEnabled(false);
  t.after(() => engine.stopSnippet());
  engine.playSnippet(params);
  assert.ok(notes > 0, "approved original audio reaches the real synthesizer");
  assert.equal(engine.sampleSpectrum(0).isPlaying, true);
  engine.stopSnippet();

  // Browser media permissions are deliberately unavailable in this synthetic case.
  replaceWindow({
    AudioContext: class extends AudioContext {
      state = "suspended";
      resume() {
        return Promise.reject(new Error("synthetic permission denial"));
      }
    },
  });
  const blockedEngine = new WaveletAudioEngine();
  blockedEngine.setSoundEffectsEnabled(false);
  blockedEngine.setHapticsEnabled(false);
  t.after(() => blockedEngine.stopSnippet());
  blockedEngine.playSnippet(params);
  await new Promise((resolve) => setImmediate(resolve));
  blockedEngine.stopSnippet();

  const session: GameSessionState = {
    status: "playing",
    config: {
      filterMode: "genre",
      filterValue: "All",
      snippetDuration: 5,
      songCount: 1,
      playMode: "party-30s",
    },
    playlist: [track],
    currentIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    history: [],
    isRevealed: true,
  };
  const next = completeSoloRound(session, { correct: true });
  assert.equal(next.status, "gameover");
  assert.equal(next.history.length, 1);
  assert.ok(next.score > 0);
  completeSoloRound({ ...session, playlist: [] }, { correct: true });

  const initial = trackMultiplayerConnection(false);
  initial.joined();
  initial.joined(); // Duplicate acknowledgement must not duplicate attempts.
  initial.closed(false);
  initial.closed(false);
  const failed = trackMultiplayerConnection(true);
  failed.failed("socket_error");
  failed.closed(false);
  const reconnected = trackMultiplayerConnection(true);
  reconnected.joined();
  reconnected.closed(true);
  const abandoned = trackMultiplayerConnection(false);
  abandoned.closed(true);

  const exported = diagnostics.exportJSONL();
  const events = exported.split("\n").map((line) => JSON.parse(line));
  assert.ok(events.every((event) => event.source === "synthetic"));
  assert.equal(
    events.filter((event) => event.operation === "audio_start" && event.outcome === "success")
      .length,
    1,
  );
  assert.equal(events.filter((event) => event.code === "audio_resume_rejected").length, 1);
  assert.equal(events.filter((event) => event.operation === "multiplayer_reconnect").length, 2);
  assert.equal(events.filter((event) => event.operation === "multiplayer_disconnect").length, 2);
  assert.ok(
    events.some((event) => event.operation === "multiplayer_join" && event.outcome === "abandoned"),
  );
  assert.ok(!exported.includes(track.title));
  assert.equal(
    events.filter((event) => event.operation === "round_complete").length,
    1,
    "an empty round never reports a completed round",
  );
  assert.ok(!exported.includes(track.previewUrl));
  assert.ok(!exported.includes("permission denial"));
  const allowed = new Set([
    "schemaVersion",
    "app",
    "source",
    "sessionId",
    "operation",
    "outcome",
    "timestamp",
    "durationMs",
    "code",
  ]);
  assert.ok(events.every((event) => Object.keys(event).every((field) => allowed.has(field))));

  // Only the explicit daily command writes artifacts; ordinary tests stay read-only.
  if (process.env.FEEDBACK_OUTPUT) {
    assert.equal(process.env.FEEDBACK_OUTPUT, ".feedback/events.jsonl");
    await mkdir(".feedback", { recursive: true });
    await writeFile(process.env.FEEDBACK_OUTPUT, exported + "\n");
  }
  diagnostics.setEnabled(false);
  assert.equal(diagnostics.exportJSONL(), "", "disabling clears retained events");
});
