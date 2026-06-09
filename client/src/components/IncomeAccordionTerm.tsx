import type { ReactNode } from 'react'
import {
  INCOME_ACCORDION_GLOSSARY,
  type IncomeAccordionGlossaryTermId,
} from '../lib/incomeAccountAccordionGlossary'
import { IncomeRmdTerm } from './IncomeRmdTerm'
import { Tooltip } from './Tooltip'
import './IncomeAccordionTerm.scss'

type Props = {
  termId: IncomeAccordionGlossaryTermId
  /** Visible label; defaults from term id. */
  children?: ReactNode
}

const DEFAULT_LABELS: Record<IncomeAccordionGlossaryTermId, string> = {
  magi: 'MAGI',
  irmaa: 'IRMAA',
  rmds: 'RMDs',
  rothConversion: 'Roth conversion',
  qualifiedMedical: 'qualified medical expenses',
  longTermCapitalGains: 'Long-term capital gains',
  ordinaryIncome: 'ordinary income',
  magiThreshold: 'MAGI threshold',
}

/** Dotted-underline glossary term with shared tooltip (income accordion). */
export function IncomeAccordionTerm({ termId, children }: Props) {
  const label = children ?? DEFAULT_LABELS[termId]

  if (termId === 'rmds') {
    return <IncomeRmdTerm label={String(label)} />
  }

  return (
    <Tooltip
      content={INCOME_ACCORDION_GLOSSARY[termId]}
      placement="top"
      showArrow
      delay={200}
      closeDelay={60}
    >
      <span className="income-accordion-term">{label}</span>
    </Tooltip>
  )
}
