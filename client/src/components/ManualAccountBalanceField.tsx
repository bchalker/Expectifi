import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, TextField } from '@heroui/react'
import { currencySymbol } from '../lib/displayCurrency'
import { fmt, fmtInput, parseNum } from '../utils/format'
import './ManualAccountBalanceField.scss'

type Props = {
  balance: number
  onCommit: (balance: number) => void
  className?: string
}

/** Click-to-edit balance for manual account rows. */
export function ManualAccountBalanceField({ balance, onCommit, className }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => fmtInput(balance))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(fmtInput(balance))
  }, [balance, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = useCallback(() => {
    const next = Math.max(0, Math.round(parseNum(draft)))
    setEditing(false)
    setDraft(fmtInput(next))
    if (next !== Math.round(balance)) onCommit(next)
  }, [balance, draft, onCommit])

  const wrapClass = ['manual-account-balance-field-wrap', className]
    .filter(Boolean)
    .join(' ')
  const sizerText = editing ? draft || fmtInput(balance) : fmt(balance)

  return (
    <div
      className={wrapClass}
      data-balance-editing={editing ? 'true' : undefined}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="manual-account-balance-field__sizer" aria-hidden>
        {sizerText}
      </span>
      {editing ? (
        <div className="manual-account-balance-field manual-account-balance-field--editing">
          <span className="manual-account-balance-field__prefix" aria-hidden>
            {currencySymbol()}
          </span>
          <TextField
            className="manual-account-balance-field__text-field"
            variant="secondary"
            aria-label="Account balance"
            value={draft}
            onChange={(v) => setDraft(v.replace(/[^\d,]/g, ''))}
          >
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              className="manual-account-balance-field__input"
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setEditing(false)
                  setDraft(fmtInput(balance))
                }
              }}
            />
          </TextField>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="manual-account-balance-field manual-account-balance-field--display"
          aria-label={`Balance ${fmt(balance)}. Click to edit.`}
          onPress={() => setEditing(true)}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          {fmt(balance)}
        </Button>
      )}
    </div>
  )
}
