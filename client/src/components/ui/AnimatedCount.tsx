import { useAnimatedScalar } from '../../hooks/useAnimatedScalar'

type Props = {
  value: number
  className?: string
  durationMs?: number
}

export function AnimatedCount({ value, className, durationMs }: Props) {
  const display = useAnimatedScalar(value, durationMs)
  return (
    <span className={className}>
      {Math.round(display).toLocaleString()}
    </span>
  )
}
