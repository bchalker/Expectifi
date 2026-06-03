import { IconChevronDown } from '@tabler/icons-react'
import { Fragment, useId, useState, type ReactNode } from 'react'
import { accountLabelForWithdrawalBucket } from '../config/taxConfig'
import { useUserLocale } from '../context/UserLocaleContext'
import type { IncomeAccordionGlossaryTermId } from '../lib/incomeAccountAccordionGlossary'
import type { ComputedSnapshot } from '../lib/computeResults'
import { filingStatusDisplayLabel } from '../lib/filingStatus'
import type { PortfolioGuidanceMetrics } from '../lib/portfolioGuidance'
import { PORTFOLIO_GUIDANCE_HSA_SOURCES } from '../lib/incomeAccountAccordionSources'
import type { IncomeAccordionSourceLink } from '../lib/incomeAccountAccordionSources'
import { fmt, fmtMon } from '../utils/format'
import { IncomeAccordionTerm } from './IncomeAccordionTerm'
import { IncomeAccordionSources } from './IncomeAccordionSources'
import { IncomeRmdTerm } from './IncomeRmdTerm'
import './PortfolioGuidancePanel.scss'

type GuidancePart =
  | { type: 'text'; value: string }
  | { type: 'value'; value: string }
  | { type: 'term'; id: IncomeAccordionGlossaryTermId; label?: string }

const GUIDANCE_EMPHASIS_PATTERN =
  /\$[\d,]+(?:\.\d+)?(?:\/(?:mo|yr|year))?|\d[\d,]*(?:\.\d+)?%|\d+(?:\.\d+)?\/(?:mo|yr|year)|\d+(?:\.\d+)?\s+years|\d+\s+percent|\d+\s+to\s+\d+\s+months/gi

function renderGuidanceTextWithEmphasis(text: string, keyPrefix: string): ReactNode {
  const nodes: ReactNode[] = []
  let lastIndex = 0

  for (const match of text.matchAll(GUIDANCE_EMPHASIS_PATTERN)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start))
    }
    nodes.push(
      <strong key={`${keyPrefix}-em-${start}`} className="portfolio-guidance__em">
        {match[0]}
      </strong>,
    )
    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  if (nodes.length === 0) return text
  if (nodes.length === 1) return nodes[0]
  return <Fragment key={keyPrefix}>{nodes}</Fragment>
}

function GuidanceParagraph({ parts }: { parts: GuidancePart[] }) {
  return (
    <div className="portfolio-guidance__p">
      {parts.map((part, index) => {
        if (part.type === 'value') {
          return (
            <strong key={`${index}-value`} className="portfolio-guidance__em">
              {part.value}
            </strong>
          )
        }

        if (part.type === 'term') {
          return (
            <IncomeAccordionTerm key={`${index}-${part.id}`} termId={part.id}>
              {part.label}
            </IncomeAccordionTerm>
          )
        }

        const rmdParts = part.value.split(/\b(RMDs?)\b/g)
        if (rmdParts.length === 1) {
          return (
            <Fragment key={`${index}-text`}>
              {renderGuidanceTextWithEmphasis(part.value, `text-${index}`)}
            </Fragment>
          )
        }

        return (
          <Fragment key={`${index}-text`}>
            {rmdParts.map((segment, segmentIndex) => {
              if (segment === 'RMD' || segment === 'RMDs') {
                return <IncomeRmdTerm key={`${index}-rmd-${segmentIndex}`} label={segment} />
              }
              if (!segment) return null
              return (
                <Fragment key={`${index}-seg-${segmentIndex}`}>
                  {renderGuidanceTextWithEmphasis(segment, `seg-${index}-${segmentIndex}`)}
                </Fragment>
              )
            })}
          </Fragment>
        )
      })}
    </div>
  )
}

type GuidanceSection = {
  id: string
  title: string
  paragraphs: GuidancePart[][]
  sources?: IncomeAccordionSourceLink[]
}

function formatRunwayYears(years: number | null): string {
  if (years == null) return 'not estimated'
  return `${years} years`
}

