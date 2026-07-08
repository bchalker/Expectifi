import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { AppOverlayScrollbars } from './ui/AppOverlayScrollbars'
import {
  IconChevronDown,
} from '@tabler/icons-react'
import { useClickOutside } from '../hooks/useClickOutside'
import { AppButton } from './ui/AppButton'
import { AppSelect } from './ui/AppSelect'
import {
  filterIncomeSecurities,
  formatSecurityYieldPct,
  INCOME_SECURITIES,
  INCOME_SECURITY_FILTERS,
  findIncomeSecurity,
  formatNavErosionRiskSummary,
  navErosionRiskBarLevel,
  navErosionRiskTextClass,
  NAV_EROSION_EXPLAIN_SHORT,
  securityRowSubtext,
  type IncomeSecurityFilterId,
  type NavErosionRisk,
} from '../lib/incomeSecurities'
import { Tooltip } from './Tooltip'
import './HoldingScenarioPopout.scss'
import './IncomeSecuritySelector.scss'
import './MarketScenarioSelector.scss'

const DIVIDEND_FUND_SUBLABEL = 'Dividend ETF/Fund'
const BADGE_PANEL_GAP_PX = 6
const BADGE_PANEL_MAX_HEIGHT_PX = 544 /* ~34rem */
const BADGE_PANEL_WIDTH_PX = 416 /* ~26rem */
const VIEWPORT_EDGE_PX = 8

const ANTENNA_BARS_5_PATHS = [
  'M6 18l0 -3',
  'M10 18l0 -6',
  'M14 18l0 -9',
  'M18 18l0 -12',
] as const

function NavErosionRiskIcon({ risk }: { risk: NavErosionRisk }) {
  const activeBars = navErosionRiskBarLevel(risk) - 1
  const colorClass = navErosionRiskTextClass(risk)
  const riskSummary = formatNavErosionRiskSummary(risk)

  return (
    <Tooltip
      content={
        <span className="income-security-selector__risk-tooltip">
          <span className="income-security-selector__risk-tooltip-lead">{NAV_EROSION_EXPLAIN_SHORT}</span>
          <span className="income-security-selector__risk-tooltip-risk">{riskSummary}</span>
        </span>
      }
      contentClassName="income-security-selector__risk-tooltip-content"
      placement="top"
      delay={200}
      closeDelay={60}
    >
      <span
        className="income-security-selector__risk-icon"
        aria-label={`${NAV_EROSION_EXPLAIN_SHORT} ${riskSummary}`}
      >
        <svg
          className="income-security-selector__risk-bars"
          xmlns="http://www.w3.org/2000/svg"
          width={26}
          height={26}
          viewBox="0 0 24 24"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          {ANTENNA_BARS_5_PATHS.map((d, index) => (
            <path
              key={d}
              d={d}
              strokeWidth={2}
              className={[
                'income-security-selector__risk-bar',
                index < activeBars ? colorClass : 'income-security-selector__risk-bar--inactive',
              ].join(' ')}
            />
          ))}
        </svg>
      </span>
    </Tooltip>
  )
}

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

function computeBadgePanelPosition(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect()
  const panelWidth = Math.min(BADGE_PANEL_WIDTH_PX, window.innerWidth - VIEWPORT_EDGE_PX * 2)
  const maxHeight = Math.min(BADGE_PANEL_MAX_HEIGHT_PX, window.innerHeight - VIEWPORT_EDGE_PX * 2)

  // Prefer right of trigger, then left; stay inside the viewport.
  let left = rect.right + BADGE_PANEL_GAP_PX
  if (left + panelWidth > window.innerWidth - VIEWPORT_EDGE_PX) {
    const leftSide = rect.left - BADGE_PANEL_GAP_PX - panelWidth
    if (leftSide >= VIEWPORT_EDGE_PX) left = leftSide
    else left = Math.max(VIEWPORT_EDGE_PX, window.innerWidth - VIEWPORT_EDGE_PX - panelWidth)
  }

  // Align with the top of the trigger; clamp vertically if needed.
  let top = rect.top
  if (top + maxHeight > window.innerHeight - VIEWPORT_EDGE_PX) {
    top = Math.max(VIEWPORT_EDGE_PX, window.innerHeight - VIEWPORT_EDGE_PX - maxHeight)
  }
  if (top < VIEWPORT_EDGE_PX) top = VIEWPORT_EDGE_PX

  return {
    position: 'fixed',
    top,
    left,
    right: 'auto',
    width: panelWidth,
    maxHeight,
    transform: 'none',
    zIndex: 400,
  }
}

