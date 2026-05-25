import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  IconLink,
  IconLinkOff,
} from '@tabler/icons-react'
import type { CalculatorInputs } from '../lib/computeResults'
import { useAuth } from '../context/AuthContext'
import { usePlan } from '../hooks/usePlan'
import { usePlaidLinkFlow, plaidErrorMessage } from '../hooks/usePlaidLinkFlow'
import { ApiRequestError } from '../lib/api'
import {
  deletePlaidItem,
  fetchPlaidItems,
  fetchPlaidStatus,
  syncPlaidHoldings,
  type PlaidItemSummary,
} from '../lib/api/plaid'
import {
  applyPlaidHoldingsSnapshot,
  applyPlaidHoldingsSnapshots,
  removePlaidItemFromLocalStorage,
} from '../lib/plaidImportApply'
import {
  preferTrueLayerForCurrentUser,
  resolveEffectiveResidenceCountry,
  resolveOpenBankingLocale,
  usesTrueLayerOpenBanking,
} from '../lib/openBankingRegion'
import {
  disconnectTrueLayer,
  fetchTrueLayerAccounts,
  fetchTrueLayerStatus,
  startTrueLayerAuth,
} from '../lib/api/truelayer'
import { markPortfolioBalancesFlush, triggerPortfolioWaveReveal } from '../lib/portfolioWaveReveal'
import { AppButton } from './ui/AppButton'
import { PlaidLinkButton } from './PlaidLinkButton'
import './PlaidConnectionHeader.scss'

type PlaidConnectionHandlers = {
  onApplyBalances: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onImportApplied?: () => void
}

type PlaidConnectionContextValue = {
  items: PlaidItemSummary[]
  initialLoaded: boolean
  configured: boolean | null
  usesTrueLayer: boolean
  connectButtonLabel: string
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
  togglePanel: () => void
  reload: () => Promise<void>
  hasConnections: boolean
  disconnectItem: (itemId: string) => Promise<void>
  reconnectItem: (itemId: string) => void
  startAddAccount: () => void
  linkBusy: boolean
  linkErr: string | null
  linkInfo: string | null
  clearLinkInfo: () => void
}

const PlaidConnectionContext = createContext<PlaidConnectionContextValue | null>(null)

export function usePlaidConnection() {
  return useContext(PlaidConnectionContext)
}

export function formatPlaidSyncTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function institutionInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

const PLAID_DISCONNECT_POPOVER_WIDTH = 240

function computeDisconnectPopoverStyle(anchor: DOMRect): CSSProperties {
  const gap = 6
  let left = anchor.right - PLAID_DISCONNECT_POPOVER_WIDTH
  left = Math.max(8, Math.min(left, window.innerWidth - PLAID_DISCONNECT_POPOVER_WIDTH - 8))

  const estimatedHeight = 128
  const spaceBelow = window.innerHeight - anchor.bottom - gap
  if (spaceBelow >= estimatedHeight) {
    return { position: 'fixed', top: anchor.bottom + gap, left, width: PLAID_DISCONNECT_POPOVER_WIDTH }
  }
  return {
    position: 'fixed',
    top: anchor.top - gap,
    left,
    width: PLAID_DISCONNECT_POPOVER_WIDTH,
    transform: 'translateY(-100%)',
  }
}

type DisconnectButtonProps = {
  item: PlaidItemSummary
  disabled?: boolean
  onConfirm: () => void | Promise<void>
}

