import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalSiteUrl,
  responsiveImageDimensions,
  responsiveImageWidths,
} from '../src/lib/responsiveImages.mjs'

test('canonicalizes same-site media URLs without changing external URLs', () => {
  assert.equal(
    canonicalSiteUrl('http://skpd.nl/_emdash/api/media/file/image.jpg', 'https://www.skpd.nl'),
    'https://www.skpd.nl/_emdash/api/media/file/image.jpg',
  )
  assert.equal(
    canonicalSiteUrl('/_emdash/api/media/file/image.jpg', 'https://www.skpd.nl'),
    'https://www.skpd.nl/_emdash/api/media/file/image.jpg',
  )
  assert.equal(
    canonicalSiteUrl('https://images.example/image.jpg', 'https://www.skpd.nl'),
    'https://images.example/image.jpg',
  )
})

test('creates responsive candidates without upscaling the R2 original', () => {
  assert.deepEqual(responsiveImageDimensions(877, 2480), { width: 782, height: 2211 })
  assert.deepEqual(responsiveImageWidths(877, 782), [320, 480, 640, 782, 877])
  assert.deepEqual(responsiveImageWidths(162, 162), [162])
})
