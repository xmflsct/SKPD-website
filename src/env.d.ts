/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface ImportMetaEnv {
  readonly CF_ACCESS_TEAM_DOMAIN?: string
  readonly CF_ACCESS_AUDIENCE?: string
}
