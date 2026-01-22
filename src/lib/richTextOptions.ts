import type { Options } from '@contentful/rich-text-html-renderer'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'

export const richTextOptions: Partial<Options> = {
  renderNode: {
    [BLOCKS.EMBEDDED_ASSET]: node => {
      if (!node?.data?.target?.fields) {
        return ''
      }
      if (node.data.target.fields.file.contentType.startsWith('image')) {
        const url = node.data.target.fields.file.url.startsWith('//')
          ? `https:${node.data.target.fields.file.url}`
          : node.data.target.fields.file.url

        const widths = [400, 782, 1200]
        const srcset = widths
          .map(w => `${url}?w=${w}&q=80&fm=webp ${w}w`)
          .join(', ')

        // Assuming standard prose width behavior
        const sizes = '(max-width: 768px) 100vw, 782px'

        return (`<figure class="my-6"><img src="${url}?w=782&q=80&fm=webp" srcset="${srcset}" sizes="${sizes}" alt="${node.data.target.fields.title}" class="rounded-lg shadow-sm" loading="lazy" /></figure>`
        )
      } else {
        return (`<p><a href="${node.data.target.fields.file.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">${node.data.target.fields.title} <span>📄</span></a></p>`
        )
      }
    },
    [INLINES.HYPERLINK]: node => (
      `<a href="${node.data.uri}" target="_blank" rel="noopener noreferrer">${(node.content[0] as any).value}</a>`
    ),
    [INLINES.ASSET_HYPERLINK]: node => (
      `<a href="${node.data.target.fields.file.url}" target="_blank" rel="noopener noreferrer">${(node.content[0] as any).value}</a>`
    )
  }
}
