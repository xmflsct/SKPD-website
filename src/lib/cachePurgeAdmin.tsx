import { Banner, Button, LayerCard, Text } from '@cloudflare/kumo'
import { useState } from 'react'
import { apiFetch, parseApiResponse } from 'emdash/plugin-utils'

const targets = [
  { id: 'home', label: 'Homepage', description: 'The front page only.' },
  { id: 'events', label: 'Events and archive', description: 'Event listings and article pages.' },
  { id: 'pages', label: 'Static pages', description: 'Pages such as Over SKPD.' },
  { id: 'menus', label: 'Menus', description: 'Pages that include menu content.' },
  { id: 'all', label: 'All public pages', description: 'Everything currently cached by the site.' },
] as const

type Target = (typeof targets)[number]['id']
type Status = { variant: 'success' | 'error'; message: string } | null

export function CachePage() {
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState<Status>(null)

  async function purge(target: Target) {
    setBusy(target)
    setStatus(null)
    try {
      await parseApiResponse(
        await apiFetch('/_emdash/api/plugins/skpd-cache/purge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        }),
        'Cache purge failed',
      )
      setStatus({ variant: 'success', message: 'The selected cache entries were purged.' })
    } catch (error) {
      setStatus({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Cache purge failed',
      })
    } finally {
      setBusy('')
    }
  }

  return (
    <main style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
      <div>
        <Text as="h1" variant="heading1">Cache</Text>
        <Text size="sm" variant="secondary">
          Purge cached public pages after a deployment or content change.
        </Text>
      </div>
      <LayerCard>
        <LayerCard.Secondary>
          <Text as="h2" variant="heading3">Purge by scope</Text>
          <Text size="sm" variant="secondary">
            Choose the smallest scope that contains the change.
          </Text>
        </LayerCard.Secondary>
        <LayerCard.Primary>
          <div style={{ display: 'grid', gap: 16 }}>
            {targets.map(({ id, label, description }) => (
              <div
                key={id}
                style={{ alignItems: 'center', display: 'flex', gap: 16, justifyContent: 'space-between' }}
              >
                <div>
                  <Text as="span" bold variant="body">{label}</Text>
                  <Text size="sm" variant="secondary">{description}</Text>
                </div>
                <Button
                  disabled={busy !== ''}
                  loading={busy === id}
                  onClick={() => purge(id)}
                  variant={id === 'all' ? 'primary' : 'secondary'}
                >
                  Purge
                </Button>
              </div>
            ))}
          </div>
        </LayerCard.Primary>
      </LayerCard>
      {status && (
        <Banner
          role={status.variant === 'error' ? 'alert' : 'status'}
          title={status.variant === 'error' ? 'Purge failed' : 'Cache purged'}
          description={status.message}
          variant={status.variant === 'error' ? 'error' : 'default'}
        />
      )}
    </main>
  )
}

export const pages = { '/': CachePage }
