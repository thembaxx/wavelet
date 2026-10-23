import { readFile, writeFile } from "node:fs/promises";
const build = (await readFile(".next/BUILD_ID", "utf8")).trim().replace(/[^a-zA-Z0-9_-]/g, "");
const template = await readFile("scripts/service-worker.template.js", "utf8");
const manifest = JSON.parse(await readFile(".next/react-loadable-manifest.json", "utf8"));
const onboardingAssets = [
  ...new Set(
    Object.entries(manifest)
      .filter(([name]) => name.includes("onboarding/Onboarding"))
      .flatMap(([, entry]) => entry.files)
      .map((file) => `/_next/${file}`),
  ),
];
if (!onboardingAssets.length)
  throw new Error("The offline intro bundle is missing from the build.");
await writeFile(
  "public/sw.js",
  template
    .replace(
      "const VERSION = 'wavelet-native-v4';",
      `const VERSION = 'wavelet-native-v4-${build}';`,
    )
    .replace(
      "const ONBOARDING_ASSETS = [];",
      `const ONBOARDING_ASSETS = ${JSON.stringify(onboardingAssets)};`,
    ),
);
console.log("Generated the versioned Wavelet service worker.");
