// The template's consumer file: erp-api's shape, plus int specs ignored (they are outside the template's tsconfig project).
import { defineConfig } from 'eslint/config';
import { backend } from '@erp/configs/eslint/backend';
import { base } from '@erp/configs/eslint/base';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/shared/db/generated/**',
      'src/**/*.int.spec.ts',
      // The shared configs/ (identical in erp-api and erp-web); linted nowhere.
      'configs/**',
    ],
  },
  ...base({
    files: ['src/**/*.ts'],
    tests: ['src/**/*.spec.ts', 'src/**/__tests__/**'],
    timerDoors: ['src/shared/resilience/**', 'src/shared/health/**'],
    docSurface: ['src/shared/**/*.ts', 'src/v1/*/facade/*.ts'],
  }),
  ...backend({ root: import.meta.dirname }),
);
