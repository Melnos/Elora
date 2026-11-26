import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

const SW_PRECACHE_EXTENSIONS = new Set(['.js', '.css', '.mjs'])
const BASE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons.svg',
]

function eloraPrecacheSw(): Plugin {
  let outDir = resolve(process.cwd(), 'dist')

  return {
    name: 'elora-precache-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const swPath = resolve(outDir, 'sw.js')
      const assetsDir = resolve(outDir, 'assets')
      if (!existsSync(swPath) || !existsSync(assetsDir)) return

      const assetPaths = readdirSync(assetsDir, { withFileTypes: true })
        .filter((entry) => {
          if (!entry.isFile()) return false
          const name = entry.name
          if (name.startsWith('.') || name.toLowerCase().includes('.env')) return false
          if (name.endsWith('.map')) return false
          return SW_PRECACHE_EXTENSIONS.has(extname(name).toLowerCase())
        })
        .map((entry) => `/assets/${entry.name}`)
        .sort()

      const swContent = readFileSync(swPath, 'utf8')
      const precacheRegex = /const\s+PRECACHE_ASSETS\s*=\s*\[[\s\S]*?\];/
      if (!precacheRegex.test(swContent)) return

      const mergedAssets = Array.from(new Set([...BASE_SHELL_ASSETS, ...assetPaths]))
      const updatedSwContent = swContent.replace(
        precacheRegex,
        `const PRECACHE_ASSETS = ${JSON.stringify(mergedAssets, null, 2)};`
      )
      writeFileSync(swPath, updatedSwContent, 'utf8')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    eloraPrecacheSw(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-core': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/app-check'],
          'firebase-ai': ['firebase/ai'],
          'vendor-ui': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
