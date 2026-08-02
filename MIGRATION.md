# Contentful to EmDash rollout

The application code, EmDash schema, `current-events` menu, importer, and the
single-Worker deployment flow are in this repository. Cloudflare resources,
Access policies, the private Contentful export, and imported data are
account-level operations and are intentionally not committed.

## 1. Configure the single Worker project

`CF_ACCESS_TEAM_DOMAIN` is required by Astro at build time; setting it only as
a Worker variable is too late. Export it in the shell or configure it in the
Cloudflare build environment, then set one Access audience as a Worker secret:

```sh
export CF_ACCESS_TEAM_DOMAIN=xmflsct.cloudflareaccess.com
npx wrangler secret put CF_ACCESS_AUDIENCE
```

Create the production resources if they do not already exist:

```sh
npx wrangler d1 create skpd-website
npx wrangler r2 bucket create skpd-website-media
```

The root `wrangler.jsonc` binds these resources to both the production Worker
and its version preview alias. There is no preview Worker or preview data pair.
Use one Access application/audience that covers both the preview alias and
`www.skpd.nl`, because the promoted version and the preview version use the
same Worker secret.

For Workers Builds, set `SKIP_DEPENDENCY_INSTALL=1`,
`SKPD_CLOUDFLARE_DEPLOYMENT=1`, and `CF_ACCESS_TEAM_DOMAIN`, then use:

- build command: `npm run typecheck && npm run test && npm run build:cloudflare`
- deploy command: `npm run upload-version`

Keep the build root at the repository root and watch the same source/config
paths covered by `.github/workflows/e2e-tests.yml`. Remove any old
`CLOUDFLARE_ENV=preview` or `CLOUDFLARE_ENV=production` build variable; it is
no longer a Wrangler environment selector.

The repository pins npm 11.6.2 in `package.json`; `build:cloudflare` installs
that version because Workers Builds' automatic installer uses its bundled npm
version and does not honor `packageManager`. Vite is pinned to 7.3.6 as well;
Astro 6's Cloudflare build currently breaks when Vite 8 is hoisted.

Set the GitHub repository variable `WORKERS_PREVIEW_URL` to the stable alias:

```text
https://preview-skpd-website.<CLOUDFLARE_WORKERS_SUBDOMAIN>.workers.dev
```

The first uploaded version must be visited once so EmDash runs its migrations
and applies `.emdash/seed.json` to the production resources.

The Access Allow policy must use the exact approved email addresses, not an
email domain or “everyone”. The first approved user to open `/_emdash/admin`
becomes Administrator; later users default to Editor.

## 2. Export Contentful privately

Run the export outside the repository with a Contentful management token:

```sh
npx contentful-cli space export \
  --space-id "$CONTENTFUL_SPACE_ID" \
  --environment-id master \
  --management-token "$CONTENTFUL_MANAGEMENT_TOKEN" \
  --export-dir /absolute/private/skpd-contentful-export \
  --content-file contentful-export.json \
  --include-drafts \
  --include-archived \
  --download-assets
```

Keep this directory private. `.contentful-export/` and the importer state file
are ignored as a second guard, but the export should not be placed in the
repository.

## 3. Import into the shared production data store

Create an EmDash API token with Administrator access after the first login.
Keep the existing read-only `CONTENTFUL_SPACE_ID` and `CONTENTFUL_TOKEN` values
available: changed Contentful entries need the Delivery API copy of their
currently published revision.

Validate without writing:

```sh
EMDASH_URL=https://preview-skpd-website.example \
EMDASH_TOKEN=... \
npm run contentful:import -- \
  --export /absolute/private/skpd-contentful-export/contentful-export.json \
  --assets /absolute/private/skpd-contentful-export
```

Import only after the dry-run report is correct:

```sh
EMDASH_URL=https://preview-skpd-website.example \
EMDASH_TOKEN=... \
npm run contentful:import -- \
  --export /absolute/private/skpd-contentful-export/contentful-export.json \
  --assets /absolute/private/skpd-contentful-export \
  --write
```

