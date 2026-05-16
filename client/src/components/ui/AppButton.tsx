import { Button } from '@heroui/react'
import type { ButtonProps } from '@heroui/react'

export type AppButtonVariant = 'primary' | 'secondary' | 'ghost'
export type AppButtonSize = 'sm' | 'md'

export type AppButtonProps = Omit<ButtonProps, 'variant' | 'size'> & {
  variant?: AppButtonVariant
  size?: AppButtonSize
  className?: string
}

/** HeroUI Button with HeadwayPlanner design-system chrome (see AppButton.scss). */
export function AppButton({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: AppButtonProps) {
  const heroVariant = variant === 'ghost' ? 'ghost' : variant === 'secondary' ? 'secondary' : 'primary'
  const classes = ['app-btn', `app-btn--${variant}`, `app-btn--${size}`, className].filter(Boolean).join(' ')

  return <Button {...rest} variant={heroVariant} className={classes} />
}
