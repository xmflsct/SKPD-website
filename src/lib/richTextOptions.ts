import type { Options } from '@contentful/rich-text-html-renderer'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char] || char))

const textContent = (node: any): string => {
  if (!node?.content) return ''

  return node.content.map((child: any) => {
    if (typeof child.value === 'string') return child.value
    return textContent(child)
  }).join('')
}

const normalizeUrl = (value: unknown): string => {
  const url = String(value ?? '').trim()

  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('www.')) return `https://${url}`
  if (/^(https?:|mailto:|tel:|\/)/i.test(url)) return url

  return '#'
}

export const richTextOptions: Partial<Options> = {
  renderNode: {
    [BLOCKS.EMBEDDED_ASSET]: node => {
      const fields = node?.data?.target?.fields
      if (!fields?.file) {
        return ''
      }

      const url = normalizeUrl(fields.file.url)
      const title = escapeHtml(fields.title)

      if (fields.file.contentType?.startsWith('image')) {
        const { width, height } = fields.file.details?.image || {}
        const widthAttr = width ? ` width="${escapeHtml(width)}"` : ''
        const heightAttr = height ? ` height="${escapeHtml(height)}"` : ''

        return (`<figure class="my-6"><img src="${escapeHtml(url)}?w=782&q=80&fm=webp" alt="${title}" class="rounded-lg shadow-sm" loading="lazy"${widthAttr}${heightAttr} /></figure>`
        )
      } else {
        return (`<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">${title} <span>📄</span></a></p>`
        )
      }
    },
    [INLINES.HYPERLINK]: node => (
      `<a href="${escapeHtml(normalizeUrl(node.data.uri))}" target="_blank" rel="noopener noreferrer">${escapeHtml(textContent(node))}</a>`
    ),
    [INLINES.ASSET_HYPERLINK]: node => (
      `<a href="${escapeHtml(normalizeUrl(node.data.target.fields.file.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(textContent(node))}</a>`
    )
  }
}
