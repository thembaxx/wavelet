"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleNotch,
  Copy,
  Headphones,
  Lightning,
  LinkSimple,
  MusicNotes,
  Play,
  SpeakerHigh,
  Trophy,
  Users,
  WifiHigh,
  WifiSlash,
} from "@phosphor-icons/react";

type Mode = "track" | "artist" | "genre" | "year";
type Player = {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  score: number;
  answered: boolean;
};
type Round = {
  options: { id: string; label: string }[];
  previewUrl: string;
  deadline: number;
  correctId?: string;
  track?: { title: string; artist: string; genre: string; releaseYear: number };
};
type Snapshot = {
  type: "state";
  phase: "lobby" | "loading" | "playing" | "reveal" | "finished";
  hostId: string | null;
  challenge: Mode;
  count: number;
  index: number;
  total: number;
  players: Player[];
  round: Round | null;
  serverTime: number;
};
type Joined = { type: "joined"; playerId: string; secret: string };
type ServerEvent =
  | Snapshot
  | Joined
  | { type: "error"; message: string }
  | { type: "hello"; room: string };

const HOST = (process.env.NEXT_PUBLIC_WAVELET_MULTIPLAYER_URL ?? "").replace(/\/$/, "");
const MODES: { id: Mode; label: string }[] = [
  { id: "track", label: "Track" },
  { id: "artist", label: "Artist" },
  { id: "genre", label: "Genre" },
  { id: "year", label: "Year" },
];
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateRoom() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join("");
}
function validRoom(value: string) {
  return /^[A-Z0-9]{8}$/.test(value);
}
function storeKey(code: string) {
  return `wavelet-multiplayer-identity-${code}`;
}
const panel =
  "rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-2xl md:p-7";
const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#EDFF8C] px-6 py-3 text-sm font-bold text-[#101713] transition hover:bg-[#e0ff61] disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-40";

