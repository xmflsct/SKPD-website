import assert from 'node:assert/strict'
import test from 'node:test'
import { migratePortableTextToBlocks } from '../scripts/lib/page-blocks.mjs'

const paragraph = key => ({ _type: 'block', _key: key, children: [] })
const heading = key => ({ _type: 'block', _key: key, style: 'h2', children: [] })
const file = (key, name = `${key}.pdf`) => ({
  _type: 'file',
  _key: key,
  url: `/_emdash/api/media/file/${name}`,
  filename: name,
  label: key,
})
const media = (...names) => names.map((name, index) => ({
  id: `MEDIA-${index + 1}`,
  filename: name,
  mimeType: 'application/pdf',
  storageKey: name,
}))
const types = result => result.blocks.map(block => block._type)

test('groups text-only Portable Text into one rich-text block', () => {
  const result = migratePortableTextToBlocks([paragraph('a'), heading('b'), paragraph('c')], [])
  assert.deepEqual(types(result), ['rich_text'])
  assert.equal(result.blocks[0].content.length, 3)
})

test('preserves a file between text groups', () => {
  const result = migratePortableTextToBlocks([paragraph('a'), file('A'), paragraph('b')], media('A.pdf'))
  assert.deepEqual(types(result), ['rich_text', 'download', 'rich_text'])
})

test('does not add empty text blocks between consecutive files', () => {
  const result = migratePortableTextToBlocks(
    [paragraph('a'), file('A'), file('B'), paragraph('b')],
    media('A.pdf', 'B.pdf'),
  )
  assert.deepEqual(types(result), ['rich_text', 'download', 'download', 'rich_text'])
})

test('handles a file at the beginning', () => {
  const result = migratePortableTextToBlocks([file('A'), paragraph('a')], media('A.pdf'))
  assert.deepEqual(types(result), ['download', 'rich_text'])
})

test('handles a file at the end', () => {
  const result = migratePortableTextToBlocks([paragraph('a'), file('A')], media('A.pdf'))
  assert.deepEqual(types(result), ['rich_text', 'download'])
})

test('creates a native media reference object', () => {
  const result = migratePortableTextToBlocks(
    [{ _type: 'file', _key: 'foo', url: '/_emdash/api/media/file/foo.pdf', filename: 'foo.pdf', label: 'Foo' }],
    [{ id: 'MEDIA-123', filename: 'foo.pdf', mimeType: 'application/pdf', storageKey: 'foo.pdf' }],
  )
  assert.deepEqual(result.blocks[0].file, {
    id: 'MEDIA-123',
    provider: 'local',
    filename: 'foo.pdf',
    mimeType: 'application/pdf',
    url: '/_emdash/api/media/file/foo.pdf',
    meta: { storageKey: 'foo.pdf' },
  })
  assert.equal(typeof result.blocks[0].file, 'object')
})

test('resolves legacy editor nodes whose public URL is stored in id', () => {
  const result = migratePortableTextToBlocks(
    [{ _type: 'file', _key: 'foo', id: '/_emdash/api/media/file/foo.pdf', filename: 'foo.pdf', label: 'Foo' }],
    [{ id: 'MEDIA-123', filename: 'foo.pdf', mimeType: 'application/pdf', storageKey: 'foo.pdf' }],
  )
  assert.equal(result.blocks[0].file.id, 'MEDIA-123')
  assert.equal(result.blocks[0].file.meta.storageKey, 'foo.pdf')
})

test('fails when a media item is missing', () => {
  assert.throws(() => migratePortableTextToBlocks([file('A')], []), /every legacy file/)
})

test('fails when a storage key matches more than one media item', () => {
  const duplicate = { id: 'MEDIA-2', filename: 'A.pdf', storageKey: 'A.pdf' }
  assert.throws(() => migratePortableTextToBlocks([file('A')], [...media('A.pdf'), duplicate]), /every legacy file/)
})

test('generates stable unique block keys', () => {
  const input = [paragraph('a'), file('A'), paragraph('b')]
  const first = migratePortableTextToBlocks(input, media('A.pdf')).blocks
  const second = migratePortableTextToBlocks(input, media('A.pdf')).blocks
  assert.deepEqual(first.map(block => block._key), second.map(block => block._key))
  assert.equal(new Set(first.map(block => block._key)).size, first.length)
})