type Props = {
  selectedTicker: string | null
  onSelect: (ticker: string | null) => void
  /** When false, only catalog securities are selectable (per-account income rows). */
  allowCustom?: boolean
  /** `badge` matches portfolio Market Scenario row buttons. */
  triggerVariant?: 'strip' | 'badge'
  /** Badge trigger: show `TICKER: yield%` when a fund is selected (income account rows). */
  showYieldInBadgeTrigger?: boolean
  /** Badge trigger: show sublabel above ticker (default true). */
  showBadgeSublabel?: boolean
  className?: string
  triggerClassName?: string
}

const FILTER_SELECT_OPTIONS = INCOME_SECURITY_FILTERS.map((filter) => ({
  id: filter.id,
  label: filter.label,
}))

function CategoryFilterSelect({
  filterId,
  onFilterId,
}: {
  filterId: IncomeSecurityFilterId
  onFilterId: (id: IncomeSecurityFilterId) => void
}) {
  return (
    <div className="income-security-selector__filter">
      <AppSelect
        value={filterId}
        onChange={(id) => onFilterId(id as IncomeSecurityFilterId)}
        options={FILTER_SELECT_OPTIONS}
        label="Dividend types:"
        labelClassName="income-security-selector__filter-label"
        ariaLabel="Dividend types"
        className="income-security-selector__filter-select"
        layout="hero"
        popoverPlacement="bottom"
        popoverClassName="app-select-import-menu__popover income-security-selector__filter-popover"
        listClassName="app-select-import-menu__list"
      />
    </div>
  )
}

