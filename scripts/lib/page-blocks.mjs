import { createHash } from 'node:crypto'

const MEDIA_FILE_PREFIX = '/_emdash/api/media/file/'

export function storageKeyFromUrl(value) {
  if (typeof value !== 'string') return undefined
  let pathname
  try {
    pathname = new URL(value, 'https://emdash.invalid').pathname
  } catch {
    return undefined
  }
  if (!pathname.startsWith(MEDIA_FILE_PREFIX)) return undefined
  const encoded = pathname.slice(MEDIA_FILE_PREFIX.length)
  if (!encoded) return undefined
  try {
    return decodeURIComponent(encoded)
  } catch {
    return encoded
  }
}

export function mediaStorageKey(media) {
  const direct = media?.storageKey || media?.key || media?.meta?.storageKey
  if (typeof direct === 'string' && direct) return direct
  return storageKeyFromUrl(media?.url || media?.src || media?.previewUrl)
}

export function indexMedia(items) {
  const byStorageKey = new Map()
  for (const item of items) {
    const storageKey = mediaStorageKey(item)
    if (!storageKey) continue
    const matches = byStorageKey.get(storageKey) || []
    matches.push(item)
    byStorageKey.set(storageKey, matches)
  }
  return byStorageKey
}

function stableKey(pageSlug, type, index, source) {
  return createHash('sha256')
    .update(`${pageSlug}\0${type}\0${index}\0${source}`)
    .digest('hex')
    .slice(0, 24)
}

function nativeFile(media, storageKey, legacy) {
  if (typeof media.id !== 'string' || !media.id) {
    throw new Error(`Media item for "${storageKey}" has no EmDash media id`)
  }
  return {
    id: media.id,
    provider: media.provider || 'local',
    filename: media.filename || legacy.filename,
    mimeType: media.mimeType || legacy.mimeType,
    ...(typeof media.size === 'number' ? { size: media.size } : {}),
    url: media.url || `/_emdash/api/media/file/${storageKey}`,
    meta: { ...(media.meta || {}), storageKey },
  }
}

export function planPageBlocks(nodes, mediaItems, pageSlug = 'over-skpd') {
  const source = Array.isArray(nodes) ? nodes : []
  const mediaIndex = indexMedia(mediaItems)
  const blocks = []
  const pendingText = []
  const unresolved = []
  const ambiguous = []
  let resolvedMediaCount = 0

  const flushText = () => {
    if (pendingText.length === 0) return
    const index = blocks.length
    const identity = pendingText.map(node => node?._key || node?._type || '').join('|')
    blocks.push({
      _type: 'rich_text',
      _version: 1,
      _key: stableKey(pageSlug, 'rich_text', index, identity),
      content: pendingText.splice(0),
    })
  }

  for (const node of source) {
    if (node?._type !== 'file') {
      pendingText.push(node)
      continue
    }

    flushText()
    const storageKey = storageKeyFromUrl(node.url)
    const title = typeof node.label === 'string' && node.label.trim()
      ? node.label.trim()
      : typeof node.filename === 'string' && node.filename.trim()
        ? node.filename.trim()
        : undefined

    if (!storageKey || !title) {
      unresolved.push({ filename: node.filename, url: node.url, reason: !storageKey ? 'missing storage key' : 'missing title' })
      continue
    }

    const matches = mediaIndex.get(storageKey) || []
    if (matches.length === 0) {
      unresolved.push({ storageKey, filename: node.filename, reason: 'media item not found' })
      continue
    }
    if (matches.length > 1) {
      ambiguous.push({ storageKey, filename: node.filename, mediaIds: matches.map(item => item.id) })
      continue
    }

    const index = blocks.length
    blocks.push({
      _type: 'download',
      _version: 1,
      _key: stableKey(pageSlug, 'download', index, node._key || storageKey),
      title,
      description: null,
      file: nativeFile(matches[0], storageKey, node),
    })
    resolvedMediaCount++
  }
  flushText()

  const report = {
    page: pageSlug,
    sourcePortableTextNodeCount: source.length,
    resultBlockCount: blocks.length,
    richTextBlockCount: blocks.filter(block => block._type === 'rich_text').length,
    downloadBlockCount: blocks.filter(block => block._type === 'download').length,
    resolvedMediaCount,
    unresolvedMediaCount: unresolved.length,
    ambiguousMediaMatchCount: ambiguous.length,
    unresolved,
    ambiguous,
  }

  return { blocks, report, valid: unresolved.length === 0 && ambiguous.length === 0 }
}

export function migratePortableTextToBlocks(nodes, mediaItems, pageSlug = 'over-skpd') {
  const result = planPageBlocks(nodes, mediaItems, pageSlug)
  if (!result.valid) {
    const error = new Error('Cannot migrate page: every legacy file must resolve to one Media Library item')
    error.report = result.report
    throw error
  }
  return result
}
