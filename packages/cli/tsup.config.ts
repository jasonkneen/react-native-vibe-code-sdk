import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    outExtension: () => ({ js: '.mjs' }),
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
  },
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    shims: true,
  },
])
