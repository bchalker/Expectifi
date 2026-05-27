import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Selection } from 'react-aria-components'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { IconChevronDown } from '@tabler/icons-react'
import { Tag, TagGroup } from '@heroui/react'
import { useClickOutside } from '../hooks/useClickOutside'
import { AppButton } from './ui/AppButton'
import {
  filterIncomeSecurities,
  formatSecurityYieldPct,
  INCOME_SECURITIES,
  INCOME_SECURITY_FILTER_DESCRIPTIONS,
  INCOME_SECURITY_FILTERS,
  findIncomeSecurity,
  navErosionRiskTextClass,
  securityRowSubtext,
  type IncomeSecurityFilterId,
} from '../lib/incomeSecurities'
import { Tooltip } from './Tooltip'
import './IncomeSecuritySelector.scss'

/** Phone / narrow portrait — full-screen panel below this width. */
const INCOME_SELECTOR_MOBILE_MQ = '(max-width: 620px)'

function useIncomeSelectorMobileLayout(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(INCOME_SELECTOR_MOBILE_MQ).matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(INCOME_SELECTOR_MOBILE_MQ)
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return mobile
}

type Props = {
  selectedTicker: string | null
  onSelect: (ticker: string | null) => void
  className?: string
  triggerClassName?: string
}

function CategoryFilterTags({
  filterId,
  onFilterId,
}: {
  filterId: IncomeSecurityFilterId
  onFilterId: (id: IncomeSecurityFilterId) => void
}) {
  const handleSelectionChange = (keys: Selection) => {
    if (keys === 'all') return
    const next = keys.values().next().value
    if (next != null) onFilterId(String(next) as IncomeSecurityFilterId)
  }

  return (
    <div className="income-security-selector__filter">
      <TagGroup
        className="income-security-selector__tag-group"
        selectionMode="single"
        selectedKeys={new Set([filterId])}
        onSelectionChange={handleSelectionChange}
        size="sm"
        variant="surface"
      >
        <TagGroup.List className="income-security-selector__tag-list">
          {INCOME_SECURITY_FILTERS.map((filter) => (
            <Tag key={filter.id} id={filter.id} className="income-security-selector__tag">
              <Tooltip
                content={INCOME_SECURITY_FILTER_DESCRIPTIONS[filter.id]}
                placement="top"
              >
                <span className="income-security-selector__tag-label">{filter.label}</span>
              </Tooltip>
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
    </div>
  )
}

export function IncomeSecuritySelector({
  selectedTicker,
  onSelect,
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [filterId, setFilterId] = useState<IncomeSecurityFilterId>('all')
  const rootRef = useRef<HTMLDivElement>(null)
  const mobileLayout = useIncomeSelectorMobileLayout()

  const selected = selectedTicker ? findIncomeSecurity(selectedTicker) : undefined

  const filtered = useMemo(
    () => filterIncomeSecurities(INCOME_SECURITIES, '', filterId),
    [filterId],
  )

  const close = useCallback(() => setOpen(false), [])

  useClickOutside(rootRef, close, open && !mobileLayout)

  useEffect(() => {
    if (!open || !mobileLayout) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, mobileLayout])

  const triggerLabel = selected ? selected.ticker : 'Custom'

  const pick = (ticker: string | null) => {
    onSelect(ticker)
    setOpen(false)
  }

  const panel = open ? (
    <div
      id="income-security-selector-panel"
      className={[
        'income-security-selector__panel',
        mobileLayout && 'income-security-selector__panel--mobile',
      ]
        .filter(Boolean)
        .join(' ')}
      role={mobileLayout ? 'dialog' : 'listbox'}
      aria-modal={mobileLayout ? true : undefined}
      aria-label="Select income security"
      onClick={(e) => e.stopPropagation()}
    >
      <CategoryFilterTags filterId={filterId} onFilterId={setFilterId} />
      <SimpleBar className="income-security-selector__scroll" autoHide={false} forceVisible="y">
        <ul className="income-security-selector__list">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={selectedTicker === null}
              className={[
                'income-security-selector__row',
                'income-security-selector__row--custom',
                selectedTicker === null && 'income-security-selector__row--selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => pick(null)}
            >
              <span className="income-security-selector__row-main">
                <span className="income-security-selector__custom-label">Custom</span>
                <span className="income-security-selector__row-sub">Set yield with the slider</span>
              </span>
            </button>
          </li>
          {filtered.map((security) => (
            <li key={security.ticker}>
              <button
                type="button"
                role="option"
                aria-selected={selectedTicker === security.ticker}
                className={[
                  'income-security-selector__row',
                  selectedTicker === security.ticker && 'income-security-selector__row--selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => pick(security.ticker)}
              >
                <span className="income-security-selector__ticker-badge">{security.ticker}</span>
                <span className="income-security-selector__row-main">
                  <span className="income-security-selector__row-name">{security.name}</span>
                  <span className="income-security-selector__row-sub">
                    {securityRowSubtext(security)}
                  </span>
                  <span className="income-security-selector__risk-row">
                    <span className="income-security-selector__risk-label">Risk: </span>
                    <span
                      className={[
                        'income-security-selector__risk-value',
                        navErosionRiskTextClass(security.nav_erosion_risk),
                      ].join(' ')}
                    >
                      {security.nav_erosion_risk}
                    </span>
                  </span>
                </span>
                <span className="income-security-selector__yield-wrap">
                  <span className="income-security-selector__yield">
                    {formatSecurityYieldPct(security.yield_est)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </SimpleBar>
      {mobileLayout ? (
        <footer className="income-security-selector__footer">
          <AppButton
            type="button"
            variant="secondary"
            size="md"
            className="income-security-selector__close-btn"
            onPress={close}
          >
            Close
          </AppButton>
        </footer>
      ) : null}
    </div>
  ) : null

  return (
    <div
      ref={rootRef}
      className={['income-security-selector', className].filter(Boolean).join(' ')}
    >
      <button
        type="button"
        className={[
          'income-security-selector__trigger',
          triggerClassName ?? 'strip-select-underline strip-select-underline--preset',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="income-security-selector-panel"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="income-security-selector__trigger-label">{triggerLabel}</span>
        {triggerClassName === 'dd-trigger' ? (
          <IconChevronDown className="dd-trigger__chevron" size={14} stroke={1.5} aria-hidden />
        ) : null}
      </button>
      {open && mobileLayout
        ? createPortal(
            <>
              <button
                type="button"
                className="income-security-selector__backdrop"
                aria-label="Close panel"
                onClick={close}
              />
              {panel}
            </>,
            document.body,
          )
        : panel}
    </div>
  )
}
