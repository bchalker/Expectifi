import { useCallback, useState } from 'react'
import { AppSelect } from './ui/AppSelect'
import { CSV_CUSTODIAN_OPTIONS, isPositionsCsvCustodian, type PositionsCsvCustodian } from '../lib/positionsCsvImport'

type Props = {
  className: string
  onPickCustodian: (custodian: PositionsCsvCustodian) => void
}

/** Action-style custodian picker; always returns to placeholder after a choice. */
export function CsvCustodianImportSelect({ className, onPickCustodian }: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const onChange = useCallback(
    (id: string) => {
      if (!isPositionsCsvCustodian(id)) return
      setSelectedKey(id)
      onPickCustodian(id)
      requestAnimationFrame(() => setSelectedKey(null))
    },
    [onPickCustodian],
  )

  return (
    <AppSelect
      className={className}
      ariaLabel="Import a CSV"
      placeholder="Import a CSV"
      value={selectedKey}
      options={CSV_CUSTODIAN_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
      onChange={onChange}
      popoverClassName="app-select-import-menu__popover"
      listClassName="app-select-import-menu__list"
    />
  )
}