export function PlaidDisconnectButton({ item, disabled = false, onConfirm }: DisconnectButtonProps) {
  const [open, setOpen] = useState(false)
  const [popStyle, setPopStyle] = useState<CSSProperties>({})
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    setPopStyle(computeDisconnectPopoverStyle(btnRef.current.getBoundingClientRect()))
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || popRef.current?.contains(target)) return
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

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`plaid-connection-panel__disconnect${open ? ' plaid-connection-panel__disconnect--open' : ''}`}
        aria-label={`Disconnect ${item.institutionName}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <IconLinkOff size={16} stroke={1.5} aria-hidden />
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              className="plaid-disconnect-popover"
              style={popStyle}
              role="alertdialog"
              aria-modal="false"
              aria-labelledby={`plaid-disconnect-title-${item.id}`}
              aria-describedby={`plaid-disconnect-desc-${item.id}`}
            >
              <h3 id={`plaid-disconnect-title-${item.id}`} className="plaid-disconnect-popover__title">
                Disconnect {item.institutionName}?
              </h3>
              <p id={`plaid-disconnect-desc-${item.id}`} className="plaid-disconnect-popover__body">
                Your holdings data will be removed.
              </p>
              <div className="plaid-disconnect-popover__footer">
                <AppButton type="button" variant="ghost" size="sm" onPress={close}>
                  Cancel
                </AppButton>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  className="plaid-disconnect-popover__confirm"
                  onPress={() => {
                    close()
                    void onConfirm()
                  }}
                >
                  Disconnect
                </AppButton>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

type ProviderProps = PlaidConnectionHandlers & {
  children: ReactNode
  /** Live residence from calculator inputs — avoids stale profile locale after country change. */
  residenceCountry?: string
}

export function PlaidConnectionProvider({
  children,
  onApplyBalances,
  onImportApplied,
  residenceCountry,
}: ProviderProps) {
  const { user } = useAuth()
  const { hasPaidSubscription } = usePlan()
  const effectiveResidence = resolveEffectiveResidenceCountry(residenceCountry)
  const usesTrueLayer = preferTrueLayerForCurrentUser(effectiveResidence)
  const connectButtonLabel = usesTrueLayer ? 'Connect your bank' : 'Connect via Plaid'
  const userId = user?.id ?? null
  const [items, setItems] = useState<PlaidItemSummary[]>([])
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [disconnectBusyId, setDisconnectBusyId] = useState<string | null>(null)
  const [truelayerBusy, setTruelayerBusy] = useState(false)
  const [truelayerErr, setTruelayerErr] = useState<string | null>(null)
  const [truelayerInfo, setTruelayerInfo] = useState<string | null>(null)
  const reloadSeqRef = useRef(0)
  const onImportAppliedRef = useRef(onImportApplied)
  onImportAppliedRef.current = onImportApplied

  const reload = useCallback(async () => {
    if (!userId || !hasPaidSubscription) {
      setItems([])
      setInitialLoaded(true)
      return
    }

    const seq = ++reloadSeqRef.current
    try {
      if (usesTrueLayer) {
        const status = await fetchTrueLayerStatus()
        if (seq !== reloadSeqRef.current) return
        setConfigured(status.configured)
        if (status.connected) {
          const accountsRes = await fetchTrueLayerAccounts()
          if (seq !== reloadSeqRef.current) return
          if (accountsRes.snapshot) {
            const balances = applyPlaidHoldingsSnapshot(accountsRes.snapshot)
            markPortfolioBalancesFlush()
            onApplyBalances(balances)
            triggerPortfolioWaveReveal()
          }
          setItems([
            {
              id: accountsRes.connection?.id ?? 'truelayer',
              institutionId: accountsRes.connection?.providerId ?? null,
              institutionName:
                accountsRes.connection?.institutionName ??
                status.institutionName ??
                'Connected bank',
              logoUrl: null,
              status: 'healthy',
              errorCode: null,
              lastSyncedAt:
                accountsRes.connection?.lastSyncedAt ?? new Date().toISOString(),
              createdAt:
                accountsRes.connection?.createdAt ?? new Date().toISOString(),
            },
          ])
        } else {
          setItems([])
        }
      } else {
        const [status, list] = await Promise.all([fetchPlaidStatus(), fetchPlaidItems()])
        if (seq !== reloadSeqRef.current) return
        setConfigured(status.configured)
        setItems(list.items)
      }
    } catch (e) {
      if (seq !== reloadSeqRef.current) return
      if (e instanceof ApiRequestError && (e.code === 'subscription_required' || e.status === 401)) {
        setItems([])
      } else {
        try {
          const status = usesTrueLayer
            ? await fetchTrueLayerStatus()
            : await fetchPlaidStatus()
          if (seq !== reloadSeqRef.current) return
          setConfigured(status.configured)
        } catch {
          if (seq !== reloadSeqRef.current) return
          setConfigured((prev) => prev ?? false)
        }
      }
    } finally {
      if (seq === reloadSeqRef.current) setInitialLoaded(true)
    }
  }, [hasPaidSubscription, onApplyBalances, userId, usesTrueLayer])

  const handleImportApplied = useCallback(() => {
    onImportAppliedRef.current?.()
    void reload()
  }, [reload])

  const { startLink, busy: plaidLinkBusy, err: plaidLinkErr, info: plaidLinkInfo, clearInfo: clearPlaidLinkInfo } =
    usePlaidLinkFlow({
      onApplyBalances,
      onImportApplied: handleImportApplied,
      onComplete: () => void reload(),
      onAlreadyConnected: () => setPanelOpen(true),
      enabled: hasPaidSubscription && !usesTrueLayer,
    })

  const linkBusy = plaidLinkBusy || truelayerBusy
  const linkErr = usesTrueLayer ? truelayerErr : plaidLinkErr
  const linkInfo = usesTrueLayer ? truelayerInfo : plaidLinkInfo
  const clearLinkInfo = useCallback(() => {
    clearPlaidLinkInfo()
    setTruelayerErr(null)
    setTruelayerInfo(null)
  }, [clearPlaidLinkInfo])

  useEffect(() => {
    setInitialLoaded(false)
    void reload()
  }, [reload])

  useEffect(() => {
    if (!hasPaidSubscription || !usesTrueLayer) return
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('truelayer') === 'connected'
    const errCode = params.get('truelayer_error')
    const errMsg = params.get('truelayer_message')
    if (!connected && !errCode) return

    if (errCode) {
      setTruelayerErr(errMsg?.trim() || 'Bank connection could not be completed.')
    } else if (connected) {
      const pending = params.get('truelayer_fetch_pending') === '1'
      setTruelayerInfo(
        pending
          ? 'Bank connected. Account balances will sync when you open Manage accounts.'
          : 'Bank connected successfully.',
      )
      void reload()
    }

    params.delete('truelayer')
    params.delete('truelayer_fetch_pending')
    params.delete('truelayer_error')
    params.delete('truelayer_message')
    const q = params.toString()
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${q ? `?${q}` : ''}${window.location.hash}`,
    )
  }, [hasPaidSubscription, reload, usesTrueLayer])

  const disconnectItem = useCallback(
    async (itemId: string) => {
      if (disconnectBusyId) return
      setDisconnectBusyId(itemId)
      try {
        if (usesTrueLayer) {
          await disconnectTrueLayer()
          const balances = removePlaidItemFromLocalStorage(itemId)
          if (balances) onApplyBalances(balances)
          setPanelOpen(false)
          await reload()
          return
        }
        await deletePlaidItem(itemId)
        removePlaidItemFromLocalStorage(itemId)
        const remaining = items.filter((i) => i.id !== itemId)
        if (remaining.length > 0) {
          try {
            const { itemSnapshots, snapshot } = await syncPlaidHoldings()
            const balances = applyPlaidHoldingsSnapshots(itemSnapshots) ?? snapshot.balances
            markPortfolioBalancesFlush()
            onApplyBalances(balances)
            triggerPortfolioWaveReveal()
          } catch {
            const balances = removePlaidItemFromLocalStorage(itemId)
            if (balances) onApplyBalances(balances)
          }
        } else {
          const balances = removePlaidItemFromLocalStorage(itemId)
          if (balances) onApplyBalances(balances)
          setPanelOpen(false)
        }
        await reload()
      } finally {
        setDisconnectBusyId(null)
      }
    },
    [disconnectBusyId, items, onApplyBalances, reload, usesTrueLayer],
  )

  const startAddAccount = useCallback(() => {
    if (usesTrueLayer) {
      startTrueLayerAuth(resolveOpenBankingLocale({ residenceCountry: effectiveResidence }))
      return
    }
    void startLink(null)
  }, [effectiveResidence, startLink, usesTrueLayer])

  const reconnectItem = useCallback(
    (itemId: string) => {
      if (usesTrueLayer) {
        setTruelayerBusy(true)
        void fetchTrueLayerAccounts()
          .then((res) => {
            if (res.snapshot) {
              const balances = applyPlaidHoldingsSnapshot(res.snapshot)
              markPortfolioBalancesFlush()
              onApplyBalances(balances)
              triggerPortfolioWaveReveal()
            }
            if (res.warning) setTruelayerInfo(res.warning)
            return reload()
          })
          .catch(() => setTruelayerErr('Could not refresh bank balances. Try again.'))
          .finally(() => setTruelayerBusy(false))
        return
      }
      void startLink(itemId)
    },
    [onApplyBalances, reload, startLink, usesTrueLayer],
  )

  const value = useMemo<PlaidConnectionContextValue>(
    () => ({
      items,
      initialLoaded,
      configured,
      usesTrueLayer,
      connectButtonLabel,
      panelOpen,
      setPanelOpen,
      togglePanel: () => setPanelOpen((o) => !o),
      reload,
      hasConnections: items.length > 0,
      disconnectItem,
      reconnectItem,
      startAddAccount,
      linkBusy,
      linkErr,
      linkInfo,
      clearLinkInfo,
    }),
    [
      configured,
      connectButtonLabel,
      disconnectItem,
      initialLoaded,
      items,
      linkBusy,
      linkErr,
      linkInfo,
      clearLinkInfo,
      panelOpen,
      reload,
      startAddAccount,
      usesTrueLayer,
    ],
  )

  if (!hasPaidSubscription) {
    return <>{children}</>
  }

  return <PlaidConnectionContext.Provider value={value}>{children}</PlaidConnectionContext.Provider>
}

