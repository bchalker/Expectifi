import { useLayoutEffect } from 'react'
import { GoalProgressBar } from './GoalProgressBar'
import { SubHeader } from './SubHeader'
import { useStickySentinel } from '../hooks/useStickySentinel'
import type { ComponentProps } from 'react'

type SubHeaderProps = ComponentProps<typeof SubHeader>

type Props = {
  stickyTopPx: number | null
  showGoalBarRow: boolean
  goalBarProps: ComponentProps<typeof GoalProgressBar>
  subHeaderProps: SubHeaderProps
  onStuckChange?: (stuck: boolean) => void
}

export function DashboardMainHero({
  stickyTopPx,
  showGoalBarRow,
  goalBarProps,
  subHeaderProps,
  onStuckChange,
}: Props) {
  const { heroRef, stuck } = useStickySentinel(stickyTopPx, true)

  useLayoutEffect(() => {
    onStuckChange?.(stuck)
    if (stuck) {
      document.documentElement.setAttribute('data-main-hero-stuck', 'true')
    } else {
      document.documentElement.removeAttribute('data-main-hero-stuck')
    }
  }, [stuck, onStuckChange])

  return (
    <>
      {showGoalBarRow ? (
        <GoalProgressBar
          {...goalBarProps}
          className="goal-progress-bar--in-main"
        />
      ) : null}
      <div
        ref={heroRef}
        className={stuck ? 'main__hero main__hero--stuck' : 'main__hero'}
      >
        <SubHeader
          {...subHeaderProps}
          className="subheader--in-main"
          instanceId="main-hero"
        />
      </div>
    </>
  )
}
