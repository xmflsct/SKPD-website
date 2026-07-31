import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { bmpToWebp } from './lib/bmp-to-webp.mjs'
import {
  convertContentfulRichText,
  portableTextDescription,
} from './lib/contentful-to-portable-text.mjs'
import {
  ensureMigrationUploadField,
  isDefaultUploadType,
  removeMigrationUploadField,
} from './lib/migration-upload-field.mjs'
import { retryTransientSocketError } from './lib/retry-transient-socket-error.mjs'

const CURRENT_EVENTS = [
  { label: 'Common Ground; Terra 40!', slug: 'common-ground' },
  { label: 'Delftse Keramiek Dagen 2026', slug: 'delftse-keramiek-dagen-2026' },
  { label: 'Nationale Keramiekprijs De Kei 2025', slug: 'nationale-keramiekprijs-de-kei-2025' },
]

const args = parseArgs(process.argv.slice(2))
const exportPath = args.export && resolve(args.export)
if (!exportPath) {
  throw new Error('Usage: npm run contentful:import -- --export <export.json> [--assets <dir>] [--write]')
}

const shouldWrite = args.write === true
const target = String(args.target || process.env.EMDASH_URL || 'http://localhost:4321').replace(/\/$/, '')
const statePath = resolve(String(args.state || '.contentful-migration-state.json'))
const source = JSON.parse(await readFile(exportPath, 'utf8'))
const locale = source.locales?.find(item => item.default)?.code || 'nl-NL'
const cmsLocale = 'nl'
const entries = (source.entries ?? []).filter(entry =>
  ['event', 'page'].includes(entry.sys?.contentType?.sys?.id),
)
const exportedAssets = new Map((source.assets ?? []).map(asset => [asset.sys.id, asset]))
const delivery = await loadDeliverySnapshot(args)
const liveEntries = new Map((delivery?.items ?? []).map(entry => [entry.sys.id, entry]))
const deliveryAssets = new Map((delivery?.includes?.Asset ?? []).map(asset => [asset.sys.id, asset]))

const changedWithoutSnapshot = entries.filter(entry =>
  stateOf(entry) === 'changed' && !liveEntries.has(entry.sys.id),
)
if (changedWithoutSnapshot.length) {
  throw new Error(
    `${changedWithoutSnapshot.length} changed published entries need a Delivery API snapshot. ` +
    'Set CONTENTFUL_SPACE_ID and CONTENTFUL_TOKEN or pass --delivery-snapshot.',
  )
}

const assetIds = new Set()
for (const entry of entries) collectAssetIds(entry.fields, assetIds)
for (const entry of liveEntries.values()) collectAssetIds(entry.fields, assetIds)

const slugRows = entries.map(entry => {
  const fields = localize(entry.fields, locale)
  const live = liveEntries.get(entry.sys.id)
  const latestSlug = toSlug(fields.slug || fields.name || fields.title)
  return {
    id: entry.sys.id,
    type: entry.sys.contentType.sys.id,
    slug: stateOf(entry) === 'changed' && live ? entrySlug(live, locale) : latestSlug,
    latestSlug,
    state: stateOf(entry),
  }
})
const duplicateSlugs = duplicates(slugRows.flatMap(row => [
  ...new Set([
    `${row.type}:${row.slug}`,
    `${row.type}:${row.latestSlug}`,
  ]),
]))
if (duplicateSlugs.length) throw new Error(`Duplicate slugs: ${duplicateSlugs.join(', ')}`)
const slugById = new Map(slugRows.map(row => [row.id, row]))

const report = {
  mode: shouldWrite ? 'write' : 'dry-run',
  target,
  entries: Object.fromEntries(
    ['published', 'changed', 'draft', 'archived'].map(status => [
      status,
      slugRows.filter(row => row.state === status).length,
    ]),
  ),
  assets: {
    exported: exportedAssets.size,
    referenced: assetIds.size,
    skippedOrphans: exportedAssets.size - assetIds.size,
  },
  menu: CURRENT_EVENTS,
}

