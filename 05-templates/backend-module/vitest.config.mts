import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// Copy of erp-api/vitest.config.mts: the template's specs run exactly as they will inside erp-api.
export default defineConfig({
  plugins: [
    // NestJS needs design:paramtypes metadata; esbuild cannot emit it, SWC can (ADR-0016).
    swc.vite({
      module: { type: 'es6' },
      jsc: { target: 'es2022', transform: { legacyDecorator: true, decoratorMetadata: true } },
    }),
  ],
  test: {
    include: ['src/**/*.spec.ts'],
    // *.int.spec.ts need the real PrismaService and the local stack: they run in erp-api only (corepack yarn test:int).
    exclude: ['src/**/*.int.spec.ts', 'node_modules/**', 'dist/**'],
    environment: 'node',
    watch: false,
  },
});
