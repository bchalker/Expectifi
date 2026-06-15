import { Chip } from '@heroui/react'
import type { ChipVariants } from '@heroui/styles'
import type { KeyboardEvent, ReactNode, CSSProperties } from 'react'
import './AppChip.scss'

export type AppChipColor = NonNullable<ChipVariants['color']>
export type AppChipVariant = NonNullable<ChipVariants['variant']>

export type AppChipProps = {
  children: ReactNode
  className?: string
  color?: AppChipColor
  variant?: AppChipVariant
  onClick?: () => void
  'aria-label'?: string
  style?: CSSProperties
}

/** HeroUI Chip with Expectifi typography (font-xs) and optional button behavior. */
export function AppChip({
  children,
  className = '',
  color = 'default',
  variant = 'soft',
  onClick,
  'aria-label': ariaLabel,
  style,
}: AppChipProps) {
  const interactive = Boolean(onClick)

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!interactive || !onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <Chip
      size="sm"
      color={color}
      variant={variant}
      className={['app-chip', interactive && 'app-chip--interactive', className]
        .filter(Boolean)
        .join(' ')}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </Chip>
  )
}
