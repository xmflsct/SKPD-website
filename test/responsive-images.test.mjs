import assert from 'node:assert/strict'
import test from 'node:test'
import {
  responsiveImageDimensions,
  responsiveImageWidths,
} from '../src/lib/responsiveImages.mjs'

test('creates responsive candidates without upscaling the R2 original', () => {
  assert.deepEqual(responsiveImageDimensions(877, 2480), { width: 782, height: 2211 })
  assert.deepEqual(responsiveImageWidths(877, 782), [320, 480, 640, 782, 877])
  assert.deepEqual(responsiveImageWidths(162, 162), [162])
})
