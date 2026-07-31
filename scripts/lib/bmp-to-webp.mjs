import sharp from 'sharp'

export async function bmpToWebp(input) {
  const { data, width, height, channels } = decodeBmp24(input)
  return sharp(data, { raw: { width, height, channels } }).webp({ lossless: true }).toBuffer()
}

export function decodeBmp24(input) {
  const bytes = Buffer.from(input)
  if (bytes.length < 54 || bytes.toString('ascii', 0, 2) !== 'BM') {
    throw new Error('Not a Windows BMP file')
  }

  const pixelOffset = bytes.readUInt32LE(10)
  const width = bytes.readInt32LE(18)
  const storedHeight = bytes.readInt32LE(22)
  const planes = bytes.readUInt16LE(26)
  const bitsPerPixel = bytes.readUInt16LE(28)
  const compression = bytes.readUInt32LE(30)
  if (width <= 0 || storedHeight === 0 || planes !== 1 || bitsPerPixel !== 24 || compression !== 0) {
    // ponytail: the export contains one uncompressed 24-bit BMP; extend this only if another BMP variant appears.
    throw new Error('Only uncompressed 24-bit Windows BMP files are supported')
  }

  const height = Math.abs(storedHeight)
  const rowSize = Math.ceil(width * 3 / 4) * 4
  const pixelBytes = rowSize * height
  if (!Number.isSafeInteger(pixelBytes) || pixelOffset + pixelBytes > bytes.length) {
    throw new Error('BMP pixel data is truncated')
  }

  const data = Buffer.allocUnsafe(width * height * 3)
  for (let y = 0; y < height; y++) {
    const sourceY = storedHeight < 0 ? y : height - 1 - y
    const sourceRow = pixelOffset + sourceY * rowSize
    const targetRow = y * width * 3
    for (let x = 0; x < width; x++) {
      const source = sourceRow + x * 3
      const target = targetRow + x * 3
      data[target] = bytes[source + 2]
      data[target + 1] = bytes[source + 1]
      data[target + 2] = bytes[source]
    }
  }

  return { data, width, height, channels: 3 }
}
