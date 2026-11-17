import { defineConfig } from 'tsup';

// Bundles the API (and the workspace packages) into api/index.js, the Vercel function.
export default defineConfig({
  entry: { index: 'src/vercel.ts' },
  outDir: 'api',
  format: ['cjs'],
  target: 'node20',
  clean: false,
  noExternal: ['@cricket/shared', '@cricket/engine'],
  external: ['@prisma/client'],
});
