// @ts-check
import cloudflare from '@astrojs/cloudflare'
import { cacheCloudflare } from '@astrojs/cloudflare/cache'
import react from '@astrojs/react'
import { access, d1, r2 } from '@emdash-cms/cloudflare'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import emdash from 'emdash/astro'
import { env } from 'node:process'
import portableTextFile from './src/plugins/portable-text-file/index.ts'

const accessTeamDomain = env.CF_ACCESS_TEAM_DOMAIN
const isCloudflareDeployment = Boolean(env.SKPD_CLOUDFLARE_DEPLOYMENT)
if (isCloudflareDeployment && !accessTeamDomain) {
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
  cache: {
    provider: cacheCloudflare(),
  },
  routeRules: {
    '/': { maxAge: 86400, swr: 604800, tags: ['events'] },
    '/archief': { maxAge: 86400, swr: 604800, tags: ['events'] },
    '/over-skpd': { maxAge: 86400, swr: 604800, tags: ['pages'] },
    '/[article]': { maxAge: 86400, swr: 604800, tags: ['events'] },
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
      // In development EmDash must derive the origin from localhost; otherwise
      // its login redirects leave the local editor and land on production.
      siteUrl: isCloudflareDeployment ? 'https://www.skpd.nl' : undefined,
      plugins: [portableTextFile()],
    }),
  ],
  devToolbar: {
    enabled: false,
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