function buildGuidanceSections(
  metrics: PortfolioGuidanceMetrics,
  c: ComputedSnapshot,
  pretaxLabel: string,
): GuidanceSection[] {
  const filingLabel = filingStatusDisplayLabel(c.filingStatus)
  const runwaySentence: GuidancePart[] =
    metrics.currentRunwayYears != null && metrics.reducedRunwayYears != null
      ? [
          {
            type: 'text',
            value: ` If you are also withdrawing from principal, your runway shortens from ${formatRunwayYears(metrics.currentRunwayYears)} to approximately ${formatRunwayYears(metrics.reducedRunwayYears)}.`,
          },
        ]
      : []

  const sustainabilityOutcome: GuidancePart[][] = metrics.incomeMeetsOrExceedsGoal
    ? [
        [
          {
            type: 'text',
            value:
              'Your projected income exceeds your goal. Your principal is preserved and continues compounding as long as yield holds.',
          },
        ],
      ]
    : [
        [
          {
            type: 'text',
            value: `Your projected income covers ${metrics.incomeGoalCoveragePct}% of your goal. The remaining ${fmtMon(metrics.monthlyIncomeGap)} requires either a higher yield fund, a larger portfolio at ${metrics.retirementAge}, or supplemental principal withdrawals.`,
          },
        ],
      ]

  return [
    {
      id: 'market-drop',
      title: 'What happens if markets drop 30%?',
      paragraphs: [
        [
          {
            type: 'text',
            value:
              'A 30 percent market drop at retirement is one of the most damaging scenarios for a dividend income strategy because your principal generating that income shrinks immediately. At your current portfolio value of ',
          },
          { type: 'value', value: fmt(metrics.totalBalanceAtRetirement) },
          {
            type: 'text',
            value: ' a 30 percent drop would reduce it to ',
          },
          { type: 'value', value: fmt(metrics.reducedBalance30Pct) },
          { type: 'text', value: '.' },
        ],
        [
          {
            type: 'text',
            value: 'At that reduced balance your monthly dividend income would fall from ',
          },
          { type: 'value', value: fmtMon(metrics.currentMonthlyIncome) },
          { type: 'text', value: ' to approximately ' },
          { type: 'value', value: fmtMon(metrics.reducedMonthlyIncome) },
          { type: 'text', value: '.' },
          ...runwaySentence,
        ],
        [
          {
            type: 'text',
            value:
              'The best defense is maintaining a cash reserve covering 12 to 24 months of expenses so you are not forced to sell during a downturn. Roth IRA funds are ideal for this buffer since withdrawals are tax-free and do not affect ',
          },
          { type: 'term', id: 'magi' },
          { type: 'text', value: '.' },
        ],
      ],
    },
    {
      id: 'sustainability',
      title: 'How do I know if my income is sustainable?',
      paragraphs: [
        [
          {
            type: 'text',
            value:
              'Your income is most sustainable when dividend yield covers your full expense need without touching principal. At your current blended yield of ',
          },
          { type: 'value', value: `${metrics.blendedYieldPct.toFixed(1)}%` },
          {
            type: 'text',
            value: ' on a projected balance of ',
          },
          { type: 'value', value: fmt(metrics.totalBalanceAtRetirement) },
          { type: 'text', value: ' your portfolio generates ' },
          { type: 'value', value: `${fmt(Math.round(metrics.annualPortfolioIncome))}/yr` },
          { type: 'text', value: '.' },
        ],
        [
          { type: 'text', value: 'Your stated income goal is ' },
          { type: 'value', value: fmtMon(metrics.monthlyIncomeGoal) },
          { type: 'text', value: ` (` },
          { type: 'value', value: `${fmt(metrics.annualIncomeGoal)}/yr` },
          { type: 'text', value: ').' },
        ],
        ...sustainabilityOutcome,
        [
          {
            type: 'text',
            value:
              'Adding Social Security when eligible can close this gap significantly without touching your portfolio.',
          },
        ],
      ],
    },
    {
      id: 'tax-bracket',
      title: 'What is my tax bracket in retirement?',
      paragraphs: [
        [
          {
            type: 'text',
            value: `At your projected withdrawal levels your estimated federal tax bracket is ${metrics.marginalOrdinaryBracket}. Your modeled ordinary income tax is ${fmt(c.taxDetail.ordTax)}/year (${filingLabel}) with an effective rate of ${metrics.effectiveTaxRatePct}%.`,
          },
        ],
        [
          {
            type: 'text',
            value:
              'Roth withdrawals and qualified HSA withdrawals do not count toward this bracket. Drawing from Roth in high-income years can keep you in a lower bracket and below the Medicare ',
          },
          { type: 'term', id: 'irmaa' },
          { type: 'text', value: ' threshold.' },
        ],
      ],
    },
    {
      id: 'roth-conversions',
      title: 'Should I do Roth conversions before 73?',
      paragraphs: [
        [
          { type: 'term', id: 'rothConversion', label: 'Roth conversions' },
          {
            type: 'text',
            value: ` move money from your pre-tax ${pretaxLabel} into a Roth IRA. You pay ordinary income tax on the converted amount now in exchange for tax-free growth and withdrawals later with no `,
          },
          { type: 'term', id: 'rmds', label: 'RMDs' },
          { type: 'text', value: ' ever.' },
        ],
        [
          {
            type: 'text',
            value: 'The window between your retirement at ',
          },
          { type: 'value', value: String(metrics.retirementAge) },
          { type: 'text', value: ' and age 73 when ' },
          { type: 'term', id: 'rmds', label: 'RMDs' },
          { type: 'text', value: ' begin is the optimal conversion period. In years with low income you can convert up to ' },
          { type: 'value', value: fmt(Math.round(metrics.rothConversionRoom)) },
          {
            type: 'text',
            value: ' before hitting the next tax bracket without increasing your effective rate.',
          },
        ],
        [
          { type: 'text', value: 'Your pre-tax balance of ' },
          { type: 'value', value: fmt(Math.round(metrics.pretaxBalanceAtRetirement)) },
          { type: 'text', value: ' will generate ' },
          { type: 'term', id: 'rmds', label: 'RMDs' },
          { type: 'text', value: ' starting at 73. Converting a portion each year between ' },
          { type: 'value', value: String(metrics.retirementAge) },
          { type: 'text', value: ' and 73 reduces that future mandatory withdrawal burden and its tax impact.' },
        ],
        [
          {
            type: 'text',
            value:
              'Consult a tax advisor to model the optimal annual conversion amount for your situation.',
          },
        ],
      ],
    },
    {
      id: 'hsa-retirement',
      title: 'How do I use my HSA in retirement?',
      paragraphs: [
        [
          {
            type: 'text',
            value:
              'Your HSA is one of the most tax-efficient accounts you own and most people underuse it in retirement.',
          },
        ],
        [
          {
            type: 'text',
            value:
              'Before 65, withdrawals must be for qualified medical expenses or you face income tax plus a 20 percent penalty. After 65 the penalty disappears and non-medical withdrawals are taxed like a traditional IRA, making it a flexible backup income source.',
          },
        ],
        [
          {
            type: 'text',
            value: 'The priority order for HSA withdrawals in retirement:',
          },
        ],
        [
          {
            type: 'text',
            value: 'First: ',
          },
          { type: 'term', id: 'qualifiedMedical', label: 'qualified medical expenses' },
          {
            type: 'text',
            value:
              '. Always tax-free regardless of age. Covers doctor visits, prescriptions, dental, vision, hearing aids, and long-term care premiums.',
          },
        ],
        [
          {
            type: 'text',
            value:
              'Second: Medicare premiums after 65. Part B, Part D, and Medicare Advantage premiums all qualify. This effectively gives you tax-free Medicare coverage funded by pre-tax dollars you saved years ago.',
          },
        ],
        [
          {
            type: 'text',
            value: 'Third: general income after 65. Taxed as ',
          },
          { type: 'term', id: 'ordinaryIncome' },
          {
            type: 'text',
            value:
              ' but no penalty. Treat it like a traditional IRA at this point and draw strategically to stay in lower brackets.',
          },
        ],
        [
          {
            type: 'text',
            value: 'Your HSA has no ',
          },
          { type: 'term', id: 'rmds' },
          {
            type: 'text',
            value:
              ' and no expiration date. Leave it untouched as long as possible and let it compound. The longer it sits the more tax-free medical coverage it generates.',
          },
        ],
      ],
      sources: PORTFOLIO_GUIDANCE_HSA_SOURCES,
    },
  ]
}

