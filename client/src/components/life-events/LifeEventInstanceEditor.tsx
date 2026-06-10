import { useEffect, type ReactNode } from 'react'
import { IconShieldCheckFilled } from '@tabler/icons-react'
import { TAX_CONFIG_BY_LOCALE } from '../../config/taxConfig'
import { Toggle } from '../ui/Toggle'
import { InstanceLabelInput } from './InstancePrimaryFields'
import {
  LifeEventCurrencyInput,
  LifeEventFloatingCurrencyField,
  LifeEventFloatingSelectField,
  LifeEventFloatingTextareaField,
  LifeEventFloatingYearField,
} from './LifeEventFloatingField'
import { LifeEventHsaBlock } from './LifeEventHsaBlock'
import { clampNumber } from './LifeEventFieldValue'
import { LifeEventPercentInput } from './LifeEventPercentInput'
import { LifeEventYearInput } from './LifeEventYearInput'
import type { LifeEventConfig, LifeEventInstance } from './types'
import {
  calcFutureValue,
  calcHsaOffset,
  calcMortgageBreakEvenRate,
  calcMortgageTradeoff,
  formatCurrency,
  formatMortgageBreakEvenSentence,
} from './utils'
import {
  deriveMortgageLifeEvent,
  getMortgagePayoffYearBounds,
  MORTGAGE_LOAN_TERM_YEARS,
  normalizeMortgageLoanStartYear,
  normalizeMortgageLoanTermYears,
} from '../../lib/calc/mortgageLifeEvent'
import { MortgagePayoffSlider } from './MortgagePayoffSlider'

export interface LifeEventInstanceEditorProps {
  config: LifeEventConfig
  instance: LifeEventInstance
  instanceIdPrefix: string
  currentYear: number
  retirementYear: number
  retirementPortfolio: number
  growthRate: number
  hsaBalance: number
  onChange: (updates: Partial<LifeEventInstance>) => void
  instanceNumber?: number
  useInstancePrimaryRow?: boolean
}

const MORTGAGE_RATE_MIN = 0.5
const MORTGAGE_RATE_MAX = 10
const SIMPLE_OUTFLOW_IDS = new Set([
  'buy-car-cash',
  'child-down-payment',
  'wedding',
  'home-repair',
  'home-renovation',
])

function enrichTradeoffVerdict(text: string): ReactNode {
  const pattern = /\d+\.\d{1,2}%|\$[\d,]+/g
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index))
    nodes.push(<strong key={index}>{match[0]}</strong>)
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes.length > 0 ? <>{nodes}</> : text
}

function TradeoffRecommendedPill() {
  return (
    <span className="life-events-tradeoff__pill life-events-tradeoff__pill--card life-events-tradeoff__pill--recommended">
      <IconShieldCheckFilled size={12} aria-hidden />
      Recommended
    </span>
  )
}

function formatMortgageTradeoffNarrative(
  mortgageRate: number,
  portfolioGrowthRate: number,
  netAdvantage: number,
  investingWins: boolean,
): string {
  return investingWins
    ? `At your ${(mortgageRate * 100).toFixed(2)}% mortgage rate and ${(portfolioGrowthRate * 100).toFixed(1)}% portfolio growth rate, staying invested likely outperforms paying off early by roughly ${formatCurrency(netAdvantage)}. Carrying a mortgage into retirement is a personal decision. Here is what each path looks like.`
    : `At your ${(mortgageRate * 100).toFixed(2)}% mortgage rate and ${(portfolioGrowthRate * 100).toFixed(1)}% portfolio growth rate, paying off early likely outperforms staying invested by roughly ${formatCurrency(Math.abs(netAdvantage))}. Here is what each path looks like.`
}

interface AmountYearFieldsProps {
  config: LifeEventConfig
  instance: LifeEventInstance
  idPrefix: string
  yearMin: number
  yearMax: number
  onChange: (updates: Partial<LifeEventInstance>) => void
  instanceNumber?: number
  label?: string
  labelPlaceholder?: string
  onLabelChange?: (label: string) => void
  primaryRow?: boolean
}

