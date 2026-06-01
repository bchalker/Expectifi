import { useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { IconChevronDown, IconFileSpreadsheet } from '@tabler/icons-react'
import { CSV_CUSTODIAN_OPTIONS, isPositionsCsvCustodian, type PositionsCsvCustodian } from '../lib/positionsCsvImport'
import { custodianShowsMonogram, custodianToBrokerSource } from '../lib/brokerMonogram'
import { custodianHasPlaidConnection } from '../lib/plaidInstitutionBroker'
import { PlaidConnectionContext } from './PlaidConnectionHeader'
import { BrokerMonogramPill } from './ui/BrokerMonogramPill'

type Props = {
  onPickCustodian: (custodian: PositionsCsvCustodian) => void
  onRequestReplaceManual?: (proceed: () => void) => void
  className?: string
}

export function FinancialsEntryCsvDropdown({ onPickCustodian, onRequestReplaceManual, className }: Props) {
  const ctx = useContext(PlaidConnectionContext)
  const plaidItems = ctx?.items ?? []
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return
      close()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  const pickCustodian = useCallback(
    (custodian: PositionsCsvCustodian) => {
      const run = () => {
        onPickCustodian(custodian)
        close()
      }
      if (onRequestReplaceManual) {
        onRequestReplaceManual(run)
        return
      }
      run()
    },
    [close, onPickCustodian, onRequestReplaceManual],
  )

  return (
    <div
      ref={wrapRef}
      className={['financials-entry-csv-dropdown', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={`financials-entry-csv-dropdown__trigger${open ? ' financials-entry-csv-dropdown__trigger--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconFileSpreadsheet size={18} stroke={1.5} aria-hidden />
        Import a CSV
        <IconChevronDown
          size={16}
          stroke={1.5}
          className={`financials-entry-csv-dropdown__chevron${open ? ' financials-entry-csv-dropdown__chevron--open' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul id={menuId} className="financials-entry-csv-dropdown__menu" role="menu">
          {CSV_CUSTODIAN_OPTIONS.map((o) => (
            <li key={o.id} role="none">
              <button
                type="button"
                className="financials-entry-csv-dropdown__item"
                role="menuitem"
                onClick={() => {
                  if (!isPositionsCsvCustodian(o.id)) return
                  pickCustodian(o.id)
                }}
              >
                {custodianShowsMonogram(o.id) ? (
                  <BrokerMonogramPill
                    source={custodianToBrokerSource(o.id)}
                    plaidConnected={custodianHasPlaidConnection(o.id, plaidItems)}
                  />
                ) : null}
                <span className="financials-entry-csv-dropdown__item-label">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