export default function MultiplayerPage() {
  const [code, setCode] = useState("");
  const [entry, setEntry] = useState("");
  const [name, setName] = useState("Listener");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [myId, setMyId] = useState("");
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState({ index: -1, value: "" });
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(0);
  const [audioError, setAudioError] = useState("");
  const [listening, setListening] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const playerAudio = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopAudio = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    playerAudio.current?.pause();
    if (playerAudio.current) {
      playerAudio.current.src = "";
      playerAudio.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentCode =
        new URLSearchParams(window.location.search).get("room")?.toUpperCase() ?? "";
      if (validRoom(currentCode)) setCode(currentCode);
      try {
        const storedName = localStorage.getItem("wavelet-multiplayer-name");
        if (storedName) setName(storedName);
      } catch {
        /* Private mode */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!code || !HOST) return;
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const connect = () => {
      if (disposed) return;
      const target = `${HOST.replace(/^http/, "ws")}/parties/wavelet-room/${code}`;
      const ws = new WebSocket(target);
      socket.current = ws;
      ws.onopen = () => {
        attempts = 0;
        setOnline(true);
        setError("");
        let identity: { playerId?: string; secret?: string } = {};
        try {
          identity = JSON.parse(sessionStorage.getItem(storeKey(code)) || "{}");
        } catch {
          /* No identity yet */
        }
        ws.send(JSON.stringify({ type: "join", name, ...identity }));
      };
      ws.onmessage = (event: MessageEvent<string>) => {
        let message: ServerEvent;
        try {
          message = JSON.parse(event.data) as ServerEvent;
        } catch {
          return;
        }
        if (message.type === "joined") {
          setMyId(message.playerId);
          try {
            sessionStorage.setItem(
              storeKey(code),
              JSON.stringify({ playerId: message.playerId, secret: message.secret }),
            );
          } catch {
            /* Guest session */
          }
        } else if (message.type === "state") {
          setClockOffset(message.serverTime - Date.now());
          setSnapshot(message);
        } else if (message.type === "error") setError(message.message);
      };
      ws.onerror = () => setError("Connection interrupted. Reconnecting…");
      ws.onclose = () => {
        setOnline(false);
        if (!disposed) {
          attempts++;
          timeout = setTimeout(connect, Math.min(12000, 600 * 2 ** Math.min(attempts, 4)));
        }
      };
    };
    connect();
    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      socket.current?.close(1000, "Leaving page");
      socket.current = null;
    };
    // The nickname is captured when entering a room; edits do not reconnect the active session.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(stopAudio, 0);
    return () => window.clearTimeout(timer);
  }, [snapshot?.index, snapshot?.phase, stopAudio]);
  useEffect(
    () => () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      playerAudio.current?.pause();
    },
    [],
  );

  const send = (message: Record<string, unknown>) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      setError("Not connected yet");
      return;
    }
    socket.current.send(JSON.stringify(message));
  };
  const enterRoom = (next: string) => {
    if (!validRoom(next)) {
      setError("Enter an eight-character room code");
      return;
    }
    setError("");
    setSelection({ index: -1, value: "" });
    setMyId("");
    setSnapshot(null);
    try {
      localStorage.setItem("wavelet-multiplayer-name", name.trim().slice(0, 24) || "Listener");
    } catch {
      /* Optional */
    }
    window.history.replaceState(null, "", `/multiplayer?room=${next}`);
    setCode(next);
  };
  const playClip = async () => {
    if (!snapshot?.round?.previewUrl) return;
    stopAudio();
    setAudioError("");
    const audio = new Audio(snapshot.round.previewUrl);
    playerAudio.current = audio;
    audio.onended = () => setListening(false);
    audio.onerror = () => {
      setAudioError("Audio preview unavailable for this track");
      setListening(false);
    };
    try {
      await audio.play();
      setListening(true);
      stopTimer.current = setTimeout(stopAudio, 5000);
    } catch {
      setAudioError("Tap again to enable audio, or check browser playback permissions");
      setListening(false);
    }
  };
  const selected = selection.index === snapshot?.index ? selection.value : "";
  const me = snapshot?.players.find((p) => p.id === myId);
  const host = snapshot?.hostId === myId;
  const remaining = snapshot?.round
    ? Math.max(0, Math.ceil((snapshot.round.deadline - now - clockOffset) / 1000))
    : 0;
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/multiplayer?room=${code}`);
    } catch {
      setError("Could not copy. Share the room code instead.");
    }
  };
  const resetRoom = () => {
    stopAudio();
    setSnapshot(null);
    setMyId("");
    setCode("");
    setEntry("");
    window.history.replaceState(null, "", "/multiplayer");
  };

  return (
    <main className="relative h-dvh overflow-x-hidden overflow-y-auto overscroll-y-contain bg-[#0A1212] px-4 py-8 text-white selection:bg-[#EDFF8C] selection:text-black md:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 h-[35rem] w-[35rem] rounded-full bg-[#309F92]/15 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-56 h-[30rem] w-[30rem] rounded-full bg-[#4F5BD5]/15 blur-[120px]"
      />
      <div className="relative mx-auto w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={18} /> Solo studio
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#EDFF8C]/25 bg-[#EDFF8C]/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#EDFF8C]">
            <Users size={15} /> Wavelet Live
          </span>
        </header>
        <div className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#EDFF8C]">
            The listening party
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-6xl">
            Better together<span className="text-[#EDFF8C]">.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
            Same song. Same countdown. Your ears against your friends. Create a room and invite up
            to seven more listeners.
          </p>
        </div>

        {!HOST && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
          >
            Multiplayer server is not configured. Set NEXT_PUBLIC_WAVELET_MULTIPLAYER_URL to your
            deployed Cloudflare Worker URL.
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {error}
          </div>
        )}

        {!code ? (
          <div className="grid gap-4 md:grid-cols-2">
            <motion.section layout className={panel}>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EDFF8C]/15 text-[#EDFF8C]">
                <Lightning size={24} weight="fill" />
              </div>
              <h2 className="text-2xl font-bold">Host a room</h2>
              <p className="mt-2 min-h-14 text-sm leading-relaxed text-white/60">
                Set the challenge, invite your crew and drop the needle when everyone is ready.
              </p>
              <label
                htmlFor="multiplayer-name"
                className="mt-5 block text-xs font-bold uppercase tracking-wider text-white/60"
              >
                Your name
              </label>
              <input
                id="multiplayer-name"
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 mb-4 h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-base text-white outline-none focus:border-[#EDFF8C]"
              />
              <button
                className={action + " w-full"}
                disabled={!HOST}
                onClick={() => enterRoom(generateRoom())}
              >
                Create room <ArrowRight size={17} />
              </button>
            </motion.section>
            <motion.section layout className={panel}>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#309F92]/20 text-[#7ddccd]">
                <Headphones size={24} />
              </div>
              <h2 className="text-2xl font-bold">Join friends</h2>
              <p className="mt-2 min-h-14 text-sm leading-relaxed text-white/60">
                Already have an invite? Enter the room code and claim your spot.
              </p>
              <label
                htmlFor="multiplayer-code"
                className="mt-5 block text-xs font-bold uppercase tracking-wider text-white/60"
              >
                Eight-character code
              </label>
              <input
                id="multiplayer-code"
                autoCapitalize="characters"
                autoComplete="off"
                maxLength={8}
                value={entry}
                onChange={(e) => setEntry(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enterRoom(entry);
                }}
                placeholder="ABCD2345"
                className="mt-2 mb-4 h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-center font-mono text-base tracking-[0.2em] text-white outline-none focus:border-[#EDFF8C]"
              />
              <button
                className={secondary + " w-full"}
                disabled={!HOST || !validRoom(entry)}
                onClick={() => enterRoom(entry)}
              >
                Join room <ArrowRight size={17} />
              </button>
            </motion.section>
          </div>
        ) : (
          <div className="space-y-4">
            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                    Private room
                  </p>
                  <h2 className="mt-1 font-mono text-2xl font-black tracking-[0.18em] text-[#EDFF8C]">
                    {code}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-white/60">
                    {online ? <WifiHigh size={17} color="#EDFF8C" /> : <WifiSlash size={17} />}{" "}
                    {online ? "Connected" : "Reconnecting"}
                  </span>
                  <button
                    className={secondary}
                    onClick={copyInvite}
                    aria-label="Copy invitation link"
                  >
                    <Copy size={17} /> Invite
                  </button>
                  <button
                    className={secondary}
                    onClick={resetRoom}
                    aria-label="Leave multiplayer room"
                  >
                    Leave
                  </button>
                </div>
              </div>
              {snapshot?.phase === "lobby" && (
                <p className="mt-4 text-sm text-white/60">
                  <LinkSimple className="mr-1 inline" /> Share the invite and ask everyone to mark
                  themselves ready.
                </p>
              )}
            </section>

            {!snapshot && (
              <section className={panel + " flex items-center justify-center gap-3 text-white/65"}>
                <CircleNotch className="animate-spin" /> Joining the listening party…
              </section>
            )}
            {snapshot && (
              <>
                <section className={panel}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold">
                      <Users className="mr-2 inline text-[#EDFF8C]" size={20} /> Players{" "}
                      <span className="text-white/40">({snapshot.players.length}/8)</span>
                    </h3>
                    <span className="text-xs text-white/50">
                      {snapshot.phase === "lobby"
                        ? "Waiting for the crew"
                        : `Round ${Math.min(snapshot.index + 1, snapshot.total)} of ${snapshot.total}`}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {snapshot.players.map((p, index) => (
                      <div
                        key={p.id}
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#309F92]/25 text-sm font-black text-[#EDFF8C]">
                          {p.name.slice(0, 1).toUpperCase() || index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {p.name}
                            {p.id === myId ? " · You" : ""}
                          </p>
                          <p className="text-xs text-white/45">
                            {p.id === snapshot.hostId ? "Host · " : ""}
                            {p.connected
                              ? snapshot.phase === "lobby"
                                ? p.ready
                                  ? "Ready"
                                  : "Not ready"
                                : p.answered
                                  ? "Locked in"
                                  : "Listening"
                              : "Disconnected"}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-bold tabular-nums text-[#EDFF8C]">
                          {snapshot.phase === "lobby" ? (
                            p.ready ? (
                              <CheckCircle size={21} weight="fill" />
                            ) : (
                              "—"
                            )
                          ) : (
                            p.score
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <AnimatePresence mode="wait">
                  {snapshot.phase === "lobby" && (
                    <motion.section
                      key="lobby"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={panel}
                    >
                      <h3 className="mb-4 text-xl font-bold">Set the tempo.</h3>
                      <p className="mb-3 text-sm text-white/60">Guess the…</p>
                      <div className="mb-5 grid grid-cols-4 gap-2">
                        {MODES.map((mode) => (
                          <button
                            key={mode.id}
                            disabled={!host}
                            onClick={() =>
                              send({ type: "configure", challenge: mode.id, count: snapshot.count })
                            }
                            className={`min-h-11 rounded-xl border px-2 text-xs font-bold transition disabled:cursor-default ${snapshot.challenge === mode.id ? "border-[#EDFF8C] bg-[#EDFF8C] text-[#101713]" : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"}`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                      <p className="mb-3 text-sm text-white/60">Songs per match</p>
                      <div className="mb-6 flex gap-2">
                        {[5, 10].map((count) => (
                          <button
                            key={count}
                            disabled={!host}
                            onClick={() =>
                              send({ type: "configure", challenge: snapshot.challenge, count })
                            }
                            className={`min-h-11 flex-1 rounded-xl border text-sm font-bold ${count === snapshot.count ? "border-[#EDFF8C] bg-[#EDFF8C]/15 text-[#EDFF8C]" : "border-white/15 bg-white/5 text-white/70"}`}
                          >
                            {count} songs
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          className={secondary}
                          disabled={!online}
                          onClick={() => send({ type: "ready", ready: !me?.ready })}
                        >
                          {me?.ready ? (
                            <CheckCircle size={19} weight="fill" />
                          ) : (
                            <MusicNotes size={19} />
                          )}
                          {me?.ready ? "Ready ✓" : "I’m ready"}
                        </button>
                        {host && (
                          <button
                            className={action + " flex-1"}
                            disabled={
                              !online ||
                              snapshot.players.filter((p) => p.connected).length < 2 ||
                              snapshot.players.some((p) => p.connected && !p.ready)
                            }
                            onClick={() => send({ type: "start" })}
                          >
                            <Play size={18} weight="fill" /> Start match
                          </button>
                        )}
                        {!host && (
                          <span className="text-xs text-white/50">
                            Host starts when everyone is ready.
                          </span>
                        )}
                      </div>
                    </motion.section>
                  )}
                  {snapshot.phase === "loading" && (
                    <motion.section
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={
                        panel + " flex items-center justify-center gap-3 py-14 text-white/75"
                      }
                    >
                      <CircleNotch size={21} className="animate-spin" /> Building a shared playlist…
                    </motion.section>
                  )}
                  {(snapshot.phase === "playing" || snapshot.phase === "reveal") &&
                    snapshot.round && (
                      <motion.section
                        key={snapshot.index}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        className={panel}
                      >
                        <div className="mb-5 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold uppercase tracking-widest text-[#EDFF8C]">
                            Round {snapshot.index + 1} · {snapshot.challenge} ID
                          </span>
                          <span
                            aria-live="polite"
                            className="font-mono text-xl font-black tabular-nums text-white"
                          >
                            {snapshot.phase === "playing" ? `${remaining}s` : "REVEAL"}
                          </span>
                        </div>
                        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#EDFF8C] transition-[width] duration-200"
                            style={{
                              width: `${snapshot.phase === "playing" ? Math.min(100, (remaining / 20) * 100) : 0}%`,
                            }}
                          />
                        </div>
                        <div className="mb-5 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#143936] to-[#10161d] px-5 py-8 text-center">
                          <motion.div
                            animate={listening ? { rotate: 360 } : { rotate: 0 }}
                            transition={{
                              duration: 2.4,
                              repeat: listening ? Infinity : 0,
                              ease: "linear",
                            }}
                            className="flex h-24 w-24 items-center justify-center rounded-full border-[10px] border-black/50 bg-[#18211f] shadow-[0_0_0_3px_rgba(237,255,140,0.3)]"
                          >
                            <MusicNotes size={31} className="text-[#EDFF8C]" />
                          </motion.div>
                          <h3 className="mt-5 text-xl font-black">
                            {snapshot.phase === "reveal"
                              ? snapshot.round.track?.title
                              : "Mystery groove"}
                          </h3>
                          <p className="mt-1 text-sm text-white/60">
                            {snapshot.phase === "reveal"
                              ? `${snapshot.round.track?.artist} · ${snapshot.round.track?.releaseYear}`
                              : "Press play and trust your ears"}
                          </p>
                          {snapshot.phase === "playing" && (
                            <button
                              onClick={playClip}
                              disabled={remaining === 0}
                              className={secondary + " mt-5"}
                            >
                              <SpeakerHigh size={18} /> {listening ? "Replay clip" : "Play 5s clip"}
                            </button>
                          )}
                          {audioError && (
                            <p role="alert" className="mt-3 text-xs text-amber-300">
                              {audioError}
                            </p>
                          )}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {snapshot.round.options.map((option, i) => {
                            const revealed = snapshot.phase === "reveal";
                            const correct = revealed && option.id === snapshot.round?.correctId;
                            const wrong = revealed && selected === option.id && !correct;
                            return (
                              <motion.button
                                key={option.id}
                                whileTap={revealed ? undefined : { scale: 0.98 }}
                                disabled={revealed || !!me?.answered || remaining === 0 || !online}
                                onClick={() => {
                                  setSelection({ index: snapshot.index, value: option.id });
                                  send({ type: "answer", optionId: option.id });
                                }}
                                className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${correct ? "border-[#EDFF8C] bg-[#EDFF8C]/20 text-[#EDFF8C]" : wrong ? "border-red-400/60 bg-red-400/10" : selected === option.id ? "border-[#309F92] bg-[#309F92]/20" : "border-white/15 bg-white/5 hover:bg-white/10"} disabled:cursor-default`}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="flex-1">{option.label}</span>
                                {correct && <CheckCircle size={20} weight="fill" />}
                              </motion.button>
                            );
                          })}
                        </div>
                        <p className="mt-4 text-center text-xs text-white/50">
                          {snapshot.phase === "reveal"
                            ? "Next round is coming up…"
                            : me?.answered
                              ? "Answer locked. Listening for the others…"
                              : "One answer per player. Faster correct guesses earn more."}
                        </p>
                      </motion.section>
                    )}
                  {snapshot.phase === "finished" && (
                    <motion.section
                      key="finished"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={panel + " text-center"}
                    >
                      <Trophy size={56} className="mx-auto mb-4 text-[#EDFF8C]" weight="duotone" />
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#EDFF8C]">
                        Final results
                      </p>
                      <h2 className="mt-2 text-3xl font-black">
                        {[...snapshot.players].sort((a, b) => b.score - a.score)[0]?.name ??
                          "The crew"}{" "}
                        wins!
                      </h2>
                      <div className="mt-6 space-y-2 text-left">
                        {[...snapshot.players]
                          .sort((a, b) => b.score - a.score)
                          .map((p, i) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                            >
                              <span className="text-sm font-bold">
                                #{i + 1} · {p.name}
                              </span>
                              <span className="font-mono font-bold text-[#EDFF8C]">{p.score}</span>
                            </div>
                          ))}
                      </div>
                      <button className={secondary + " mt-6"} onClick={copyInvite}>
                        <Copy size={17} /> Share the room
                      </button>
                      {host && (
                        <button
                          className={action + " mt-6 ml-2"}
                          onClick={() => send({ type: "reset" })}
                        >
                          <Play size={17} /> Rematch
                        </button>
                      )}
                    </motion.section>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
        <footer className="mt-7 text-center text-xs leading-relaxed text-white/40">
          Multiplayer requires a live connection and playable preview rights. Solo mode still works
          independently.
        </footer>
      </div>
    </main>
  );
}
