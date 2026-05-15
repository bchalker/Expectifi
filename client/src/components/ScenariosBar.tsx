import { useCallback, useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { useAuth } from '../context/AuthContext'
import { ApiRequestError, apiFetchJson } from '../lib/api'
import type { AppSnapshotV1 } from '../lib/appSnapshot'
import type { ScenarioRow } from '../lib/database.types'

type ListResponse = { ok: true; scenarios: ScenarioRow[] }

type Props = {
  getSnapshot: () => AppSnapshotV1
  onLoadSnapshot: (s: AppSnapshotV1) => void
}

export function ScenariosBar({ getSnapshot, onLoadSnapshot }: Props) {
  const { apiReady, user, loading } = useAuth()
  const [rows, setRows] = useState<ScenarioRow[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([])
      return
    }
    setListError(null)
    try {
      const data = await apiFetchJson<ListResponse>('/api/scenarios')
      setRows(data.scenarios ?? [])
    } catch (e) {
      if (e instanceof ApiRequestError && e.status === 401) {
        setRows([])
        return
      }
      setListError(e instanceof Error ? e.message : 'Failed to load scenarios')
    }
  }, [user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function saveCurrent() {
    if (!user) return
    const name = window.prompt('Save scenario as…', 'My scenario')
    if (!name?.trim()) return
    setBusy(true)
    try {
      const snapshot = getSnapshot()
      await apiFetchJson<{ ok: true }>('/api/scenarios', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), inputs: snapshot }),
      })
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this saved scenario?')) return
    setBusy(true)
    try {
      await apiFetchJson<{ ok: true }>(`/api/scenarios/${encodeURIComponent(id)}`, { method: 'DELETE' })
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function loadSelected(id: string) {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    const raw = row.inputs
    if (!raw || typeof raw !== 'object') return
    const snap = raw as AppSnapshotV1
    if (snap.version !== 1) {
      alert('Unsupported scenario format.')
      return
    }
    onLoadSnapshot(snap)
  }

  if (loading) return null

  if (!apiReady) return null

  if (!user) {
    return (
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
        Sign in to save scenarios to your account.
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <label style={{ fontFamily: 'var(--body)', fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Saved scenarios
      </label>
      <select
        className="rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-[family-name:var(--mono)] text-[var(--text-muted)]"
        style={{ minWidth: 160 }}
        defaultValue=""
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value
          e.target.value = ''
          if (v) void loadSelected(v)
        }}
      >
        <option value="">Load…</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} · {new Date(r.created_at).toLocaleDateString()}
          </option>
        ))}
      </select>
      <select
        className="rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-[family-name:var(--mono)] text-[var(--text-muted)]"
        style={{ minWidth: 140 }}
        defaultValue=""
        disabled={busy}
        onChange={(e) => {
          const v = e.target.value
          e.target.value = ''
          if (v) void remove(v)
        }}
      >
        <option value="">Delete…</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" isDisabled={busy} onPress={() => void saveCurrent()}>
        Save current
      </Button>
      <Button size="sm" variant="outline" isDisabled={busy} onPress={() => void refresh()}>
        Refresh
      </Button>
      {listError ? <span style={{ fontSize: 10, color: 'var(--danger)', fontFamily: 'var(--mono)' }}>{listError}</span> : null}
    </div>
  )
}
