# Daily improvement review

The scheduled workflow runs the existing Node regression suite and a synthetic
audio/game journey every day. Run it locally with the repository's Bun version:

```sh
bun install --frozen-lockfile
bun run test
bun run feedback:daily
```

The journey uses the real original-groove synthesizer with a mocked browser audio
context, completes a one-track game through the same completion function used by
the UI, and exercises join, disconnect, failed reconnect, successful reconnect and
leaving before joining through the runtime connection tracker. It writes
`.feedback/events.jsonl`; the reviewer writes `.feedback/report.md` and
`.feedback/report.json`. These ignored files are retained as workflow artifacts
for seven days alongside check logs. Scheduled runs start after this workflow is
merged into the default branch; this draft does not run or deploy production.

All automated events have `source: "synthetic"`. The intentionally denied audio
resume (`audio_resume_rejected`), interrupted socket (`socket_error`), unexpected
disconnect (`connection_closed`) and early departure (`user_left`) prove error
reporting. They are expected test cases, not newly discovered production issues.
Reproduce them with `bun run feedback:collect`; assertions in
`lib/feedback-smoke.test.ts` verify one result per attempt and successful recovery.
This test does not open a live multiplayer room, test browser autoplay policy or
exercise an actual service worker. Browser/Worker end-to-end checks remain separate.

## Optional local runtime diagnostics

Collection is **off by default**. On either game page, open the browser developer
console and explicitly enable collection before reproducing an issue:

```js
window.waveletDiagnostics.setEnabled(true);
window.waveletDiagnostics.isEnabled(); // true
```

Play a round, start approved audio, reconnect multiplayer, or use the existing
Studio update action. Audio startup, multiplayer connection outcomes, round
completion, offline setup and applied/failed updates use fixed codes. No nickname,
room/invite identifier, user identity, score, answer, track metadata, URL, exception
text, or music-account data enters these events. Session IDs are random local
diagnostic identifiers; they are not account IDs or people counts.

Export with `window.waveletDiagnostics.exportJSONL()` and save the returned string
as a local JSONL file. In Chrome DevTools, `copy(...)` can copy it to the clipboard:

```js
copy(window.waveletDiagnostics.exportJSONL());
window.waveletDiagnostics.setEnabled(false); // clears consent and retained events
```

Review that export with the same CLI:

```sh
bun run feedback:review --input /path/to/events.jsonl --output .feedback/runtime.md
```

Consent persists in localStorage until disabled. Events remain local, capped at
300 and pruned to the last 24 hours when accessed; blocked storage falls back to
memory for the current tab. `clear()` clears events while preserving consent.
`setEnabled(true, "synthetic")` is reserved for explicit test collection; runtime
is the default source. Diagnostics never upload themselves. Review an export
before sharing it.

## Evidence before changes

The report separates synthetic and runtime observations and permits **no change
needed** or **insufficient evidence**. For an observed failure, attach a
reproducible scenario and failing regression case, choose an operation-specific
success metric at comparable attempt volume, and run existing success cases.
Counts and p95 duration describe only this sample; they do not prove root cause,
production usage or user impact. The instrumented offline paths run in production
builds; the synthetic suite does not currently verify them.

Set the optional `FEEDBACK_GEMINI_API_KEY` environment variable or Actions secret
to request Gemini proposals. Only bounded aggregate counts and fixed codes are
sent, never raw events or session IDs. The optional `FEEDBACK_GEMINI_MODEL` selects
the model (default `gemini-2.5-flash`). Missing credentials and invalid/provider
failures retain the deterministic report. Proposals are unverified review input;
the workflow never edits code, opens issues, merges, changes prompts or deploys.
