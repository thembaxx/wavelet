import { createDiagnostics } from "./diagnostics.ts";

export const diagnostics = createDiagnostics("wavelet", {
  operations: [
    "audio_start",
    "multiplayer_join",
    "multiplayer_reconnect",
    "multiplayer_disconnect",
    "round_complete",
    "offline_setup",
    "offline_update",
  ],
  codes: [
    "audio_running",
    "audio_unavailable",
    "audio_context_error",
    "audio_not_running",
    "audio_resume_rejected",
    "preview_rejected",
    "joined",
    "socket_error",
    "server_rejected",
    "connection_closed",
    "user_left",
    "solo",
    "multiplayer",
    "offline_ready",
    "offline_unavailable",
    "update_applied",
    "update_failed",
  ],
});

// This API only controls local collection and export. It never sends events.
if (typeof window !== "undefined") {
  Object.assign(window, {
    waveletDiagnostics: {
      setEnabled: diagnostics.setEnabled,
      isEnabled: diagnostics.isEnabled,
      exportJSONL: diagnostics.exportJSONL,
      clear: diagnostics.clear,
    },
  });
}

/** One terminal result per connection attempt, plus a disconnect after joining. */
export function trackMultiplayerConnection(reconnecting: boolean) {
  const operation = reconnecting ? "multiplayer_reconnect" : "multiplayer_join";
  const started = performance.now();
  let terminal = false;
  let joined = false;
  let closed = false;
  const finish = (
    outcome: "success" | "failure" | "abandoned",
    code: "joined" | "socket_error" | "server_rejected" | "connection_closed" | "user_left",
  ) => {
    if (terminal) return;
    terminal = true;
    diagnostics.record(operation, outcome, { code, durationMs: performance.now() - started });
  };
  return {
    joined() {
      joined = true;
      finish("success", "joined");
    },
    failed(code: "socket_error" | "server_rejected") {
      finish("failure", code);
    },
    closed(intentional: boolean) {
      if (closed) return;
      closed = true;
      if (joined) {
        diagnostics.record("multiplayer_disconnect", intentional ? "success" : "failure", {
          code: intentional ? "user_left" : "connection_closed",
        });
      } else {
        finish(
          intentional ? "abandoned" : "failure",
          intentional ? "user_left" : "connection_closed",
        );
      }
    },
  };
}
