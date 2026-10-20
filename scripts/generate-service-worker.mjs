import { readFile, writeFile } from 'node:fs/promises';
const build = (await readFile('.next/BUILD_ID', 'utf8')).trim().replace(/[^a-zA-Z0-9_-]/g, '');
const template = await readFile('scripts/service-worker.template.js', 'utf8');
await writeFile('public/sw.js', template.replace("const VERSION = 'wavelet-native-v4';", `const VERSION = 'wavelet-native-v4-${build}';`));
console.log('Generated the versioned Wavelet service worker.');
