import { Fragment, type ReactNode } from 'react'
import { IncomeRmdTerm } from './IncomeRmdTerm'

const RMD_PATTERN = /\b(RMDs?)\b/g

/** Dollar amounts, percentages, and key numeric ages in account-row education copy. */
const INLINE_EMPHASIS_PATTERN =
  /(\$[\d,]+(?:\/yr)?(?:\s+to\s+\$[\d,]+)?|\d+(?:\.\d+)?%|\d+(?:,\d{3})+|\d+ percent|\b59½\b|(?<=age )\d+|(?<=at )\d+(?=[.,\s]|$)|(?<=and )\d+(?=\s)|(?<=At )\d+)/g

function renderInlineEmphasis(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let matchIndex = 0

  for (const match of text.matchAll(INLINE_EMPHASIS_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${matchIndex}`}>{text.slice(lastIndex, index)}</Fragment>,
      )
    }
    nodes.push(
      <strong key={`${keyPrefix}-e-${matchIndex}`} className="income-account-row-detail__emphasis">
        {match[0]}
      </strong>,
    )
    lastIndex = index + match[0].length
    matchIndex += 1
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t-end`}>{text.slice(lastIndex)}</Fragment>)
  }

  return nodes.length > 0 ? nodes : [text]
}

function renderRmdAndEmphasis(text: string, keyPrefix: string): ReactNode[] {
  const segments = text.split(RMD_PATTERN)
  const nodes: ReactNode[] = []

  segments.forEach((segment, segmentIndex) => {
    if (segment === 'RMD' || segment === 'RMDs') {
      nodes.push(
        <IncomeRmdTerm key={`${keyPrefix}-rmd-${segmentIndex}`} label={segment} />,
      )
      return
    }
    if (!segment) return
    nodes.push(
      ...renderInlineEmphasis(segment, `${keyPrefix}-seg-${segmentIndex}`).map((node, index) => (
        <Fragment key={`${keyPrefix}-seg-${segmentIndex}-n-${index}`}>{node}</Fragment>
      )),
    )
  })

  return nodes
}

/** Split plain text: RMD tooltips, then bold amounts and percentages. */
export function renderIncomeTextWithRmdTerms(text: string): ReactNode {
  return <>{renderRmdAndEmphasis(text, 'inline')}</>
}

/** Bold standalone amount / rate part (from fmt or bracket labels). */
export function renderIncomeAmountEmphasis(value: string): ReactNode {
  return <strong className="income-account-row-detail__emphasis">{value}</strong>
}
