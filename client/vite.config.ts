import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizePath, searchForWorkspaceRoot, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { parseChangelog } from './src/changelog/parse.ts'

// At the repo root so it is easy to find; the Dockerfile copies it to the same place.
const CHANGELOG_PATH = normalizePath(fileURLToPath(new URL('../CHANGELOG.md', import.meta.url)))

/**
 * Serves `CHANGELOG.md` to the client as ready-parsed entries.
 *
 * Parsing here rather than in the browser means a malformed changelog fails the build
 * with its line number instead of shipping, and the client carries no Markdown parser.
 */
function changelog(): Plugin {
  return {
    name: 'gaudi-changelog',
    enforce: 'pre',
    load(id) {
      if (normalizePath(id.split('?')[0]!) !== CHANGELOG_PATH) return null
      this.addWatchFile(CHANGELOG_PATH)
      const { entries, errors } = parseChangelog(readFileSync(CHANGELOG_PATH, 'utf8'))
      if (errors.length > 0) {
        this.error(`CHANGELOG.md is not valid:\n  ${errors.join('\n  ')}`)
      }
      return `export default ${JSON.stringify(entries)};`
    },
  }
}

export default defineConfig({
  plugins: [
    changelog(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The game must be playable with no connection: levels are prefetched and
      // completions queue locally until they can be submitted for verification.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      manifest: {
        name: 'Gaudi Ballz',
        short_name: 'Gaudi',
        description: 'A free, ad-free colour sorting puzzle.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), CHANGELOG_PATH],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
