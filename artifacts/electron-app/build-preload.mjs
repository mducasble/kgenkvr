import { build } from 'esbuild';

await build({
  entryPoints: ['src/preload/preload.ts'],
  bundle: true,
  platform: 'node',
  external: ['electron'],
  outfile: 'dist/preload/preload.js',
});

console.log('Preload bundled successfully.');
