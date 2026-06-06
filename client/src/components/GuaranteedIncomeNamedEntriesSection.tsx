import { Button, Input, TextField } from '@heroui/react'
import { IconCircleMinus, IconPlus } from '@tabler/icons-react'
import type { GuaranteedIncomeEntry } from '../lib/guaranteedIncome'
import { startAgeRangeForType } from '../lib/guaranteedIncome'
import { fmtInput, parseNum } from '../utils/format'
import './GuaranteedIncomeSetupPanel.scss'

type Props = {
  entries: GuaranteedIncomeEntry[]
  emptyPrompt: string
  addButtonLabel: string
  namePlaceholder: string
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<GuaranteedIncomeEntry>) => void
  onRemove: (id: string) => void
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
  return (
    <TextField
      className="gi-table-field gi-table-field--name"
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

  return (
    <div className="gi-table-field gi-table-field--money">
      <span className="gi-table-field__prefix" aria-hidden>
        $
      </span>
      <TextField
        className="gi-table-field__money-input"
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
  return (
    <TextField
      className="gi-table-field gi-table-field--age"
      variant="secondary"
      aria-label="Start age"
      value={String(value)}
      onChange={(raw) => {
        const n = Math.round(Number(raw.replace(/,/g, '')))
        if (!Number.isFinite(n)) return
        onChange(Math.min(max, Math.max(min, n)))
      }}
    >
      <Input id={id} type="text" inputMode="decimal" />
    </TextField>
  )
}

function NamedEntryRow({
  entry,
  namePlaceholder,
  onUpdate,
  onRemove,
}: {
  entry: GuaranteedIncomeEntry
  namePlaceholder: string
  onUpdate: (patch: Partial<GuaranteedIncomeEntry>) => void
  onRemove: () => void
}) {
  const range = startAgeRangeForType(entry.type)

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