if (!shouldWrite) {
  const placeholders = placeholderMedia(assetIds, exportedAssets, deliveryAssets, locale)
  for (const entry of entries) {
    entryData(entry, placeholders, locale)
    const live = liveEntries.get(entry.sys.id)
    if (live) entryData(live, placeholders, locale)
  }
  for (const item of CURRENT_EVENTS) {
    if (!slugRows.some(row => row.type === 'event' && row.slug === item.slug)) {
      throw new Error(`Current-event menu target is missing: ${item.slug}`)
    }
  }
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

const api = await createApi(target, args.token || process.env.EMDASH_TOKEN)
await assertSchema(api)
const migrationUploadField = await ensureMigrationUploadField(
  api,
  [...assetIds].map(assetId => {
    const metadata = assetMetadata(
      exportedAssets.get(assetId) || deliveryAssets.get(assetId),
      locale,
    )
    if (!metadata) throw new Error(`Missing exported asset metadata: ${assetId}`)
    return metadata.mimeType
  }),
)
const state = await readState(statePath)
const files = await indexFiles(resolve(String(args.assets || dirname(exportPath))))
const existingMedia = new Set((await listAll(api, '/media')).map(item => item.id))
const mediaByAsset = new Map()
const mediaByHash = new Map()

for (const assetId of [...assetIds].sort()) {
  const metadata = assetMetadata(
    exportedAssets.get(assetId) || deliveryAssets.get(assetId),
    locale,
  )
  if (!metadata) throw new Error(`Missing exported asset metadata: ${assetId}`)

  let bytes = await readAsset(metadata, assetId, files)
  let filename = metadata.filename
  let mimeType = metadata.mimeType
  if (
    mimeType === 'image/bmp' ||
    mimeType === 'image/x-ms-bmp' ||
    extname(filename).toLowerCase() === '.bmp'
  ) {
    try {
      bytes = await bmpToWebp(bytes)
    } catch (error) {
      throw new Error(`BMP conversion failed for "${filename}" (${assetId})`, { cause: error })
    }
    filename = `${filename.slice(0, -extname(filename).length)}.webp`
    mimeType = 'image/webp'
  }

  const hash = createHash('sha256').update(bytes).digest('hex')
  let media = mediaByHash.get(hash)
  const saved = state.assets?.[assetId]
  if (!media && saved?.hash === hash && existingMedia.has(saved.mediaId)) {
    media = await api.json(`/media/${saved.mediaId}`)
    media = media.item
  }
  if (!media) {
    try {
      media = (await retryTransientSocketError(() => {
        const form = new FormData()
        form.set('file', new File([bytes], filename, { type: mimeType }))
        if (migrationUploadField && !isDefaultUploadType(mimeType)) {
          form.set('fieldId', migrationUploadField.id)
        }
        return api.form('/media', form)
      })).item
    } catch (error) {
      const size = `${(bytes.byteLength / 1024 / 1024).toFixed(1)} MiB`
      throw new Error(`Upload failed for "${filename}" (${assetId}, ${size})`, { cause: error })
    }
    if (metadata.alt || metadata.caption) {
      media = (await api.json(`/media/${media.id}`, {
        method: 'PUT',
        body: { alt: metadata.alt, caption: metadata.caption },
      })).item
    }
  }

  mediaByHash.set(hash, media)
  mediaByAsset.set(assetId, mediaReference(media, { ...metadata, filename, mimeType }))
  state.assets[assetId] = { hash, mediaId: media.id }
}

if (migrationUploadField) await removeMigrationUploadField(api)

const active = {
  events: await contentBySlug(api, 'events'),
  pages: await contentBySlug(api, 'pages'),
}
const trashed = {
  events: await contentBySlug(api, 'events', true),
  pages: await contentBySlug(api, 'pages', true),
}
const importedEvents = new Map()
let skippedEntries = 0

for (const entry of entries) {
  const collection = entry.sys.contentType.sys.id === 'event' ? 'events' : 'pages'
  const latestData = entryData(entry, mediaByAsset, locale)
  const liveEntry = liveEntries.get(entry.sys.id)
  const liveData = liveEntry ? entryData(liveEntry, mediaByAsset, locale) : latestData
  const latestSeo = entrySeo(collection, latestData)
  const liveSeo = entrySeo(collection, liveData)
  const row = slugById.get(entry.sys.id)
  const slug = row.slug
  const latestSlug = row.latestSlug
  const status = stateOf(entry)
  const saved = state.entries[entry.sys.id]
  const savedActive = saved?.collection === collection
    ? findById(active[collection], saved.id)
    : undefined
  const savedTrashed = saved?.collection === collection
    ? findById(trashed[collection], saved.id)
    : undefined
  const entryFingerprint = fingerprint({
    importerVersion: 2,
    source: entry,
    published: liveEntry ?? null,
    assets: referencedAssetState(entry, liveEntry, state),
  })

  if (
    saved?.fingerprint === entryFingerprint &&
    ((status === 'archived' && savedTrashed) || (status !== 'archived' && savedActive))
  ) {
    if (collection === 'events' && savedActive) importedEvents.set(slug, savedActive)
    skippedEntries++
    continue
  }

  let item = savedActive || active[collection].get(slug) || active[collection].get(latestSlug)
  const trashedItem =
    savedTrashed || trashed[collection].get(slug) || trashed[collection].get(latestSlug)
  if (!item && trashedItem) {
    await api.json(`/content/${collection}/${trashedItem.id}/restore`, { method: 'POST' })
    item = (await api.json(`/content/${collection}/${trashedItem.id}`)).item
  }

  if (!item) {
    item = (await api.json(`/content/${collection}`, {
      method: 'POST',
      body: {
        data: status === 'changed' ? liveData : latestData,
        seo: status === 'changed' ? liveSeo : latestSeo,
        slug,
        status: 'draft',
        locale: cmsLocale,
        createdAt: entry.sys.createdAt,
      },
    })).item
  } else {
    const current = await api.json(`/content/${collection}/${item.id}`)
    item = (await api.json(`/content/${collection}/${item.id}`, {
      method: 'PUT',
      body: {
        data: status === 'changed' ? liveData : latestData,
        seo: status === 'changed' ? liveSeo : latestSeo,
        slug,
        _rev: current._rev,
      },
    })).item
  }

  if (status === 'published' || status === 'changed' || (status === 'archived' && entry.sys.publishedAt)) {
    await api.json(`/content/${collection}/${item.id}/publish`, {
      method: 'POST',
      body: entry.sys.publishedAt ? { publishedAt: entry.sys.publishedAt } : undefined,
    })
  }

  if (status === 'changed') {
    const current = await api.json(`/content/${collection}/${item.id}`)
    item = (await api.json(`/content/${collection}/${item.id}`, {
      method: 'PUT',
      body: { data: latestData, slug: latestSlug, _rev: current._rev },
    })).item
  }

  if (status === 'archived') {
    await api.json(`/content/${collection}/${item.id}`, { method: 'DELETE' })
  } else {
    active[collection].set(slug, item)
  }

  if (collection === 'events' && status !== 'archived') {
    importedEvents.set(slug, item)
  }
  state.entries[entry.sys.id] = {
    collection,
    id: item.id,
    slug: latestSlug,
    fingerprint: entryFingerprint,
  }
}

await replaceCurrentEventsMenu(api, importedEvents)
await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
console.log(JSON.stringify({
  ...report,
  imported: entries.length - skippedEntries,
  skippedUnchanged: skippedEntries,
}, null, 2))

function parseArgs(values) {
  const parsed = {}
  for (let index = 0; index < values.length; index++) {
    const value = values[index]
    if (!value.startsWith('--')) continue
    const key = value.slice(2)
    if (key === 'write') parsed.write = true
    else parsed[key] = values[++index]
  }
  return parsed
}

async function loadDeliverySnapshot(options) {
  if (options['delivery-snapshot']) {
    return JSON.parse(await readFile(resolve(options['delivery-snapshot']), 'utf8'))
  }
  const space = process.env.CONTENTFUL_SPACE_ID
  const token = process.env.CONTENTFUL_TOKEN
  if (!space || !token) return null
  const environment = options.environment || process.env.CONTENTFUL_ENVIRONMENT || 'master'
  const url = new URL(
    `https://cdn.contentful.com/spaces/${space}/environments/${environment}/entries`,
  )
  url.searchParams.set('access_token', token)
  url.searchParams.set('limit', '1000')
  url.searchParams.set('include', '10')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Contentful Delivery API returned ${response.status}`)
  return response.json()
}

function stateOf(entry) {
  if (entry.sys.archivedAt) return 'archived'
  if (!entry.sys.publishedAt) return 'draft'
  const changedByVersion =
    Number.isInteger(entry.sys.version) &&
    Number.isInteger(entry.sys.publishedVersion) &&
    entry.sys.version > entry.sys.publishedVersion + 1
  const changedByDate =
    entry.sys.updatedAt &&
    new Date(entry.sys.updatedAt).getTime() > new Date(entry.sys.publishedAt).getTime()
  return changedByVersion || changedByDate ? 'changed' : 'published'
}

function localize(fields = {}, localeCode) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    key,
    value && typeof value === 'object' && !Array.isArray(value) && localeCode in value
      ? value[localeCode]
      : value,
  ]))
}

function toSlug(value) {
  if (!value) throw new Error('Cannot create a slug without a title')
  return String(value)
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[*+~.()'"!:@]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function entrySlug(entry, localeCode) {
  const fields = localize(entry.fields, localeCode)
  return toSlug(fields.slug || fields.name || fields.title)
}

function collectAssetIds(value, output) {
  if (!value || typeof value !== 'object') return
  if (
    value.sys?.id &&
    (value.sys.linkType === 'Asset' || value.sys.type === 'Asset')
  ) {
    output.add(value.sys.id)
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    collectAssetIds(child, output)
  }
}

function assetMetadata(asset, localeCode) {
  if (!asset) return null
  const fields = localize(asset.fields, localeCode)
  const file = fields.file
  if (!file) return null
  const dimensions = file.details?.image
  return {
    filename: file.fileName || basename(file.url || asset.sys.id),
    mimeType: file.contentType || 'application/octet-stream',
    url: file.url?.startsWith('//') ? `https:${file.url}` : file.url,
    alt: fields.description || fields.title || '',
    caption: fields.title || undefined,
    width: dimensions?.width,
    height: dimensions?.height,
  }
}

function placeholderMedia(ids, exported, delivered, localeCode) {
  return new Map([...ids].map(id => {
    const metadata = assetMetadata(exported.get(id) || delivered.get(id), localeCode)
    if (!metadata) throw new Error(`Missing exported asset metadata: ${id}`)
    return [id, {
      id: `dry-run-${id}`,
      url: `/_emdash/api/media/file/dry-run-${id}`,
      ...metadata,
    }]
  }))
}

function mediaReference(media, metadata) {
  const storageKey = media.storageKey || media.key
  return {
    id: media.id,
    provider: 'local',
    url: `/_emdash/api/media/file/${storageKey}`,
    filename: metadata.filename,
    mimeType: metadata.mimeType,
    alt: metadata.alt,
    caption: metadata.caption,
    width: media.width || metadata.width,
    height: media.height || metadata.height,
    ...(storageKey ? { meta: { storageKey } } : {}),
  }
}

function entryData(entry, media, localeCode) {
  const fields = localize(entry.fields, localeCode)
  const asset = link => {
    const id = link?.sys?.id
    if (!id || !media.has(id)) throw new Error(`Unresolved asset link: ${id || 'missing ID'}`)
    return media.get(id)
  }
  const content = convertContentfulRichText(
    fields.description || fields.content,
    id => media.get(id),
  )

  if (entry.sys.contentType.sys.id === 'event') {
    const featured = fields.featuredImage ? asset(fields.featuredImage) : null
    return {
      title: fields.name,
      start_date: fields.dateStart,
      end_date: fields.dateEnd,
      ...(featured ? {
        featured_image: {
          id: featured.id,
          provider: 'local',
          alt: featured.alt,
          width: featured.width,
          height: featured.height,
          ...(featured.meta ? { meta: featured.meta } : {}),
        },
      } : {}),
      content,
    }
  }

  return { title: fields.title, content }
}

function entrySeo(collection, data) {
  if (collection !== 'events') return undefined
  const description = portableTextDescription(data.content)
  const storageKey = data.featured_image?.meta?.storageKey
  return {
    ...(description ? { description } : {}),
    ...(typeof storageKey === 'string'
      ? { image: `/_emdash/api/media/file/${storageKey}` }
      : {}),
  }
}

function duplicates(values) {
  const seen = new Set()
  const result = new Set()
  for (const value of values) {
    if (seen.has(value)) result.add(value)
    seen.add(value)
  }
  return [...result]
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function referencedAssetState(entry, liveEntry, state) {
  const ids = new Set()
  collectAssetIds(entry.fields, ids)
  if (liveEntry) collectAssetIds(liveEntry.fields, ids)
  return [...ids].sort().map(id => [id, state.assets[id]])
}

function findById(items, id) {
  if (!id) return undefined
  return [...items.values()].find(item => item.id === id)
}

async function indexFiles(root) {
  const output = []
  async function walk(directory) {
    for (const item of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
      const path = join(directory, item.name)
      if (item.isDirectory()) await walk(path)
      else if (item.isFile()) output.push(path)
    }
  }
  await walk(root)
  return output
}

async function readAsset(metadata, assetId, files) {
  const matches = files.filter(path => basename(path) === metadata.filename)
  const local = matches.find(path => path.includes(assetId))
  if (!local && matches.length > 1) {
    throw new Error(`Ambiguous downloaded asset filename: ${metadata.filename}`)
  }
  const downloaded = local || matches[0]
  if (downloaded) return readFile(downloaded)
  if (!metadata.url) throw new Error(`Downloaded asset not found: ${metadata.filename}`)
  const response = await fetch(metadata.url)
  if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${metadata.url}`)
  return Buffer.from(await response.arrayBuffer())
}

