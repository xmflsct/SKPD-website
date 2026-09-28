#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const write = args.includes('--write')
const backupFlag = args.indexOf('--backup')
const backupPath = backupFlag >= 0 ? args[backupFlag + 1] : undefined

if (args.includes('--help')) {
  console.log('Usage: node scripts/retire-page-content.mjs [--write --backup <path>]\n\nDry-run is the default. Set EMDASH_URL and EMDASH_TOKEN.')
  process.exit(0)
}
if (write && !backupPath) throw new Error('--write requires --backup <path>')

const target = String(process.env.EMDASH_URL || 'http://localhost:4321').replace(/\/$/, '')
const api = createApi(target, process.env.EMDASH_TOKEN)
const fields = (await api.json('/schema/collections/pages/fields')).items
const contentField = fields.find(field => field.slug === 'content')
const layoutField = fields.find(field => field.slug === 'layout')

if (!layoutField || layoutField.type !== 'blocks') {
  throw new Error('Refusing to retire pages.content before pages.layout exists as a blocks field')
}
if (!contentField) {
  console.log(JSON.stringify({ mode: write ? 'write' : 'dry-run', alreadyRetired: true }, null, 2))
  process.exit(0)
}
if (contentField.type !== 'portableText') {
  throw new Error('Refusing to retire pages.content because it is not a portableText field')
}

const pages = await listAll(api, '/content/pages')
const summary = pages.find(item => item.slug === 'over-skpd')
if (!summary) throw new Error('Page pages/over-skpd was not found')

const response = await api.json(`/content/pages/${summary.id}`)
const page = response.item || response
const content = page.data?.content
const layout = page.data?.layout
if (!Array.isArray(content) || content.length === 0) {
  throw new Error('Refusing to retire pages.content because the legacy value is empty')
}
if (!Array.isArray(layout) || layout.length === 0) {
  throw new Error('Refusing to retire pages.content because pages/over-skpd.layout is empty')
}

const backup = {
  collection: 'pages',
  page: { id: page.id, slug: page.slug, title: page.data?.title },
  field: { slug: contentField.slug, type: contentField.type, label: contentField.label },
  content,
}
const serialized = `${JSON.stringify(backup, null, 2)}\n`

console.log(JSON.stringify({
  mode: write ? 'write' : 'dry-run',
  pageId: page.id,
  legacyNodes: content.length,
  layoutBlocks: layout.length,
  backup: backupPath ? resolve(backupPath) : null,
  action: 'delete pages.content field and its database column',
}, null, 2))
if (!write) process.exit(0)

const absoluteBackup = resolve(backupPath)
await mkdir(dirname(absoluteBackup), { recursive: true })
await writeFile(absoluteBackup, serialized, { encoding: 'utf8', flag: 'wx' })
if (await readFile(absoluteBackup, 'utf8') !== serialized) {
  throw new Error('Backup verification failed; pages.content was not deleted')
}

await api.json('/schema/collections/pages/fields/content', { method: 'DELETE' })
const remaining = (await api.json('/schema/collections/pages/fields')).items
if (remaining.some(field => field.slug === 'content')) {
  throw new Error('pages.content still exists after the delete request')
}
console.log(JSON.stringify({ retired: true, backup: absoluteBackup }, null, 2))

function createApi(baseUrl, bearerToken) {
  let cookie
  return {
    async json(path, { method = 'GET', body } = {}) {
      if (!bearerToken && !cookie && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
        const response = await fetch(`${baseUrl}/_emdash/api/auth/dev-bypass`, { redirect: 'manual' })
        cookie = response.headers.get('set-cookie')?.split(';', 1)[0]
      }
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
