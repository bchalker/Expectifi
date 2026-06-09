import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clampTargetRetirementAge, retireAgeBoundsForDob } from '../lib/userPrefs'
import { parseNum } from '../utils/format'
import { useClickOutside } from '../hooks/useClickOutside'
import './RetirementAgeInline.scss'

type Props = {
  value: number
  dateOfBirth: string
  onChange: (age: number) => void
  className?: string
  /** `hero` — large suffix under portfolio total; `tab` — inside Income phase pill. */
  variant?: 'hero' | 'tab'
}

export function RetirementAgeInline({
  value,
  dateOfBirth,
  onChange,
  className,
  variant = 'hero',
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const zoneRef = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bounds = useMemo(() => retireAgeBoundsForDob(dateOfBirth), [dateOfBirth])

  const commit = useCallback(() => {
    if (!editing) return
    const next = clampTargetRetirementAge(parseNum(draft), dateOfBirth)
    onChange(next)
    setEditing(false)
  }, [dateOfBirth, draft, editing, onChange])

  const closeWithoutSave = useCallback(() => {
    setEditing(false)
  }, [])

  useEffect(() => {
    if (!editing) return
    setDraft(String(value))
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editing, value])

  useClickOutside(zoneRef, commit, editing)

  const openEdit = (event: React.MouseEvent) => {
    event.stopPropagation()
    setEditing(true)
  }

  return (
    <span
      ref={zoneRef}
      className={[
        'retirement-age-inline',
        `retirement-age-inline--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => event.stopPropagation()}
    >
      <span
        className={[
          'retirement-age-inline__display',
          editing && 'retirement-age-inline__display--hidden',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={editing}
      >
        <button
          type="button"
          className="retirement-age-inline__link"
          onClick={openEdit}
          aria-label="Edit retirement age"
        >
          {value}
        </button>
      </span>
      <span
        className={[
          'retirement-age-inline__edit',
          editing && 'retirement-age-inline__edit--open',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!editing}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          className="retirement-age-inline__input"
          value={draft}
          tabIndex={editing ? 0 : -1}
          min={bounds.min}
          max={bounds.max}
          aria-label="Retirement age"
          onChange={(event) => {
            setDraft(event.target.value.replace(/[^\d]/g, ''))
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              closeWithoutSave()
            }
          }}
        />
      </span>
    </span>
  )
}
