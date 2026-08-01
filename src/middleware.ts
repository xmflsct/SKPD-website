import { defineMiddleware } from 'astro:middleware'
import { isSuccessfulMenuMutation } from './lib/cloudflareCache.mjs'

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next()
  if (
    context.cache.enabled
    && isSuccessfulMenuMutation(context.request.method, context.url.pathname, response.status)
  ) {
    await context.cache.invalidate({ tags: ['menus'] })
  }
  return response
})
