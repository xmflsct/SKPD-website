// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

// https://astro.build/config
export default defineConfig({
  site: 'https://skpd.nl',
  output: 'static',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  image: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'images.ctfassets.net',
    }],
    layout: 'constrained'
  },
  integrations: [sitemap()],
  vite: {
    // @ts-expect-error - Type mismatch between @tailwindcss/vite and Astro's bundled Vite version
    plugins: [tailwindcss()]
  }
})
