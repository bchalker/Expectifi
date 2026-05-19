import type { AnimationEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Checkbox, Label, ListBox, Select } from '@heroui/react'
import { AppButton } from './ui/AppButton'
import { IconBuildingBank, IconCheck } from '@tabler/icons-react'
import { ViewHoldingsHint } from './ui/ViewHoldingsHint'
import { fmt } from '../utils/format'
import { FidelityAccountPositionsTable } from './FidelityAccountBreakdown'
import type { ParsedFidelityCsv, AccountBucket } from '../lib/fidelityCsv'
import {
  applyBucketAssignmentsToRows,
  buildDefaultAccountAssignments,
  fidelityAccountKey,
  IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS,
  isFidelityPendingActivityRow,
  uniqueAccountKeysFromRows,
} from '../lib/fidelityCsv'
import {
  hashCsvText,
  isHashAlreadyImported,
  loadStoredFidelityImport,
  mergeFidelityBatches,
  saveStoredFidelityImport,
  type FidelityImportBatch,
} from '../lib/fidelityStorage'
import type { CalculatorInputs } from '../lib/computeResults'
import { custodianLogoPublicUrl } from '../lib/custodianLogos'
import {
  custodianDisplayName,
  parsePositionsCsv,
  peekCsvHeaderLabels,
  type OtherColumnMap,
  type PositionsCsvCustodian,
} from '../lib/positionsCsvImport'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'
import { markPortfolioBalancesFlush, triggerPortfolioWaveReveal } from '../lib/portfolioWaveReveal'
import './SidePanelShell.scss'
import './FidelityCsvImport.scss'

type Props = {
  onApplyBalances: (partial: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>) => void
  onImportApplied?: () => void
  variant?: 'default' | 'toolbar'
  /** Full-viewport modal (default) or in-card slide panel. */
  presentation?: 'modal' | 'panel'
  /** Controlled open state when `presentation` is `panel`. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  /** When the import flow mounts, pre-select this custodian (e.g. from dashboard picker). */
  initialCustodian?: PositionsCsvCustodian | null
  /** Called when the import modal/panel is dismissed (after close, before inner state reset). */
  onImportFlowClose?: () => void
  /** Parent picked custodian + file (e.g. empty-state flow): skip custodian grid and immediate file row. */
  fileIngestRequest?: { id: number; file: File; custodian: PositionsCsvCustodian } | null
  onFileIngestConsumed?: () => void
}

type PendingImport = {
  fileName: string
  contentHash: string
  parsed: ParsedFidelityCsv
  duplicateInStorage: boolean
  duplicateInSelection: boolean
}

type ImportBusyState = {
  headline: string
  details: string[]
}

const IMPORT_APPLY_FADE_MS = 280

type ConfirmOverlayState =
  | { mode: 'idle' }
  | { mode: 'applying' }
  | { mode: 'exiting' }
  | { mode: 'error'; message: string }

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsText(file)
  })
}

function buildIncomingBatches(
  pending: PendingImport | null,
  replaceDuplicateImports: boolean,
  custodian: PositionsCsvCustodian | null,
  reviewAssignments: Record<string, AccountBucket>,
): FidelityImportBatch[] {
  if (!pending || pending.duplicateInSelection) return []
  if (pending.duplicateInStorage && !replaceDuplicateImports) return []
  if (!custodian) return []
  const now = new Date().toISOString()
  const rows = applyBucketAssignmentsToRows(pending.parsed.rows, reviewAssignments)
  return [
    {
      contentHash: pending.contentHash,
      fileName: pending.fileName,
      importedAt: now,
      rows,
      custodian,
    },
  ]
}

const CUSTODIANS: {
  id: PositionsCsvCustodian
  label: string
  logoUrl: string | null
}[] = [
  { id: 'fidelity', label: 'Fidelity', logoUrl: custodianLogoPublicUrl('fidelity') },
  { id: 'schwab', label: 'Charles Schwab', logoUrl: custodianLogoPublicUrl('schwab') },
  { id: 'vanguard', label: 'Vanguard', logoUrl: custodianLogoPublicUrl('vanguard') },
  { id: 'other', label: 'Other', logoUrl: null },
]

const EMPTY_OTHER: OtherColumnMap = { symbol: '', name: '', currentValue: '', costBasis: '' }

const IMPORT_BUCKET_VALUES = new Set(
  IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS.map((o) => o.value),
)

