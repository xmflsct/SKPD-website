import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ensureMigrationUploadField,
  isDefaultUploadType,
  removeMigrationUploadField,
} from '../scripts/lib/migration-upload-field.mjs'

test('temporarily authorizes document uploads without widening the global policy', async () => {
  const calls = []
  const api = {
    async json(path, options) {
      calls.push({ path, options })
      if (!options) return { items: [] }
      if (options.method === 'POST') return { item: { id: 'field-id', ...options.body } }
      return {}
    },
  }

  const field = await ensureMigrationUploadField(api, [
    'image/jpeg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  assert.equal(field.id, 'field-id')
  assert.equal(isDefaultUploadType('application/pdf'), true)
  assert.deepEqual(calls[1].options.body.validation.allowedMimeTypes, [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])

  await removeMigrationUploadField(api)
  assert.equal(calls[2].options.method, 'DELETE')
})
