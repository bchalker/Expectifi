import { useCallback, useState } from 'react'
import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import { isPositionsCsvCustodian, type PositionsCsvCustodian } from '../lib/positionsCsvImport'

const CUSTODIAN_OPTIONS: { id: PositionsCsvCustodian; label: string }[] = [
  { id: 'fidelity', label: 'Fidelity' },
  { id: 'schwab', label: 'Charles Schwab' },
  { id: 'vanguard', label: 'Vanguard' },
  { id: 'other', label: 'Other' },
]

type Props = {
  className: string
  onPickCustodian: (custodian: PositionsCsvCustodian) => void
}

/** Action-style custodian picker; always returns to placeholder after a choice. */
export function CsvCustodianImportSelect({ className, onPickCustodian }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const onSelectionChange = useCallback(
    (keys: unknown) => {
      const id = firstKeyFromSelectSelection(keys)
      if (!id || !isPositionsCsvCustodian(id)) return
      setSelectedKey(id)
      onPickCustodian(id)
      requestAnimationFrame(() => setSelectedKey(null))
    },
    [onPickCustodian],
  )

  return (
    <Select
      className={className}
      variant="secondary"
      aria-label="Import a CSV"
      placeholder="Import a CSV"
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
    >
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="app-select-import-menu__popover">
        <ListBox className="app-select-import-menu__list">
          {CUSTODIAN_OPTIONS.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
              {o.label}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
