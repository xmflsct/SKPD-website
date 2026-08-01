import type { APIRoute } from 'astro'

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://www.skpd.nl/sitemap-static.xml</loc></sitemap>
  <sitemap><loc>https://www.skpd.nl/sitemap-events.xml</loc></sitemap>
  <sitemap><loc>https://www.skpd.nl/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`

export const GET: APIRoute = () => new Response(sitemap, {
  headers: {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  },
})
