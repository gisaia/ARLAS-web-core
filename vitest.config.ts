import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
