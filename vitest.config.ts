import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Sobe um MongoDB em memória uma vez para todos os testes (sem credenciais reais).
    globalSetup: ['tests/global-setup.ts'],
    // Na primeira execução o MongoDB em memória é baixado; pode demorar.
    hookTimeout: 300_000,
    testTimeout: 20_000,
  },
});
