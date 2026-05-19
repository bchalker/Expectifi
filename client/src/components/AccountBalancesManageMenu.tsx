import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import {
  IconAlertTriangle,
  IconChevronDown,
  IconLink,
  IconPencil,
  IconFileSpreadsheet,
} from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { isPositionsCsvCustodian, type PositionsCsvCustodian } from '../lib/positionsCsvImport'
import type { PlaidItemSummary } from '../lib/api/plaid'
import { AppButton } from './ui/AppButton'
import { Tooltip } from './Tooltip'
import {
  PlaidConnectionContext,
  PlaidDisconnectButton,
  formatPlaidSyncTime,
} from './PlaidConnectionHeader'
import './AccountBalancesManageMenu.scss'

const CSV_CUSTODIANS: { id: PositionsCsvCustodian; label: string }[] = [
  { id: 'fidelity', label: 'Fidelity' },
  { id: 'schwab', label: 'Charles Schwab' },
  { id: 'vanguard', label: 'Vanguard' },
  { id: 'other', label: 'Other' },
]

const MANAGE_MENU_MIN_WIDTH = 280
const MANAGE_MENU_MAX_WIDTH = 360

function computeManageMenuStyle(anchor: DOMRect): CSSProperties {
  const gap = 6
  const width = Math.min(MANAGE_MENU_MAX_WIDTH, Math.max(MANAGE_MENU_MIN_WIDTH, anchor.width + 120))
  let left = anchor.right - width
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8))

  const estimatedHeight = 420
  const spaceBelow = window.innerHeight - anchor.bottom - gap
  if (spaceBelow >= estimatedHeight) {
    return { position: 'fixed', top: anchor.bottom + gap, left, width }
  }
  return {
    position: 'fixed',
    top: anchor.top - gap,
    left,
    width,
    transform: 'translateY(-100%)',
  }
}

function latestHealthySyncTime(items: PlaidItemSummary[]): string | null {
  const healthy = items.filter((i) => i.status === 'healthy')
  if (!healthy.length) return null
  let latest = healthy[0]!.lastSyncedAt
  for (const item of healthy) {
    if (new Date(item.lastSyncedAt).getTime() > new Date(latest).getTime()) {
      latest = item.lastSyncedAt
    }
  }
  return latest
}

type PlaidConnectionsSectionProps = {
  items: PlaidItemSummary[]
  linkBusy: boolean
  onReconnect: (itemId: string) => void
  onDisconnect: (itemId: string) => void | Promise<void>
  showConnectAnother?: boolean
  onConnectAnother?: () => void
}

