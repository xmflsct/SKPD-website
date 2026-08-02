import assert from 'node:assert/strict'

const baseUrl = process.env.WORKERS_PREVIEW_URL?.trim()
if (!baseUrl) throw new Error('WORKERS_PREVIEW_URL is required')

const base = new URL(baseUrl)
if (!['http:', 'https:'].includes(base.protocol)) {
  throw new Error('WORKERS_PREVIEW_URL must use http or https')
}

const checks = [
  ['/archief', 200, /<html[\s>]/i],
  ['/over-skpd', 200, /<html[\s>]/i],
  ['/robots.txt', 200, /Sitemap:/],
  ['/sitemap.xml', 200, /sitemapindex/],
]

async function check(path, expectedStatus, expectedBody) {
  const response = await fetch(new URL(path, base))
  const body = await response.text()
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`)
  assert.match(body, expectedBody, `${path} returned an unexpected body`)
  return body
}

const home = await check('/', 200, /<html[\s>]/i)
for (const [path, expectedStatus, expectedBody] of checks) {
  await check(path, expectedStatus, expectedBody)
}

const mediaPath = home.match(/\/_emdash\/api\/media\/file\/[^"'?\s<]+/)?.[0]
assert.ok(mediaPath, 'home page did not expose an EmDash media URL')
const media = await fetch(new URL(mediaPath, base))
assert.equal(media.status, 200, `media URL returned ${media.status}`)

const missing = await fetch(new URL('/__skpd_e2e_missing__', base))
assert.equal(missing.status, 404, `missing URL returned ${missing.status}`)

console.log(`E2E smoke passed for ${base.origin}`)
