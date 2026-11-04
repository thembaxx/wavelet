import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Wavelet prefers installed standalone without automatic fullscreen", () => {
  const manifest = read("app/manifest.ts");
  assert.match(manifest, /display:\s*["']standalone["']/);
  assert.match(manifest, /display_override:\s*\[["']standalone["'],\s*["']minimal-ui["']\]/);
  const fullscreen = read("hooks/use-pwa-install.ts");
  assert.ok(fullscreen.includes("requestFullscreen()"));
  assert.ok(fullscreen.includes("document.exitFullscreen()"));
});

test("immersive Wavelet respects viewport and safe area insets", () => {
  const css = read("app/native-shell.css");
  assert.ok(css.includes("100dvh"));
  assert.ok(css.includes("safe-area-inset-top"));
  assert.ok(css.includes("safe-area-inset-bottom"));
  const layout = read("app/layout.tsx");
  assert.match(layout, /viewportFit:\s*["\x27]cover["\x27]/);
  assert.doesNotMatch(layout, /black-translucent/);
});
