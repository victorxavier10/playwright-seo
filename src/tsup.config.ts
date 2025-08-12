import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts', 'src/config.ts', 'src/bin/cli.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2021',
  outDir: 'dist',
  treeshake: true,
  splitting: false,
  platform: 'node',               
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' })
});