/** Optional hook for siblings that need to refresh after Plaid Link from empty state. */
export function usePlaidConnectionReload(): (() => Promise<void>) | null {
  const ctx = useContext(PlaidConnectionContext)
  return ctx?.reload ?? null
}

/** Empty-state choice button with pro gating — unchanged UX when no connections. */
export function PlaidConnectionChoiceButton({
  onApplyBalances,
  onImportApplied,
  residenceCountry,
}: PlaidConnectionHandlers & { residenceCountry?: string }) {
  const ctx = useContext(PlaidConnectionContext)
  const reload = usePlaidConnectionReload()

  if (ctx) {
    return (
      <div className="financials-entry-choice-wrap" role="listitem">
        <button
          type="button"
          role="listitem"
          className="financials-entry-choice"
          disabled={ctx.linkBusy}
          onClick={() => ctx.startAddAccount()}
        >
          <IconLink size={18} stroke={1.5} aria-hidden />
          {ctx.linkBusy ? 'Connecting…' : ctx.connectButtonLabel}
        </button>
        {ctx.linkInfo ? (
          <p className="plaid-link-btn__info" role="status">
            {ctx.linkInfo}
          </p>
        ) : null}
        {ctx.linkErr ? (
          <p className="plaid-link-btn__err" role="alert">
            {ctx.linkErr}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <PlaidLinkButton
      variant="choice"
      residenceCountry={residenceCountry}
      onApplyBalances={onApplyBalances}
      onImportApplied={() => {
        onImportApplied?.()
        void reload?.()
      }}
    />
  )
}

/** Pro-gated disabled choice for guests / non-subscribers. */
export function PlaidConnectionChoiceGated({ residenceCountry }: { residenceCountry?: string } = {}) {
  const { user } = useAuth()
  const { hasPaidSubscription } = usePlan()
  if (hasPaidSubscription) return null
  const proNote = user ? 'Subscribe to Pro to connect' : 'Pro subscribers only'
  const connectLabel = usesTrueLayerOpenBanking(
    resolveOpenBankingLocale({ residenceCountry: resolveEffectiveResidenceCountry(residenceCountry) }),
  )
    ? 'Connect your bank'
    : 'Connect via Plaid'
  return (
    <div className="financials-entry-choice-wrap financials-entry-choice-wrap--pro-gated" role="listitem">
      <button
        type="button"
        className="financials-entry-choice financials-entry-choice--pro-gated"
        disabled
        aria-disabled="true"
      >
        <IconLink size={18} stroke={1.5} aria-hidden />
        {connectLabel}
      </button>
      <p className="financials-entry-choice__pro-note">{proNote}</p>
    </div>
  )
}

export { PlaidConnectionContext, plaidErrorMessage }