function AmountYearFields({
  config,
  instance,
  idPrefix,
  yearMin,
  yearMax,
  onChange,
  instanceNumber,
  label = '',
  labelPlaceholder = '',
  onLabelChange,
  primaryRow = false,
}: AmountYearFieldsProps) {
  const yearValue = Math.min(Math.max(instance.year, yearMin), yearMax)
  const labelId = `${idPrefix}-label`

  useEffect(() => {
    if (instance.year === yearValue) return
    onChange({ year: yearValue })
  }, [instance.year, yearValue, onChange])

  if (primaryRow && instanceNumber != null && onLabelChange) {
    return (
      <div className="life-events-instance-primary">
        <div className="life-events-instance-primary__row">
          <InstanceLabelInput
            instanceNumber={instanceNumber}
            id={labelId}
            value={label}
            placeholder={labelPlaceholder}
            onChange={onLabelChange}
          />
          <LifeEventFloatingCurrencyField
            id={`${idPrefix}-amount`}
            label={config.amountLabel}
            value={instance.amount}
            min={config.amountMin}
            max={config.amountMax}
            onChange={(amount) => onChange({ amount })}
            className="life-events-instance-primary__field life-events-instance-primary__field--amount"
          />
          <LifeEventFloatingYearField
            id={`${idPrefix}-year`}
            label={config.yearLabel}
            value={yearValue}
            min={yearMin}
            max={yearMax}
            onChange={(year) => onChange({ year })}
            className="life-events-instance-primary__field life-events-instance-primary__field--year"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="life-events-mortgage-fields__row">
      <LifeEventFloatingCurrencyField
        id={`${idPrefix}-amount`}
        label={config.amountLabel}
        value={instance.amount}
        min={config.amountMin}
        max={config.amountMax}
        onChange={(amount) => onChange({ amount })}
        className="life-events-mortgage-fields__field"
      />
      <LifeEventFloatingYearField
        id={`${idPrefix}-year`}
        label={config.yearLabel}
        value={yearValue}
        min={yearMin}
        max={yearMax}
        onChange={(year) => onChange({ year })}
        className="life-events-mortgage-fields__field"
      />
    </div>
  )
}

interface CompoundingInsightProps {
  amount: number
  year: number
  retirementYear: number
  growthRate: number
}

function CompoundingInsight({ amount, year, retirementYear, growthRate }: CompoundingInsightProps) {
  const futureValue = calcFutureValue(amount, year, retirementYear, growthRate)
  return (
    <p className="life-events-event__impact-subline">
      A {formatCurrency(amount)} expense in {year} costs your retirement portfolio{' '}
      {formatCurrency(futureValue)} by {retirementYear} — what it would have compounded to.
    </p>
  )
}

interface TradeoffGridProps {
  optionALabel: string
  optionBLabel: string
  aRecommended: boolean
  bRecommended: boolean
  rowsA: { label: string; value: string; tone?: 'positive' | 'negative' }[]
  rowsB: { label: string; value: string; tone?: 'positive' | 'negative' }[]
  verdict?: ReactNode
}

function TradeoffGrid({
  optionALabel,
  optionBLabel,
  aRecommended,
  bRecommended,
  rowsA,
  rowsB,
  verdict,
}: TradeoffGridProps) {
  return (
    <>
      <div className="life-events-tradeoff__header">
        <span className="life-events-tradeoff__title">You have two options</span>
      </div>
      <div className="life-events-tradeoff__grid">
        <div
          className={[
            'life-events-tradeoff__card',
            aRecommended && 'life-events-tradeoff__card--recommended',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="life-events-tradeoff__card-head">
            <span className="life-events-tradeoff__card-title">
              <span className="life-events-tradeoff__option-badge">A</span>
              <span className="life-events-tradeoff__card-label">{optionALabel}</span>
            </span>
            {aRecommended ? <TradeoffRecommendedPill /> : null}
          </div>
          {rowsA.map((row) => (
            <div key={row.label} className="life-events-tradeoff__row">
              <span className="life-events-tradeoff__row-label">{row.label}</span>
              <span
                className={[
                  'life-events-tradeoff__row-value',
                  row.tone === 'positive' && 'life-events-tradeoff__row-value--positive',
                  row.tone === 'negative' && 'life-events-tradeoff__row-value--negative',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div
          className={[
            'life-events-tradeoff__card',
            bRecommended && 'life-events-tradeoff__card--recommended',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="life-events-tradeoff__card-head">
            <span className="life-events-tradeoff__card-title">
              <span className="life-events-tradeoff__option-badge">B</span>
              <span className="life-events-tradeoff__card-label">{optionBLabel}</span>
            </span>
            {bRecommended ? <TradeoffRecommendedPill /> : null}
          </div>
          {rowsB.map((row) => (
            <div key={row.label} className="life-events-tradeoff__row">
              <span className="life-events-tradeoff__row-label">{row.label}</span>
              <span
                className={[
                  'life-events-tradeoff__row-value',
                  row.tone === 'positive' && 'life-events-tradeoff__row-value--positive',
                  row.tone === 'negative' && 'life-events-tradeoff__row-value--negative',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      {verdict ? <p className="life-events-tradeoff__verdict">{verdict}</p> : null}
    </>
  )
}

function MortgageInstanceEditor({
  config,
  instance,
  instanceIdPrefix,
  currentYear,
  retirementYear,
  growthRate,
  onChange,
  instanceNumber,
  useInstancePrimaryRow,
}: LifeEventInstanceEditorProps) {
  const mortgageRate = instance.mortgageRate ?? 0.04
  const monthlyPayment = instance.mortgageMonthlyPayment ?? 1500
  const loanTermYears = normalizeMortgageLoanTermYears(instance.mortgageLoanTermYears)
  const loanStartYear = normalizeMortgageLoanStartYear(instance.mortgageLoanStartYear, currentYear)
  const mortgagePayoffBounds = getMortgagePayoffYearBounds(
    currentYear,
    retirementYear,
    loanTermYears,
    loanStartYear,
  )
  const payoffYearMin = mortgagePayoffBounds.payoffYearMin
  const payoffYearMax = mortgagePayoffBounds.scheduledPayoffYear
  const yearValue = clampNumber(instance.year, payoffYearMin, payoffYearMax)
  const scheduledPayoffYear = mortgagePayoffBounds.scheduledPayoffYear

  useEffect(() => {
    if (instance.year === yearValue) return
    onChange({ year: yearValue })
  }, [instance.year, yearValue, onChange])

  const mortgageDerived = deriveMortgageLifeEvent(
    instance.amount,
    mortgageRate,
    monthlyPayment,
    yearValue,
    currentYear,
    retirementYear,
    loanTermYears,
    loanStartYear,
  )

  const tradeoff = calcMortgageTradeoff(
    instance.amount,
    mortgageRate,
    growthRate,
    yearValue,
    retirementYear,
    mortgageDerived.interestSavedAtPayoffYear,
  )

  const breakEvenSentence = formatMortgageBreakEvenSentence(
    calcMortgageBreakEvenRate(
      instance.amount,
      tradeoff.interestSaved,
      yearValue,
      retirementYear,
    ),
    mortgageRate,
  )

  const portfolioCost = calcFutureValue(instance.amount, yearValue, retirementYear, growthRate)
  const loanTermOptions = MORTGAGE_LOAN_TERM_YEARS.map((years) => ({
    id: String(years),
    label: `${years} years`,
  }))
  const amountValueId = `${instanceIdPrefix}-amount`
  const mortgageRateValueId = `${instanceIdPrefix}-mortgage-rate`
  const monthlyPaymentValueId = `${instanceIdPrefix}-monthly-payment`
  const loanTermSelectId = `${instanceIdPrefix}-loan-term`
  const loanStartYearId = `${instanceIdPrefix}-loan-start-year`
  const yearRangeId = `${instanceIdPrefix}-year-range`
  const labelId = `${instanceIdPrefix}-label`
  const showPrimaryRow = useInstancePrimaryRow && instanceNumber != null

  return (
    <div className="life-events-event__expand">
      <div className="life-events-event__expand-layout life-events-event__expand-layout--stacked">
        <div className="life-events-slider-group life-events-slider-group--mortgage">
          {showPrimaryRow ? (
            <div className="life-events-instance-primary">
              <div className="life-events-instance-primary__row life-events-instance-primary__row--label-year">
                <InstanceLabelInput
                  instanceNumber={instanceNumber}
                  id={labelId}
                  value={instance.label}
                  placeholder={config.labelPlaceholder}
                  onChange={(label) => onChange({ label })}
                />
                <LifeEventFloatingYearField
                  id={`${instanceIdPrefix}-payoff-year`}
                  label={config.yearLabel}
                  value={yearValue}
                  min={payoffYearMin}
                  max={payoffYearMax}
                  onChange={(year) => onChange({ year })}
                  className="life-events-mortgage-fields__field life-events-instance-primary__field life-events-instance-primary__field--year"
                />
              </div>
            </div>
          ) : null}
          <div className="life-events-mortgage-fields">
            {showPrimaryRow ? (
              <div className="life-events-mortgage-fields__row">
                <LifeEventPercentInput
                  id={mortgageRateValueId}
                  label="Rate"
                  value={mortgageRate * 100}
                  min={MORTGAGE_RATE_MIN}
                  max={MORTGAGE_RATE_MAX}
                  onChange={(ratePct) => onChange({ mortgageRate: ratePct / 100 })}
                  className="life-events-mortgage-fields__field"
                />
                <LifeEventCurrencyInput
                  id={amountValueId}
                  label={config.amountLabel}
                  value={instance.amount}
                  min={config.amountMin}
                  max={config.amountMax}
                  onChange={(amount) => onChange({ amount })}
                  className="life-events-mortgage-fields__field"
                />
                <LifeEventCurrencyInput
                  id={monthlyPaymentValueId}
                  label="Monthly"
                  value={monthlyPayment}
                  min={500}
                  max={5000}
                  onChange={(amount) => onChange({ mortgageMonthlyPayment: amount })}
                  className="life-events-mortgage-fields__field"
                />
              </div>
            ) : (
              <div className="life-events-mortgage-fields__row">
                <LifeEventCurrencyInput
                  id={amountValueId}
                  label="Remaining"
                  value={instance.amount}
                  min={config.amountMin}
                  max={config.amountMax}
                  onChange={(amount) => onChange({ amount })}
                  className="life-events-mortgage-fields__field"
                />
                <LifeEventPercentInput
                  id={mortgageRateValueId}
                  label="Rate"
                  value={mortgageRate * 100}
                  min={MORTGAGE_RATE_MIN}
                  max={MORTGAGE_RATE_MAX}
                  onChange={(ratePct) => onChange({ mortgageRate: ratePct / 100 })}
                  className="life-events-mortgage-fields__field"
                />
                <LifeEventCurrencyInput
                  id={monthlyPaymentValueId}
                  label="Monthly"
                  value={monthlyPayment}
                  min={500}
                  max={5000}
                  onChange={(amount) => onChange({ mortgageMonthlyPayment: amount })}
                  className="life-events-mortgage-fields__field"
                />
              </div>
            )}
            <div className="life-events-mortgage-fields__row">
              <LifeEventFloatingSelectField
                id={loanTermSelectId}
                label="Loan term"
                value={String(loanTermYears)}
                onChange={(id) =>
                  onChange({
                    mortgageLoanTermYears: normalizeMortgageLoanTermYears(Number(id)),
                  })
                }
                options={loanTermOptions}
                className="life-events-mortgage-fields__field"
              />
              <LifeEventYearInput
                id={loanStartYearId}
                label="Year loan started"
                value={loanStartYear}
                min={2000}
                max={currentYear}
                onChange={(year) =>
                  onChange({
                    mortgageLoanStartYear: normalizeMortgageLoanStartYear(year, currentYear),
                  })
                }
                className="life-events-mortgage-fields__field"
              />
            </div>
          </div>
          <MortgagePayoffSlider
            id={yearRangeId}
            min={payoffYearMin}
            max={payoffYearMax}
            value={yearValue}
            scheduledPayoffYear={scheduledPayoffYear}
            onChange={(year) => onChange({ year })}
          />
        </div>

        <TradeoffGrid
          optionALabel="Pay off early"
          optionBLabel="Stay invested"
          aRecommended={!tradeoff.investingWins}
          bRecommended={tradeoff.investingWins}
          rowsA={[
            {
              label: 'Portfolio cost',
              value: formatCurrency(portfolioCost),
              tone: 'negative',
            },
            {
              label: 'Monthly freed',
              value: `+$${monthlyPayment.toLocaleString()}/mo`,
              tone: 'positive',
            },
            {
              label: 'Interest saved',
              value: formatCurrency(tradeoff.interestSaved),
            },
          ]}
          rowsB={[
            {
              label: 'Portfolio gain',
              value: formatCurrency(tradeoff.investmentGain),
              tone: 'positive',
            },
            {
              label: 'Mortgage continues',
              value: `-$${monthlyPayment.toLocaleString()}/mo`,
              tone: 'negative',
            },
            {
              label: 'Net advantage',
              value: formatCurrency(Math.abs(tradeoff.netAdvantageOfInvesting)),
            },
          ]}
          verdict={
            <>
              {enrichTradeoffVerdict(
                formatMortgageTradeoffNarrative(
                  mortgageRate,
                  growthRate,
                  tradeoff.netAdvantageOfInvesting,
                  tradeoff.investingWins,
                ),
              )}
              {breakEvenSentence ? <> {enrichTradeoffVerdict(breakEvenSentence)}</> : null}
            </>
          }
        />
      </div>
    </div>
  )
}

export function LifeEventInstanceEditor({
  config,
  instance,
  instanceIdPrefix,
  currentYear,
  retirementYear,
  retirementPortfolio,
  growthRate,
  hsaBalance,
  onChange,
  instanceNumber,
  useInstancePrimaryRow = false,
}: LifeEventInstanceEditorProps) {
  const yearMin = currentYear
  const yearMax = retirementYear
  const accountTypeOptions = TAX_CONFIG_BY_LOCALE.us.accountTypes.map((t) => ({
    id: t.key,
    label: t.label,
  }))

  const amountYearExtras =
    useInstancePrimaryRow && instanceNumber != null
      ? {
          instanceNumber,
          label: instance.label,
          labelPlaceholder: config.labelPlaceholder,
          onLabelChange: (label: string) => onChange({ label }),
          primaryRow: true as const,
        }
      : {}

  if (config.id === 'pay-off-mortgage' || config.id === 'pay-student-loans') {
    return (
      <MortgageInstanceEditor
        config={config}
        instance={instance}
        instanceIdPrefix={instanceIdPrefix}
        currentYear={currentYear}
        retirementYear={retirementYear}
        retirementPortfolio={retirementPortfolio}
        growthRate={growthRate}
        hsaBalance={hsaBalance}
        onChange={onChange}
        instanceNumber={instanceNumber}
        useInstancePrimaryRow={useInstancePrimaryRow}
      />
    )
  }

  if (config.id === 'medical-expense') {
    const defaultHsa = calcHsaOffset(instance.amount, hsaBalance)
    const hsaOffsetAmount = instance.hsaOffsetAmount ?? defaultHsa.hsaOffset
    const hsaResult = {
      grossExpense: instance.amount,
      hsaOffset: Math.min(instance.amount, Math.max(0, hsaOffsetAmount)),
      netExpense: Math.max(0, instance.amount - Math.min(instance.amount, Math.max(0, hsaOffsetAmount))),
      fullyCovered: instance.amount - Math.min(instance.amount, Math.max(0, hsaOffsetAmount)) <= 0,
      hasHsa: hsaBalance > 0 || hsaOffsetAmount > 0,
    }
    const withoutHsa = calcFutureValue(instance.amount, instance.year, retirementYear, growthRate)
    const withHsa = calcFutureValue(hsaResult.netExpense, instance.year, retirementYear, growthRate)
    const hsaSavings = withoutHsa - withHsa

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
          </div>
          <LifeEventHsaBlock
            hsaResult={hsaResult}
            hsaBalance={hsaBalance}
            hsaSavings={hsaSavings}
            hsaOffsetAmount={hsaOffsetAmount}
            onHsaOffsetChange={(amount) => onChange({ hsaOffsetAmount: amount })}
          />
        </div>
      </div>
    )
  }

  if (config.id === 'buy-vacation-property') {
    const downPayment = instance.downPayment ?? Math.round(instance.amount * 0.2)
    const mortgageRate = instance.mortgageRate ?? 0.065
    const loanTermYears = instance.mortgageLoanTermYears ?? 30
    const downFv = calcFutureValue(downPayment, instance.year, retirementYear, growthRate)
    const fullFv = calcFutureValue(instance.amount, instance.year, retirementYear, growthRate)
    const downWins = downFv < fullFv
    const showPrimaryRow = useInstancePrimaryRow && instanceNumber != null
    const labelId = `${instanceIdPrefix}-label`

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            {showPrimaryRow ? (
              <div className="life-events-instance-primary">
                <div className="life-events-instance-primary__row">
                  <InstanceLabelInput
                    instanceNumber={instanceNumber}
                    id={labelId}
                    value={instance.label}
                    placeholder={config.labelPlaceholder}
                    onChange={(label) => onChange({ label })}
                  />
                  <LifeEventCurrencyInput
                    id={`${instanceIdPrefix}-price`}
                    label={config.amountLabel}
                    value={instance.amount}
                    min={config.amountMin}
                    max={config.amountMax}
                    onChange={(amount) => onChange({ amount })}
                    className="life-events-mortgage-fields__field life-events-instance-primary__field life-events-instance-primary__field--amount"
                  />
                  <LifeEventYearInput
                    id={`${instanceIdPrefix}-vac-year`}
                    label={config.yearLabel}
                    value={instance.year}
                    min={yearMin}
                    max={yearMax}
                    onChange={(year) => onChange({ year })}
                    className="life-events-mortgage-fields__field life-events-instance-primary__field life-events-instance-primary__field--year"
                  />
                </div>
              </div>
            ) : null}
            <div className="life-events-mortgage-fields">
              {!showPrimaryRow ? (
                <div className="life-events-mortgage-fields__row">
                  <LifeEventCurrencyInput
                    id={`${instanceIdPrefix}-price`}
                    label="Purchase price"
                    value={instance.amount}
                    min={config.amountMin}
                    max={config.amountMax}
                    onChange={(amount) => onChange({ amount })}
                    className="life-events-mortgage-fields__field"
                  />
                  <LifeEventYearInput
                    id={`${instanceIdPrefix}-vac-year`}
                    label={config.yearLabel}
                    value={instance.year}
                    min={yearMin}
                    max={yearMax}
                    onChange={(year) => onChange({ year })}
                    className="life-events-mortgage-fields__field"
                  />
                </div>
              ) : null}
              <div className="life-events-mortgage-fields__row">
                <LifeEventCurrencyInput
                  id={`${instanceIdPrefix}-down`}
                  label="Down payment"
                  value={downPayment}
                  min={0}
                  max={instance.amount}
                  onChange={(amount) => onChange({ downPayment: amount })}
                  className="life-events-mortgage-fields__field"
                />
                <LifeEventPercentInput
                  id={`${instanceIdPrefix}-vac-rate`}
                  label="Mortgage rate"
                  value={mortgageRate * 100}
                  min={0}
                  max={15}
                  onChange={(ratePct) => onChange({ mortgageRate: ratePct / 100 })}
                  className="life-events-mortgage-fields__field"
                />
                <LifeEventYearInput
                  id={`${instanceIdPrefix}-vac-term`}
                  label="Term (years)"
                  value={loanTermYears}
                  min={5}
                  max={30}
                  onChange={(years) => onChange({ mortgageLoanTermYears: years })}
                  className="life-events-mortgage-fields__field"
                />
              </div>
            </div>
          </div>
          <TradeoffGrid
            optionALabel="20% down"
            optionBLabel="Pay all cash"
            aRecommended={downWins}
            bRecommended={!downWins}
            rowsA={[
              { label: 'Portfolio cost', value: formatCurrency(downFv), tone: 'negative' },
              { label: 'Down payment', value: formatCurrency(downPayment) },
            ]}
            rowsB={[
              { label: 'Portfolio cost', value: formatCurrency(fullFv), tone: 'negative' },
              { label: 'Up front', value: formatCurrency(instance.amount) },
            ]}
            verdict={enrichTradeoffVerdict(
              downWins
                ? `A ${formatCurrency(downPayment)} down payment keeps ${formatCurrency(fullFv - downFv)} more compounding in your portfolio than paying cash.`
                : `Paying all cash simplifies ownership but removes ${formatCurrency(fullFv - downFv)} more from compounding than a down payment.`,
            )}
          />
        </div>
      </div>
    )
  }

  if (config.id === 'business-investment') {
    const expectedReturn = instance.expectedReturn ?? 0.12
    const timelineYears = instance.timelineYears ?? 7
    const portfolioFv = calcFutureValue(instance.amount, instance.year, retirementYear, growthRate)
    const businessYears = Math.min(timelineYears, Math.max(0, retirementYear - instance.year))
    const businessValue = instance.amount * Math.pow(1 + expectedReturn, businessYears)
    const businessWins = businessValue > instance.amount * Math.pow(1 + growthRate, businessYears)

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            <div className="life-events-mortgage-fields__row">
              <LifeEventPercentInput
                id={`${instanceIdPrefix}-expected-return`}
                label="Expected return"
                value={expectedReturn * 100}
                min={0}
                max={50}
                onChange={(ratePct) => onChange({ expectedReturn: ratePct / 100 })}
                className="life-events-mortgage-fields__field"
              />
              <LifeEventYearInput
                id={`${instanceIdPrefix}-timeline`}
                label="Timeline (years)"
                value={timelineYears}
                min={1}
                max={30}
                onChange={(years) => onChange({ timelineYears: years })}
                className="life-events-mortgage-fields__field"
              />
            </div>
          </div>
          <TradeoffGrid
            optionALabel="Invest in business"
            optionBLabel="Stay in portfolio"
            aRecommended={businessWins}
            bRecommended={!businessWins}
            rowsA={[
              {
                label: 'Projected value',
                value: formatCurrency(businessValue),
                tone: 'positive',
              },
              { label: 'Amount invested', value: formatCurrency(instance.amount), tone: 'negative' },
            ]}
            rowsB={[
              {
                label: 'Portfolio at retirement',
                value: formatCurrency(portfolioFv + retirementPortfolio),
              },
              {
                label: 'Opportunity cost',
                value: formatCurrency(portfolioFv),
                tone: 'negative',
              },
            ]}
            verdict={enrichTradeoffVerdict(
              businessWins
                ? `At ${(expectedReturn * 100).toFixed(0)}% over ${timelineYears} years, the business could outperform leaving ${formatCurrency(instance.amount)} in your portfolio.`
                : `Your ${(growthRate * 100).toFixed(1)}% portfolio growth likely beats a ${(expectedReturn * 100).toFixed(0)}% business return over this timeline.`,
            )}
          />
        </div>
      </div>
    )
  }

  if (config.id === 'divorce') {
    const divorceIsPercent = instance.divorceIsPercent ?? true
    const divorcePercent = instance.divorcePercent ?? 50
    const splitAmount = divorceIsPercent
      ? retirementPortfolio * (divorcePercent / 100)
      : instance.amount

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <Toggle
              label="Estimate as percent of portfolio"
              value={divorceIsPercent}
              onChange={(enabled) => onChange({ divorceIsPercent: enabled })}
              className="life-events-event__financing-toggle"
            />
            {divorceIsPercent ? (
              <LifeEventPercentInput
                id={`${instanceIdPrefix}-divorce-pct`}
                label="Estimated split"
                value={divorcePercent}
                min={0}
                max={100}
                onChange={(pct) => onChange({ divorcePercent: pct })}
              />
            ) : (
              <AmountYearFields
                config={config}
                instance={instance}
                idPrefix={instanceIdPrefix}
                yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            )}
            <div className="life-events-field">
              <LifeEventYearInput
                id={`${instanceIdPrefix}-divorce-year`}
                label={config.yearLabel}
                value={instance.year}
                min={yearMin}
                max={yearMax}
                onChange={(year) => onChange({ year })}
              />
            </div>
          </div>
          <p className="life-events-event__impact-subline">
            Estimated split of {formatCurrency(splitAmount)} in {instance.year} — portfolio impact{' '}
            {formatCurrency(calcFutureValue(splitAmount, instance.year, retirementYear, growthRate))}{' '}
            by {retirementYear}.
          </p>
        </div>
      </div>
    )
  }

  if (config.id === 'inheritance') {
    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            <LifeEventFloatingSelectField
              id={`${instanceIdPrefix}-account`}
              label="Invest in account"
              value={instance.investedAccount ?? 'brokerage'}
              onChange={(id) => onChange({ investedAccount: id })}
              options={accountTypeOptions}
              className="life-events-mortgage-fields__field"
            />
          </div>
        </div>
      </div>
    )
  }

  if (config.id === 'sell-business' || config.id === 'sell-property') {
    const taxValue = (instance.taxRate ?? 0.2) * 100

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            <LifeEventPercentInput
              id={`${instanceIdPrefix}-tax`}
              label="Estimated tax rate"
              value={taxValue}
              min={0}
              max={50}
              onChange={(pct) => onChange({ taxRate: pct / 100 })}
            />
          </div>
        </div>
      </div>
    )
  }

  if (config.id === 'pension-lump-sum') {
    const taxValue = (instance.taxWithholding ?? 0.22) * 100

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            <LifeEventPercentInput
              id={`${instanceIdPrefix}-tax`}
              label="Tax withholding"
              value={taxValue}
              min={0}
              max={50}
              onChange={(pct) => onChange({ taxWithholding: pct / 100 })}
            />
          </div>
          <p className="life-events-event__impact-subline">
            If you also added this pension on the Guaranteed Income tab in Config, remove it there
            so it is not counted twice.
          </p>
        </div>
      </div>
    )
  }

  if (config.id === 'family-crisis') {
    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            <LifeEventFloatingTextareaField
              id={`${instanceIdPrefix}-description`}
              label="Description (required)"
              value={instance.description ?? ''}
              placeholder="Who you are supporting and why"
              rows={3}
              onChange={(description) => onChange({ description })}
              className="life-events-mortgage-fields__field"
            />
          </div>
        </div>
      </div>
    )
  }

  if (config.id === 'fund-529') {
    const plan529GrowthRate = instance.plan529GrowthRate ?? 0.06
    const projectedValue =
      instance.amount * Math.pow(1 + plan529GrowthRate, Math.max(0, retirementYear - instance.year))

    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
            <LifeEventPercentInput
              id={`${instanceIdPrefix}-529-growth`}
              label="529 growth rate (optional)"
              value={plan529GrowthRate * 100}
              min={0}
              max={15}
              onChange={(pct) => onChange({ plan529GrowthRate: pct / 100 })}
            />
          </div>
          <p className="life-events-event__impact-subline">
            {formatCurrency(instance.amount)} contributed in {instance.year} could grow to{' '}
            {formatCurrency(projectedValue)} in the 529 by {retirementYear} at{' '}
            {(plan529GrowthRate * 100).toFixed(1)}% — removed from your retirement compounding at{' '}
            {formatCurrency(
              calcFutureValue(instance.amount, instance.year, retirementYear, growthRate),
            )}{' '}
            opportunity cost.
          </p>
        </div>
      </div>
    )
  }

  if (SIMPLE_OUTFLOW_IDS.has(config.id)) {
    return (
      <div className="life-events-event__expand">
        <div className="life-events-event__expand-layout">
          <div className="life-events-slider-group">
            <AmountYearFields
              config={config}
              instance={instance}
              idPrefix={instanceIdPrefix}
              yearMin={yearMin}
              yearMax={yearMax}
              onChange={onChange}
              {...amountYearExtras}
            />
          </div>
          <CompoundingInsight
            amount={instance.amount}
            year={instance.year}
            retirementYear={retirementYear}
            growthRate={growthRate}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="life-events-event__expand">
      <div className="life-events-event__expand-layout">
        <div className="life-events-slider-group">
          <AmountYearFields
            config={config}
            instance={instance}
            idPrefix={instanceIdPrefix}
            yearMin={yearMin}
            yearMax={yearMax}
            onChange={onChange}
            {...amountYearExtras}
          />
        </div>
      </div>
    </div>
  )
}
