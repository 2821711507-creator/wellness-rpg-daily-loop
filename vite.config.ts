import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
    // `supabase/functions/**` are Deno Edge Function sources and tests (run via
    // `deno test`, not Vitest) -- they use Deno-only import specifiers
    // (`jsr:...`, `npm:...`, relative `.ts` imports) that Vitest's resolver
    // cannot handle, so they must be excluded from Vitest's own test discovery.
    exclude: [...configDefaults.exclude, 'supabase/**'],
  },
})
