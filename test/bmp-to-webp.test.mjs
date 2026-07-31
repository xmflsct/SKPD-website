import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { bmpToWebp, decodeBmp24 } from '../scripts/lib/bmp-to-webp.mjs'

test('decodes an uncompressed bottom-up 24-bit BMP and converts it to lossless WebP', async () => {
  const bmp = Buffer.alloc(70)
  bmp.write('BM')
  bmp.writeUInt32LE(bmp.length, 2)
  bmp.writeUInt32LE(54, 10)
  bmp.writeUInt32LE(40, 14)
  bmp.writeInt32LE(2, 18)
  bmp.writeInt32LE(2, 22)
  bmp.writeUInt16LE(1, 26)
  bmp.writeUInt16LE(24, 28)
  bmp.set([
    255, 0, 0, 255, 255, 255, 0, 0,
    0, 0, 255, 0, 255, 0, 0, 0,
  ], 54)

  const decoded = decodeBmp24(bmp)
  assert.deepEqual([...decoded.data], [
    255, 0, 0, 0, 255, 0,
    0, 0, 255, 255, 255, 255,
  ])

  const webp = await bmpToWebp(bmp)
  const metadata = await sharp(webp).metadata()
  assert.deepEqual(
    { format: metadata.format, width: metadata.width, height: metadata.height },
    { format: 'webp', width: 2, height: 2 },
  )
  assert.deepEqual(await sharp(webp).raw().toBuffer(), decoded.data)
})
