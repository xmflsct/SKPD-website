import { extractPlainText } from 'emdash'
import type { ContentSeo, MediaValue, PortableTextBlock } from 'emdash'
import type { PageLayoutBlock } from '../../emdash-env'
import { canonicalSiteUrl } from './responsiveImages.mjs'

export interface EventData {
  id: string
  slug: string
  title: string
  start_date: string
  end_date: string
  featured_image?: MediaValue | null
  content: PortableTextBlock[]
  seo?: ContentSeo
}

export interface PageData {
  id: string
  slug: string
  title: string
  content?: PortableTextBlock[] | null
  layout?: PageLayoutBlock[] | null
  seo?: ContentSeo
}

export interface DownloadableFile {
  id: string
  url?: string
  src?: string
  filename?: string
  mimeType?: string
  size?: number
  provider?: string
  meta?: Record<string, unknown>
}

export function eventDescription(content: PortableTextBlock[]): string {
  const text = extractPlainText(content).replace(/\s+/g, ' ').trim()
  return text.slice(0, 160) + (text.length > 160 ? '...' : '')
}

export function mediaUrl(media: MediaValue | null | undefined, origin: string): string | undefined {
  const storageKey = media?.meta?.storageKey
  const path = typeof storageKey === 'string'
    ? `/_emdash/api/media/file/${storageKey}`
    : media?.src
  return path ? canonicalSiteUrl(path, origin) : undefined
}

export function fileUrl(file: DownloadableFile | null | undefined): string | undefined {
  if (!file) return undefined
  if (file.url) return file.url
  if (file.src) return file.src

  const storageKey = file.meta?.storageKey
  if (typeof storageKey === 'string' && storageKey) {
    return `/_emdash/api/media/file/${storageKey}`
  }

  return undefined
}
