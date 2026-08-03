import { useState } from 'react'
import { apiFetch, parseApiResponse } from 'emdash/plugin-utils'

const targets = [
  ['home', 'Homepage'],
  ['events', 'Events and archive'],
  ['pages', 'Static pages'],
  ['menus', 'Menus'],
  ['all', 'All public pages'],
]

export function CachePage() {
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  async function purge(target: string) {
    setBusy(target)
    setMessage('')
    try {
      await parseApiResponse(
        await apiFetch('/_emdash/api/plugins/skpd-cache/purge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        }),
        'Cache purge failed',
      )
      setMessage('Cache purged.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cache purge failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <main style={{ maxWidth: 640 }}>
      <h1>Cache</h1>
      <p>Purge cached public pages after a deployment or content change.</p>
      <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
        {targets.map(([target, label]) => (
          <button key={target} disabled={busy !== ''} onClick={() => purge(target)} type="button">
            {busy === target ? 'Purging…' : label}
          </button>
        ))}
      </div>
      {message && <p role="status" style={{ marginTop: 16 }}>{message}</p>}
    </main>
  )
}

export const pages = { '/': CachePage }
