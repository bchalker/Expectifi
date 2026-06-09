import { useState } from 'react'
import { Button, Input, TextField } from '@heroui/react'
import { IconCircleMinus, IconPlus } from '@tabler/icons-react'
import type { GuaranteedIncomeEntry } from '../lib/guaranteedIncome'
import { supplementalStartAgeRange } from '../lib/guaranteedIncome'
import { fmtInput, parseNum } from '../utils/format'
import './GuaranteedIncomeSetupPanel.scss'

type Props = {
  entries: GuaranteedIncomeEntry[]
  /** User's current age — supplemental start ages cannot be below this. */
  minStartAge: number
  emptyPrompt: string
  addButtonLabel: string
  namePlaceholder: string
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<GuaranteedIncomeEntry>) => void
  onRemove: (id: string) => void
}

function tableFieldClass(base: string, filled: boolean) {
  return [base, filled && 'gi-table-field--filled'].filter(Boolean).join(' ')
}

function TableNameInput({
  id,
  value,
  placeholder,
  onChange,
}: {
  id: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  const filled = value.trim().length > 0

  return (
    <TextField
      className={tableFieldClass('gi-table-field gi-table-field--name', filled)}
      variant="secondary"
      fullWidth
      aria-label="Name"
      value={value}
      onChange={onChange}
    >
      <Input id={id} type="text" placeholder={placeholder} />
    </TextField>
  )
}

function TableMoneyInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: number
  onChange: (amount: number) => void
}) {
  const display = fmtInput(value)
  const filled = value > 0

  return (
    <div className={tableFieldClass('gi-table-field gi-table-field--money', filled)}>
      <span className="gi-table-field__prefix" aria-hidden>
        $
      </span>
      <TextField
        className={tableFieldClass('gi-table-field__money-input', filled)}
        variant="secondary"
        aria-label="Monthly amount"
        value={display}
        onChange={(v) => onChange(Math.round(parseNum(v)))}
      >
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          onBlur={() => onChange(Math.round(parseNum(display)))}
        />
      </TextField>
    </div>
  )
}

function TableAgeInput({
  id,
  value,
  min,
  max,
  onChange,
}: {
  id: string
  value: number
  min: number
  max: number
  onChange: (age: number) => void
}) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState('')
  const age = Math.min(max, Math.max(min, Math.round(value)))
  const maxDigits = String(max).length

  const commitDraft = (raw: string) => {
    const n = Math.round(Number(raw.replace(/,/g, '')))
    if (!Number.isFinite(n) || raw.trim() === '') {
      onChange(age)
      return
    }
    onChange(Math.min(max, Math.max(min, n)))
  }

  return (
    <TextField
      className={tableFieldClass('gi-table-field gi-table-field--age', true)}
      variant="secondary"
      aria-label="Start age"
      value={focused ? draft : String(age)}
      onChange={(raw) => {
        if (!focused) return
        setDraft(raw.replace(/[^\d]/g, '').slice(0, maxDigits))
      }}
    >
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={age}
        onFocus={() => {
          setFocused(true)
          setDraft(String(age))
        }}
        onBlur={() => {
          setFocused(false)
          commitDraft(draft)
        }}
      />
    </TextField>
  )
}

function NamedEntryRow({
  entry,
  namePlaceholder,
  minStartAge,
  onUpdate,
  onRemove,
}: {
  entry: GuaranteedIncomeEntry
  namePlaceholder: string
  minStartAge: number
  onUpdate: (patch: Partial<GuaranteedIncomeEntry>) => void
  onRemove: () => void
}) {
  const range = supplementalStartAgeRange(minStartAge)

  return (
    <div className="gi-named-table__row">
      <TableNameInput
        id={`gi-name-${entry.id}`}
        value={entry.name ?? ''}
        placeholder={namePlaceholder}
        onChange={(name) => onUpdate({ name })}
      />
      <TableMoneyInput
        id={`gi-amt-${entry.id}`}
        value={entry.monthlyAmount}
        onChange={(amount) => onUpdate({ monthlyAmount: amount })}
      />
      <TableAgeInput
        id={`gi-age-${entry.id}`}
        value={entry.startAge}
        min={range.min}
        max={range.max}
        onChange={(age) => onUpdate({ startAge: age })}
      />
      <Button
        type="button"
        variant="ghost"
        isIconOnly
        className="gi-named-table__remove"
        aria-label="Remove entry"
        onPress={onRemove}
      >
        <IconCircleMinus size={18} stroke={1.5} aria-hidden />
      </Button>
    </div>
  )
}

export function GuaranteedIncomeNamedEntriesSection({
  entries,
  minStartAge,
  emptyPrompt,
  addButtonLabel,
  namePlaceholder,
  onAdd,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <div className="gi-named-table">
      {entries.length === 0 ? (
        <p className="gi-named-table__empty-prompt">{emptyPrompt}</p>
      ) : (
        <>
          <div className="gi-named-table__head" aria-hidden>
            <span className="gi-named-table__head-cell gi-named-table__head-cell--name">Name</span>
            <span className="gi-named-table__head-cell gi-named-table__head-cell--money">Monthly</span>
            <span className="gi-named-table__head-cell gi-named-table__head-cell--age">Age</span>
            <span className="gi-named-table__head-cell gi-named-table__head-cell--action" />
          </div>
          <div className="gi-named-table__body">
            {entries.map((entry) => (
              <NamedEntryRow
                key={entry.id}
                entry={entry}
                namePlaceholder={namePlaceholder}
                minStartAge={minStartAge}
                onUpdate={(patch) => onUpdate(entry.id, patch)}
                onRemove={() => onRemove(entry.id)}
              />
            ))}
          </div>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        className="gi-named-table__add"
        onPress={onAdd}
      >
        <span className="gi-named-table__add-icon" aria-hidden>
          <IconPlus size={12} stroke={2} />
        </span>
        {addButtonLabel}
      </Button>
    </div>
  )
}
