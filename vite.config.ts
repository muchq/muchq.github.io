import { defineConfig, type Connect, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { SOLO_API } from './src/apps/wordchains/solo/contract.ts'
import { readSoloRequest } from './server/wordchains/service.ts'

const soloMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
  if (req.url?.split('?')[0] !== SOLO_API) return next()
  try {
    const init: RequestInit & { duplex?: 'half' } = { method: req.method }
    if (req.method === 'POST') {
      init.body = Readable.toWeb(req) as ReadableStream
      init.duplex = 'half'
    }
    const response = await readSoloRequest(new Request(`http://localhost${SOLO_API}`, init))
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(await response.text())
  } catch (error) {
    next(error)
  }
}

const soloApi: Plugin = {
  name: 'wordchains-solo-api',
  configureServer: server => { server.middlewares.use(soloMiddleware) },
  configurePreviewServer: server => { server.middlewares.use(soloMiddleware) },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), soloApi],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@/hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@/utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@/types': fileURLToPath(new URL('./src/types', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/react-router-dom')) {
            return 'router-vendor'
          }
        }
      }
    }
  },
  base: '/',
  server: {
    port: 3000,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/server/**', '**/.vite-temp/**'] },
    open: true
  },
  preview: {
    port: 4173
  }
})