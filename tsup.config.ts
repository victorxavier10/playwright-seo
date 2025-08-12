import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'config': 'src/config.ts',
    'bin/cli': 'src/bin/cli.ts', 
  },
  dts: {
    entry: {
      index: 'src/index.ts',
      config: 'src/config.ts',
    },
  },
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'es2021',
  outDir: 'dist',
  platform: 'node',
  splitting: false,
  treeshake: true,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
});
