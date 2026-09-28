#!/usr/bin/env node
import { migratePortableTextToBlocks, planPageBlocks } from './lib/page-blocks.mjs'

const args = new Set(process.argv.slice(2))
const write = args.has('--write')
if (args.has('--help')) {
  console.log('Usage: node scripts/migrate-page-blocks.mjs [--write]\n\nDry-run is the default. Set EMDASH_URL and optionally EMDASH_TOKEN.')
  process.exit(0)
}

const target = String(process.env.EMDASH_URL || 'http://localhost:4321').replace(/\/$/, '')
const token = process.env.EMDASH_TOKEN
const api = await createApi(target, token)
const pages = await listAll(api, '/content/pages')
const summary = pages.find(item => item.slug === 'over-skpd')
if (!summary) throw new Error('Page pages/over-skpd was not found')

const response = await api.json(`/content/pages/${summary.id}`)
const page = response.item || response
const revision = response._rev
const media = await listAll(api, '/media')
const plan = planPageBlocks(page.data?.content, media, 'over-skpd')

console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', ...plan.report }, null, 2))
if (!plan.valid) {
  throw new Error('Migration refused: unresolved or ambiguous Media Library references')
}
if (!write) process.exit(0)

const { blocks } = migratePortableTextToBlocks(page.data?.content, media, 'over-skpd')
if (Array.isArray(page.data?.layout) && page.data.layout.length > 0) {
  throw new Error('Migration refused: pages/over-skpd.layout is already populated')
}

const updated = await api.json(`/content/pages/${page.id}`, {
  method: 'PUT',
  body: {
    data: { ...page.data, layout: blocks },
    slug: page.slug,
    _rev: revision,
  },
})
if (page.status === 'published') {
  await api.json(`/content/pages/${page.id}/publish`, {
    method: 'POST',
    body: { _rev: updated._rev },
  })
}
console.log(JSON.stringify({ written: true, pageId: page.id, revision: updated._rev }, null, 2))

async function createApi(baseUrl, bearerToken) {
  let cookie
  if (!bearerToken && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
    const response = await fetch(`${baseUrl}/_emdash/api/auth/dev-bypass`, { redirect: 'manual' })
    cookie = response.headers.get('set-cookie')?.split(';', 1)[0]
  }

  return {
    async json(path, { method = 'GET', body } = {}) {
      const headers = new Headers({ Accept: 'application/json', 'X-EmDash-Request': '1' })
      if (bearerToken) headers.set('Authorization', `Bearer ${bearerToken}`)
      if (cookie) headers.set('Cookie', cookie)
      if (body !== undefined) headers.set('Content-Type', 'application/json')
      const response = await fetch(`${baseUrl}/_emdash/api${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(`${method} ${path} failed (${response.status}): ${payload?.error?.message || response.statusText}`)
      }
      return payload?.data
    },
  }
}

async function listAll(client, path) {
  const items = []
  let cursor
  do {
    const query = new URLSearchParams({ limit: '100' })
    if (cursor) query.set('cursor', cursor)
    const result = await client.json(`${path}?${query}`)
    items.push(...result.items)
    cursor = result.nextCursor
  } while (cursor)
  return items
}
