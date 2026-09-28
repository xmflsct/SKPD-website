-- Project schema migration: pages.content becomes an optional legacy fallback.
-- This changes schema metadata only; values in ec_pages.content are untouched.
UPDATE _emdash_fields
SET required = 0,
    label = 'Inhoud (legacy)'
WHERE collection_id = (
    SELECT id FROM _emdash_collections WHERE slug = 'pages'
  )
  AND slug = 'content'
  AND type = 'portableText'
  AND column_type = 'JSON'
  AND required = 1;
