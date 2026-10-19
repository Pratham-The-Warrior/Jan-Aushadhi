import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Absolute site origin for social-preview URLs (og:image must be absolute).
  // On Vercel the production domain is known at build time, so this works
  // even before VITE_SITE_URL is configured.
  const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : ''
  const siteUrl = (env.VITE_SITE_URL || vercelUrl).replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'site-url',
        transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    ],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
  }
})
