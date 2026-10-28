import { advanceRoundState } from "./game-rules.ts";
import { diagnostics } from "./feedback.ts";

/** Keep operational completion separate from scores, answers and song metadata. */
export function completeSoloRound(...args: Parameters<typeof advanceRoundState>) {
  const next = advanceRoundState(...args);
  if (next.history.length === args[0].history.length + 1)
    diagnostics.record("round_complete", "success", { code: "solo" });
  return next;
}