function PlaidConnectionsSection({
  items,
  linkBusy,
  onReconnect,
  onDisconnect,
  showConnectAnother = false,
  onConnectAnother,
}: PlaidConnectionsSectionProps) {
  if (!items.length) return null
  return (
    <div className="account-balances-manage__plaid-section" aria-label="Connected Plaid accounts">
      <ul className="plaid-connection-panel__list">
        {items.map((item) => {
          const healthy = item.status === 'healthy'
          return (
            <li
              key={item.id}
              className={`plaid-connection-panel__row${healthy ? ' plaid-connection-panel__row--synced' : ''}`}
            >
              <div className="plaid-connection-panel__institution">
                <div className="plaid-connection-panel__institution-text">
                  {healthy ? (
                    <span className="plaid-connection-panel__name-row">
                      <span className="plaid-connection-panel__name">{item.institutionName}</span>
                      <span className="plaid-connection-panel__sync-dot" aria-hidden />
                    </span>
                  ) : (
                    <span className="plaid-connection-panel__name">{item.institutionName}</span>
                  )}
                  <span className="plaid-connection-panel__synced">
                    Last synced {formatPlaidSyncTime(item.lastSyncedAt)}
                  </span>
                </div>
              </div>
              {!healthy ? (
                <div className="plaid-connection-panel__status">
                  <span className="plaid-connection-panel__status-pill plaid-connection-panel__status-pill--warn">
                    <IconAlertTriangle size={14} stroke={1.5} aria-hidden />
                    Reconnect needed
                  </span>
                </div>
              ) : null}
              <div className="plaid-connection-panel__actions">
                {!healthy ? (
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="plaid-connection-panel__reconnect"
                    isDisabled={linkBusy}
                    onPress={() => onReconnect(item.id)}
                  >
                    Reconnect
                  </AppButton>
                ) : null}
                <PlaidDisconnectButton
                  item={item}
                  disabled={linkBusy}
                  onConfirm={() => void onDisconnect(item.id)}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {showConnectAnother && onConnectAnother ? (
        <button
          type="button"
          className="account-balances-manage__plaid-add"
          disabled={linkBusy}
          onClick={onConnectAnother}
        >
          <IconLink size={16} stroke={1.5} aria-hidden />
          Connect another account via Plaid
        </button>
      ) : null}
    </div>
  )
}

export type AccountBalancesManageMenuProps = {
  canClearAccounts: boolean
  onManualAdd: () => void
  onPickCsvCustodian: (custodian: PositionsCsvCustodian) => void
  onClearAccounts: () => void
  onImportApplied?: () => void
  className?: string
  /** Increment to open the Manage menu programmatically. */
  openRequest?: number
}

export function AccountBalancesManageMenu({
  canClearAccounts,
  onManualAdd,
  onPickCsvCustodian,
  onClearAccounts,
  onImportApplied,
  className,
  openRequest,
}: AccountBalancesManageMenuProps) {
  const { user } = useAuth()
  const { hasPaidSubscription } = usePlan()
  const ctx = useContext(PlaidConnectionContext)

  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const [csvExpanded, setCsvExpanded] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const items = ctx?.items ?? []
  const hasConnections = items.length > 0
  const healthyItems = useMemo(() => items.filter((i) => i.status === 'healthy'), [items])
  const hasHealthyPlaid = healthyItems.length > 0
  const lastHealthySync = latestHealthySyncTime(items)
  const plaidConfigured = ctx?.configured !== false
  const showPlaidConnect = hasPaidSubscription && plaidConfigured

  const close = useCallback(() => {
    setOpen(false)
    setCsvExpanded(false)
    ctx?.setPanelOpen(false)
  }, [ctx])

  const openMenu = useCallback(() => {
    setOpen(true)
    ctx?.setPanelOpen(true)
  }, [ctx])

  const toggleMenu = useCallback(() => {
    if (open) close()
    else openMenu()
  }, [close, open, openMenu])

  const lastOpenRequestRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!openRequest || lastOpenRequestRef.current === openRequest) return
    lastOpenRequestRef.current = openRequest
    openMenu()
  }, [openRequest, openMenu])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    setMenuStyle(computeManageMenuStyle(triggerRef.current.getBoundingClientRect()))
  }, [open, hasConnections, csvExpanded])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('.plaid-disconnect-popover')) return
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

  const runAndClose = useCallback(
    (action: () => void) => {
      action()
      close()
    },
    [close],
  )

  const handlePlaidConnect = useCallback(() => {
    if (!showPlaidConnect || ctx?.linkBusy) return
    close()
    if (ctx) {
      void ctx.startAddAccount()
      return
    }
    onImportApplied?.()
  }, [close, ctx, onImportApplied, showPlaidConnect])

  const syncTooltip = lastHealthySync ? (
    <>
      <span className="account-balances-manage__tooltip-title">Plaid synced</span>
      <span className="account-balances-manage__tooltip-time">{formatPlaidSyncTime(lastHealthySync)}</span>
    </>
  ) : (
    'Plaid synced'
  )

  return (
    <div className={['account-balances-manage', className].filter(Boolean).join(' ')}>
      {hasHealthyPlaid ? (
        <Tooltip content={syncTooltip} placement="bottom">
          <span className="account-balances-manage__sync-dot" aria-label="Plaid synced" />
        </Tooltip>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className={`account-balances-manage__trigger${open ? ' account-balances-manage__trigger--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="account-balances-manage-menu"
        disabled={ctx?.linkBusy}
        onClick={toggleMenu}
      >
        <span>Manage</span>
        <IconChevronDown size={14} stroke={1.5} aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id="account-balances-manage-menu"
              className="account-balances-manage__menu"
              style={menuStyle}
              role="menu"
            >
              {hasConnections && ctx ? (
                <>
                  <PlaidConnectionsSection
                    items={items}
                    linkBusy={ctx.linkBusy}
                    onReconnect={(id) => {
                      close()
                      ctx.reconnectItem(id)
                    }}
                    onDisconnect={ctx.disconnectItem}
                    showConnectAnother={showPlaidConnect}
                    onConnectAnother={handlePlaidConnect}
                  />
                  <div className="account-balances-manage__divider" role="separator" />
                </>
              ) : null}

              {ctx?.linkInfo ? (
                <p className="account-balances-manage__info" role="status">
                  {ctx.linkInfo}
                </p>
              ) : null}

              <ul className="account-balances-manage__actions">
                {showPlaidConnect && !hasConnections ? (
                  <li role="none">
                    <button
                      type="button"
                      className="account-balances-manage__item"
                      role="menuitem"
                      disabled={ctx?.linkBusy}
                      onClick={handlePlaidConnect}
                    >
                      <IconLink size={16} stroke={1.5} aria-hidden />
                      Connect with Plaid
                    </button>
                  </li>
                ) : !showPlaidConnect && !hasPaidSubscription ? (
                  <li role="none">
                    <span
                      className="account-balances-manage__item account-balances-manage__item--disabled"
                      aria-label={
                        user
                          ? 'Connect with Plaid — Subscribe to Pro to connect'
                          : 'Connect with Plaid — Pro subscribers only'
                      }
                    >
                      <span className="account-balances-manage__pro-pill" aria-hidden>
                        PRO
                      </span>
                      <IconLink size={16} stroke={1.5} aria-hidden />
                      Connect with Plaid
                    </span>
                  </li>
                ) : null}

                <li role="none" className="account-balances-manage__csv-group">
                  <button
                    type="button"
                    className="account-balances-manage__item account-balances-manage__item--submenu"
                    role="menuitem"
                    aria-expanded={csvExpanded}
                    onClick={() => setCsvExpanded((v) => !v)}
                  >
                    <IconFileSpreadsheet size={16} stroke={1.5} aria-hidden />
                    <span>Import a CSV</span>
                    <IconChevronDown
                      size={14}
                      stroke={1.5}
                      className={`account-balances-manage__csv-chevron${csvExpanded ? ' account-balances-manage__csv-chevron--open' : ''}`}
                      aria-hidden
                    />
                  </button>
                  {csvExpanded ? (
                    <ul className="account-balances-manage__csv-list">
                      {CSV_CUSTODIANS.map((o) => (
                        <li key={o.id} role="none">
                          <button
                            type="button"
                            className="account-balances-manage__csv-item"
                            role="menuitem"
                            onClick={() => {
                              if (!isPositionsCsvCustodian(o.id)) return
                              runAndClose(() => onPickCsvCustodian(o.id))
                            }}
                          >
                            {o.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>

                <li role="none">
                  <button
                    type="button"
                    className="account-balances-manage__item"
                    role="menuitem"
                    onClick={() => runAndClose(onManualAdd)}
                  >
                    <IconPencil size={16} stroke={1.5} aria-hidden />
                    Manually Add
                  </button>
                </li>
              </ul>

              {canClearAccounts ? (
                <>
                  <div className="account-balances-manage__divider" role="separator" />
                  <AppButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="account-balances-manage__clear-btn"
                    onPress={() => runAndClose(onClearAccounts)}
                  >
                    Clear all accounts
                  </AppButton>
                </>
              ) : null}

              {ctx?.linkErr ? (
                <p className="account-balances-manage__err" role="alert">
                  {ctx.linkErr}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
