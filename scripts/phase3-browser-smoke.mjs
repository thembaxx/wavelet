import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(new URL("../.phase3-browser/package.json", import.meta.url));
const { chromium } = require("playwright");
const mobile = process.argv[2] === "mobile";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
});

try {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem("wavelet_onboarding_v1", "completed");
    localStorage.setItem(
      "wavelet_studio_preferences_v1",
      JSON.stringify({
        motion: "system",
        muted: true,
        soundEffects: false,
        haptics: false,
        compactCanvas: true,
        animatedBackground: false,
      }),
    );
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded", timeout: 60000 });

  const dock = page.getByTestId("game-configuration");
  await dock.waitFor({ state: "visible", timeout: 60000 });
  await page.locator('[data-motion-intent="setup"][data-motion-reduced="true"]').waitFor();

  const roundOptions = page.getByRole("button", { name: "Round options" });
  await roundOptions.click({ timeout: 30000 });

  const dialog = page.locator('dialog.studio-dialog[data-motion-intent="dialog"][open]');
  await dialog.waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await dialog.getAttribute("data-motion-reduced"), "true");
  await page.getByRole("button", { name: "Close round options" }).click();
  await dialog.waitFor({ state: "hidden" });

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator('[data-motion-intent="setup"][data-motion-reduced="false"]').waitFor();
  await roundOptions.click({ timeout: 30000 });
  await dialog.waitFor({ state: "visible", timeout: 30000 });
  assert.equal(await dialog.getAttribute("data-motion-reduced"), "false");
  await page.getByRole("button", { name: "Close round options" }).click();
  await dialog.waitFor({ state: "hidden" });

  assert.equal(await dock.isVisible(), true);
  console.log(
    `PASS ${mobile ? "mobile" : "desktop"}: dock, accessible dialog and live motion preference`,
  );
  await context.close();
} finally {
  await browser.close();
}
