import { routePartykitRequest, Server, type Connection } from "partyserver";

type Challenge = "track" | "artist" | "genre" | "year";
type Track = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  releaseYear: number;
  previewUrl: string;
  source?: string;
  rights?: { provider?: string; gameUse?: boolean; territories?: string[] };
};
type Choice = { id: string; label: string };
type Player = {
  id: string;
  secret: string;
  name: string;
  ready: boolean;
  connected: boolean;
  score: number;
  answer: string | null;
  lastPlayedIndex?: number;
  playCount?: number;
};
type Round = {
  options: Choice[];
  correctId: string;
  deadline: number;
  previewUrl: string;
  track: Track;
};
type Room = {
  phase: "lobby" | "loading" | "playing" | "reveal" | "finished";
  players: Player[];
  hostId: string | null;
  challenge: Challenge;
  count: number;
  tracks: Track[];
  pool: Track[];
  index: number;
  round: Round | null;
  lastActive: number;
};
interface Env {
  WaveletRoom: DurableObjectNamespace;
  CATALOG_ORIGIN: string;
  ALLOWED_ORIGINS: string;
}
type PlayerConnection = Connection<{ playerId?: string }>;
type Message =
  | { type: "join"; name?: string; playerId?: string; secret?: string }
  | { type: "ready"; ready: boolean }
  | { type: "configure"; challenge: Challenge; count: number }
  | { type: "start" }
  | { type: "answer"; optionId: string }
  | { type: "play" }
  | { type: "leave" }
  | { type: "reset" };
