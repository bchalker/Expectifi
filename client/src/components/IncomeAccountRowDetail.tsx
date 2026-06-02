import type {
  IncomeAccordionContent,
  IncomeAccordionPart,
} from '../lib/incomeAccountAccordionContent'
import { IncomeAccordionTerm } from './IncomeAccordionTerm'
import { renderIncomeTextWithRmdTerms } from './renderIncomeTextWithRmdTerms'
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
  return <span key={`text-${index}`}>{renderIncomeTextWithRmdTerms(part.value)}</span>
}

function RichParagraph({ parts }: { parts: IncomeAccordionPart[] }) {
  return (
    <p className="income-account-row-detail__p">
      {parts.map((part, index) => renderPart(part, index))}
    </p>
  )
}

/** Expandable tax / draw guidance for income-mode account rows. */
export function IncomeAccountRowDetail({ content }: Props) {
  return (
    <article className="income-account-row-detail">
      <h3 className="income-account-row-detail__title">{renderIncomeTextWithRmdTerms(content.title)}</h3>

      <div className="income-account-row-detail__prose">
        {content.introParagraphs.map((parts) => (
          <RichParagraph key={parts.map((p) => (p.type === 'text' ? p.value : p.id)).join('|')} parts={parts} />
        ))}
        {content.sections.map((section) => (
          <section key={section.heading} className="income-account-row-detail__section">
            <h4 className="income-account-row-detail__heading">
              {renderIncomeTextWithRmdTerms(section.heading)}
            </h4>
            <RichParagraph parts={section.parts} />
          </section>
        ))}
      </div>

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
    </article>
  )
}