async function readState(path) {
  try {
    const state = JSON.parse(await readFile(path, 'utf8'))
    return { assets: state.assets ?? {}, entries: state.entries ?? {} }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { assets: {}, entries: {} }
  }
}

async function createApi(baseUrl, token) {
  let cookie
  if (!token && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl)) {
    const response = await fetch(`${baseUrl}/_emdash/api/auth/dev-bypass`, { redirect: 'manual' })
    cookie = response.headers.get('set-cookie')?.split(';', 1)[0]
  }

  async function request(path, { method = 'GET', body, form } = {}) {
    const headers = new Headers({ Accept: 'application/json', 'X-EmDash-Request': '1' })
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (cookie) headers.set('Cookie', cookie)
    if (body !== undefined) headers.set('Content-Type', 'application/json')
    const response = await fetch(`${baseUrl}/_emdash/api${path}`, {
      method,
      headers,
      body: form || (body === undefined ? undefined : JSON.stringify(body)),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(
        `${method} ${path} failed (${response.status}): ` +
        `${payload?.error?.message || response.statusText}`,
      )
    }
    return payload?.data
  }

  return {
    json: (path, options) => request(path, options),
    form: (path, form) => request(path, { method: 'POST', form }),
  }
}

async function assertSchema(api) {
  const result = await api.json('/schema/collections')
  const names = new Set(result.items.map(item => item.slug))
  for (const required of ['events', 'pages']) {
    if (!names.has(required)) {
      throw new Error(`Missing EmDash collection "${required}". Run npm run emdash:init first.`)
    }
  }
}

