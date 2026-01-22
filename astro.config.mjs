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
    domains: ['images.ctfassets.net'],
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  integrations: [sitemap()],
  vite: {
    // @ts-expect-error - Type mismatch between @tailwindcss/vite and Astro's bundled Vite version
    plugins: [tailwindcss()]
  }
})
