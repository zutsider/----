import { build } from 'esbuild';

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
    outfile: 'dist-electron/main.js'
  }),
  build({
    ...common,
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.js'
  })
]);
