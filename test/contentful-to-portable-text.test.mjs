import assert from 'node:assert/strict'
import test from 'node:test'
import {
  convertContentfulRichText,
  portableTextDescription,
} from '../scripts/lib/contentful-to-portable-text.mjs'

const text = (value, marks = []) => ({
  nodeType: 'text',
  value,
  marks: marks.map(type => ({ type })),
  data: {},
})

const assets = new Map([
  ['image', {
    id: 'media-image',
    url: '/_emdash/api/media/file/media-image',
    filename: 'photo.jpg',
    mimeType: 'image/jpeg',
    alt: 'Photo',
    caption: 'Photo title',
    width: 1200,
    height: 800,
  }],
  ['pdf', {
    id: 'media-pdf',
    url: '/_emdash/api/media/file/media-pdf',
    filename: 'program.pdf',
    mimeType: 'application/pdf',
  }],
  ['docx', {
    id: 'media-docx',
    url: '/_emdash/api/media/file/media-docx',
    filename: 'notes.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }],
  ['xlsx', {
    id: 'media-xlsx',
    url: '/_emdash/api/media/file/media-xlsx',
    filename: 'list.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }],
])

test('converts every Contentful rich-text shape used by SKPD', () => {
  const document = {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [
          text('Bold', ['bold']),
          text(' and italic', ['italic']),
          {
            nodeType: 'hyperlink',
            data: { uri: 'https://example.com' },
            content: [text(' link')],
          },
          {
            nodeType: 'asset-hyperlink',
            data: { target: { sys: { id: 'pdf' } } },
            content: [text(' PDF')],
          },
        ],
      },
      { nodeType: 'heading-3', data: {}, content: [text('Heading')] },
      {
        nodeType: 'unordered-list',
        data: {},
        content: [{
          nodeType: 'list-item',
          data: {},
          content: [{ nodeType: 'paragraph', data: {}, content: [text('Bullet')] }],
        }],
      },
      {
        nodeType: 'ordered-list',
        data: {},
        content: [{
          nodeType: 'list-item',
          data: {},
          content: [{ nodeType: 'paragraph', data: {}, content: [text('Number')] }],
        }],
      },
      ...['image', 'pdf', 'docx', 'xlsx'].map(id => ({
        nodeType: 'embedded-asset-block',
        data: { target: { sys: { id } } },
        content: [],
      })),
    ],
  }

  const result = convertContentfulRichText(document, id => assets.get(id))

  assert.equal(result[0].children[0].marks[0], 'strong')
  assert.equal(result[0].children[1].marks[0], 'em')
  assert.deepEqual(result[0].markDefs.map(mark => mark.href), [
    'https://example.com',
    '/_emdash/api/media/file/media-pdf',
  ])
  assert.equal(result[1].style, 'h3')
  assert.equal(result[2].listItem, 'bullet')
  assert.equal(result[3].listItem, 'number')
  assert.equal(result[4]._type, 'image')
  assert.equal('caption' in result[4], false)
  assert.deepEqual(result.slice(5).map(block => block._type), ['file', 'file', 'file'])
  assert.deepEqual(result.slice(5).map(block => block.label), [
    'program.pdf',
    'notes.docx',
    'list.xlsx',
  ])
  assert.equal(
    portableTextDescription(result, 20),
    'Bold and italic link...',
  )
})

test('rejects unknown nodes instead of silently losing content', () => {
  assert.throws(
    () => convertContentfulRichText({
      nodeType: 'document',
      content: [{ nodeType: 'table', content: [], data: {} }],
    }, () => undefined),
    /Unsupported Contentful block node: table/,
  )
})
