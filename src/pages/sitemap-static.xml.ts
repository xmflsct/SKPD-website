import type { APIRoute } from 'astro'

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.skpd.nl/</loc></url>
  <url><loc>https://www.skpd.nl/archief</loc></url>
</urlset>`

export const GET: APIRoute = () => new Response(sitemap, {
  headers: {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  },
})
