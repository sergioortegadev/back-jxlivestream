import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/public/**', 'src/db/**'],
    },
  },
  resolve: {
    // Allow importing .js extensions that resolve to .ts files (NodeNext style)
    extensions: ['.ts', '.js'],
  },
});
