import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import type { PlaidLinkOnSuccessMetadata } from 'react-plaid-link'
import { ApiRequestError } from '../lib/api'
import {
  createPlaidLinkToken,
  deletePlaidItem,
  exchangePlaidPublicToken,
  resolvePlaidInstitution,
  syncPlaidHoldings,
} from '../lib/api/plaid'
import {
  applyPlaidHoldingsSnapshots,
  type PlaidHoldingsSnapshot,
} from '../lib/plaidImportApply'
import {
  applyPlaidHoldingsSnapshotDefault,
  detectPlaidBrokerConflict,
  applyPlaidHoldingsWithResolution,
  type PlaidBrokerConflict,
  type PlaidConflictResolution,
} from '../lib/plaidConflict'
import type { CalculatorInputs } from '../lib/computeResults'
import { markPortfolioBalancesFlush, triggerPortfolioWaveReveal } from '../lib/portfolioWaveReveal'

export function plaidErrorMessage(code: string): string {
  switch (code) {
    case 'unauthorized':
      return 'Sign in to connect your accounts.'
    case 'plaid_not_configured':
      return 'Account linking is not available right now.'
    case 'plaid_link_token_failed':
      return 'Could not start Plaid. Try again in a moment.'
    case 'plaid_exchange_failed':
      return 'Could not finish linking your account. Try again.'
    case 'plaid_sync_failed':
      return 'Could not refresh your linked accounts. Try again.'
    case 'subscription_required':
      return 'An active subscription is required to connect accounts via Plaid.'
    case 'already_connected':
      return 'This institution is already connected.'
    default:
      return 'Something went wrong connecting your account.'
  }
}

export function plaidAlreadyConnectedMessage(institutionName: string): string {
  return `${institutionName} is already connected. You can manage it in the panel above.`
}

export type PlaidBrokerConflictRequest = {
  snapshot: PlaidHoldingsSnapshot
  conflict: PlaidBrokerConflict
}

type UsePlaidLinkFlowOptions = {
  onApplyBalances: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onImportApplied?: () => void
  onComplete?: () => void
  onAlreadyConnected?: () => void
  onPlaidSnapshotReady?: (snapshot: PlaidHoldingsSnapshot) => void
  onBrokerConflict?: (request: PlaidBrokerConflictRequest) => Promise<PlaidConflictResolution>
  enabled?: boolean
}

