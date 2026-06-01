import { useCallback, useContext, useState } from 'react'
import { ListBox, Select } from '@heroui/react'
import { firstKeyFromSelectSelection } from '../lib/dateOfBirthSelect'
import { CSV_CUSTODIAN_OPTIONS, isPositionsCsvCustodian, type PositionsCsvCustodian } from '../lib/positionsCsvImport'
import { custodianShowsMonogram, custodianToBrokerSource } from '../lib/brokerMonogram'
import { custodianHasPlaidConnection } from '../lib/plaidInstitutionBroker'
import { PlaidConnectionContext } from './PlaidConnectionHeader'
import { BrokerMonogramPill } from './ui/BrokerMonogramPill'

type Props = {
  className: string
  onPickCustodian: (custodian: PositionsCsvCustodian) => void
}

/** Action-style custodian picker; always returns to placeholder after a choice. */
export function CsvCustodianImportSelect({ className, onPickCustodian }: Props) {
  const ctx = useContext(PlaidConnectionContext)
  const plaidItems = ctx?.items ?? []
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
          {CSV_CUSTODIAN_OPTIONS.map((o) => (
            <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
              <span className="csv-import-menu-option">
                {custodianShowsMonogram(o.id) ? (
                  <BrokerMonogramPill
                    source={custodianToBrokerSource(o.id)}
                    plaidConnected={custodianHasPlaidConnection(o.id, plaidItems)}
                  />
                ) : null}
                <span className="csv-import-menu-option__label">{o.label}</span>
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
