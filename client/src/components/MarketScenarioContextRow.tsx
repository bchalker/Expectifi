import { useMemo } from 'react'
import type { ComputedSnapshot, CalculatorInputs, ComputeBalanceModes } from '../lib/computeResults'
import { computeResults } from '../lib/computeResults'
import {
  getMarketScenarioDefinition,
  marketScenarioModifierSummary,
  type MarketScenarioId,
} from '../lib/marketScenario'
import { buildMarketScenarioProjectionSeries } from '../lib/marketScenarioProjection'
import { fmtK } from '../utils/format'
import { AccordionSection } from './ui/AccordionSection'
import { MarketScenarioSparkline } from './MarketScenarioSparkline'
import './FidelityHoldingScenarioPopout.scss'
import './MarketScenarioContextRow.scss'

function marketScenarioDotClass(id: MarketScenarioId): string {
  if (id === 'bull') return 'holdings-scenario-trigger--bull'
  if (id === 'bear') return 'holdings-scenario-trigger--bear'
  return 'holdings-scenario-trigger--custom'
}

const ACTIVE_MARKET_SCENARIO_SUBLABEL = 'Active Market Scenario'

function ScenarioHeadingBlock({
  label,
  dotClass,
  titleAs = 'h3',
}: {
  label: string
  dotClass: string
  titleAs?: 'h3' | 'span'
}) {
  const TitleTag = titleAs
  return (
    <div className="market-scenario-context-row__heading-block">
      <span className="market-scenario-context-row__sublabel">{ACTIVE_MARKET_SCENARIO_SUBLABEL}</span>
      <div className={`market-scenario-context-row__title-row ${dotClass}`}>
        <span className="holdings-scenario-trigger__dot" aria-hidden />
        <TitleTag className="market-scenario-context-row__title">{label}</TitleTag>
      </div>
    </div>
  )
}

function formatSignedDeltaK(delta: number): string {
  if (!Number.isFinite(delta) || delta === 0) return fmtK(0)
  const sign = delta > 0 ? '+' : '−'
  return `${sign}${fmtK(Math.abs(delta))}`
}

export type MarketScenarioContextRowProps = {
  scenarioId: MarketScenarioId
  c: ComputedSnapshot
  inputs: CalculatorInputs
  balanceModes: ComputeBalanceModes
  retRate: number
  brkRate: number
  hasScenarioOverrides?: boolean
  className?: string
}

export function MarketScenarioContextRow({
  scenarioId,
  c,
  inputs,
  balanceModes,
  retRate,
  brkRate,
  hasScenarioOverrides = false,
  className = '',
}: MarketScenarioContextRowProps) {
  const def = getMarketScenarioDefinition(scenarioId)
  const dotClass = marketScenarioDotClass(scenarioId)

  const chartUi = useMemo(
    () => ({ incomeMode: false, ssIncluded: false, incomeSecurityTicker: null }),
    [],
  )

  const projectionSnapshot = useMemo(
    () => computeResults(inputs, chartUi, balanceModes),
    [balanceModes, chartUi, inputs],
  )

  const baseSnapshot = useMemo(
    () => computeResults({ ...inputs, marketScenario: 'base' }, chartUi, balanceModes),
    [balanceModes, chartUi, inputs],
  )

  const retirementYear = projectionSnapshot.retirementCalendarYear

  const series = useMemo(
    () =>
      buildMarketScenarioProjectionSeries({
        retBal: projectionSnapshot.retBal,
        brkBal: projectionSnapshot.brkBal,
        annualSave: projectionSnapshot.save,
        retRate,
        brkRate,
        yearsToRetirement: projectionSnapshot.yearsToRetirement,
        retirementCalendarYear: retirementYear,
        scenarioId,
        terminalBaseTotal: baseSnapshot.totalFV,
        terminalScenarioTotal: c.totalFV,
      }),
    [
      baseSnapshot.totalFV,
      brkRate,
      c.totalFV,
      projectionSnapshot.brkBal,
      projectionSnapshot.retBal,
      projectionSnapshot.save,
      projectionSnapshot.yearsToRetirement,
      retRate,
      retirementYear,
      scenarioId,
    ],
  )

  const modifierSummary = marketScenarioModifierSummary(scenarioId)
  const baseEnd = baseSnapshot.totalFV
  const scenarioEnd = c.totalFV
  const delta = scenarioEnd - baseEnd
  const deltaTone = delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'

  const scenarioTitle = (
    <ScenarioHeadingBlock label={def.label} dotClass={dotClass} titleAs="span" />
  )

  const copyBlock = (
    <div className="market-scenario-context-row__copy">
      <p className="market-scenario-context-row__desc">{def.contextDescription}</p>
      <p className="market-scenario-context-row__modifier">{modifierSummary}</p>
      {hasScenarioOverrides ? (
        <p className="market-scenario-context-row__override-callout" role="note">
          Holdings or buckets with their own scenario will override this market-level setting.
        </p>
      ) : null}
    </div>
  )

  const chartBlock = (
    <div className="market-scenario-context-row__chart-block">
      <MarketScenarioSparkline
        series={series}
        scenarioLabel={def.label}
        deltaLabel={formatSignedDeltaK(delta)}
        deltaTone={deltaTone}
        retirementYear={series.years[series.years.length - 1] ?? retirementYear}
        animationKey={scenarioId}
      />
    </div>
  )

  const variantClass = `market-scenario-context-row--${scenarioId}`

  return (
    <>
      <section
        className={[
          'market-scenario-context-row',
          'market-scenario-context-row--desktop',
          variantClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={`${def.label} market scenario context`}
      >
        <div className="market-scenario-context-row__col market-scenario-context-row__col--copy">
          <ScenarioHeadingBlock label={def.label} dotClass={dotClass} />
          {copyBlock}
        </div>
        <div className="market-scenario-context-row__col market-scenario-context-row__col--chart">
          {chartBlock}
        </div>
      </section>

      <AccordionSection
        title={scenarioTitle}
        defaultOpen={false}
        className={[
          'market-scenario-context-row',
          'market-scenario-context-row--mobile',
          variantClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        panelClassName="market-scenario-context-row__accordion-panel"
      >
        <div className="market-scenario-context-row__mobile-stack">
          {copyBlock}
          {chartBlock}
        </div>
      </AccordionSection>
    </>
  )
}
