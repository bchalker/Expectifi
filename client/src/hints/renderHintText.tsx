import type { ReactNode } from 'react'

/** Matches ~$50,000/yr, $1,800/mo, $$50,000/yr (legacy double-$), etc. */
const HINT_VALUE_PATTERN = /~?\$+[\d,]+(?:\/mo|\/yr)?/g

/** Split plain hint copy so currency amounts render bold. */
export function renderHintTextWithBoldValues(text: string, keyPrefix: string): ReactNode {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(HINT_VALUE_PATTERN.source, 'g')

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <strong
        key={`${keyPrefix}-amt-${match.index}`}
        className="account-bucket-hint__value"
      >
        {match[0]}
      </strong>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  if (parts.length === 0) return text
  if (parts.length === 1) return parts[0]
  return parts
}
