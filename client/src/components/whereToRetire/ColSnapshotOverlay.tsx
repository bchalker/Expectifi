import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import type { DestinationCatalogEntry } from '../../data/destinations'
import {
  fetchLivingCostSnapshot,
  getCachedLivingCostSnapshot,
  type LivingCostSnapshot,
} from '../../lib/api/livingCost'
import { livingCostPathForEntry } from '../../lib/whereToRetire/livingCostPath'
import { fmt, fmtMon } from '../../utils/format'
import './ColSnapshotOverlay.scss'

export type ColOverlayTarget = {
  entry: DestinationCatalogEntry
}

type Props = {
  target: ColOverlayTarget | null
  onClose: () => void
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return fmt(n)
}

function SummaryTiles({ snapshot }: { snapshot: LivingCostSnapshot }) {
  const s = snapshot.summary
  const tiles = [
    { label: 'Rent + utilities', value: fmtUsd(s.rentSingleUsd) },
    { label: 'Food', value: fmtUsd(s.foodSingleUsd) },
    { label: 'Transport', value: fmtUsd(s.transportSingleUsd) },
    { label: 'Salary after tax', value: fmtUsd(s.salaryUsd) },
  ]
  return (
    <div className="wtr-col-overlay__summary">
      {tiles.map((t) => (
        <div className="wtr-col-overlay__stat" key={t.label}>
          <span className="wtr-col-overlay__stat-label">{t.label}</span>
          <span className="wtr-col-overlay__stat-value">{t.value}</span>
        </div>
      ))}
    </div>
  )
}

function SnapshotBody({ snapshot }: { snapshot: LivingCostSnapshot }) {
  const s = snapshot.summary
  return (
    <>
      <div className="wtr-col-overlay__totals">
        <div className="wtr-col-overlay__total-block">
          <span className="wtr-col-overlay__total-label">Single person</span>
          <span className="wtr-col-overlay__total-value">{fmtMon(s.totalSingleUsd ?? 0)}</span>
        </div>
        {s.totalFamilyUsd != null ? (
          <div className="wtr-col-overlay__total-block">
            <span className="wtr-col-overlay__total-label">Family of 4</span>
            <span className="wtr-col-overlay__total-value">{fmtMon(s.totalFamilyUsd)}</span>
          </div>
        ) : null}
      </div>

      <SummaryTiles snapshot={snapshot} />

      <div className="wtr-col-overlay__meta-row">
        {s.qualityScore != null ? (
          <span className="wtr-col-overlay__meta-chip">
            Quality of life <strong>{Math.round(s.qualityScore)}</strong>
          </span>
        ) : null}
        {s.population ? (
          <span className="wtr-col-overlay__meta-chip">
            Population <strong>{s.population}</strong>
          </span>
        ) : null}
      </div>

      <div className="wtr-col-overlay__categories">
        {snapshot.categories.map((cat) => (
          <details key={cat.name} className="wtr-col-overlay__category" open>
            <summary className="wtr-col-overlay__category-head">{cat.name}</summary>
            <ul className="wtr-col-overlay__price-list">
              {cat.items.map((item) => (
                <li key={item.label} className="wtr-col-overlay__price-row">
                  <span className="wtr-col-overlay__price-label">{item.label}</span>
                  <span className="wtr-col-overlay__price-value">{fmt(item.usd)}</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <p className="wtr-col-overlay__source">
        Data from{' '}
        <a
          href={`https://livingcost.org/cost/${snapshot.path}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          livingcost.org
        </a>
        . Crowdsourced estimates — not financial advice.
      </p>
    </>
  )
}

function LoadingState() {
  return (
    <div className="wtr-col-overlay__loading" role="status" aria-live="polite">
      <span className="wtr-col-overlay__spinner" aria-hidden />
      <span>Loading cost of living data…</span>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="wtr-col-overlay__error" role="alert">
      <p>{message}</p>
      <button type="button" className="wtr-col-overlay__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function ColSnapshotOverlay({ target, onClose }: Props) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [snapshot, setSnapshot] = useState<LivingCostSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pathRef = useRef<string | null>(null)

  const load = useCallback(async (path: string) => {
    const cached = getCachedLivingCostSnapshot(path)
    if (cached) {
      setSnapshot(cached)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    setSnapshot(null)
    try {
      const data = await fetchLivingCostSnapshot(path)
      if (pathRef.current !== path) return
      setSnapshot(data)
    } catch {
      if (pathRef.current !== path) return
      setError('Could not load cost of living data. The destination may not be listed on livingcost.org.')
    } finally {
      if (pathRef.current === path) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!target) {
      pathRef.current = null
      setSnapshot(null)
      setLoading(false)
      setError(null)
      return
    }

    const path = livingCostPathForEntry(target.entry)
    pathRef.current = path
    const cached = getCachedLivingCostSnapshot(path)
    if (cached) {
      setSnapshot(cached)
      setLoading(false)
      setError(null)
      return
    }
    setSnapshot(null)
    setLoading(true)
    setError(null)
    void load(path)
  }, [target, load])

  useEffect(() => {
    if (!target) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [target])

  useEffect(() => {
    if (!target) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [target, onClose])

  useEffect(() => {
    if (!target) return
    closeRef.current?.focus()
  }, [target])

  useEffect(() => {
    if (!target) return
    const panel = panelRef.current
    if (!panel) return

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const nodes = focusable()
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [target, snapshot, loading, error])

  if (!target) return null

  const path = livingCostPathForEntry(target.entry)
  const flag = target.entry.flagEmoji ?? ''
  const displayName = snapshot?.name ?? target.entry.name

  return createPortal(
    <div className="wtr-col-overlay" role="presentation">
      <button
        type="button"
        className="wtr-col-overlay__backdrop"
        aria-label="Close cost of living details"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="wtr-col-overlay__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          ref={closeRef}
          type="button"
          className="wtr-col-overlay__close"
          aria-label="Close"
          onClick={onClose}
        >
          <IconX size={20} stroke={1.5} aria-hidden />
        </button>

        <header className="wtr-col-overlay__header">
          <h2 id={titleId} className="wtr-col-overlay__title">
            {flag ? <span className="wtr-col-overlay__flag">{flag}</span> : null}
            {displayName}
          </h2>
          {snapshot?.summary.totalSingleUsd != null ? (
            <p className="wtr-col-overlay__hero">
              <span className="wtr-col-overlay__hero-label">Cost of living</span>
              <span className="wtr-col-overlay__hero-value">{fmtMon(snapshot.summary.totalSingleUsd)}</span>
              <span className="wtr-col-overlay__hero-sub">per month · single person</span>
            </p>
          ) : null}
        </header>

        <div className="wtr-col-overlay__body">
          {loading ? <LoadingState /> : null}
          {!loading && error ? (
            <ErrorState message={error} onRetry={() => void load(path)} />
          ) : null}
          {!loading && !error && snapshot ? <SnapshotBody snapshot={snapshot} /> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
