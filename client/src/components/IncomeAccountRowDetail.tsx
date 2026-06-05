import type {
  IncomeAccordionContent,
  IncomeAccordionPart,
} from '../lib/incomeAccountAccordionContent'
import { IncomeAccordionTerm } from './IncomeAccordionTerm'
import { IncomeAccordionSources } from './IncomeAccordionSources'
import { formatIncomeSectionHeading } from '../lib/incomeAccountAccordionHeadings'
import {
  renderIncomeAmountEmphasis,
  renderIncomeTextWithRmdTerms,
} from './renderIncomeTextWithRmdTerms'
import './IncomeAccountRowDetail.scss'

type Props = {
  content: IncomeAccordionContent
}

function renderPart(part: IncomeAccordionPart, index: number) {
  if (part.type === 'term') {
    return (
      <IncomeAccordionTerm key={`term-${part.id}-${index}`} termId={part.id}>
        {part.label}
      </IncomeAccordionTerm>
    )
  }
  if (part.type === 'amount') {
    return <span key={`amount-${index}`}>{renderIncomeAmountEmphasis(part.value)}</span>
  }
  return (
    <span key={`text-${index}`}>{renderIncomeTextWithRmdTerms(part.value)}</span>
  )
}

function RichParagraph({ parts }: { parts: IncomeAccordionPart[] }) {
  return (
    <div className="income-account-row-detail__p">
      {parts.map((part, index) => renderPart(part, index))}
    </div>
  )
}

/** Expandable tax / draw guidance for income-mode account rows. */
export function IncomeAccountRowDetail({ content }: Props) {
  const hasProse =
    content.sections.length > 0 &&
    content.sections.some((section) => section.heading || section.parts.length > 0)

  return (
    <article className="income-account-row-detail">
      {hasProse ? (
        <div className="income-account-row-detail__prose">
        {content.sections.map((section, sectionIndex) => (
          <section
            key={section.heading || `section-${sectionIndex}`}
            className={[
              'income-account-row-detail__section',
              !section.heading && 'income-account-row-detail__section--continued',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {section.heading ? (
              <h4 className="income-account-row-detail__heading">
                {formatIncomeSectionHeading(section.heading)}
              </h4>
            ) : null}
            <RichParagraph parts={section.parts} />
          </section>
        ))}
        </div>
      ) : null}

      <dl className="income-account-row-detail__stats">
        {content.stats.map((row) => (
          <div key={row.label} className="income-account-row-detail__stat">
            <dt>{renderIncomeTextWithRmdTerms(row.label)}</dt>
            <dd className="tabular-nums">
              {row.valueTermId ? (
                <IncomeAccordionTerm termId={row.valueTermId}>{row.value}</IncomeAccordionTerm>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <IncomeAccordionSources sources={content.sources} />
    </article>
  )
}
