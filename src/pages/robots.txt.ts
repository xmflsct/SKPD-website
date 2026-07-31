import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      'Allow: /_emdash/api/media/file/',
      'Disallow: /_emdash/',
      '',
      `Sitemap: ${new URL('/sitemap.xml', site)}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  )
