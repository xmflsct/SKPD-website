#!/usr/bin/env node

const args = new Set(process.argv.slice(2))
const write = args.has('--write')
if (args.has('--help')) {
  console.log('Usage: node scripts/apply-page-blocks-schema.mjs [--write]\n\nDry-run is the default. Set EMDASH_URL and EMDASH_TOKEN.')
  process.exit(0)
}

const target = String(process.env.EMDASH_URL || 'http://localhost:4321').replace(/\/$/, '')
const token = process.env.EMDASH_TOKEN
const api = await createApi(target, token)

const desiredBlockTypes = [
  {
    slug: 'rich_text', label: 'Tekst', category: 'Inhoud',
    fields: [{ slug: 'content', label: 'Inhoud', type: 'portableText', required: true }],
  },
  {
    slug: 'download', label: 'Download', category: 'Inhoud',
    fields: [
      { slug: 'title', label: 'Titel', type: 'string', required: true },
      { slug: 'description', label: 'Omschrijving', type: 'text' },
      { slug: 'file', label: 'Bestand', type: 'file', required: true },
    ],
  },
]
const desiredLayout = {
  slug: 'layout', label: 'Pagina-inhoud', type: 'blocks',
  validation: { allowedTypes: ['rich_text', 'download'], maxItems: 100 },
}

const blockResponse = await api.json('/schema/block-types')
const existingBlocks = new Map(blockResponse.items.map(item => [item.slug, item]))
const fieldsResponse = await api.json('/schema/collections/pages/fields')
const existingFields = new Map(fieldsResponse.items.map(item => [item.slug, item]))
const actions = []

for (const desired of desiredBlockTypes) {
  const existing = existingBlocks.get(desired.slug)
  if (!existing) {
    actions.push({ action: 'create block type', slug: desired.slug })
    if (write) await api.json('/schema/block-types', { method: 'POST', body: desired })
    continue
  }
  const active = existing.versions.find(version => version.version === existing.currentVersion)
  if (!active || !sameFields(active.fields, desired.fields)) {
    throw new Error(`Block type "${desired.slug}" exists with a different active definition; refusing to overwrite it`)
  }
}

const content = existingFields.get('content')
if (content && content.type !== 'portableText') {
  throw new Error('pages.content exists with an unexpected field type')
}
if (content?.required) {
  throw new Error(
    'pages.content is still required. Apply migrations/001_pages_content_optional.sql to D1, then restart/redeploy before retrying.',
  )
}

const layout = existingFields.get('layout')
if (!layout) {
  actions.push({ action: 'create field', collection: 'pages', slug: 'layout' })
  if (write) await api.json('/schema/collections/pages/fields', { method: 'POST', body: desiredLayout })
} else if (
  layout.type !== desiredLayout.type ||
  !sameBlockValidation(layout.validation, desiredLayout.validation)
) {
  throw new Error('pages.layout exists with a different definition; refusing to overwrite it')
}

console.log(JSON.stringify({
  mode: write ? 'write' : 'dry-run',
  legacyContentField: content ? { type: content.type, required: content.required } : null,
  actions,
  ready: write || actions.length === 0,
}, null, 2))

function sameFields(actual, desired) {
  const select = field => ({
    slug: field.slug,
    label: field.label,
    type: field.type,
    required: Boolean(field.required),
  })
  return JSON.stringify(actual.map(select)) === JSON.stringify(desired.map(select))
}

function sameBlockValidation(actual, desired) {
  return (
    Array.isArray(actual?.allowedTypes) &&
    JSON.stringify(actual.allowedTypes) === JSON.stringify(desired.allowedTypes) &&
    actual.maxItems === desired.maxItems &&
    (actual.minItems === undefined || actual.minItems === 0) &&
    (!Array.isArray(actual.retiredTypes) || actual.retiredTypes.length === 0)
  )
}

async function createApi(baseUrl, bearerToken) {
  let cookie
  if (!bearerToken && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
    const response = await fetch(`${baseUrl}/_emdash/api/auth/dev-bypass?content=0`, { redirect: 'manual' })
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