// Years are identical for every original 2026 demo track. A year quiz would be misleading.
const MODES = new Set<Challenge>(["track", "artist", "genre"]);
const MAX_PLAYERS = 8;
const ROUND_MS = 20000;
const REVEAL_MS = 4500;
const TTL_MS = 24 * 60 * 60 * 1000;
function freshRoom(): Room {
  return {
    phase: "lobby",
    players: [],
    hostId: null,
    challenge: "track",
    count: 5,
    tracks: [],
    pool: [],
    index: 0,
    round: null,
    lastActive: Date.now(),
  };
}
function answerKey(song: Track, challenge: Challenge): string {
  switch (challenge) {
    case "track":
      return song.id;
    case "artist":
      return song.artist.trim().toLowerCase();
    case "genre":
      return song.genre.trim().toLowerCase();
    case "year":
      return String(song.releaseYear);
  }
}
function answerLabel(song: Track, challenge: Challenge): string {
  switch (challenge) {
    case "track":
      return song.title;
    case "artist":
      return song.artist;
    case "genre":
      return song.genre;
    case "year":
      return String(song.releaseYear);
  }
}
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const j = random[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export class WaveletRoom extends Server<Env> {
  static options = { hibernate: true };
  private room: Room = freshRoom();

  async onStart() {
    this.room = (await this.ctx.storage.get<Room>("room")) ?? freshRoom();
    // Socket state survives Durable Object hibernation; reconcile on reconnect.
    this.reconcilePresence();
  }
  private reconcilePresence() {
    const live = new Set(
      Array.from(this.getConnections<{ playerId?: string }>())
        .map((c) => c.state?.playerId)
        .filter(Boolean),
    );
    for (const player of this.room.players) player.connected = live.has(player.id);
    if (!this.room.players.find((p) => p.id === this.room.hostId && p.connected)) {
      this.room.hostId = this.room.players.find((p) => p.connected)?.id ?? this.room.hostId;
    }
  }
  private async save() {
    this.room.lastActive = Date.now();
    await this.ctx.storage.put("room", this.room);
    if (this.room.phase === "lobby" || this.room.phase === "finished") {
      await this.ctx.storage.setAlarm(Date.now() + TTL_MS);
    }
  }
  private publicState() {
    const { phase, hostId, challenge, count, index, players, round } = this.room;
    return {
      type: "state",
      phase,
      hostId,
      challenge,
      count,
      index,
      total: this.room.tracks.length,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        connected: p.connected,
        score: p.score,
        answered: p.answer !== null,
        playCount: p.playCount ?? 0,
      })),
      round:
        round && (phase === "playing" || phase === "reveal" || phase === "finished")
          ? {
              options: round.options,
              previewUrl: round.previewUrl,
              deadline: round.deadline,
              ...(phase === "playing"
                ? {}
                : {
                    correctId: round.correctId,
                    track: {
                      title: round.track.title,
                      artist: round.track.artist,
                      genre: round.track.genre,
                      releaseYear: round.track.releaseYear,
                    },
                  }),
            }
          : null,
      serverTime: Date.now(),
    };
  }
  private broadcastState() {
    this.broadcast(JSON.stringify(this.publicState()));
  }
  private error(connection: PlayerConnection, reason: string) {
    connection.send(JSON.stringify({ type: "error", message: reason }));
  }
  private playerFor(connection: PlayerConnection) {
    return this.room.players.find((p) => p.id === connection.state?.playerId);
  }
  onConnect(connection: PlayerConnection) {
    if (Array.from(this.getConnections<{ playerId?: string }>()).length > 20) {
      connection.close(1008, "Room connection limit");
      return;
    }
    connection.send(JSON.stringify({ type: "hello", room: this.name }));
  }
  async onMessage(connection: PlayerConnection, raw: string | ArrayBuffer) {
    if (typeof raw !== "string" || raw.length > 2048)
      return this.error(connection, "Invalid message");
    let msg: Message;
    try {
      msg = JSON.parse(raw) as Message;
    } catch {
      return this.error(connection, "Invalid JSON");
    }
    if (!msg || typeof msg.type !== "string") return this.error(connection, "Invalid message");
    if (msg.type === "join") {
      const prior = this.room.players.find(
        (p) => p.id === msg.playerId && p.secret === msg.secret && !!msg.secret,
      );
      if (!prior && this.room.phase !== "lobby")
        return this.error(connection, "This match has already started");
      if (!prior && this.room.players.length >= MAX_PLAYERS)
        return this.error(connection, "The room is full");
      if (connection.state?.playerId) return;
      const player = prior ?? {
        id: crypto.randomUUID(),
        secret: crypto.randomUUID(),
        name: (typeof msg.name === "string" ? msg.name.trim() : "").slice(0, 24) || "Listener",
        ready: false,
        connected: true,
        score: 0,
        answer: null,
        lastPlayedIndex: -1,
        playCount: 0,
      };
      for (const other of this.getConnections<{ playerId?: string }>()) {
        if (other.id !== connection.id && other.state?.playerId === player.id)
          other.close(1000, "Connected elsewhere");
      }
      if (!prior) this.room.players.push(player);
      player.connected = true;
      connection.setState({ playerId: player.id });
      if (
        !this.room.hostId ||
        !this.room.players.some((p) => p.id === this.room.hostId && p.connected)
      )
        this.room.hostId = player.id;
      await this.save();
      connection.send(
        JSON.stringify({ type: "joined", playerId: player.id, secret: player.secret }),
      );
      this.broadcastState();
      return;
    }
    const player = this.playerFor(connection);
    if (!player) return this.error(connection, "Join the room first");
    if (msg.type === "ready" && this.room.phase === "lobby" && typeof msg.ready === "boolean") {
      player.ready = msg.ready;
    } else if (
      msg.type === "configure" &&
      player.id === this.room.hostId &&
      this.room.phase === "lobby"
    ) {
      if (!MODES.has(msg.challenge) || ![5, 10].includes(msg.count))
        return this.error(connection, "Invalid match settings");
      this.room.challenge = msg.challenge;
      this.room.count = msg.count;
      for (const p of this.room.players) p.ready = false;
    } else if (
      msg.type === "start" &&
      player.id === this.room.hostId &&
      this.room.phase === "lobby"
    ) {
      const connected = this.room.players.filter((p) => p.connected);
      if (connected.length < 2 || connected.some((p) => !p.ready))
        return this.error(connection, "At least two ready players are required");
      this.room.phase = "loading";
      await this.save();
      this.broadcastState();
      try {
        const endpoint = new URL("/api/songs", this.env.CATALOG_ORIGIN);
        endpoint.searchParams.set("limit", "50");
        const response = await fetch(endpoint.toString(), { signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error("Catalog unavailable");
        const data = (await response.json()) as { tracks?: Track[] };
        const pool = (data.tracks ?? [])
          .filter(
            (t) =>
              !!t &&
              typeof t.id === "string" &&
              typeof t.title === "string" &&
              typeof t.artist === "string" &&
              typeof t.genre === "string" &&
              Number.isInteger(t.releaseYear) &&
              typeof t.previewUrl === "string" &&
              t.source === "original" &&
              t.rights?.provider === "wavelet-original" &&
              t.rights?.gameUse === true &&
              t.rights?.territories?.includes("*") === true &&
              t.previewUrl === "wavelet-original:" + t.id,
          )
          .slice(0, 50);
        if (new Set(pool.map((t) => answerKey(t, this.room.challenge))).size < 4)
          throw new Error("Not enough playable choices for this challenge");
        this.room.pool = pool;
        this.room.tracks = shuffled(pool).slice(0, this.room.count);
        this.room.index = 0;
        for (const p of this.room.players) {
          p.score = 0;
          p.answer = null;
          p.playCount = 0;
          p.lastPlayedIndex = -1;
        }
        this.beginRound();
      } catch (err) {
        this.room.phase = "lobby";
        this.error(connection, err instanceof Error ? err.message : "Could not load songs");
      }
    } else if (msg.type === "play" && this.room.phase === "playing" && this.room.round) {
      // Counts accepted listener play intents, not royalty-bearing audio streams.
      // Replaying a round never double-counts a listener.
      if (player.lastPlayedIndex !== this.room.index) {
        player.lastPlayedIndex = this.room.index;
        player.playCount = (player.playCount ?? 0) + 1;
      }
    } else if (msg.type === "answer" && this.room.phase === "playing" && this.room.round) {
      if (
        typeof msg.optionId !== "string" ||
        Date.now() > this.room.round.deadline ||
        player.answer !== null
      )
        return;
      if (!this.room.round.options.some((o) => o.id === msg.optionId))
        return this.error(connection, "Unknown option");
      player.answer = msg.optionId;
      if (msg.optionId === this.room.round.correctId) {
        const remaining = Math.max(0, this.room.round.deadline - Date.now());
        player.score += 100 + Math.round((remaining / ROUND_MS) * 100);
      }
      if (this.room.players.filter((p) => p.connected).every((p) => p.answer !== null))
        await this.reveal();
    } else if (
      msg.type === "reset" &&
      player.id === this.room.hostId &&
      this.room.phase === "finished"
    ) {
      this.room.phase = "lobby";
      this.room.round = null;
      this.room.tracks = [];
      this.room.pool = [];
      this.room.index = 0;
      for (const p of this.room.players) {
        p.ready = false;
        p.score = 0;
        p.answer = null;
        p.playCount = 0;
        p.lastPlayedIndex = -1;
      }
    } else if (msg.type === "leave") {
      connection.close(1000, "Left room");
      return;
    } else {
      return this.error(connection, "Action not allowed");
    }
    await this.save();
    this.broadcastState();
  }
  private beginRound() {
    const track = this.room.tracks[this.room.index];
    if (!track) {
      this.room.phase = "finished";
      this.room.round = null;
      return;
    }
    const targetKey = answerKey(track, this.room.challenge);
    const seen = new Set([targetKey]);
    const options: Choice[] = [{ id: targetKey, label: answerLabel(track, this.room.challenge) }];
    for (const candidate of shuffled(this.room.pool)) {
      const key = answerKey(candidate, this.room.challenge);
      if (seen.has(key)) continue;
      seen.add(key);
      options.push({ id: key, label: answerLabel(candidate, this.room.challenge) });
      if (options.length === 4) break;
    }
    if (options.length < 4) {
      this.room.phase = "finished";
      this.room.round = null;
      return;
    }
    for (const p of this.room.players) p.answer = null;
    this.room.round = {
      options: shuffled(options),
      correctId: targetKey,
      previewUrl: track.previewUrl,
      deadline: Date.now() + ROUND_MS,
      track,
    };
    this.room.phase = "playing";
    void this.ctx.storage.setAlarm(this.room.round.deadline);
  }
  private async reveal() {
    if (this.room.phase !== "playing") return;
    this.room.phase = "reveal";
    await this.ctx.storage.setAlarm(Date.now() + REVEAL_MS);
    await this.save();
    this.broadcastState();
  }
  async onAlarm() {
    if (
      this.room.phase === "playing" &&
      this.room.round &&
      Date.now() >= this.room.round.deadline
    ) {
      await this.reveal();
    } else if (this.room.phase === "reveal") {
      this.room.index++;
      if (this.room.index >= this.room.tracks.length) {
        this.room.phase = "finished";
        this.room.round = null;
      } else this.beginRound();
      await this.save();
      this.broadcastState();
    } else if (
      (this.room.phase === "lobby" || this.room.phase === "finished") &&
      Date.now() - this.room.lastActive >= TTL_MS
    ) {
      await this.ctx.storage.deleteAll();
      this.room = freshRoom();
    }
  }
  async onClose(connection: PlayerConnection) {
    const player = this.playerFor(connection);
    if (!player) return;
    player.connected = Array.from(this.getConnections<{ playerId?: string }>()).some(
      (c) => c.id !== connection.id && c.state?.playerId === player.id,
    );
    if (this.room.hostId === player.id && !player.connected) {
      this.room.hostId = this.room.players.find((p) => p.connected)?.id ?? player.id;
    }
    if (
      this.room.phase === "playing" &&
      this.room.players.filter((p) => p.connected).every((p) => p.answer !== null)
    ) {
      await this.reveal();
    } else {
      await this.save();
      this.broadcastState();
    }
  }
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health")
      return Response.json({ ok: true, service: "wavelet-multiplayer" });
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    if (!origin || !allowed.includes(origin)) return new Response("Origin denied", { status: 403 });
    if (
      request.headers.get("Upgrade")?.toLowerCase() !== "websocket" ||
      !/^\/parties\/wavelet-room\/[A-Z0-9]{8}$/.test(url.pathname)
    )
      return new Response("Not found", { status: 404 });
    return (await routePartykitRequest(request, env)) ?? new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
