import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@heroui/react'
import { IconBuildingBank } from '@tabler/icons-react'
import { fmt } from '../utils/format'
import { FidelityAccountBreakdown } from './FidelityAccountBreakdown'
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
}

type PendingImport = {
  fileName: string
  contentHash: string
  parsed: ParsedFidelityCsv
  duplicateInStorage: boolean
  duplicateInSelection: boolean
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

export function FidelityCsvImport({
  onApplyBalances,
  onImportApplied,
  variant = 'default',
  presentation = 'modal',
  open: openControlled,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const isPanel = presentation === 'panel'
  const pickInputRef = useRef<HTMLInputElement>(null)
  const fileInputId = useId()
  const [modalOpen, setModalOpen] = useState(false)
  const flowOpen = isPanel ? Boolean(openControlled) : modalOpen
  const [custodian, setCustodian] = useState<PositionsCsvCustodian | null>(null)
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [otherMap, setOtherMap] = useState<OtherColumnMap>(EMPTY_OTHER)
  const [headerOptions, setHeaderOptions] = useState<string[]>([])
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [replaceDuplicateImports, setReplaceDuplicateImports] = useState(false)
  const [reviewAssignments, setReviewAssignments] = useState<Record<string, AccountBucket>>({})

  function resetModalInner() {
    setCustodian(null)
    setStagedFile(null)
    setOtherMap(EMPTY_OTHER)
    setHeaderOptions([])
    setPending(null)
    setParseError(null)
    setReplaceDuplicateImports(false)
    setReviewAssignments({})
    if (pickInputRef.current) pickInputRef.current.value = ''
  }

  function openFlow() {
    resetModalInner()
    if (isPanel) onOpenChange?.(true)
    else setModalOpen(true)
  }

  function closeFlow() {
    if (isPanel) onOpenChange?.(false)
    else setModalOpen(false)
    resetModalInner()
  }

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
      setImporting(true)
      setParseError(null)
      try {
        const text = await readFileAsText(stagedFile)
        const contentHash = await hashCsvText(text)
        const parsed =
          custodian === 'other' ? parsePositionsCsv('other', text, otherMap) : parsePositionsCsv(custodian, text)
        if (cancelled) return

        const existing = loadStoredFidelityImport()
        const duplicateInStorage = isHashAlreadyImported(contentHash, existing)

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
        if (!cancelled) setImporting(false)
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
    return keys.map((k) => ({
      key: k,
      label: k === '(blank)' ? '(missing account name)' : k,
      total: pending.parsed.rows
        .filter((r) => fidelityAccountKey(r.accountName) === k && !isFidelityPendingActivityRow(r))
        .reduce((s, r) => s + r.currentValue, 0),
    }))
  }, [pending])

  const reviewAssignmentsComplete = useMemo(() => {
    if (!pending?.parsed.rows.length) return false
    const keys = uniqueAccountKeysFromRows(pending.parsed.rows)
    if (!keys.length) return false
    return keys.every((k) => {
      const b = reviewAssignments[k]
      return b !== undefined && b !== 'unknown'
    })
  }, [pending, reviewAssignments])

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
    const name = f.name.toLowerCase()
    if (!name.endsWith('.csv') && f.type !== 'text/csv' && f.type !== 'application/csv' && f.type !== 'application/vnd.ms-excel') {
      setStagedFile(null)
      setPending(null)
      setParseError(
        `We couldn't read this file. Make sure you're uploading a positions export from ${custodianDisplayName(custodian)} and try again.`,
      )
      return
    }
    setStagedFile(f)
    setParseError(null)
    setPending(null)
    setReplaceDuplicateImports(false)
    if (custodian === 'other') {
      void readFileAsText(f).then((text) => {
        setHeaderOptions(peekCsvHeaderLabels(text))
        setOtherMap(EMPTY_OTHER)
      })
    } else {
      setHeaderOptions([])
    }
  }

  function applyImport() {
    if (!pending?.parsed.rows.length || !custodian) return
    const incoming = buildIncomingBatches(pending, replaceDuplicateImports, custodian, reviewAssignments)
    if (!incoming.length) return
    const existing = loadStoredFidelityImport()
    const next = mergeFidelityBatches(existing, incoming, { replaceDuplicateHashes: replaceDuplicateImports })
    saveStoredFidelityImport(next)
    onApplyBalances(next.balances)
    onImportApplied?.()
    closeFlow()
  }


  const renderImportBody = () => (
    <>
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

      {custodian ? (
        <div className="csv-import-upload">
          <input
            ref={pickInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            id={fileInputId}
            onChange={onFileInputChange}
          />
          <label htmlFor={fileInputId} className="csv-import-upload__label">
            Choose CSV file
            {stagedFile ? <span className="csv-import-upload__filename">{stagedFile.name}</span> : null}
          </label>
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
            <div className="csv-import-review__title">Review bucket assignments</div>
            <p className="csv-import-review__lead">
              Holdings are grouped by account name from the file. Adjust any row so each account maps to the right tax
              treatment, then confirm.
            </p>
            <div className="csv-import-review-scroll" role="region" aria-label="Per-account bucket assignments">
              <table className="csv-import-review-table">
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Bucket</th>
                    <th scope="col" className="csv-import-review-table__num">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accountReviewRows.map((row) => {
                    const sel = reviewAssignments[row.key]
                    const unknown = sel === 'unknown' || sel === undefined
                    return (
                      <tr key={row.key} className={unknown ? 'csv-import-review-table__row--attention' : undefined}>
                        <td className="csv-import-review-table__acct">{row.label}</td>
                        <td>
                          <select
                            className="csv-import-review-select csv-import-select-sm"
                            aria-label={`Tax bucket for ${row.label}`}
                            value={unknown ? '' : sel}
                            onChange={(e) => {
                              const v = e.target.value as Exclude<AccountBucket, 'unknown'>
                              setReviewAssignments((m) => ({ ...m, [row.key]: v }))
                            }}
                          >
                            {unknown ? <option value="">Unmapped — choose…</option> : null}
                            {IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="csv-import-review-table__num">{fmt(row.total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {hasStorageDuplicate ? (
            <div
              style={{
                background: 'var(--warn-light)',
                border: '1px solid rgba(122,74,16,0.25)',
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: '1rem',
                fontSize: 12,
                color: 'var(--warn)',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                This file matches a CSV already imported. It is ignored unless you replace the earlier import.
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={replaceDuplicateImports}
                  onChange={(e) => setReplaceDuplicateImports(e.target.checked)}
                />
                Replace earlier import when the file content matches
              </label>
            </div>
          ) : null}
        </>
      ) : null}

      {pending && pending.parsed.rows.length > 0 && !parseError ? (
        <>
          <div className="csv-import-breakdown-title">By account (this import)</div>
          <FidelityAccountBreakdown rows={rowsThisSelection} />
        </>
      ) : null}
    </>
  )

  const flowShell = (
    <div
      className={isPanel ? 'csv-import-panel-shell' : 'csv-import-modal-shell'}
      role="dialog"
      aria-modal={isPanel ? undefined : true}
      aria-labelledby="csv-import-modal-title"
      onClick={isPanel ? undefined : (e) => e.stopPropagation()}
    >
      <header className="csv-import-modal-header">
        <h2 id="csv-import-modal-title" className="csv-import-modal__title">
          Import positions CSV
        </h2>
        <p className="csv-import-modal__lead">Choose your custodian, then select a single positions export file.</p>
      </header>
      <SimpleBar className="side-panel-shell__scroll csv-import-modal-scroll" autoHide={false}>
        <div className="csv-import-modal-body">{renderImportBody()}</div>
      </SimpleBar>
      <footer className="csv-import-modal-footer">
        <Button size="sm" variant="ghost" onPress={() => !importing && closeFlow()}>
          Cancel
        </Button>
        {pending && pending.parsed.rows.length > 0 && !parseError ? (
          <span className="csv-import-summary csv-import-summary--footer">
            {pending.parsed.rows.length} holdings found
          </span>
        ) : (
          <span />
        )}
        <div className="csv-import-modal__footer-actions">
          <Button size="sm" variant="primary" isDisabled={!canConfirm || importing} onPress={applyImport}>
            Confirm
          </Button>
        </div>
      </footer>
    </div>
  )

  const busyOverlay = importing ? (
    <div
      className={`fidelity-import-busy-overlay${isPanel ? ' fidelity-import-busy-overlay--panel' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="fidelity-import-busy-card">
        <div className="fidelity-import-busy-ring" aria-hidden />
        <div className="fidelity-import-busy-text">Reading CSV…</div>
      </div>
    </div>
  ) : null

  return (
    <>
      {!hideTrigger && !isPanel ? (
        <div className={variant === 'toolbar' ? 'csv-import-root csv-import-root--toolbar' : 'csv-import-root'}>
          <div className="csv-import-trigger">
            <Button size="sm" variant="outline" className="fidelity-import-file-btn" onPress={openFlow}>
              Import CSV
            </Button>
          </div>
        </div>
      ) : null}
      {flowOpen && isPanel ? (
        <div className="csv-import-panel-host">
          {busyOverlay}
          {flowShell}
        </div>
      ) : null}
      {flowOpen && !isPanel && typeof document !== 'undefined'
        ? createPortal(
            <>
              {busyOverlay}
              <div
                className="csv-import-modal-overlay"
                role="presentation"
                onClick={() => {
                  if (!importing) closeFlow()
                }}
              >
                {flowShell}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  )
}
