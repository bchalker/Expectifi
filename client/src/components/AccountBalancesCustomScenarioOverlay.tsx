import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import type { CalculatorInputs } from '../lib/computeResults'
import {
  applyScenarioUiChoice,
  horizonClamp,
  inferCommonScenarioChoiceForModels,
  inferScenarioUiChoice,
  mergePatchPositionModelsIntoInputs,
  type ScenarioUiChoice,
  SCENARIO_MIXED,
} from '../lib/holdingScenarioApply'
import { blendedRateForDashboardPositionId } from '../lib/mergedDashboardPositionModels'
import {
  decimalToPct,
  modelingCalendarYears,
  padYearlyReturns,
  pctToDecimal,
  ratesMatchScenario,
  type PositionReturnModel,
} from '../lib/positionReturnModel'

export type CustomScenarioScope = 'all' | 'bucket' | 'holding'

type Props = {
  open: boolean
  positionModels: PositionReturnModel[]
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  yearsToRetirement: number
  retirementCalendarYear: number
}

function parseSignedPct(raw: string): number {
  const v = parseFloat((raw || '').replace(/,/g, ''))
  return Number.isFinite(v) ? v : 0
}

function modelsMatchingPrefixes(models: PositionReturnModel[], prefixes: readonly string[]): PositionReturnModel[] {
  return models.filter((m) => prefixes.some((p) => m.id.startsWith(p)))
}

const BROKERAGE_PREFIX = 'fid-brk-' as const
const PRETAX_PREFIXES = ['fid-ret401k-', 'fid-se401k-'] as const
const ROTH_PREFIX = 'fid-roth-' as const
const HSA_PREFIX = 'fid-hsa-' as const

function ScenarioSelect({
  value,
  mixed,
  onPick,
}: {
  value: ScenarioUiChoice | typeof SCENARIO_MIXED
  mixed: boolean
  onPick: (c: ScenarioUiChoice) => void
}) {
  return (
    <select
      className="custom-scenario-select"
      aria-label="Return scenario"
      value={value}
      onChange={(e) => {
        const v = e.target.value
        if (v === SCENARIO_MIXED) return
        onPick(v as ScenarioUiChoice)
      }}
    >
      {mixed ? <option value={SCENARIO_MIXED}>Various — choose to apply</option> : null}
      <option value="default">Default return</option>
      <option value="bull">Bull</option>
      <option value="base">Base (Normal)</option>
      <option value="bear">Bear</option>
      <option value="custom">Custom %</option>
      <option value="peryear">Per year</option>
    </select>
  )
}

function CustomPctField({
  valueStr,
  onChangeStr,
  onCommitDecimal,
}: {
  valueStr: string
  onChangeStr: (s: string) => void
  onCommitDecimal: (pct: number) => void
}) {
  return (
    <div className="custom-scenario-inline-pct">
      <span className="num-input-prefix" aria-hidden>
        %
      </span>
      <div className="num-input-wrap">
        <input
          type="text"
          inputMode="decimal"
          className="num-input"
          aria-label="Custom annual return percent"
          value={valueStr}
          onChange={(e) => {
            const s = e.target.value
            onChangeStr(s)
            onCommitDecimal(parseSignedPct(s))
          }}
        />
      </div>
    </div>
  )
}

function YearStrip({
  model,
  horizon,
  retirementCalendarYear,
  onPatch,
}: {
  model: PositionReturnModel
  horizon: number
  retirementCalendarYear: number
  onPatch: (next: PositionReturnModel) => void
}) {
  const h = horizonClamp(horizon)
  const years = useMemo(() => modelingCalendarYears(retirementCalendarYear, h), [retirementCalendarYear, h])
  const rates = padYearlyReturns(model.yearlyReturns, h, model.flatRate)

  return (
    <div className="custom-scenario-year-strip">
      {years.map((calY, i) => (
        <div key={calY} className="custom-scenario-year-field">
          <label htmlFor={`cs-yr-${model.id}-${i}`}>{calY}</label>
          <input
            id={`cs-yr-${model.id}-${i}`}
            type="text"
            inputMode="decimal"
            className="num-input"
            value={String(decimalToPct(rates[i] ?? 0))}
            onChange={(e) => {
              const dec = pctToDecimal(parseSignedPct(e.target.value))
              const nextRates = [...rates]
              nextRates[i] = dec
              onPatch(applyScenarioUiChoice(model, 'peryear', 0, h, 0, nextRates))
            }}
          />
        </div>
      ))}
    </div>
  )
}

