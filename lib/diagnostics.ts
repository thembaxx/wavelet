/** Local, opt-in operational diagnostics. Never pass user content to this API. */
export type FeedbackSource = "runtime" | "synthetic";
export type FeedbackOutcome = "success" | "failure" | "abandoned";
export type FeedbackEvent = {
  schemaVersion: 1;
  app: string;
  source: FeedbackSource;
  sessionId: string;
  operation: string;
  outcome: FeedbackOutcome;
  timestamp: string;
  durationMs?: number;
  code?: string;
};

const TOKEN = /^[a-z][a-z0-9_]{0,63}$/;
const DAY = 86_400_000;
const LIMIT = 300;

export function createDiagnostics(
  app: string,
  options: { operations: readonly string[]; codes?: readonly string[] },
) {
  if (!TOKEN.test(app) || !options.operations.every((op) => TOKEN.test(op))) {
    throw new Error("Diagnostics require static application and operation identifiers.");
  }
  const operations = new Set(options.operations);
  const codes = new Set((options.codes ?? []).filter((code) => TOKEN.test(code)));
  const prefix = `feedback.v1.${app}`;
  const sessionId =
    globalThis.crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  let source: FeedbackSource = "runtime";
  let consent = false;
  let storageConsent: boolean | undefined;
  let memory: FeedbackEvent[] = [];
  let storageDirty = false;
  const storage = () => {
    try {
      return typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
      return undefined;
    }
  };
  function isEnabled() {
    if (storageConsent !== undefined) return storageConsent;
    try {
      const local = storage();
      return local ? local.getItem(`${prefix}.enabled`) === "true" : consent;
    } catch {
      return consent;
    }
  }
  function sanitize(value: unknown): FeedbackEvent | undefined {
    if (!value || typeof value !== "object") return;
    const event = value as Partial<FeedbackEvent>;
    const age = Date.now() - Date.parse(event.timestamp ?? "");
    if (
      event.schemaVersion !== 1 ||
      event.app !== app ||
      !operations.has(event.operation ?? "") ||
      !["success", "failure", "abandoned"].includes(event.outcome ?? "") ||
      !["runtime", "synthetic"].includes(event.source ?? "") ||
      typeof event.sessionId !== "string" ||
      !/^[A-Za-z0-9_-]{1,80}$/.test(event.sessionId) ||
      !Number.isFinite(age) ||
      age < -300_000 ||
      age > DAY
    )
      return;
    const safe: FeedbackEvent = {
      schemaVersion: 1,
      app,
      source: event.source!,
      sessionId: event.sessionId,
      operation: event.operation!,
      outcome: event.outcome!,
      timestamp: event.timestamp!,
    };
    if (
      typeof event.durationMs === "number" &&
      Number.isFinite(event.durationMs) &&
      event.durationMs >= 0 &&
      event.durationMs <= DAY
    ) {
      safe.durationMs = Math.round(event.durationMs);
    }
    if (typeof event.code === "string" && codes.has(event.code)) safe.code = event.code;
    return safe;
  }
  function read() {
    if (!isEnabled()) return [];
    try {
      const local = storage();
      const raw = local && !storageDirty ? local.getItem(`${prefix}.events`) : undefined;
      if (raw === null || (raw && raw.length > 250_000)) memory = [];
      // Refuse unexpectedly large/corrupted stores; do not export their contents.
      if (raw && raw.length <= 250_000) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed))
          memory = parsed.slice(-LIMIT).flatMap((v) => {
            const safe = sanitize(v);
            return safe ? [safe] : [];
          });
      }
    } catch {
      /* Memory-only diagnostics remain available when storage fails. */
    }
    memory = memory
      .flatMap((v) => {
        const safe = sanitize(v);
        return safe ? [safe] : [];
      })
      .slice(-LIMIT);
    return memory;
  }
  function clear() {
    memory = [];
    try {
      const local = storage();
      if (local) local.removeItem(`${prefix}.events`);
      storageDirty = !local;
    } catch {
      storageDirty = true; /* Never restore an uncleared stale buffer. */
    }
  }
  function setEnabled(enabled: boolean, eventSource: FeedbackSource = "runtime") {
    consent = enabled;
    source = eventSource === "synthetic" ? "synthetic" : "runtime";
    // Tab-scoped marker survives reloads in synthetic checks, never other tabs.
    try {
      if (enabled) window.sessionStorage.setItem(`${prefix}.source`, source);
      else window.sessionStorage.removeItem(`${prefix}.source`);
    } catch {
      /* Memory-only or server context. */
    }
    if (!enabled) clear();
    try {
      const local = storage();
      if (!local) {
        storageConsent = enabled;
        return;
      }
      if (enabled) local.setItem(`${prefix}.enabled`, "true");
      else local.removeItem(`${prefix}.enabled`);
      storageConsent = undefined;
    } catch {
      storageConsent = enabled; /* Explicit consent works in memory. */
    }
  }
  function record(
    operation: string,
    outcome: FeedbackOutcome,
    metadata: { durationMs?: number; code?: string } = {},
  ) {
    if (!isEnabled()) return;
    try {
      source =
        window.sessionStorage.getItem(`${prefix}.source`) === "synthetic" ? "synthetic" : "runtime";
    } catch {
      /* Keep the explicitly selected memory-only source. */
    }
    const event = sanitize({
      schemaVersion: 1,
      app,
      source,
      sessionId,
      operation,
      outcome,
      timestamp: new Date().toISOString(),
      durationMs: metadata.durationMs,
      code: metadata.code,
    });
    if (!event) return;
    memory = [...read(), event].slice(-LIMIT);
    try {
      const local = storage();
      if (local) local.setItem(`${prefix}.events`, JSON.stringify(memory));
      storageDirty = !local;
    } catch {
      storageDirty = true; /* Retain unsaved events in memory. */
    }
  }
  return {
    record,
    isEnabled,
    setEnabled,
    clear,
    exportJSONL: () =>
      read()
        .map((event) => JSON.stringify(event))
        .join("\n"),
  };
}