The importer is rerunnable. It preserves live and draft states, skips unchanged
entries, deduplicates media by SHA-256, converts BMP media to WebP, trashes
archived entries, and replaces the seeded menu URLs with native event
references.

The import through the preview alias writes the production D1 database and R2
bucket by design. If the currently deployed Worker still uses the old preview
pair, create/use the production pair above and rerun this import; R2 buckets
cannot be renamed in place. Keep the old pair until the production content and
media have been verified, then remove it manually.

## 4. Preview acceptance

The published Contentful snapshot contained these 25 event URLs when the
migration code was validated:

```text
/common-ground
/delftse-keramiek-dagen-2026
/delftse-keramiek-dagen-2025
/nationale-keramiekprijs-de-kei-2025
/keramiekprijs-de-kei
/keramiekprijs-de-kei-2023
/echo-van-majiayao-veertien-internationale-kunstenaars-interpreteren-een-5000-jaar-oude-keramiek-cultuur
/winnaar-de-kei-2021
/1996-keramiek-in-delft
/1995
/2000-keramiek-door-delft-1
/2001-keramiek-door-delft-2
/2001-dozen-van-klei
/2002-keramiek-door-delft-3
/2003-keramiek-door-delft-4
/2004-keramiek-door-delft-5
/2006-terra-twintig
/2009-hoog-in-je-bol
/2010-delft-pecs
/2011-brandpunt-terra
/2012-terra-in-china-china-in-terra
/delft-keramiek-2013
/china-in-terra
/jubileum-terra-30-jaar
/terras-pop-up-atelier
```

Confirm:

- Home, all 25 event URLs, `/archief`, `/over-skpd`, and a missing URL return
  the expected pages/status.
- The header order is Home, the three seeded labels, Archief, Over SKPD.
- The archive has 22 unique published events, excludes exactly the menu's three
  URLs, and includes `/winnaar-de-kei-2021`.
- Drafts, changed revisions, Trash, images, PDF/file downloads, previews, and
  mobile navigation work.
- Canonicals use `https://www.skpd.nl`; `/sitemap.xml` and `/robots.txt` work;
  `/sitemap-index.xml` redirects permanently.
- An unauthenticated admin request is intercepted by Access and an
  unauthenticated `/_emdash/api/*` write is rejected by EmDash.

Cloudflare's native Worker cache serves public pages at the edge. Request each
of `/`, `/archief`, and a representative event twice and confirm the second
response has `CF-Cache-Status: HIT`; administration and API responses must not
be cached. Publishing content purges the relevant collection tag, while a menu
edit purges the `menus` tag. Then make 20 warmed requests to each public page
and compare p75 TTFB with the existing production site.

Confirm `/sitemap.xml` lists the static, event, and page sitemaps; together they
must contain the same 28 public URLs as production. Each page must have one
description, canonical, Open Graph set, and Twitter Card set. The 404 page must
return 404 with `noindex`, and JSON-LD and canonicals must use
`https://www.skpd.nl` even on preview. Both slash forms of an existing URL must
remain reachable; the sitemap and canonical URLs use the no-trailing-slash
form consistently. Preview-host pages must also emit `noindex, nofollow`.

## 5. Ongoing deploy and rollback

For each `main` change:

1. Cloudflare Workers Builds runs type checking, unit tests, builds, and uploads
   a version tagged with the commit SHA.
2. `.github/workflows/e2e-tests.yml` runs the HTTP E2E smoke test against the
   stable preview alias.
3. The workflow promotes that exact version to 100% only after E2E succeeds.
4. Roll back from the Cloudflare dashboard using a previous Worker version.

Do not use a separate preview Worker or separate D1/R2 pair for this flow. A
separate data pair is only justified if E2E needs to mutate CMS content or test
destructive migrations; then it needs a separate Worker or an explicit data
sync step as well.
