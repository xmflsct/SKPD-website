import assert from 'node:assert/strict'
import test from 'node:test'
import { isSuccessfulMenuMutation } from '../src/lib/cloudflareCache.mjs'

test('invalidates public pages only after a successful menu mutation', () => {
  assert.equal(isSuccessfulMenuMutation('POST', '/_emdash/api/menus/current-events/items', 201), true)
  assert.equal(isSuccessfulMenuMutation('GET', '/_emdash/api/menus/current-events', 200), false)
  assert.equal(isSuccessfulMenuMutation('OPTIONS', '/_emdash/api/menus/current-events', 204), false)
  assert.equal(isSuccessfulMenuMutation('PUT', '/_emdash/api/content/events/id', 200), false)
  assert.equal(isSuccessfulMenuMutation('DELETE', '/_emdash/api/menus/current-events/items/id', 500), false)
})
