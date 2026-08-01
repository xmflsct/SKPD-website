export default function cloudflareCache() {
  return {
    name: 'cloudflare-workers-cache',
    async invalidate({ tags, path }) {
      const options = {}
      if (tags) options.tags = Array.isArray(tags) ? tags : [tags]
      if (path) options.pathPrefixes = [path]
      if (!options.tags && !options.pathPrefixes) return

      const { cache } = await import('cloudflare:workers')
      const result = await cache.purge(options)
      if (!result.success) {
        throw new Error(`Cloudflare cache purge failed: ${JSON.stringify(result.errors)}`)
      }
    },
  }
}

export function isSuccessfulMenuMutation(method, pathname, status) {
  return /^(POST|PUT|PATCH|DELETE)$/.test(method)
    && pathname.startsWith('/_emdash/api/menus/')
    && status >= 200
    && status < 300
}