export function IncomeSecuritySelector({
  selectedTicker,
  onSelect,
  allowCustom = true,
  triggerVariant = 'strip',
  showYieldInBadgeTrigger = false,
  showBadgeSublabel = true,
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [filterId, setFilterId] = useState<IncomeSecurityFilterId>('all')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [badgePanelStyle, setBadgePanelStyle] = useState<CSSProperties>({})
  const labelId = useId()
  const mobileLayout = useIncomeSelectorMobileLayout()
  const badgeTrigger = triggerVariant === 'badge'
  const panelPortaled = open && (mobileLayout || badgeTrigger)

  const selected = selectedTicker ? findIncomeSecurity(selectedTicker) : undefined

  const filtered = useMemo(
    () => filterIncomeSecurities(INCOME_SECURITIES, '', filterId),
    [filterId],
  )

  const close = useCallback(() => setOpen(false), [])

  useClickOutside(
    rootRef,
    close,
    open && !mobileLayout,
    panelPortaled && !mobileLayout ? [panelRef] : undefined,
    { ignoreClosest: '.income-security-selector__filter-popover' },
  )

  const syncBadgePanelPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger || !badgeTrigger || !open || mobileLayout) return
    setBadgePanelStyle(computeBadgePanelPosition(trigger))
  }, [badgeTrigger, open, mobileLayout])

  useLayoutEffect(() => {
    if (!open || !badgeTrigger || mobileLayout) return
    syncBadgePanelPosition()
  }, [open, badgeTrigger, mobileLayout, syncBadgePanelPosition, filterId])

  useEffect(() => {
    if (!open || !badgeTrigger || mobileLayout) return
    const onLayout = () => syncBadgePanelPosition()
    window.addEventListener('resize', onLayout)
    window.addEventListener('scroll', onLayout, true)
    return () => {
      window.removeEventListener('resize', onLayout)
      window.removeEventListener('scroll', onLayout, true)
    }
  }, [open, badgeTrigger, mobileLayout, syncBadgePanelPosition])

  useEffect(() => {
    if (!open || !mobileLayout) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, mobileLayout])

  const triggerLabel = selected
    ? showYieldInBadgeTrigger && badgeTrigger
      ? `${selected.ticker}: ${formatSecurityYieldPct(selected.yield_est)}`
      : selected.ticker
    : allowCustom
      ? 'Custom'
      : 'Select fund'

  const pick = (ticker: string | null) => {
    onSelect(ticker)
    setOpen(false)
  }

  const panel = open ? (
    <div
      ref={panelRef}
      id={`income-security-selector-panel-${labelId}`}
      className={[
        'income-security-selector__panel',
        mobileLayout && 'income-security-selector__panel--mobile',
        badgeTrigger && !mobileLayout && 'income-security-selector__panel--badge-portal',
      ]
        .filter(Boolean)
        .join(' ')}
      style={badgeTrigger && !mobileLayout ? badgePanelStyle : undefined}
      role={mobileLayout ? 'dialog' : 'listbox'}
      aria-modal={mobileLayout ? true : undefined}
      aria-label="Select income security"
      onClick={(e) => e.stopPropagation()}
    >
      <CategoryFilterSelect filterId={filterId} onFilterId={setFilterId} />
      <AppOverlayScrollbars
        className="income-security-selector__scroll"
        defer={false}
      >
        <ul className="income-security-selector__list">
          {allowCustom ? (
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
          ) : null}
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
                <span className="income-security-selector__symbol-col">
                  <span className="income-security-selector__ticker-badge">{security.ticker}</span>
                  <span className="income-security-selector__risk-row">
                    <NavErosionRiskIcon risk={security.nav_erosion_risk} />
                  </span>
                </span>
                <span className="income-security-selector__row-main">
                  <span className="income-security-selector__row-name">{security.name}</span>
                  <span className="income-security-selector__row-sub">
                    {securityRowSubtext(security)}
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
      </AppOverlayScrollbars>
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
      className={[
        'income-security-selector',
        badgeTrigger && 'income-security-selector--badge',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {badgeTrigger ? (
        <button
          ref={triggerRef}
          type="button"
          className={[
            'holdings-scenario-trigger',
            'holdings-scenario-trigger--badge',
            'income-security-selector__trigger',
            'income-security-selector__trigger--badge',
            open && 'income-security-selector__trigger--open',
            triggerClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`income-security-selector-panel-${labelId}`}
          aria-labelledby={showBadgeSublabel ? labelId : undefined}
          aria-label={showBadgeSublabel ? undefined : DIVIDEND_FUND_SUBLABEL}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((prev) => !prev)
          }}
        >
          <span className="holdings-scenario-trigger__text">
            {showBadgeSublabel ? (
              <span className="holdings-scenario-trigger__sublabel" id={labelId}>
                {DIVIDEND_FUND_SUBLABEL}
              </span>
            ) : null}
            <span className="holdings-scenario-trigger__label-row">
              <span className="holdings-scenario-trigger__label">{triggerLabel}</span>
              <span className="holdings-scenario-trigger__trail" aria-hidden>
                <IconChevronDown size={14} stroke={1.5} />
              </span>
            </span>
          </span>
        </button>
      ) : (
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
          aria-controls={`income-security-selector-panel-${labelId}`}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((prev) => !prev)
          }}
        >
          <span className="income-security-selector__trigger-label">{triggerLabel}</span>
          {triggerClassName === 'dd-trigger' ? (
            <IconChevronDown className="dd-trigger__chevron" size={14} stroke={1.5} aria-hidden />
          ) : null}
        </button>
      )}
      {panelPortaled
        ? createPortal(
            <>
              {mobileLayout ? (
                <button
                  type="button"
                  className="income-security-selector__backdrop"
                  aria-label="Close panel"
                  onClick={close}
                />
              ) : null}
              {panel}
            </>,
            document.body,
          )
        : panel}
    </div>
  )
}
