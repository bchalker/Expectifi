import { Tooltip } from './Tooltip'
import { INCOME_RMD_TOOLTIP } from '../lib/incomeRmdTooltip'
import './IncomeRmdTerm.scss'

type Props = {
  label: string
}

/** Dashed amber RMD/RMDs term with HeroUI tooltip (income mode). */
export function IncomeRmdTerm({ label }: Props) {
  return (
    <Tooltip content={INCOME_RMD_TOOLTIP} placement="top" showArrow delay={200} closeDelay={60}>
      <span className="income-rmd-term">{label}</span>
    </Tooltip>
  )
}
