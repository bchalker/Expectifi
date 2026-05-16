import { IconAdjustments, IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import { computeBucketTrendDisplay } from '../lib/bucketHoldingTrend'
import { BucketTotalTrend } from './ui/BucketTotalTrend'
import { ViewHoldingsHint } from './ui/ViewHoldingsHint'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import { formatFidelityDescription } from '../lib/fidelityDisplay'
import { groupPositionsByAccount, isFidelityPendingActivityRow, normalizeFidelityImportSymbol, type FidelityPositionRow } from '../lib/fidelityCsv'
import {
  blendedBaselineFV,
  makeFidelityPositionReturnId,
  mergeBucketIntoAllModels,
  normalizePositionReturnModels,
  projectPositionAtRetirement,
  type PositionReturnModel,
} from '../lib/positionReturnModel'
import { useHoldingQuotes } from '../lib/holdingQuotes'
import { custodianLogoPublicUrl } from '../lib/custodianLogos'
import type { PositionsCsvCustodian } from '../lib/positionsCsvImport'
import { fmt } from '../utils/format'
import { PositionReturnPopover } from './PositionReturnPopover'

type Props = {
  positions: FidelityPositionRow[]
  /** Disambiguate React keys across multiple buckets on the same page (e.g. `ret401k`, `brk`). */
  keyPrefix: string
  /** Dashboard: return editor popover per holding. */
  showReturnSliders?: boolean
  inputs?: CalculatorInputs
  setInputs?: (p: Partial<CalculatorInputs>) => void
  blendedRate?: number
  yearsToRetirement?: number
  retirementCalendarYear?: number
  /** Age at retirement (for copy such as “at 62”). */
  targetRetirementAge?: number
  /** Open return editor from strip (GrowthSliderLabel); only the bucket whose ids match consumes it. */
  openReturnEditorRequest?: { positionId: string; anchorTop: number; nonce: number } | null
  onReturnEditorOpenHandled?: () => void
  /** Latest import custodian — small badge beside each holding. */
  importCustodian?: PositionsCsvCustodian
  /** Rendered at the end of the “Holdings/Portfolio” summary row (e.g. cloud scenarios). */
  holdingsSummaryEnd?: ReactNode
}

function fmtSignedDelta(n: number): string {
  return (n >= 0 ? '+' : '') + fmt(n)
}

/** Fidelity CSV bucket: per-account ledgers + Holdings/Portfolio disclosure with position cards. */
export function FidelityBucketHoldingsSubrows({
  positions,
  keyPrefix,
  showReturnSliders,
  inputs,
  setInputs,
  blendedRate = 0.07,
  yearsToRetirement = 7,
  retirementCalendarYear,
  targetRetirementAge = 62,
  openReturnEditorRequest,
  onReturnEditorOpenHandled,
  importCustodian = 'fidelity',
  holdingsSummaryEnd,
}: Props) {
  const accountGroups = groupPositionsByAccount(positions)
  const showFidelityAccountNames = accountGroups.length > 1

  const custodianLogoSrc = useMemo(
    () => custodianLogoPublicUrl(importCustodian),
    [importCustodian],
  )

  const calYear = retirementCalendarYear ?? new Date().getFullYear()

  const mergedModels = useMemo(() => {
    if (!showReturnSliders || !inputs) return [] as PositionReturnModel[]
    const normalized = normalizePositionReturnModels(
      inputs.positionReturnModels ?? [],
      yearsToRetirement,
      blendedRate,
      calYear,
    )
    return mergeBucketIntoAllModels(normalized, positions, keyPrefix, blendedRate, yearsToRetirement, calYear).filter((p) =>
      p.id.startsWith(`fid-${keyPrefix}-`),
    )
  }, [showReturnSliders, inputs, positions, keyPrefix, blendedRate, yearsToRetirement, calYear])

  useEffect(() => {
    const req = openReturnEditorRequest
    if (!req || !showReturnSliders) return
    if (!mergedModels.some((m) => m.id === req.positionId)) return
    setPopover({ id: req.positionId, top: req.anchorTop })
    onReturnEditorOpenHandled?.()
  }, [openReturnEditorRequest, mergedModels, showReturnSliders, onReturnEditorOpenHandled])

  const [popover, setPopover] = useState<{ id: string; top: number } | null>(null)
  const popoverModel = popover ? mergedModels.find((m) => m.id === popover.id) : undefined

  const quoteMap = useHoldingQuotes(positions, positions.length > 0)

  function patchPosition(next: PositionReturnModel) {
    if (!setInputs || !inputs) return
    const rest = (inputs.positionReturnModels ?? []).filter((p) => p.id !== next.id)
    setInputs({ positionReturnModels: [...rest, next] })
  }

  return (
    <div className="fidelity-bucket-subrows">
      {popoverModel && popover ? (
        <PositionReturnPopover
          open
          onClose={() => setPopover(null)}
          anchorTop={popover.top}
          position={popoverModel}
          onPositionChange={patchPosition}
          blendedRate={blendedRate}
          retirementYear={calYear}
          retirementAge={targetRetirementAge}
          horizon={yearsToRetirement}
        />
      ) : null}
      {accountGroups.map((g) => (
        <div key={`${keyPrefix}-${g.accountName}`} className="fidelity-import-ledger">
          <details className="fidelity-holdings-disclosure">
            <summary className="fidelity-holdings-summary">
              <div className="fidelity-import-ledger__lead">
                {showFidelityAccountNames ? (
                  <span className="fidelity-import-ledger-acct">{g.accountName}</span>
                ) : null}
                {showFidelityAccountNames ? <ViewHoldingsHint /> : null}
              </div>
              <div className="fidelity-import-ledger__summary-end">
                <div className="fidelity-import-ledger__values">
                  <span className="fidelity-import-ledger__total">{fmt(g.total)}</span>
                  <BucketTotalTrend trend={computeBucketTrendDisplay(g.rows, quoteMap)} />
                </div>
                {holdingsSummaryEnd ? <span className="fidelity-holdings-summary__end">{holdingsSummaryEnd}</span> : null}
              </div>
            </summary>
            <div className="retirement-import-holdings">
              {g.rows.map((r) => {
                const rowIndex = positions.indexOf(r)
                const modelId =
                  rowIndex >= 0 ? makeFidelityPositionReturnId(keyPrefix, r.accountName, r.symbol, rowIndex) : ''
                const model = modelId ? mergedModels.find((m) => m.id === modelId) : undefined
                const projected =
                  model != null ? projectPositionAtRetirement(model, calYear, yearsToRetirement) : null
                const blendedFv =
                  model != null ? blendedBaselineFV(model.currentValue, blendedRate, yearsToRetirement) : null
                const delta = projected != null && blendedFv != null ? projected - blendedFv : null
                const deltaMatchesBlended = delta != null && Math.abs(delta) < 1
                const symKey = normalizeFidelityImportSymbol(r.symbol).toUpperCase()
                const liveQuote = isFidelityPendingActivityRow(r) ? undefined : quoteMap.get(symKey)
                return (
                  <div key={`${keyPrefix}-${g.accountName}-${r.symbol}-${rowIndex}`} className="holding-return-row">
                    <div className="holding-return-row__primary">
                    <div className="holding-return-row__left">
                      {custodianLogoSrc ? (
                        <img
                          className="holding-custodian-logo"
                          src={custodianLogoSrc}
                          alt=""
                          width={18}
                          height={18}
                          decoding="async"
                        />
                      ) : null}
                      <div className="holding-return-row__symbol-name">
                          <div className="holding-card-symbol">{r.symbol || '—'}</div>
                          <div className="holding-card-name">{formatFidelityDescription(r.description)}</div>
                        </div>
                      </div>
                      <div className="holding-return-row__values">
                        <div className="holding-card-value">{fmt(r.currentValue)}</div>
                        {liveQuote ? (
                          <div
                            className={`holding-return-row__quote${
                              liveQuote.changePct > 0
                                ? ' holding-return-row__quote--up'
                                : liveQuote.changePct < 0
                                  ? ' holding-return-row__quote--down'
                                  : ' holding-return-row__quote--flat'
                            }`}
                            title="Delayed quote via market data"
                          >
                            <span className="holding-return-row__quote-price">${liveQuote.price.toFixed(2)}</span>
                            <span className="holding-return-row__quote-chg">
                              {liveQuote.changePct >= 0 ? '+' : ''}
                              {liveQuote.changePct.toFixed(2)}%
                            </span>
                          </div>
                        ) : null}
                        {showReturnSliders && model && projected != null ? (
                          <div className="holding-return-row__projected">
                            {fmt(projected)} at {targetRetirementAge}
                          </div>
                        ) : null}
                      </div>
                      {showReturnSliders && model && setInputs ? (
                        <button
                          type="button"
                          className="holding-return-row__edit"
                          data-position-return-popover-ignore-outside
                          aria-label={`Edit returns for ${model.ticker || 'position'}`}
                          onClick={(e) => {
                            const top = e.currentTarget.getBoundingClientRect().top
                            setPopover((prev) => (prev?.id === model.id ? null : { id: model.id, top }))
                          }}
                        >
                          <IconAdjustments size={16} stroke={1.75} aria-hidden />
                          <span>Edit returns</span>
                        </button>
                      ) : null}
                    </div>
                    <div className="holding-return-row__secondary">
                      <div className="holding-card-basis">Cost basis: {r.costBasis != null ? fmt(r.costBasis) : '—'}</div>
                      {showReturnSliders && model && delta != null ? (
                        <div
                          className={`holding-return-row__vs${deltaMatchesBlended ? ' holding-return-row__vs--neutral' : delta >= 0 ? ' holding-return-row__vs--pos' : ' holding-return-row__vs--neg'}`}
                        >
                          <span>vs rate:</span>{' '}
                          {deltaMatchesBlended ? (
                            <span>matches portfolio rate</span>
                          ) : (
                            <>
                              <span>{fmtSignedDelta(delta)}</span>
                              {delta >= 0 ? (
                                <IconTrendingUp size={15} stroke={1.75} aria-hidden />
                              ) : (
                                <IconTrendingDown size={15} stroke={1.75} aria-hidden />
                              )}
                            </>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      ))}
    </div>
  )
}
