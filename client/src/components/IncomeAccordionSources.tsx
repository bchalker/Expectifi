import type { IncomeAccordionSourceLink } from '../lib/incomeAccountAccordionSources'
import './IncomeAccordionSources.scss'

type Props = {
  sources: IncomeAccordionSourceLink[]
  className?: string
}

/** Muted "Sources:" row with inline external links (income education). */
export function IncomeAccordionSources({ sources, className }: Props) {
  if (sources.length === 0) return null

  return (
    <p
      className={['income-accordion-sources', className].filter(Boolean).join(' ')}
    >
      <span className="income-accordion-sources__label">Sources:</span>{' '}
      {sources.map((source, index) => (
        <span key={source.href} className="income-accordion-sources__link-wrap">
          {index > 0 ? (
            <span className="income-accordion-sources__sep" aria-hidden>
              {' '}
              ·{' '}
            </span>
          ) : null}
          <a
            className="income-accordion-sources__link"
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {source.label}
          </a>
        </span>
      ))}
    </p>
  )
}
