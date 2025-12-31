import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Inclure uniquement les tests unitaires (fichiers .test.ts/js)
    include: ['src/**/*.test.{ts,js}'],
    // Exclure explicitement le dossier des tests E2E (Playwright)
    exclude: ['tests/**', 'node_modules/**'],
    environment: 'node', // Pour tester la logique pure (sans DOM pour l'instant)
  },
});