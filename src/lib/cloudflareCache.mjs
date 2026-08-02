export default function cloudflareCache() {
  return {
    name: 'cloudflare-workers-cache',
    async invalidate({ tags, path }) {
      const options = {}
      if (tags) options.tags = Array.isArray(tags) ? tags : [tags]
      if (path) options.pathPrefixes = [path]
      if (!options.tags && !options.pathPrefixes) return

      try {
        const { cache } = await import('cloudflare:workers')
        const result = await cache.purge(options)
        if (!result.success) {
          console.error('Cloudflare cache purge failed:', result.errors)
        }
      } catch (error) {
        // ponytail: best-effort purge; stale entries expire via route TTL, add a retry queue if this becomes material
        console.error('Cloudflare cache purge threw:', error)
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