function firstCustomPctString(models: PositionReturnModel[], horizon: number, retRate: number, brkRate: number): string {
  for (const m of models) {
    const b = blendedRateForDashboardPositionId(m.id, retRate, brkRate)
    if (inferScenarioUiChoice(m, b, horizon) === 'custom') return String(decimalToPct(m.flatRate))
  }
  return '7'
}

function HoldingScenarioRow({
  m,
  horizon,
  retRate,
  brkRate,
  retirementCalendarYear,
  inputs,
  setInputs,
  onRowChoice,
}: {
  m: PositionReturnModel
  horizon: number
  retRate: number
  brkRate: number
  retirementCalendarYear: number
  inputs: CalculatorInputs
  setInputs: (p: Partial<CalculatorInputs>) => void
  onRowChoice: (model: PositionReturnModel, choice: ScenarioUiChoice, customPct: number) => void
}) {
  const h = horizonClamp(horizon)
  const b = blendedRateForDashboardPositionId(m.id, retRate, brkRate)
  const ch = inferScenarioUiChoice(m, b, h)
  const [draftPct, setDraftPct] = useState(() => String(decimalToPct(ch === 'custom' ? m.flatRate : b)))

  const yrKey = useMemo(() => m.yearlyReturns.slice(0, h).join(','), [m.yearlyReturns, h])

  useEffect(() => {
    const nextCh = inferScenarioUiChoice(m, b, h)
    setDraftPct(String(decimalToPct(nextCh === 'custom' ? m.flatRate : b)))
  }, [m.id, m.flatRate, m.returnMode, m.scenario, yrKey, h, b])

  const showYears =
    ch === 'peryear' ||
    (m.returnMode === 'scenario' &&
      m.scenario != null &&
      !ratesMatchScenario(m.scenario, padYearlyReturns(m.yearlyReturns, h, m.flatRate), h))

  return (
    <Fragment>
      <tr>
        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{m.ticker || '—'}</td>
        <td>{m.label || m.ticker}</td>
        <td className="scenario-table__stack">
          <ScenarioSelect
            value={ch}
            mixed={false}
            onPick={(c) => {
              if (c === 'custom') {
                const seed = String(decimalToPct(b))
                setDraftPct(seed)
                onRowChoice(m, 'custom', parseSignedPct(seed))
              } else {
                onRowChoice(m, c, 0)
              }
            }}
          />
          {ch === 'custom' ? (
            <CustomPctField
              valueStr={draftPct}
              onChangeStr={setDraftPct}
              onCommitDecimal={(pct) => onRowChoice(m, 'custom', pct)}
            />
          ) : null}
        </td>
      </tr>
      {showYears ? (
        <tr>
          <td colSpan={3}>
            <YearStrip
              model={m}
              horizon={h}
              retirementCalendarYear={retirementCalendarYear}
              onPatch={(next) => setInputs({ positionReturnModels: mergePatchPositionModelsIntoInputs(inputs, [next]) })}
            />
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
}

export function AccountBalancesCustomScenarioOverlay({
  open,
  positionModels,
  inputs,
  setInputs,
  yearsToRetirement,
  retirementCalendarYear,
}: Props) {
  const h = horizonClamp(yearsToRetirement)
  const retRate = inputs.retRate
  const brkRate = inputs.brkRate

  const [scope, setScope] = useState<CustomScenarioScope>('holding')

  const [allCustomPctStr, setAllCustomPctStr] = useState('7')
  const [pretaxCustomPctStr, setPretaxCustomPctStr] = useState('7')
  const [rothCustomPctStr, setRothCustomPctStr] = useState('7')
  const [hsaCustomPctStr, setHsaCustomPctStr] = useState('7')
  const [brkCustomPctStr, setBrkCustomPctStr] = useState('7')

  const commonAll = useMemo(
    () => inferCommonScenarioChoiceForModels(positionModels, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate)),
    [positionModels, h, retRate, brkRate],
  )

  const pretaxModels = useMemo(() => modelsMatchingPrefixes(positionModels, PRETAX_PREFIXES), [positionModels])
  const rothModels = useMemo(() => modelsMatchingPrefixes(positionModels, [ROTH_PREFIX]), [positionModels])
  const hsaModels = useMemo(() => modelsMatchingPrefixes(positionModels, [HSA_PREFIX]), [positionModels])
  const brkModels = useMemo(() => modelsMatchingPrefixes(positionModels, [BROKERAGE_PREFIX]), [positionModels])

  const commonPretax = useMemo(
    () => inferCommonScenarioChoiceForModels(pretaxModels, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate)),
    [pretaxModels, h, retRate, brkRate],
  )
  const commonRoth = useMemo(
    () => inferCommonScenarioChoiceForModels(rothModels, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate)),
    [rothModels, h, retRate, brkRate],
  )
  const commonHsa = useMemo(
    () => inferCommonScenarioChoiceForModels(hsaModels, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate)),
    [hsaModels, h, retRate, brkRate],
  )
  const commonBrk = useMemo(
    () => inferCommonScenarioChoiceForModels(brkModels, h, (m) => blendedRateForDashboardPositionId(m.id, retRate, brkRate)),
    [brkModels, h, retRate, brkRate],
  )

  useEffect(() => {
    if (!open) return
    setAllCustomPctStr(firstCustomPctString(positionModels, h, retRate, brkRate))
    setPretaxCustomPctStr(firstCustomPctString(pretaxModels, h, retRate, brkRate))
    setRothCustomPctStr(firstCustomPctString(rothModels, h, retRate, brkRate))
    setHsaCustomPctStr(firstCustomPctString(hsaModels, h, retRate, brkRate))
    setBrkCustomPctStr(firstCustomPctString(brkModels, h, retRate, brkRate))
  }, [open, positionModels, pretaxModels, rothModels, hsaModels, brkModels, h, retRate, brkRate])

  const patchMany = useCallback(
    (targets: PositionReturnModel[], mapOne: (m: PositionReturnModel) => PositionReturnModel) => {
      if (targets.length === 0) return
      const next = targets.map(mapOne)
      setInputs({ positionReturnModels: mergePatchPositionModelsIntoInputs(inputs, next) })
    },
    [inputs, setInputs],
  )

  const applyAllChoice = useCallback(
    (choice: ScenarioUiChoice, customPct: number) => {
      patchMany(positionModels, (m) => {
        const b = blendedRateForDashboardPositionId(m.id, retRate, brkRate)
        return applyScenarioUiChoice(m, choice, b, h, customPct)
      })
    },
    [h, patchMany, positionModels, retRate, brkRate],
  )

  const applyBucketChoice = useCallback(
    (subset: PositionReturnModel[], choice: ScenarioUiChoice, customPct: number) => {
      patchMany(subset, (m) => {
        const b = blendedRateForDashboardPositionId(m.id, retRate, brkRate)
        return applyScenarioUiChoice(m, choice, b, h, customPct)
      })
    },
    [h, patchMany, retRate, brkRate],
  )

  const onRowChoice = useCallback(
    (m: PositionReturnModel, choice: ScenarioUiChoice, customPct: number) => {
      const b = blendedRateForDashboardPositionId(m.id, retRate, brkRate)
      const next = applyScenarioUiChoice(m, choice, b, h, customPct)
      setInputs({ positionReturnModels: mergePatchPositionModelsIntoInputs(inputs, [next]) })
    },
    [h, inputs, retRate, brkRate, setInputs],
  )

  const sortedHoldings = useMemo(() => {
    return [...positionModels].sort((a, b) => (a.ticker || '').localeCompare(b.ticker || '', undefined, { sensitivity: 'base' }))
  }, [positionModels])

  if (!open) return null

  return (
    <div className="account-balances-custom-scenario-overlay" role="region" aria-label="Custom scenario editor">
      <fieldset className="custom-scenario-scope">
        <legend className="custom-scenario-scope__legend">Applies to</legend>
        <div className="custom-scenario-scope__options">
          <label className="custom-scenario-scope__opt">
            <input type="radio" name="custom-scenario-scope" checked={scope === 'all'} onChange={() => setScope('all')} />
            All holdings
          </label>
          <label className="custom-scenario-scope__opt">
            <input type="radio" name="custom-scenario-scope" checked={scope === 'bucket'} onChange={() => setScope('bucket')} />
            By bucket
          </label>
          <label className="custom-scenario-scope__opt">
            <input type="radio" name="custom-scenario-scope" checked={scope === 'holding'} onChange={() => setScope('holding')} />
            Per holding
          </label>
        </div>
      </fieldset>

      {scope === 'all' ? (
        <div className="custom-scenario-panel">
          <ScenarioSelect
            value={commonAll}
            mixed={commonAll === SCENARIO_MIXED}
            onPick={(c) => applyAllChoice(c, parseSignedPct(allCustomPctStr))}
          />
          {commonAll === 'custom' ? (
            <CustomPctField
              valueStr={allCustomPctStr}
              onChangeStr={setAllCustomPctStr}
              onCommitDecimal={(pct) => applyAllChoice('custom', pct)}
            />
          ) : null}
        </div>
      ) : null}

      {scope === 'bucket' ? (
        <div className="custom-scenario-panel custom-scenario-bucket-grid">
          <span className="custom-scenario-bucket-label">Brokerage</span>
          <div>
            <ScenarioSelect
              value={commonBrk}
              mixed={commonBrk === SCENARIO_MIXED}
              onPick={(c) => applyBucketChoice(brkModels, c, parseSignedPct(brkCustomPctStr))}
            />
            {commonBrk === 'custom' && brkModels.length > 0 ? (
              <CustomPctField
                valueStr={brkCustomPctStr}
                onChangeStr={setBrkCustomPctStr}
                onCommitDecimal={(pct) => applyBucketChoice(brkModels, 'custom', pct)}
              />
            ) : null}
            {brkModels.length === 0 ? (
              <p className="footnote custom-scenario-footnote">No brokerage positions in import.</p>
            ) : null}
          </div>

          <span className="custom-scenario-bucket-label">Pre-tax</span>
          <div>
            <ScenarioSelect
              value={commonPretax}
              mixed={commonPretax === SCENARIO_MIXED}
              onPick={(c) => applyBucketChoice(pretaxModels, c, parseSignedPct(pretaxCustomPctStr))}
            />
            {commonPretax === 'custom' && pretaxModels.length > 0 ? (
              <CustomPctField
                valueStr={pretaxCustomPctStr}
                onChangeStr={setPretaxCustomPctStr}
                onCommitDecimal={(pct) => applyBucketChoice(pretaxModels, 'custom', pct)}
              />
            ) : null}
            {pretaxModels.length === 0 ? (
              <p className="footnote custom-scenario-footnote">No pre-tax positions in import.</p>
            ) : null}
          </div>

          <span className="custom-scenario-bucket-label">Roth</span>
          <div>
            <ScenarioSelect
              value={commonRoth}
              mixed={commonRoth === SCENARIO_MIXED}
              onPick={(c) => applyBucketChoice(rothModels, c, parseSignedPct(rothCustomPctStr))}
            />
            {commonRoth === 'custom' && rothModels.length > 0 ? (
              <CustomPctField
                valueStr={rothCustomPctStr}
                onChangeStr={setRothCustomPctStr}
                onCommitDecimal={(pct) => applyBucketChoice(rothModels, 'custom', pct)}
              />
            ) : null}
            {rothModels.length === 0 ? <p className="footnote custom-scenario-footnote">No Roth positions in import.</p> : null}
          </div>

          <span className="custom-scenario-bucket-label">HSA</span>
          <div>
            <ScenarioSelect
              value={commonHsa}
              mixed={commonHsa === SCENARIO_MIXED}
              onPick={(c) => applyBucketChoice(hsaModels, c, parseSignedPct(hsaCustomPctStr))}
            />
            {commonHsa === 'custom' && hsaModels.length > 0 ? (
              <CustomPctField
                valueStr={hsaCustomPctStr}
                onChangeStr={setHsaCustomPctStr}
                onCommitDecimal={(pct) => applyBucketChoice(hsaModels, 'custom', pct)}
              />
            ) : null}
            {hsaModels.length === 0 ? <p className="footnote custom-scenario-footnote">No HSA positions in import.</p> : null}
          </div>
        </div>
      ) : null}

      {scope === 'holding' ? (
        <div className="custom-scenario-table-wrap">
          <table className="scenario-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Description</th>
                <th>Scenario</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((m) => (
                <HoldingScenarioRow
                  key={m.id}
                  m={m}
                  horizon={h}
                  retRate={retRate}
                  brkRate={brkRate}
                  retirementCalendarYear={retirementCalendarYear}
                  inputs={inputs}
                  setInputs={setInputs}
                  onRowChoice={onRowChoice}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
