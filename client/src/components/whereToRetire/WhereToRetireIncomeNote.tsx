import { useState } from 'react'
import { IconPencil } from '@tabler/icons-react'
import { fmtMon } from '../../utils/format'
import { loadIncomeOverride, saveIncomeOverride } from '../../lib/whereToRetire/storage'
import './WhereToRetireIncomeNote.scss'

type Props = {
  planGrossMonthly: number
  effectiveGrossMonthly: number
  onOverrideChange: (value: number | null) => void
}

export function WhereToRetireIncomeNote({
  planGrossMonthly,
  effectiveGrossMonthly,
  onOverrideChange,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const hasOverride = loadIncomeOverride() != null

  const startEdit = () => {
    setDraft(String(Math.round(effectiveGrossMonthly)))
    setEditing(true)
  }

  const commit = () => {
    const n = Number(draft.replace(/,/g, ''))
    if (Number.isFinite(n) && n > 0) {
      saveIncomeOverride(n)
      onOverrideChange(n)
    } else {
      saveIncomeOverride(null)
      onOverrideChange(null)
    }
    setEditing(false)
  }

  const resetToPlan = () => {
    saveIncomeOverride(null)
    onOverrideChange(null)
    setEditing(false)
  }

  return (
    <p className="wtr-income-note">
      {hasOverride ? (
        <>
          Using <strong className="wtr-income-note__amount">{fmtMon(effectiveGrossMonthly)}</strong> for this
          page
          {editing ? (
            <span className="wtr-income-note__edit">
              <input
                type="text"
                inputMode="decimal"
                className="wtr-income-note__input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
                aria-label="Monthly income for comparison"
              />
            </span>
          ) : (
            <button type="button" className="wtr-income-note__link" onClick={startEdit}>
              <IconPencil size={14} stroke={1.5} aria-hidden />
              Edit
            </button>
          )}
          <button type="button" className="wtr-income-note__link" onClick={resetToPlan}>
            Reset to plan ({fmtMon(planGrossMonthly)})
          </button>
        </>
      ) : (
        <>
          Based on <strong className="wtr-income-note__amount">{fmtMon(planGrossMonthly)}</strong>/mo from your
          plan
          {editing ? (
            <span className="wtr-income-note__edit">
              <input
                type="text"
                inputMode="decimal"
                className="wtr-income-note__input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit()
                  if (e.key === 'Escape') setEditing(false)
                }}
                autoFocus
                aria-label="Monthly income for comparison"
              />
            </span>
          ) : (
            <button type="button" className="wtr-income-note__link" onClick={startEdit}>
              <IconPencil size={14} stroke={1.5} aria-hidden />
              Edit for this page
            </button>
          )}
        </>
      )}
    </p>
  )
}
