import type { AnimationEvent } from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, ListBox, Select } from '@heroui/react'
import { IconBuildingBank, IconCheck, IconChevronRight } from '@tabler/icons-react'
import { fmt } from '../utils/format'
import { FidelityAccountPositionsTable } from './FidelityAccountBreakdown'
import type { ParsedFidelityCsv, AccountBucket } from '../lib/fidelityCsv'
import {
  applyBucketAssignmentsToRows,
  buildDefaultAccountAssignments,
  fidelityAccountKey,
  IMPORT_ACCOUNT_BUCKET_SELECT_OPTIONS,
  isFidelityPendingActivityRow,
  normalizeFidelityImportSymbol,
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

const CONFIRM_MIN_STEP_MS = 120
const CONFIRM_POSITION_STAGGER_MS = 75
const CONFIRM_OVERLAY_FADE_MS = 400
const CONFIRM_WAVE_DATASET_CLEAR_MS = 320

type ConfirmStepRow = {
  id: string
  title: string
  subtitle?: string
  status: 'pending' | 'active' | 'done' | 'error'
  errorDetail?: string
}

type ConfirmOverlayState =
  | { mode: 'idle' }
  | { mode: 'running'; steps: ConfirmStepRow[]; positionLabels: string[]; positionRevealIndex: number }
  | {
      mode: 'exiting'
      steps: ConfirmStepRow[]
      positionLabels: string[]
      positionRevealIndex: number
    }
  | { mode: 'error'; steps: ConfirmStepRow[]; failedStepIndex: number; message: string }

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function brokerageFormatLabel(c: PositionsCsvCustodian): string {
  if (c === 'fidelity') return 'Fidelity'
  if (c === 'vanguard') return 'Vanguard'
  if (c === 'schwab') return 'Schwab'
  return 'Other'
}

function buildConfirmSteps(fileName: string, brokerLabel: string): ConfirmStepRow[] {
  return [
    { id: 'received', title: 'File received', subtitle: fileName, status: 'pending' },
    { id: 'parse', title: 'Parsing CSV', status: 'pending' },
    {
      id: 'format',
      title: 'Identifying brokerage format',
      subtitle: `Detected: ${brokerLabel}`,
      status: 'pending',
    },
    { id: 'validate', title: 'Validating holdings', status: 'pending' },
    { id: 'positions', title: 'Loading positions', status: 'pending' },
  ]
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
  const [hideImportSourceUi, setHideImportSourceUi] = useState(false)
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
    if (isPanel) onOpenChange?.(false)
    else setModalOpen(false)
    resetModalInner()
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
    stagePickedCsvFile(f, custodian)
  }

  const confirmBlocking = confirmOverlay.mode === 'running' || confirmOverlay.mode === 'exiting'

  function patchConfirmSteps(
    steps: ConfirmStepRow[],
    index: number,
    patch: Partial<ConfirmStepRow>,
  ): ConfirmStepRow[] {
    return steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
  }

  async function applyImportWithProgress() {
    if (!pending?.parsed.rows.length || !custodian) return
    const p = pending
    const cust = custodian
    const rep = replaceDuplicateImports
    const ra = { ...reviewAssignments }
    const rows = applyBucketAssignmentsToRows(p.parsed.rows, ra)
    const positionLabels = rows
      .filter((r) => !isFidelityPendingActivityRow(r))
      .slice(0, 80)
      .map((r) => {
        const sym = normalizeFidelityImportSymbol(r.symbol) || '—'
        const desc = r.description.trim() || 'Holding'
        const short = desc.length > 48 ? `${desc.slice(0, 47)}…` : desc
        return `${sym} — ${short}`
      })

    setConfirmOverlay({
      mode: 'running',
      steps: buildConfirmSteps(p.fileName, brokerageFormatLabel(cust)),
      positionLabels,
      positionRevealIndex: -1,
    })

    const fail = (stepIndex: number, message: string) => {
      setConfirmOverlay((prev) => {
        if (prev.mode !== 'running') {
          return {
            mode: 'error',
            steps: buildConfirmSteps(p.fileName, brokerageFormatLabel(cust)),
            failedStepIndex: stepIndex,
            message,
          }
        }
        const steps = prev.steps.map((s, i) => {
          if (i < stepIndex) return { ...s, status: 'done' as const }
          if (i === stepIndex) return { ...s, status: 'error' as const, errorDetail: message }
          return { ...s, status: 'pending' as const }
        })
        return { mode: 'error', steps, failedStepIndex: stepIndex, message }
      })
    }

    try {
      for (let i = 0; i < 4; i++) {
        await sleep(CONFIRM_MIN_STEP_MS)
        setConfirmOverlay((prev) => {
          if (prev.mode !== 'running') return prev
          return { ...prev, steps: patchConfirmSteps(prev.steps, i, { status: 'active' }) }
        })
        await sleep(CONFIRM_MIN_STEP_MS)

        if (i === 1) {
          try {
            if (!p.parsed.rows.length) throw new Error('CSV has no data rows.')
            const sample = p.parsed.rows[0]
            if (typeof sample.currentValue !== 'number' || Number.isNaN(sample.currentValue)) {
              throw new Error('Parsed positions are invalid.')
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Parsing failed.'
            fail(i, msg)
            return
          }
        }

        if (i === 3) {
          try {
            for (const r of rows) {
              if (!Number.isFinite(r.currentValue)) throw new Error('One or more holdings have an invalid value.')
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Validation failed.'
            fail(i, msg)
            return
          }
        }

        setConfirmOverlay((prev) => {
          if (prev.mode !== 'running') return prev
          return { ...prev, steps: patchConfirmSteps(prev.steps, i, { status: 'done' }) }
        })
      }

      await sleep(CONFIRM_MIN_STEP_MS)
      setConfirmOverlay((prev) => {
        if (prev.mode !== 'running') return prev
        return { ...prev, steps: patchConfirmSteps(prev.steps, 4, { status: 'active' }) }
      })
      await sleep(CONFIRM_MIN_STEP_MS)

      if (positionLabels.length > 0) {
        setConfirmOverlay((prev) => {
          if (prev.mode !== 'running') return prev
          return { ...prev, positionRevealIndex: 0 }
        })
        for (let j = 1; j < positionLabels.length; j++) {
          await sleep(CONFIRM_POSITION_STAGGER_MS)
          setConfirmOverlay((prev) => {
            if (prev.mode !== 'running') return prev
            return { ...prev, positionRevealIndex: j }
          })
        }
      }

      if (positionLabels.length === 0) {
        await sleep(CONFIRM_MIN_STEP_MS)
      }

      setConfirmOverlay((prev) => {
        if (prev.mode !== 'running') return prev
        return { ...prev, steps: patchConfirmSteps(prev.steps, 4, { status: 'done' }) }
      })

      await sleep(CONFIRM_MIN_STEP_MS)

      const incoming = buildIncomingBatches(p, rep, cust, ra)
      if (!incoming.length) {
        fail(3, 'Could not build import from the current review state.')
        return
      }
      let mergedBalances: Pick<CalculatorInputs, 'base401k' | 'baseSE401k' | 'baseRoth' | 'baseHsa' | 'brkBal'>
      try {
        const existing = loadStoredFidelityImport()
        const next = mergeFidelityBatches(existing, incoming, { replaceDuplicateHashes: rep })
        saveStoredFidelityImport(next)
        mergedBalances = next.balances
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not save import to this browser (storage may be full or disabled).'
        fail(4, msg)
        return
      }

      await sleep(CONFIRM_MIN_STEP_MS)
      setConfirmOverlay((prev) => {
        if (prev.mode !== 'running') return prev
        const stepsDone = prev.steps.map((s) => ({ ...s, status: 'done' as const }))
        const lastIdx = Math.max(0, prev.positionLabels.length - 1)
        return {
          mode: 'exiting',
          steps: stepsDone,
          positionLabels: prev.positionLabels,
          positionRevealIndex: prev.positionLabels.length ? lastIdx : prev.positionRevealIndex,
        }
      })
      document.documentElement.setAttribute('data-portfolio-import-flush', 'true')
      onApplyBalances(mergedBalances)
      window.requestAnimationFrame(() => {
        document.documentElement.removeAttribute('data-portfolio-import-flush')
        document.documentElement.setAttribute('data-portfolio-wave-reveal', 'true')
      })
      await sleep(CONFIRM_OVERLAY_FADE_MS)
      onImportApplied?.()
      closeFlow()
      window.setTimeout(() => {
        document.documentElement.removeAttribute('data-portfolio-wave-reveal')
        document.documentElement.removeAttribute('data-portfolio-import-flush')
      }, CONFIRM_WAVE_DATASET_CLEAR_MS)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Import failed.'
      fail(0, msg)
    }
  }


  const renderImportBody = () => {
    const showSourcePickers = !hideImportSourceUi
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
              {stagedFile ? <span className="csv-import-upload__filename">{stagedFile.name}</span> : null}
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
            <div className="csv-import-review-list" role="list" aria-label="Per-account bucket assignments">
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
                        <span className="csv-import-review-acct__holdings-hint">
                          <IconChevronRight
                            className="csv-import-review-acct__holdings-icon"
                            size={14}
                            stroke={1.5}
                            aria-hidden
                          />
                          View Holdings
                        </span>
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
                      <span className="fidelity-acct-summary-total">{fmt(row.total)}</span>
                    </summary>
                    <FidelityAccountPositionsTable rows={accountRows} showScenarioColumn={false} />
                  </details>
                )
              })}
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
    </>
    )
  }

  const flowShell = (
    <div
      className={isPanel ? 'csv-import-panel-shell' : 'csv-import-modal-shell'}
      role="dialog"
      aria-modal={isPanel ? undefined : true}
      aria-labelledby="csv-import-modal-title"
    >
      <header className="csv-import-modal-header">
        <h2 id="csv-import-modal-title" className="csv-import-modal__title">
          Import positions CSV
        </h2>
        <p className="csv-import-modal__lead">
          {hideImportSourceUi
            ? 'Review each account and map it to the correct tax bucket, then confirm.'
            : 'Choose your custodian, then select a single positions export file.'}
        </p>
      </header>
      <SimpleBar className="side-panel-shell__scroll csv-import-modal-scroll" autoHide={false}>
        <div className="csv-import-modal-body">{renderImportBody()}</div>
      </SimpleBar>
      <footer className="csv-import-modal-footer">
        <Button size="sm" variant="ghost" isDisabled={importBusy !== null || confirmBlocking} onPress={() => closeFlow()}>
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
          <Button
            size="sm"
            variant="primary"
            isDisabled={!canConfirm || importBusy !== null || confirmBlocking}
            onPress={() => void applyImportWithProgress()}
          >
            Confirm
          </Button>
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

  const confirmPositionLabels =
    confirmOverlay.mode === 'running' || confirmOverlay.mode === 'exiting' ? confirmOverlay.positionLabels : []

  const confirmPositionRevealIndex =
    confirmOverlay.mode === 'running' || confirmOverlay.mode === 'exiting' ? confirmOverlay.positionRevealIndex : -1

  const confirmSteps = confirmOverlay.mode !== 'idle' ? confirmOverlay.steps : []

  const confirmOverlayPortal =
    confirmOverlay.mode !== 'idle' && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={`csv-import-confirm-overlay${confirmOverlay.mode === 'exiting' ? ' csv-import-confirm-overlay--exiting' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-import-confirm-title"
            aria-busy={confirmOverlay.mode === 'running'}
          >
            <div className="csv-import-confirm-overlay__panel">
              <h2 id="csv-import-confirm-title" className="csv-import-confirm-overlay__title">
                {confirmOverlay.mode === 'error' ? 'Import could not finish' : 'Applying import'}
              </h2>
              {confirmOverlay.mode === 'error' ? (
                <p className="csv-import-confirm-overlay__error-lead" role="alert">
                  {confirmOverlay.message}
                </p>
              ) : null}
              <ul className="csv-import-confirm-overlay__steps">
                {confirmSteps.map((step) => (
                  <li
                    key={step.id}
                    className={`csv-import-confirm-overlay__step csv-import-confirm-overlay__step--${step.status}`}
                  >
                    <div className="csv-import-confirm-overlay__step-row">
                      <div className="csv-import-confirm-overlay__step-main">
                        <div
                          className={`csv-import-confirm-overlay__step-title-wrap${
                            step.status === 'active' ? ' csv-import-confirm-overlay__step-title-wrap--enter' : ''
                          }`}
                        >
                          <span className="csv-import-confirm-overlay__step-title">{step.title}</span>
                          {step.subtitle ? (
                            <span className="csv-import-confirm-overlay__step-sub">{step.subtitle}</span>
                          ) : null}
                        </div>
                        {step.status === 'error' && step.errorDetail ? (
                          <p className="csv-import-confirm-overlay__step-error">{step.errorDetail}</p>
                        ) : null}
                      </div>
                      <span className="csv-import-confirm-overlay__step-status" aria-hidden>
                        {step.status === 'done' ? (
                          <IconCheck className="csv-import-confirm-overlay__check" size={18} stroke={1.5} />
                        ) : null}
                      </span>
                    </div>
                    {step.id === 'positions' &&
                    (step.status === 'active' || step.status === 'done') &&
                    confirmPositionLabels.length > 0 ? (
                      <ul className="csv-import-confirm-overlay__holdings">
                        {confirmPositionLabels.map((label, hi) => (
                          <li
                            key={`${step.id}-${hi}-${label.slice(0, 24)}`}
                            className={`csv-import-confirm-overlay__holding${
                              hi <= confirmPositionRevealIndex ? ' csv-import-confirm-overlay__holding--in' : ''
                            }`}
                          >
                            {label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
              {confirmOverlay.mode === 'error' ? (
                <div className="csv-import-confirm-overlay__footer">
                  <Button size="sm" variant="primary" onPress={() => setConfirmOverlay({ mode: 'idle' })}>
                    Dismiss
                  </Button>
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null

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
      {confirmOverlayPortal}
    </>
  )
}
