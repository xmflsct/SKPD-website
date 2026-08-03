const BREAKPOINTS = [320, 480, 640, 782, 1080, 1564]

export function canonicalSiteUrl(value, siteOrigin) {
  if (!value) return undefined

  const site = new URL(siteOrigin)
  const url = new URL(value, site)
  const siteHostname = site.hostname.toLowerCase()
  const apexHostname = siteHostname.replace(/^www\./, '')

  if ([siteHostname, apexHostname].includes(url.hostname.toLowerCase())) {
    url.protocol = site.protocol
    url.host = site.host
  }

  return url.toString()
}

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
