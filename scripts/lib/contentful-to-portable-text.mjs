const MARKS = new Map([
  ['bold', 'strong'],
  ['italic', 'em'],
])

export function convertContentfulRichText(document, resolveAsset) {
  if (!document || document.nodeType !== 'document' || !Array.isArray(document.content)) {
    throw new Error('Expected a Contentful rich-text document')
  }

  let sequence = 0
  const key = () => `k${sequence++}`

  const asset = target => {
    const id = target?.sys?.id
    if (!id) throw new Error('Asset link is missing its Contentful ID')
    const resolved = resolveAsset(id)
    if (!resolved) throw new Error(`Unresolved Contentful asset: ${id}`)
    return resolved
  }

  const inline = nodes => {
    const children = []
    const markDefs = []

    for (const node of nodes ?? []) {
      if (node.nodeType === 'text') {
        const marks = (node.marks ?? []).map(mark => {
          const mapped = MARKS.get(mark.type)
          if (!mapped) throw new Error(`Unsupported Contentful mark: ${mark.type}`)
          return mapped
        })
        children.push({ _type: 'span', _key: key(), text: node.value ?? '', marks })
        continue
      }

      if (node.nodeType === 'hyperlink' || node.nodeType === 'asset-hyperlink') {
        const markKey = key()
        const href = node.nodeType === 'hyperlink'
          ? node.data?.uri
          : asset(node.data?.target).url
        if (!href) throw new Error(`${node.nodeType} is missing its URL`)
        markDefs.push({ _type: 'link', _key: markKey, href })
        const converted = inline(node.content)
        for (const child of converted.children) {
          children.push({ ...child, marks: [...(child.marks ?? []), markKey] })
        }
        markDefs.push(...converted.markDefs)
        continue
      }

      throw new Error(`Unsupported Contentful inline node: ${node.nodeType}`)
    }

    return { children, markDefs }
  }

  const textBlock = (node, listItem, level) => {
    const { children, markDefs } = inline(node.content)
    return {
      _type: 'block',
      _key: key(),
      style: node.nodeType === 'paragraph' ? 'normal' : node.nodeType.replace('heading-', 'h'),
      children: children.length ? children : [{ _type: 'span', _key: key(), text: '', marks: [] }],
      ...(markDefs.length ? { markDefs } : {}),
      ...(listItem ? { listItem, level } : {}),
    }
  }

  const blocks = (nodes, listItem, level = 1) => {
    const output = []

    for (const node of nodes ?? []) {
      if (node.nodeType === 'paragraph' || /^heading-[1-6]$/.test(node.nodeType)) {
        output.push(textBlock(node, listItem, level))
        continue
      }

      if (node.nodeType === 'unordered-list' || node.nodeType === 'ordered-list') {
        const kind = node.nodeType === 'unordered-list' ? 'bullet' : 'number'
        const itemLevel = listItem ? level + 1 : level
        for (const item of node.content ?? []) {
          if (item.nodeType !== 'list-item') {
            throw new Error(`Unsupported node in ${node.nodeType}: ${item.nodeType}`)
          }
          output.push(...blocks(item.content, kind, itemLevel))
        }
        continue
      }

      if (node.nodeType === 'list-item') {
        output.push(...blocks(node.content, listItem, level))
        continue
      }

      if (node.nodeType === 'embedded-asset-block') {
        const media = asset(node.data?.target)
        output.push(
          media.mimeType.startsWith('image/')
            ? {
                _type: 'image',
                _key: key(),
                asset: { _ref: media.id, url: media.url },
                alt: media.alt ?? '',
                width: media.width,
                height: media.height,
              }
            : {
                _type: 'file',
                _key: key(),
                url: media.url,
                filename: media.filename,
                label: media.caption || media.filename,
                showDownloadButton: true,
              },
        )
        continue
      }

      throw new Error(`Unsupported Contentful block node: ${node.nodeType}`)
    }

    return output
  }

  return blocks(document.content)
}

export function portableTextDescription(blocks, maxLength = 160) {
  const text = blocks
    .filter(block => block._type === 'block')
    .flatMap(block => block.children ?? [])
    .map(child => child.text ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '')
}
