const COLLECTION = 'pages'
const FIELD_SLUG = 'migration_upload'

export function isDefaultUploadType(mimeType) {
  const normalized = mimeType.split(';', 1)[0].trim().toLowerCase()
  return (
    normalized.startsWith('image/') ||
    normalized.startsWith('video/') ||
    normalized.startsWith('audio/') ||
    normalized === 'application/pdf'
  )
}

export async function ensureMigrationUploadField(api, mimeTypes) {
  const allowedMimeTypes = [...new Set(
    mimeTypes
      .map(type => type.split(';', 1)[0].trim().toLowerCase())
      .filter(type => type && !isDefaultUploadType(type)),
  )].sort()
  if (!allowedMimeTypes.length) return null

  const path = `/schema/collections/${COLLECTION}/fields`
  const fields = await api.json(path)
  const existing = fields.items.find(field => field.slug === FIELD_SLUG)
  const body = {
    label: 'Migration upload (temporary)',
    type: 'file',
    required: false,
    validation: { allowedMimeTypes },
  }

  if (existing) {
    if (existing.type !== 'file') {
      throw new Error(`Temporary migration field "${FIELD_SLUG}" has the wrong type`)
    }
    return (await api.json(`${path}/${FIELD_SLUG}`, { method: 'PUT', body })).item
  }

  return (await api.json(path, {
    method: 'POST',
    body: { slug: FIELD_SLUG, ...body },
  })).item
}

export async function removeMigrationUploadField(api) {
  await api.json(
    `/schema/collections/${COLLECTION}/fields/${FIELD_SLUG}`,
    { method: 'DELETE' },
  )
}
