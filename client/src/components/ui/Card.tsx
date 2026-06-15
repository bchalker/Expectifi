import type { ReactNode } from 'react'
import './Card.scss'

export type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={['ui-card', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