async function listAll(api, path) {
  const items = []
  let cursor
  do {
    const query = new URLSearchParams({ limit: '100' })
    if (cursor) query.set('cursor', cursor)
    const result = await api.json(`${path}?${query}`)
    items.push(...result.items)
    cursor = result.nextCursor
  } while (cursor)
  return items
}

async function contentBySlug(api, collection, trash = false) {
  const items = await listAll(api, `/content/${collection}${trash ? '/trash' : ''}`)
  return new Map(items.filter(item => item.slug).map(item => [item.slug, item]))
}

async function replaceCurrentEventsMenu(api, events) {
  const targets = CURRENT_EVENTS.map(item => {
    const event = events.get(item.slug)
    if (!event) throw new Error(`Cannot build current-events menu; missing ${item.slug}`)
    return {
      type: 'collection',
      label: item.label,
      referenceCollection: 'events',
      referenceId: event.translationGroup || event.id,
    }
  })

  const menu = await api.json(`/menus/current-events?locale=nl`)
  const current = menu.items ?? []
  const unchanged = current.length === targets.length && current.every((item, index) =>
    item.label === targets[index].label &&
    item.referenceCollection === 'events' &&
    item.referenceId === targets[index].referenceId,
  )
  if (unchanged) return

  for (const item of current) {
    await api.json(`/menus/current-events/items/${item.id}?locale=nl`, { method: 'DELETE' })
  }
  for (const item of targets) {
    await api.json('/menus/current-events/items?locale=nl', { method: 'POST', body: item })
  }
}
