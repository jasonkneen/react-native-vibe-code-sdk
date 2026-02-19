import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Allow vitest to resolve TypeScript files when require() is used at runtime
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['packages/*/src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/__tests__/**', 'packages/*/src/**/index.ts'],
    },
  },
})
