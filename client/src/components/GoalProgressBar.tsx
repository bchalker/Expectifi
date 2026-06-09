import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { IconShieldCheckFilled } from '@tabler/icons-react'
import { currencySymbol } from '../lib/displayCurrency'
import { fmt, fmtInput, fmtMon, parseNum } from '../utils/format'
import { useClickOutside } from '../hooks/useClickOutside'
import './GoalProgressBar.scss'

type Phase = 'growth' | 'income'

type Props = {
  phase: Phase
  growthGoal: number
  growthGoalProgressPct: number | null
  monthlyIncomeGoal: number
  incomeGoalProgressPct: number | null
  hasPortfolioBalances: boolean
  onGrowthGoal: (amount: number) => void
  onMonthlyIncomeGoal: (amount: number) => void
  className?: string
}

const GOAL_LABEL = 'Goal'
/** Keep in sync with `.goal-progress-bar__inline-edit` max-width transition. */
const GOAL_EDIT_EXIT_MS = 280

type InlineEditProps = {
  editing: boolean
  phase: Phase
  value: number
  onChange: (amount: number) => void
  onClose: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

function GoalAmountInlineEdit({
  editing,
  phase,
  value,
  onChange,
  onClose,
  inputRef,
}: InlineEditProps) {
  const isGrowth = phase === 'growth'
  const [draft, setDraft] = useState(() => (value > 0 ? fmtInput(value) : ''))

  const commit = useCallback(() => {
    if (!editing) return
    const raw = draft.trim()
    const next = raw ? Math.round(parseNum(raw)) : 0
    onChange(next)
    onClose()
  }, [draft, editing, onChange, onClose])

  useEffect(() => {
    if (!editing) return
    setDraft(value > 0 ? fmtInput(value) : '')
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editing, value, inputRef])

  return (
    <div
      className={[
        'goal-progress-bar__inline-edit',
        editing && 'goal-progress-bar__inline-edit--open',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={!editing}
    >
      <span className="goal-progress-bar__inline-prefix">{currencySymbol()}</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className="goal-progress-bar__inline-input"
        value={draft}
        tabIndex={editing ? 0 : -1}
        aria-label={isGrowth ? 'Portfolio at retirement' : 'Monthly income in retirement'}
        onChange={(event) => {
          const digits = event.target.value.replace(/,/g, '').replace(/[^\d]/g, '')
          setDraft(digits ? fmtInput(parseNum(digits)) : '')
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
      />
      {!isGrowth ? (
        <span className="goal-progress-bar__inline-suffix">/mo</span>
      ) : null}
    </div>
  )
}

/** Shown above the wave subheader when the user has portfolio balances. */
export function GoalProgressBar({
  phase,
  growthGoal,
  growthGoalProgressPct,
  monthlyIncomeGoal,
  incomeGoalProgressPct,
  hasPortfolioBalances,
  onGrowthGoal,
  onMonthlyIncomeGoal,
  className,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [revealDisplay, setRevealDisplay] = useState(true)
  const zoneRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeEdit = useCallback(() => setEditing(false), [])

  const isGrowth = phase === 'growth'
  const goalValue = isGrowth ? growthGoal : monthlyIncomeGoal
  const onGoalChange = isGrowth ? onGrowthGoal : onMonthlyIncomeGoal
  const hasActiveGoal = goalValue > 0
  const showGrowth = isGrowth && hasActiveGoal && growthGoalProgressPct != null
  const showIncome =
    !isGrowth && hasActiveGoal && incomeGoalProgressPct != null
  const isEmpty = !showGrowth && !showIncome
  const displayHidden = editing || (isEmpty && !revealDisplay)

  const phaseClass = isGrowth
    ? 'goal-progress-bar--phase-growth'
    : 'goal-progress-bar--phase-income'

  useEffect(() => {
    if (editing) {
      setRevealDisplay(false)
      return
    }
    if (!isEmpty) {
      setRevealDisplay(true)
      return
    }
    const timer = window.setTimeout(() => setRevealDisplay(true), GOAL_EDIT_EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [editing, isEmpty])

  useClickOutside(zoneRef, () => {
    if (!editing) return
    const raw = inputRef.current?.value.trim() ?? ''
    const next = raw ? Math.round(parseNum(raw)) : 0
    onGoalChange(next)
    closeEdit()
  }, editing)

  if (!hasPortfolioBalances) return null

  const regionLabel =
    !showGrowth && !showIncome
      ? GOAL_LABEL
      : isGrowth
        ? 'Portfolio at retirement goal progress'
        : 'After-tax monthly income goal progress'

  return (
    <div
      className={[
        'goal-progress-bar',
        !showGrowth && !showIncome && 'goal-progress-bar--empty',
        showGrowth
          ? 'goal-progress-bar--phase-growth'
          : showIncome
            ? 'goal-progress-bar--phase-income'
            : phaseClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label={regionLabel}
    >
      <div className="goal-progress-bar__row">
        <span className="goal-progress-bar__label">{GOAL_LABEL}</span>
        <div className="goal-progress-bar__meter">
          <div
            className="goal-progress-bar__track"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              showGrowth || showIncome
                ? showGrowth
                  ? Math.min(100, Math.round(growthGoalProgressPct!))
                  : Math.min(100, Math.round(incomeGoalProgressPct!))
                : 0
            }
            aria-label={regionLabel}
          >
            {(showGrowth || showIncome) && (
              <div
                className={`goal-progress-bar__fill${
                  (showGrowth && growthGoalProgressPct! >= 100) ||
                  (showIncome && incomeGoalProgressPct! >= 100)
                    ? ' goal-progress-bar__fill--met'
                    : ''
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    showGrowth ? growthGoalProgressPct! : incomeGoalProgressPct!,
                  )}%`,
                }}
              />
            )}
          </div>
        </div>
        <div ref={zoneRef} className="goal-progress-bar__stat-zone">
          <div
            className={[
              'goal-progress-bar__display',
              displayHidden && 'goal-progress-bar__display--hidden',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden={displayHidden}
          >
            {!showGrowth && !showIncome ? (
              <button
                type="button"
                className="goal-progress-bar__add"
                onClick={() => setEditing(true)}
              >
                Add
              </button>
            ) : (
              (() => {
                const target = showGrowth ? growthGoal : monthlyIncomeGoal
                const pct = showGrowth ? growthGoalProgressPct! : incomeGoalProgressPct!
                const formatValue = showGrowth ? fmt : fmtMon
                const goalMet = pct >= 100
                const displayPct = goalMet ? 100 : Math.round(pct)
                const amountLabel = formatValue(target)

                return (
                  <span
                    className={[
                      'goal-progress-bar__stat',
                      goalMet && 'goal-progress-bar__stat--met',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="goal-progress-bar__stat-text tabular-nums">
                      {displayPct}% of{' '}
                      <button
                        type="button"
                        className="goal-progress-bar__amount-link"
                        onClick={() => setEditing(true)}
                      >
                        {amountLabel}
                      </button>
                    </span>
                    {goalMet ? (
                      <IconShieldCheckFilled
                        className="goal-progress-bar__met-icon"
                        size={16}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                )
              })()
            )}
          </div>
          <GoalAmountInlineEdit
            editing={editing}
            phase={phase}
            value={goalValue}
            onChange={onGoalChange}
            onClose={closeEdit}
            inputRef={inputRef}
          />
        </div>
      </div>
    </div>
  )
}
