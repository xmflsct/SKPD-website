import assert from 'node:assert/strict'
import test from 'node:test'
import { validateBlocks } from '@emdash-cms/blocks'

test('allows document MIME filters in the patched Media Library picker', () => {
  const result = validateBlocks([
    {
      type: 'fields',
      fields: [
        {
          type: 'media_picker',
          action_id: 'url',
          label: 'Bestand',
          mime_type_filter: 'application/',
          value: '',
        },
      ],
    },
  ])

  assert.equal(result.valid, true)
  assert.equal(result.errors.length, 0)
})