function firstKeyFromSelectSelection(keys: unknown): string | null {
  if (keys == null || keys === 'all') return null
  if (
    typeof keys === 'object' &&
    'values' in keys &&
    typeof (keys as { values: () => Iterator<unknown> }).values === 'function'
  ) {
    const it = (keys as Set<unknown>).values().next()
    return it.done || it.value == null ? null : String(it.value)
  }
  return String(keys)
}

function isImportBucketValue(v: string): v is Exclude<AccountBucket, 'unknown'> {
  return IMPORT_BUCKET_VALUES.has(v as Exclude<AccountBucket, 'unknown'>)
}

export function FidelityCsvImport({
  onApplyBalances,
  onImportApplied,
  variant = 'default',
  presentation = 'modal',
  open: openControlled,
  onOpenChange,
  hideTrigger = false,
  initialCustodian = null,
  onImportFlowClose,
  fileIngestRequest = null,
  onFileIngestConsumed,
}: Props) {
  const isPanel = presentation === 'panel'
  const pickInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const duplicateReplaceId = useId()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalClosing, setModalClosing] = useState(false)
  const flowOpen = isPanel ? Boolean(openControlled) : modalOpen
  const [custodian, setCustodian] = useState<PositionsCsvCustodian | null>(() => initialCustodian ?? null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [otherMap, setOtherMap] = useState<OtherColumnMap>(EMPTY_OTHER)
  const [headerOptions, setHeaderOptions] = useState<string[]>([])
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importBusy, setImportBusy] = useState<ImportBusyState | null>(null)
  const [confirmOverlay, setConfirmOverlay] = useState<ConfirmOverlayState>({ mode: 'idle' })

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-portfolio-wave-reveal')
      document.documentElement.removeAttribute('data-portfolio-import-flush')
    }
  }, [])
  const [replaceDuplicateImports, setReplaceDuplicateImports] = useState(false)
  const [reviewAssignments, setReviewAssignments] = useState<Record<string, AccountBucket>>({})
  const [hideImportSourceUi, setHideImportSourceUi] = useState(
    () => Boolean(fileIngestRequest) || isPanel,
  )
  const lastFileIngestIdRef = useRef<number | null>(null)

  function resetModalInner(options?: { seedCustodianFromProps?: boolean }) {
    setHideImportSourceUi(false)
    setCustodian(options?.seedCustodianFromProps ? (initialCustodian ?? null) : null)
    setStagedFile(null)
    setOtherMap(EMPTY_OTHER)
    setHeaderOptions([])
    setPending(null)
    setParseError(null)
    setReplaceDuplicateImports(false)
    setReviewAssignments({})
    setConfirmOverlay({ mode: 'idle' })
    if (pickInputRef.current) pickInputRef.current.value = ''
  }

  function openFlow() {
    resetModalInner({ seedCustodianFromProps: true })
    setModalClosing(false)
    if (isPanel) onOpenChange?.(true)
    else setModalOpen(true)
  }

  function completeCloseFlow() {
    setModalClosing(false)
    onImportFlowClose?.()
    if (isPanel) {
      onOpenChange?.(false)
      // Parent unmounts after close animation — resetting here flashes the custodian picker.
    } else {
      setModalOpen(false)
      resetModalInner()
    }
  }

  function closeFlow() {
    if (!isPanel && modalOpen && !modalClosing) {
      if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        completeCloseFlow()
        return
      }
      setModalClosing(true)
      return
    }
    completeCloseFlow()
  }

  const onModalOverlayAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.animationName !== 'csv-import-modal-fade-out') return
    if (!modalClosing) return
    completeCloseFlow()
  }

  function stagePickedCsvFile(f: File, c: PositionsCsvCustodian) {
    const name = f.name.toLowerCase()
    if (!name.endsWith('.csv') && f.type !== 'text/csv' && f.type !== 'application/csv' && f.type !== 'application/vnd.ms-excel') {
      setStagedFile(null)
      setPending(null)
      setParseError(
        `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(c)} and try again.`,
      )
      return
    }
    setCustodian(c)
    setStagedFile(f)
    setParseError(null)
    setPending(null)
    setReplaceDuplicateImports(false)
    if (c === 'other') {
      void readFileAsText(f).then((text) => {
        setHeaderOptions(peekCsvHeaderLabels(text))
        setOtherMap(EMPTY_OTHER)
      })
    } else {
      setHeaderOptions([])
    }
  }

  useEffect(() => {
    if (!fileIngestRequest) {
      lastFileIngestIdRef.current = null
      return
    }
    if (lastFileIngestIdRef.current === fileIngestRequest.id) return
    lastFileIngestIdRef.current = fileIngestRequest.id
    setHideImportSourceUi(true)
    if (!isPanel) setModalOpen(true)
    stagePickedCsvFile(fileIngestRequest.file, fileIngestRequest.custodian)
    queueMicrotask(() => onFileIngestConsumed?.())
  }, [fileIngestRequest, isPanel, onFileIngestConsumed])

  const otherMapReady =
    custodian !== 'other' ||
    (Boolean(otherMap.symbol) && Boolean(otherMap.name) && Boolean(otherMap.currentValue))

  useEffect(() => {
    if (!flowOpen) return
    if (!custodian || !stagedFile) {
      setPending(null)
      setParseError(null)
      setReviewAssignments({})
      return
    }
    if (custodian === 'other' && !otherMapReady) {
      setPending(null)
      setParseError(null)
      setReviewAssignments({})
      return
    }

    let cancelled = false
    ;(async () => {
      setParseError(null)
      setImportBusy({
        headline: 'Reading file',
        details: [stagedFile.name, `Custodian: ${custodianDisplayName(custodian)}`],
      })
      try {
        const text = await readFileAsText(stagedFile)
        if (cancelled) return
        setImportBusy({
          headline: 'Fingerprinting',
          details: [stagedFile.name, 'Computing a hash of the file contents'],
        })
        const contentHash = await hashCsvText(text)
        if (cancelled) return
        setImportBusy({
          headline: 'Parsing positions',
          details: [
            `Format: ${custodianDisplayName(custodian)}`,
            'Reading symbols, account names, and market values from each row',
          ],
        })
        const parsed =
          custodian === 'other' ? parsePositionsCsv('other', text, otherMap) : parsePositionsCsv(custodian, text)
        if (cancelled) return

        setImportBusy({
          headline: 'Checking saved imports',
          details: ['Comparing this file to imports already saved in this browser'],
        })
        const existing = loadStoredFidelityImport()
        const duplicateInStorage = isHashAlreadyImported(contentHash, existing)

        const rowCount = parsed.rows.length
        setImportBusy({
          headline: 'Preparing review',
          details:
            rowCount > 0
              ? [`${rowCount} position row${rowCount === 1 ? '' : 's'} loaded`, 'Map each account to a tax bucket below']
              : ['No position rows found in this file', 'Try another export or adjust column mapping for Other'],
        })

        setPending({
          fileName: stagedFile.name,
          contentHash,
          parsed,
          duplicateInStorage,
          duplicateInSelection: false,
        })

        if (!parsed.rows.length) {
          setReviewAssignments({})
          setParseError(
            `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(custodian)} and try again.`,
          )
        } else {
          setReviewAssignments(buildDefaultAccountAssignments(parsed.rows))
          setParseError(null)
        }
      } catch {
        if (!cancelled) {
          setPending(null)
          setReviewAssignments({})
          setParseError(
            `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(custodian ?? 'other')} and try again.`,
          )
        }
      } finally {
        if (!cancelled) setImportBusy(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [flowOpen, custodian, stagedFile, otherMapReady, otherMap.symbol, otherMap.name, otherMap.currentValue, otherMap.costBasis])

  const incomingBatches = useMemo(
    () => buildIncomingBatches(pending, replaceDuplicateImports, custodian, reviewAssignments),
    [pending, replaceDuplicateImports, custodian, reviewAssignments],
  )

  const accountReviewRows = useMemo(() => {
    if (!pending?.parsed.rows.length) return [] as { key: string; label: string; total: number }[]
    const keys = uniqueAccountKeysFromRows(pending.parsed.rows)
    return keys
      .map((k) => ({
        key: k,
        label: k === '(blank)' ? '(missing account name)' : k,
        total: pending.parsed.rows
          .filter((r) => fidelityAccountKey(r.accountName) === k && !isFidelityPendingActivityRow(r))
          .reduce((s, r) => s + r.currentValue, 0),
      }))
      .filter((row) => row.total > 0)
  }, [pending])

  const reviewAssignmentsComplete = useMemo(() => {
    if (!accountReviewRows.length) return false
    return accountReviewRows.every((row) => {
      const b = reviewAssignments[row.key]
      return b !== undefined && b !== 'unknown'
    })
  }, [accountReviewRows, reviewAssignments])

  const rowsThisSelection = useMemo(
    () => (pending ? applyBucketAssignmentsToRows(pending.parsed.rows, reviewAssignments) : []),
    [pending, reviewAssignments],
  )

  const hasStorageDuplicate = Boolean(pending?.duplicateInStorage)
  const canConfirm =
    Boolean(pending?.parsed.rows.length && !parseError && incomingBatches.length > 0) && reviewAssignmentsComplete

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f || !custodian) return
    stagePickedCsvFile(f, custodian)
  }

  const confirmBlocking =
    confirmOverlay.mode === 'applying' || confirmOverlay.mode === 'exiting'

  async function applyImportWithProgress() {
    if (!pending?.parsed.rows.length || !custodian) return
    const p = pending
    const cust = custodian
    const rep = replaceDuplicateImports
    const ra = { ...reviewAssignments }
    const rows = applyBucketAssignmentsToRows(p.parsed.rows, ra)
    setConfirmOverlay({ mode: 'applying' })

    try {
      if (!p.parsed.rows.length) throw new Error('CSV has no data rows.')
      const sample = p.parsed.rows[0]
      if (typeof sample.currentValue !== 'number' || Number.isNaN(sample.currentValue)) {
        throw new Error('Parsed positions are invalid.')
      }
      for (const r of rows) {
        if (!Number.isFinite(r.currentValue)) {
          throw new Error('One or more holdings have an invalid value.')
        }
      }

      const incoming = buildIncomingBatches(p, rep, cust, ra)
      if (!incoming.length) {
        throw new Error('Could not build import from the current review state.')
      }

      const existing = loadStoredFidelityImport()
      const next = mergeFidelityBatches(existing, incoming, { replaceDuplicateHashes: rep })
      saveStoredFidelityImport(next)
      const mergedBalances = next.balances

      setConfirmOverlay({ mode: 'exiting' })

      markPortfolioBalancesFlush()
      onApplyBalances(mergedBalances)
      triggerPortfolioWaveReveal()

      await sleep(IMPORT_APPLY_FADE_MS)
      onImportApplied?.()
      closeFlow()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.'
      setConfirmOverlay({ mode: 'error', message: msg })
    }
  }


  const renderImportBody = () => {
    const showSourcePickers =
      !isPanel &&
      !hideImportSourceUi &&
      confirmOverlay.mode === 'idle' &&
      !stagedFile &&
      !pending &&
      !importBusy
    return (
      <>
        {custodian ? (
          <input
            ref={pickInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            id={fileInputId}
            onChange={onFileInputChange}
          />
        ) : null}

        {showSourcePickers ? (
          <div className="csv-import-custodian-grid" role="listbox" aria-label="Custodian">
            {CUSTODIANS.map((c) => {
              const selected = custodian === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`csv-import-custodian-card${selected ? ' csv-import-custodian-card--selected' : ''}`}
                  onClick={() => {
                    setCustodian(c.id)
                    setStagedFile(null)
                    setPending(null)
                    setParseError(null)
                    setReplaceDuplicateImports(false)
                    setOtherMap(EMPTY_OTHER)
                    setHeaderOptions([])
                    if (pickInputRef.current) pickInputRef.current.value = ''
                  }}
                >
                  <div className="csv-import-custodian-card__logo-wrap">
                    {c.logoUrl ? (
                      <img
                        className="csv-import-custodian-card__logo"
                        src={c.logoUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <IconBuildingBank size={28} stroke={1.5} aria-hidden />
                    )}
                  </div>
                  <span className="csv-import-custodian-card__name">{c.label}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        {showSourcePickers && custodian ? (
          <div className="csv-import-upload">
            <label htmlFor={fileInputId} className="csv-import-upload__label">
              Choose CSV file
            </label>
          </div>
        ) : null}

        {hideImportSourceUi && parseError && custodian ? (
          <div className="csv-import-upload csv-import-upload--retry">
            <button type="button" className="csv-import-upload__label" onClick={() => pickInputRef.current?.click()}>
              Choose another CSV file…
            </button>
          </div>
        ) : null}

      {custodian === 'other' && stagedFile && headerOptions.length > 0 ? (
        <div className="csv-import-other-map">
          <div className="csv-import-other-map__row">
            <span className="csv-import-other-map__label">Symbol</span>
            <select
              className="csv-import-select-sm"
              value={otherMap.symbol}
              onChange={(e) => setOtherMap((m) => ({ ...m, symbol: e.target.value }))}
            >
              <option value="">—</option>
              {headerOptions.map((h) => (
                <option key={`sym-${h}`} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="csv-import-other-map__row">
            <span className="csv-import-other-map__label">Name</span>
            <select
              className="csv-import-select-sm"
              value={otherMap.name}
              onChange={(e) => setOtherMap((m) => ({ ...m, name: e.target.value }))}
            >
              <option value="">—</option>
              {headerOptions.map((h) => (
                <option key={`name-${h}`} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="csv-import-other-map__row">
            <span className="csv-import-other-map__label">Current Value</span>
            <select
              className="csv-import-select-sm"
              value={otherMap.currentValue}
              onChange={(e) => setOtherMap((m) => ({ ...m, currentValue: e.target.value }))}
            >
              <option value="">—</option>
              {headerOptions.map((h) => (
                <option key={`val-${h}`} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="csv-import-other-map__row">
            <span className="csv-import-other-map__label">Cost Basis (optional)</span>
            <select
              className="csv-import-select-sm"
              value={otherMap.costBasis}
              onChange={(e) => setOtherMap((m) => ({ ...m, costBasis: e.target.value }))}
            >
              <option value="">—</option>
              {headerOptions.map((h) => (
                <option key={`cost-${h}`} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {parseError ? <div className="csv-import-error">{parseError}</div> : null}

      {pending && pending.parsed.rows.length > 0 && !parseError ? (
        <>
          {!reviewAssignmentsComplete ? (
            <div className="csv-import-review-hint csv-import-review-hint--warn">
              Assign a tax bucket to every account below before importing. Unrecognized names start as &ldquo;Unmapped&rdquo;
              — choose Pre-tax, Roth, HSA, or Brokerage.
            </div>
          ) : null}

          <div className="csv-import-review">
            <div
              className={`csv-import-review-list${confirmBlocking ? ' csv-import-review-list--applying' : ''}`}
              role="list"
              aria-label="Per-account bucket assignments"
            >
              {accountReviewRows.map((row, index) => {
                const sel = reviewAssignments[row.key]
                const unknown = sel === 'unknown' || sel === undefined
                const accountRows = rowsThisSelection.filter(
                  (r) =>
                    fidelityAccountKey(r.accountName) === row.key && !isFidelityPendingActivityRow(r),
                )
                return (
                  <details
                    key={row.key}
                    className={`fidelity-acct-details csv-import-review-acct${unknown ? ' csv-import-review-acct--attention' : ''}`}
                    style={{ animationDelay: `${index * 0.055}s` }}
                  >
                    <summary>
                      <div className="csv-import-review-acct__identity">
                        <span className="fidelity-acct-fido-name csv-import-review-acct__name">{row.label}</span>
                      </div>
                      <div
                        className="csv-import-review-acct__bucket"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Select
                          className="csv-import-review-bucket-select app-select--compact"
                          variant="secondary"
                          aria-label={`Tax bucket for ${row.label}`}
                          placeholder="Unmapped — choose…"
                          selectedKey={unknown ? null : sel}
                          isDisabled={confirmBlocking}
                          onSelectionChange={(keys) => {
                            const id = firstKeyFromSelectSelection(keys)
                            if (!id || !isImportBucketValue(id)) return
                            setReviewAssignments((m) => ({ ...m, [row.key]: id }))
                          }}
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover className="app-select-import-menu__popover">
                            <ListBox className="app-select-import-menu__list">
                              {IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS.map((o) => (
                                <ListBox.Item key={o.value} id={o.value} textValue={o.label}>
                                  {o.label}
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                      <span className="csv-import-review-acct__summary-end">
                        <div className="csv-import-review-acct__values">
                          <span className="fidelity-acct-summary-total">{fmt(row.total)}</span>
                          <ViewHoldingsHint />
                        </div>
                      </span>
                    </summary>
                    <FidelityAccountPositionsTable rows={accountRows} showScenarioColumn={false} />
                  </details>
                )
              })}
            </div>
          </div>

          {confirmOverlay.mode === 'error' ? (
            <div className="csv-import-error" role="alert">
              {confirmOverlay.message}
            </div>
          ) : null}

        </>
      ) : null}
    </>
    )
  }

  const importFlowExiting = confirmOverlay.mode === 'exiting'

  const flowShell = (
    <div
      className={`${isPanel ? 'csv-import-panel-shell' : 'csv-import-modal-shell'}${importFlowExiting ? ' csv-import-flow-shell--exiting' : ''}`}
      role="dialog"
      aria-modal={isPanel ? undefined : true}
      aria-labelledby="csv-import-modal-title"
    >
      <header className="csv-import-modal-header">
        <h2 id="csv-import-modal-title" className="csv-import-modal__title">
          Import positions CSV
        </h2>
        <p className="csv-import-modal__lead">
          {isPanel || hideImportSourceUi || stagedFile || pending
            ? 'Review each account and map it to the correct tax bucket, then confirm.'
            : 'Choose your custodian, then select a single positions export file.'}
        </p>
      </header>
      <SimpleBar className="side-panel-shell__scroll csv-import-modal-scroll" autoHide={false}>
        <div className="csv-import-modal-body">{renderImportBody()}</div>
      </SimpleBar>
      {pending && pending.parsed.rows.length > 0 && !parseError && hasStorageDuplicate ? (
        <div className="csv-import-duplicate-notice">
          <Checkbox
            id={duplicateReplaceId}
            className="app-checkbox"
            isSelected={replaceDuplicateImports}
            onChange={setReplaceDuplicateImports}
            variant="secondary"
          >
            <Checkbox.Control>
              <Checkbox.Indicator>
                <IconCheck size={12} stroke={2.5} aria-hidden />
              </Checkbox.Indicator>
            </Checkbox.Control>
            <Checkbox.Content>
              <Label className="csv-import-duplicate-notice__label">
                Seems like a duplicate. Continue replacing?
              </Label>
            </Checkbox.Content>
          </Checkbox>
        </div>
      ) : null}
      <footer className="csv-import-modal-footer">
        <div className="csv-import-modal-footer__row">
          <AppButton
            size="sm"
            variant="ghost"
            isDisabled={importBusy !== null || confirmBlocking}
            onPress={() => closeFlow()}
          >
            Cancel
          </AppButton>
        {pending && pending.parsed.rows.length > 0 && !parseError ? (
          <span className="csv-import-summary csv-import-summary--footer">
            {pending.parsed.rows.length} holdings found
          </span>
        ) : (
          <span />
        )}
        <div className="csv-import-modal__footer-actions">
          {confirmOverlay.mode === 'error' ? (
            <AppButton size="sm" variant="primary" onPress={() => setConfirmOverlay({ mode: 'idle' })}>
              Dismiss
            </AppButton>
          ) : (
            <AppButton
              size="sm"
              variant="primary"
              isDisabled={!canConfirm || importBusy !== null || confirmBlocking}
              onPress={() => void applyImportWithProgress()}
            >
              Confirm
            </AppButton>
          )}
        </div>
        </div>
      </footer>
    </div>
  )

  const busyOverlay = importBusy ? (
    <div
      className={`fidelity-import-busy-overlay${isPanel ? ' fidelity-import-busy-overlay--panel' : ' fidelity-import-busy-overlay--modal'}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="fidelity-import-busy-card">
        <div className="fidelity-import-busy-ring" aria-hidden />
        <p className="fidelity-import-busy-headline">{importBusy.headline}</p>
        <ul className="fidelity-import-busy-details">
          {importBusy.details.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  ) : null

  return (
    <>
      {!hideTrigger && !isPanel ? (
        <div className={variant === 'toolbar' ? 'csv-import-root csv-import-root--toolbar' : 'csv-import-root'}>
          <div className="csv-import-trigger">
            <AppButton size="sm" variant="secondary" className="fidelity-import-file-btn" onPress={openFlow}>
              Import CSV
            </AppButton>
          </div>
        </div>
      ) : null}
      {flowOpen && isPanel ? (
        <div className={`csv-import-panel-host${importFlowExiting ? ' csv-import-panel-host--exiting' : ''}`}>
          {busyOverlay}
          {flowShell}
        </div>
      ) : null}
      {flowOpen && !isPanel && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={`csv-import-modal-overlay${modalClosing ? ' csv-import-modal-overlay--closing' : ''}`}
              role="presentation"
              onAnimationEnd={onModalOverlayAnimationEnd}
              onClick={() => {
                if (!importBusy && confirmOverlay.mode === 'idle') closeFlow()
              }}
            >
              <div className="csv-import-modal-stack" onClick={(e) => e.stopPropagation()}>
                {busyOverlay}
                {flowShell}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
