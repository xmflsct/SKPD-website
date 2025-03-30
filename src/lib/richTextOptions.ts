import type { Options } from '@contentful/rich-text-html-renderer'
import { BLOCKS, INLINES } from '@contentful/rich-text-types'

export const richTextOptions: Partial<Options> = {
  renderNode: {
    [BLOCKS.EMBEDDED_ASSET]: node => {
      if (!node?.data?.target?.fields) {
        return ''
      }
      if (node.data.target.fields.file.contentType.startsWith('image')) {
        return (`<p><img src="${node.data.target.fields.file.url}?w=782&q=80&fm=jpg&fl=progressive" alt="${node.data.target.fields.title}" /></p>`
        )
      } else {
        return (`<p><a href="${node.data.target.fields.file.url}" target="_blank" rel="noopener noreferrer">${node.data.target.fields.title} 📄</a></p>`
        )
      }
    },
    [INLINES.HYPERLINK]: node => (
      `<a href="${node.data.uri}" target="_blank" rel="noopener noreferrer">${node.content[0].value}</a>`
    ),
    [INLINES.ASSET_HYPERLINK]: node => (
      `<a href="${node.data.target.fields.file.url}" target="_blank" rel="noopener noreferrer">${node.content[0].value}</a>`
    )
  }
}
