import assert from 'node:assert/strict'
import test from 'node:test'
import { retryTransientSocketError } from '../scripts/lib/retry-transient-socket-error.mjs'

test('retries a media upload once when its socket is closed', async () => {
  let attempts = 0
  const result = await retryTransientSocketError(async () => {
    attempts++
    if (attempts === 1) {
      const error = new TypeError('fetch failed')
      error.cause = { code: 'UND_ERR_SOCKET' }
      throw error
    }
    return 'uploaded'
  })

  assert.equal(result, 'uploaded')
  assert.equal(attempts, 2)
})
