import { useEffect, useState } from 'react'
import './FadingText.scss'

type Props = {
  text: string
  className?: string
}

export function FadingText({ text, className }: Props) {
  const [displayed, setDisplayed] = useState(text)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (text === displayed) return
    setVisible(false)
    const id = window.setTimeout(() => {
      setDisplayed(text)
      setVisible(true)
    }, 120)
    return () => window.clearTimeout(id)
  }, [text, displayed])

  return (
    <span
      className={[
        'fading-text',
        visible && 'fading-text--visible',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {displayed}
    </span>
  )
}
