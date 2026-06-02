import { Fragment, type ReactNode } from 'react'
import { IncomeRmdTerm } from './IncomeRmdTerm'

const RMD_PATTERN = /\b(RMDs?)\b/g

/** Split plain text and wrap each RMD/RMDs occurrence with the income tooltip term. */
export function renderIncomeTextWithRmdTerms(text: string): ReactNode {
  const parts = text.split(RMD_PATTERN)

  return parts.map((part, index) => {
    if (part === 'RMD' || part === 'RMDs') {
      return <IncomeRmdTerm key={`rmd-${index}-${part}`} label={part} />
    }
    if (!part) return null
    return <Fragment key={`text-${index}`}>{part}</Fragment>
  })
}
