import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';

import { build } from 'esbuild';

const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
const mainFile = path.resolve('dist-electron/main.js');
const electronDir = path.resolve('electron');

let electronProcess;
let rebuilding = false;
let queued = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function buildElectron() {
  const common = {
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: ['electron'],
    sourcemap: true
  };

  await Promise.all([
    build({
      ...common,
      entryPoints: ['electron/main.ts'],
      outfile: mainFile
    }),
    build({
      ...common,
      entryPoints: ['electron/preload.ts'],
      outfile: path.resolve('dist-electron/preload.js')
    })
  ]);
}

async function waitForRenderer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(rendererUrl);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${rendererUrl}`);
}

function startElectron() {
  electronProcess = spawn('electron', [mainFile], {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: rendererUrl
    },
    shell: process.platform === 'win32'
  });

  electronProcess.on('exit', () => {
    electronProcess = undefined;
  });
}

function restartElectron() {
  if (!electronProcess) {
    startElectron();
    return;
  }

  const current = electronProcess;
  current.once('exit', startElectron);
  current.kill();
}

async function rebuildAndRestart() {
  if (rebuilding) {
    queued = true;
    return;
  }

  rebuilding = true;
  try {
    await buildElectron();
    restartElectron();
  } catch (error) {
    console.error(error);
  } finally {
    rebuilding = false;
    if (queued) {
      queued = false;
      void rebuildAndRestart();
    }
  }
}

await buildElectron();
await waitForRenderer();
startElectron();

let debounceTimer;
watch(electronDir, { recursive: true }, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void rebuildAndRestart();
  }, 150);
});
