import { Button } from '@heroui/react'
import './PhaseToggle.scss'

type Phase = 'growth' | 'income'

type Props = {
  phase: Phase
  onPhase: (p: Phase) => void
  currentAge: number
  targetRetirementAge: number
}

export function PhaseToggle({ phase, onPhase, currentAge, targetRetirementAge }: Props) {
  const growthActive = phase === 'growth'
  const incomeActive = phase === 'income'
  return (
    <div className="mb-6 flex overflow-hidden rounded-[10px] border border-[var(--border-strong)]">
      <Button
        fullWidth
        variant={growthActive ? 'primary' : 'secondary'}
        onPress={() => onPhase('growth')}
        className="typo-phase-toggle !rounded-none min-h-[4.75rem] flex-1 flex-col gap-0.5 border-0 border-r border-[var(--border-strong)] py-3.5"
      >
        <span className="typo-phase-toggle-line1">↑ Growth</span>
        <span className="typo-phase-toggle-sub opacity-55">
          Age {currentAge}→{targetRetirementAge} · building the portfolio
        </span>
      </Button>
      <Button
        fullWidth
        variant={incomeActive ? 'primary' : 'secondary'}
        onPress={() => onPhase('income')}
        className="typo-phase-toggle !rounded-none min-h-[4.75rem] flex-1 flex-col gap-0.5 border-0 py-3.5"
      >
        <span className="typo-phase-toggle-line1">$ Income</span>
        <span className="typo-phase-toggle-sub opacity-80">
          Age {targetRetirementAge}+ · living off the portfolio
        </span>
      </Button>
    </div>
  )
}