function GuidanceAccordionItem({
  title,
  paragraphs,
  sources,
  open,
  onToggle,
}: {
  title: string
  paragraphs: GuidancePart[][]
  sources?: IncomeAccordionSourceLink[]
  open: boolean
  onToggle: () => void
}) {
  const panelId = useId()

  return (
    <div
      className={[
        'portfolio-guidance__item',
        open ? 'portfolio-guidance__item--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="portfolio-guidance__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="portfolio-guidance__trigger-label">{title}</span>
        <IconChevronDown className="portfolio-guidance__chevron" size={16} stroke={1.5} aria-hidden />
      </button>
      <div id={panelId} className="portfolio-guidance__panel">
        <div className="portfolio-guidance__panel-inner">
          <div className="portfolio-guidance__panel-content">
            {paragraphs.map((parts, paragraphIndex) => (
              <GuidanceParagraph key={`${title}-${paragraphIndex}`} parts={parts} />
            ))}
            {sources?.length ? (
              <IncomeAccordionSources
                sources={sources}
                className="portfolio-guidance__sources"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

type Props = {
  c: ComputedSnapshot
}

export function PortfolioGuidancePanel({ c }: Props) {
  const { taxConfig } = useUserLocale()
  const metrics = c.portfolioGuidance
  const [openId, setOpenId] = useState<string | null>(null)

  if (!metrics) {
    return (
      <p className="portfolio-guidance__empty">
        Add portfolio balances and income strategies to see portfolio guidance.
      </p>
    )
  }

  const pretaxLabel =
    accountLabelForWithdrawalBucket(taxConfig, 'pretax')?.toLowerCase() ?? 'pre-tax account'
  const sections = buildGuidanceSections(metrics, c, pretaxLabel)

  return (
    <article className="portfolio-guidance">
      {sections.map((section) => (
        <GuidanceAccordionItem
          key={section.id}
          title={section.title}
          paragraphs={section.paragraphs}
          sources={section.sources}
          open={openId === section.id}
          onToggle={() => setOpenId((current) => (current === section.id ? null : section.id))}
        />
      ))}
    </article>
  )
}
