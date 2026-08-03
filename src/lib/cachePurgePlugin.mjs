import { definePlugin, PluginRouteError } from 'emdash'
import { z } from 'zod'
import { purgeCloudflareCache } from './cloudflareCache.mjs'

const purgeTargets = {
  home: ['home'],
  events: ['events'],
  pages: ['pages'],
  menus: ['menus'],
  all: ['home', 'events', 'pages', 'menus'],
}

export function createPlugin() {
  return definePlugin({
    id: 'skpd-cache',
    version: '0.1.0',
    admin: { pages: [{ path: '/', label: 'Cache' }] },
    routes: {
      purge: {
        permission: 'plugins:manage',
        input: z.object({ target: z.enum(Object.keys(purgeTargets)) }),
        handler: async ({ input, request }) => {
          if (request.method !== 'POST') throw new PluginRouteError('METHOD_NOT_ALLOWED', 'Use POST', 405)
          await purgeCloudflareCache({ tags: purgeTargets[input.target] })
          return { target: input.target }
        },
      },
    },
  })
}
