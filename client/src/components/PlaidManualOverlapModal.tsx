import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import type { PlaidManualOverlapBucket } from '../lib/plaidConflict'
import {
  loadStoredManualAccounts,
  saveStoredManualAccounts,
  type ManualAccountEntry,
} from '../lib/manualAccountEntries'
import { fmt } from '../utils/format'
import { AppButton } from './ui/AppButton'
import './PlaidManualOverlapModal.scss'

type Props = {
  open: boolean
  buckets: PlaidManualOverlapBucket[]
  onDismiss: () => void
  onManualRemoved?: () => void
}

export function PlaidManualOverlapModal({ open, buckets, onDismiss, onManualRemoved }: Props) {
  const [entries, setEntries] = useState<ManualAccountEntry[]>([])

  useEffect(() => {
    if (!open) return
    setEntries(loadStoredManualAccounts()?.entries ?? [])
  }, [open, buckets])

  const removeEntry = useCallback(
    (id: string) => {
      const stored = loadStoredManualAccounts()
      if (!stored) return
      const nextEntries = stored.entries.map((e) => (e.id === id ? { ...e, balance: 0 } : e))
      saveStoredManualAccounts({ ...stored, entries: nextEntries })
      setEntries(nextEntries)
      onManualRemoved?.()
    },
    [onManualRemoved],
  )

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  if (!open || !buckets.length) return null

  return createPortal(
    <div className="plaid-manual-overlap-backdrop" role="presentation" onMouseDown={onDismiss}>
      <div
        className="plaid-manual-overlap-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plaid-manual-overlap-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="plaid-manual-overlap-modal__close" aria-label="Close" onClick={onDismiss}>
          <IconX size={18} stroke={1.5} aria-hidden />
        </button>
        <h2 id="plaid-manual-overlap-title" className="plaid-manual-overlap-modal__title">
          Review manual holdings
        </h2>
        <p className="plaid-manual-overlap-modal__lead">
          You have manually entered holdings that may overlap with your Plaid data. Would you like to review them?
        </p>

        <div className="plaid-manual-overlap-modal__buckets">
          {buckets.map((bucket) => (
            <section key={bucket.bucketKey} className="plaid-manual-overlap-modal__bucket">
              <h3 className="plaid-manual-overlap-modal__bucket-title">{bucket.bucketLabel}</h3>
              <div className="plaid-manual-overlap-modal__diff">
                <div className="plaid-manual-overlap-modal__col">
                  <span className="plaid-manual-overlap-modal__col-label">Manual</span>
                  <ul className="plaid-manual-overlap-modal__list">
                    {bucket.manualLines.map((line) => {
                      const live = entries.find((e) => e.id === line.id)
                      if (!live || live.balance <= 0) return null
                      return (
                        <li key={line.id} className="plaid-manual-overlap-modal__row">
                          <span className="plaid-manual-overlap-modal__row-label">{line.label}</span>
                          <span className="plaid-manual-overlap-modal__row-value">{fmt(live.balance)}</span>
                          <AppButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="plaid-manual-overlap-modal__remove"
                            onPress={() => removeEntry(line.id)}
                          >
                            Remove
                          </AppButton>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <div className="plaid-manual-overlap-modal__col">
                  <span className="plaid-manual-overlap-modal__col-label">Plaid</span>
                  <p className="plaid-manual-overlap-modal__plaid-total">
                    <span className="plaid-manual-overlap-modal__row-value">{fmt(bucket.plaidTotal)}</span>
                    <span className="plaid-manual-overlap-modal__plaid-note">in this bucket</span>
                  </p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <p className="plaid-manual-overlap-modal__note">
          <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
          Manual entries are never removed automatically.
        </p>

        <div className="plaid-manual-overlap-modal__footer">
          <AppButton type="button" variant="primary" size="sm" onPress={onDismiss}>
            Done reviewing
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
