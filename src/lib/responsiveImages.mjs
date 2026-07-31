const BREAKPOINTS = [320, 480, 640, 750, 782, 960, 1080, 1280, 1600, 1920]

export function responsiveImageDimensions(sourceWidth, sourceHeight, maxWidth = 782) {
  const width = Math.min(sourceWidth, maxWidth)
  return { width, height: Math.round(width * sourceHeight / sourceWidth) }
}

export function responsiveImageWidths(sourceWidth, displayWidth) {
  const cap = Math.min(sourceWidth, displayWidth * 2)
  return [...new Set([...BREAKPOINTS, displayWidth, cap])]
    .filter(width => width <= cap)
    .sort((a, b) => a - b)
}
