// @ts-check
import cloudflare from '@astrojs/cloudflare'
import react from '@astrojs/react'
import { access, d1, r2 } from '@emdash-cms/cloudflare'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import emdash from 'emdash/astro'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'

const cachePluginEntrypoint = fileURLToPath(new URL('./src/lib/cachePurgePlugin.mjs', import.meta.url))
const cachePluginAdminEntry = fileURLToPath(new URL('./src/lib/cachePurgeAdmin.tsx', import.meta.url))

const accessTeamDomain = env.CF_ACCESS_TEAM_DOMAIN
if (env.SKPD_CLOUDFLARE_DEPLOYMENT && !accessTeamDomain) {
  throw new Error('CF_ACCESS_TEAM_DOMAIN must be set when building a Cloudflare deployment')
}
const auth = accessTeamDomain
  ? access({
      teamDomain: accessTeamDomain,
      audienceEnvVar: 'CF_ACCESS_AUDIENCE',
      defaultRole: 40,
      syncRoles: false,
    })
  : undefined

// https://astro.build/config
export default defineConfig({
  site: 'https://www.skpd.nl',
  output: 'server',
  adapter: cloudflare(),
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover'
  },
  experimental: {
    cache: {
      provider: {
        entrypoint: './src/lib/cloudflareCache.mjs',
      },
    },
    routeRules: {
      '/': { maxAge: 86400, swr: 604800, tags: ['events', 'menus', 'home'] },
      '/archief': { maxAge: 86400, swr: 604800, tags: ['events', 'menus'] },
      '/over-skpd': { maxAge: 86400, swr: 604800, tags: ['pages', 'menus'] },
      '/[article]': { maxAge: 86400, swr: 604800, tags: ['events', 'menus'] },
    },
  },
  image: {
    layout: 'constrained',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'preview-skpd-website.xmflsct.workers.dev',
        pathname: '/_emdash/api/media/file/**',
      },
      {
        protocol: 'https',
        hostname: 'www.skpd.nl',
        pathname: '/_emdash/api/media/file/**',
      },
    ],
  },
  i18n: {
    locales: ['nl'],
    defaultLocale: 'nl',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    emdash({
      database: d1({ binding: 'DB', session: 'auto' }),
      storage: r2({ binding: 'MEDIA' }),
      auth,
      siteUrl: 'https://www.skpd.nl',
      plugins: [{
        id: 'skpd-cache',
        version: '0.1.0',
        format: 'native',
        entrypoint: cachePluginEntrypoint,
        adminEntry: cachePluginAdminEntry,
        adminPages: [{ path: '/', label: 'Cache' }],
      }],
    }),
  ],
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