export function usePlaidLinkFlow({
  onApplyBalances,
  onImportApplied,
  onComplete,
  onAlreadyConnected,
  onPlaidSnapshotReady,
  onBrokerConflict,
  enabled = true,
}: UsePlaidLinkFlowOptions) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const pendingOpenRef = useRef(false)
  const exchangingRef = useRef(false)
  const reconnectItemIdRef = useRef<string | null>(null)
  const pendingSwitchToUpdateRef = useRef<string | null>(null)
  const exitingForDuplicateRef = useRef(false)
  const institutionCheckBusyRef = useRef(false)
  const onAlreadyConnectedRef = useRef(onAlreadyConnected)
  const onBrokerConflictRef = useRef(onBrokerConflict)
  const onPlaidSnapshotReadyRef = useRef(onPlaidSnapshotReady)
  onAlreadyConnectedRef.current = onAlreadyConnected
  onBrokerConflictRef.current = onBrokerConflict
  onPlaidSnapshotReadyRef.current = onPlaidSnapshotReady

  const launchLinkToken = useCallback(async (itemIdForReconnect?: string | null) => {
    reconnectItemIdRef.current = itemIdForReconnect?.trim() || null
    try {
      const { linkToken: token } = await createPlaidLinkToken(
        reconnectItemIdRef.current ? { itemId: reconnectItemIdRef.current } : undefined,
      )
      pendingOpenRef.current = true
      setLinkToken(token)
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.code : 'unknown'
      setErr(plaidErrorMessage(code))
      setBusy(false)
      reconnectItemIdRef.current = null
      setLinkToken(null)
    }
  }, [])

  const applySnapshot = useCallback(
    async (snapshot: PlaidHoldingsSnapshot, institutionId: string | null) => {
      const conflict = detectPlaidBrokerConflict(institutionId, snapshot.institutionName)
      let resolution: PlaidConflictResolution | null = null

      if (conflict && onBrokerConflictRef.current) {
        resolution = await onBrokerConflictRef.current({ snapshot, conflict })
      }

      if (conflict && resolution === 'skip_plaid') {
        try {
          await deletePlaidItem(snapshot.itemId)
        } catch {
          /* item may already be removed */
        }
        return
      }

      const balances = conflict
        ? applyPlaidHoldingsWithResolution(snapshot, resolution ?? 'use_plaid', conflict.broker)
        : applyPlaidHoldingsSnapshotDefault(snapshot)

      if (!balances) return

      markPortfolioBalancesFlush()
      onApplyBalances(balances)
      triggerPortfolioWaveReveal()
      onPlaidSnapshotReadyRef.current?.(snapshot)
      onImportApplied?.()
      onComplete?.()
    },
    [onApplyBalances, onComplete, onImportApplied],
  )

  const finishNewConnection = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const institutionId = metadata.institution?.institution_id ?? null
      const institutionName = metadata.institution?.name ?? null

      if (institutionId && !reconnectItemIdRef.current) {
        const resolved = await resolvePlaidInstitution(institutionId)
        if (resolved.action === 'already_connected') {
          const name = resolved.institutionName ?? institutionName ?? 'This institution'
          setInfo(plaidAlreadyConnectedMessage(name))
          onAlreadyConnectedRef.current?.()
          return
        }
      }

      try {
        const { snapshot } = await exchangePlaidPublicToken({
          publicToken,
          institutionId,
          institutionName,
        })
        const enriched: PlaidHoldingsSnapshot = {
          ...snapshot,
          institutionId,
        }
        await applySnapshot(enriched, institutionId)
      } catch (e) {
        if (e instanceof ApiRequestError && e.code === 'already_connected') {
          const name = institutionName ?? 'This institution'
          setInfo(plaidAlreadyConnectedMessage(name))
          onAlreadyConnectedRef.current?.()
          return
        }
        throw e
      }
    },
    [applySnapshot],
  )

  const finishReconnect = useCallback(async () => {
    const { snapshot, itemSnapshots } = await syncPlaidHoldings()
    const balances = applyPlaidHoldingsSnapshots(itemSnapshots) ?? snapshot.balances
    markPortfolioBalancesFlush()
    onApplyBalances(balances)
    triggerPortfolioWaveReveal()
    onImportApplied?.()
    onComplete?.()
  }, [onApplyBalances, onComplete, onImportApplied])

  const finishExchange = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      exchangingRef.current = true
      setBusy(true)
      setErr(null)
      setInfo(null)
      try {
        if (reconnectItemIdRef.current) {
          await finishReconnect()
        } else {
          await finishNewConnection(publicToken, metadata)
        }
      } catch (e) {
        const code = e instanceof ApiRequestError ? e.code : 'unknown'
        setErr(plaidErrorMessage(code))
      } finally {
        exchangingRef.current = false
        setBusy(false)
        setLinkToken(null)
        pendingOpenRef.current = false
        reconnectItemIdRef.current = null
      }
    },
    [finishNewConnection, finishReconnect],
  )

  const handleInstitutionSelected = useCallback(
    async (
      institutionId: string | undefined,
      exitLink: (options?: { force?: boolean }) => void,
    ) => {
      if (!institutionId || reconnectItemIdRef.current || institutionCheckBusyRef.current) return
      institutionCheckBusyRef.current = true
      try {
        const resolved = await resolvePlaidInstitution(institutionId)
        if (resolved.action === 'already_connected') {
          const name = resolved.institutionName ?? 'This institution'
          setInfo(plaidAlreadyConnectedMessage(name))
          onAlreadyConnectedRef.current?.()
          exitingForDuplicateRef.current = true
          exitLink({ force: true })
          return
        }
        if (resolved.action === 'update' && resolved.itemId) {
          pendingSwitchToUpdateRef.current = resolved.itemId
          exitLink({ force: true })
        }
      } catch {
        /* allow Link to continue if resolve fails */
      } finally {
        institutionCheckBusyRef.current = false
      }
    },
    [],
  )

  const { open, ready, exit } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      void finishExchange(publicToken, metadata)
    },
    onExit: () => {
      if (exitingForDuplicateRef.current) {
        exitingForDuplicateRef.current = false
        setLinkToken(null)
        pendingOpenRef.current = false
        setBusy(false)
        reconnectItemIdRef.current = null
        return
      }

      const switchToItemId = pendingSwitchToUpdateRef.current
      pendingSwitchToUpdateRef.current = null
      setLinkToken(null)
      pendingOpenRef.current = false

      if (switchToItemId) {
        void launchLinkToken(switchToItemId)
        return
      }

      reconnectItemIdRef.current = null
      if (!exchangingRef.current) setBusy(false)
    },
    onEvent: (eventName, metadata) => {
      if (eventName !== 'SELECT_INSTITUTION') return
      const institutionId =
        typeof metadata === 'object' &&
        metadata != null &&
        'institution' in metadata &&
        typeof (metadata as { institution?: { institution_id?: string } }).institution?.institution_id ===
          'string'
          ? (metadata as { institution: { institution_id: string } }).institution.institution_id
          : undefined
      void handleInstitutionSelected(
        institutionId,
        exit as (options?: { force?: boolean }) => void,
      )
    },
  })

  useEffect(() => {
    if (!linkToken || !ready || !pendingOpenRef.current) return
    open()
    pendingOpenRef.current = false
  }, [linkToken, ready, open])

  const startLink = useCallback(
    async (itemIdForReconnect?: string | null) => {
      if (!enabled) return
      setErr(null)
      if (busy) return
      setBusy(true)
      await launchLinkToken(itemIdForReconnect)
    },
    [busy, enabled, launchLinkToken],
  )

  return {
    startLink,
    busy,
    err,
    info,
    clearError: () => setErr(null),
    clearInfo: () => setInfo(null),
  }
}
