import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '@tabler/icons-react'
import type { PlaidBrokerConflict, PlaidConflictResolution } from '../lib/plaidConflict'
import { AppButton } from './ui/AppButton'
import './PlaidBrokerConflictModal.scss'

type Props = {
  open: boolean
  conflict: PlaidBrokerConflict | null
  onResolve: (resolution: PlaidConflictResolution) => void
  onClose: () => void
}

export function PlaidBrokerConflictModal({ open, conflict, onResolve, onClose }: Props) {
  const [choice, setChoice] = useState<PlaidConflictResolution>('use_plaid')

  useEffect(() => {
    if (open) setChoice('use_plaid')
  }, [open, conflict?.broker])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !conflict) return null

  const broker = conflict.brokerLabel

  return createPortal(
    <div className="plaid-conflict-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="plaid-conflict-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plaid-conflict-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button type="button" className="plaid-conflict-modal__close" aria-label="Close" onClick={onClose}>
          <IconX size={18} stroke={1.5} aria-hidden />
        </button>
        <h2 id="plaid-conflict-title" className="plaid-conflict-modal__title">
          You already have {broker} holdings loaded
        </h2>
        <p className="plaid-conflict-modal__lead">Choose how to combine your existing data with live Plaid sync.</p>

        <div className="plaid-conflict-modal__options" role="radiogroup" aria-label="Plaid conflict resolution">
          <label
            className={`plaid-conflict-modal__option plaid-conflict-modal__option--destructive${choice === 'use_plaid' ? ' plaid-conflict-modal__option--selected' : ''}`}
          >
            <input
              type="radio"
              name="plaid-conflict"
              className="plaid-conflict-modal__radio"
              checked={choice === 'use_plaid'}
              onChange={() => setChoice('use_plaid')}
            />
            <span className="plaid-conflict-modal__option-body">
              <span className="plaid-conflict-modal__option-head">
                <span className="plaid-conflict-modal__option-title">Use Plaid</span>
                <span className="plaid-conflict-modal__tag plaid-conflict-modal__tag--recommended">Recommended</span>
              </span>
              <span className="plaid-conflict-modal__option-desc">
                Remove your existing {broker} CSV holdings and use live Plaid data instead. Your account stays current
                automatically.
              </span>
            </span>
          </label>

          <label
            className={`plaid-conflict-modal__option${choice === 'keep_both' ? ' plaid-conflict-modal__option--selected' : ''}`}
          >
            <input
              type="radio"
              name="plaid-conflict"
              className="plaid-conflict-modal__radio"
              checked={choice === 'keep_both'}
              onChange={() => setChoice('keep_both')}
            />
            <span className="plaid-conflict-modal__option-body">
              <span className="plaid-conflict-modal__option-head">
                <span className="plaid-conflict-modal__option-title">Keep both</span>
                <span className="plaid-conflict-modal__tag plaid-conflict-modal__tag--amber">Manual management needed</span>
              </span>
              <span className="plaid-conflict-modal__option-desc">
                Keep your existing CSV holdings and add Plaid data alongside them. You&apos;ll manage any duplicates
                manually.
              </span>
            </span>
          </label>

          <label
            className={`plaid-conflict-modal__option${choice === 'skip_plaid' ? ' plaid-conflict-modal__option--selected' : ''}`}
          >
            <input
              type="radio"
              name="plaid-conflict"
              className="plaid-conflict-modal__radio"
              checked={choice === 'skip_plaid'}
              onChange={() => setChoice('skip_plaid')}
            />
            <span className="plaid-conflict-modal__option-body">
              <span className="plaid-conflict-modal__option-head">
                <span className="plaid-conflict-modal__option-title">Keep CSV, skip Plaid for this broker</span>
              </span>
              <span className="plaid-conflict-modal__option-desc">
                Keep your existing data and don&apos;t connect this broker via Plaid.
              </span>
            </span>
          </label>
        </div>

        <div className="plaid-conflict-modal__footer">
          <AppButton type="button" variant="ghost" size="sm" onPress={onClose}>
            Cancel
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" onPress={() => onResolve(choice)}>
            Continue
          </AppButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
