import { extractPlainText } from 'emdash'
import type { ContentSeo, MediaValue, PortableTextBlock } from 'emdash'
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
  content: PortableTextBlock[]
  seo?: ContentSeo
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
