import { Fragment } from 'react'
import type { TaxPictureNarrative } from '../lib/taxBreakdownTaxPicture'

type Props = {
  narrative: TaxPictureNarrative
}

export function TaxBreakdownTaxPictureBody({ narrative }: Props) {
  return (
    <p className="tax-breakdown-harvest__body">
      {narrative.map((sentence, sentenceIndex) => (
        <Fragment key={sentenceIndex}>
          {sentenceIndex > 0 ? ' ' : null}
          {sentence.map((part, partIndex) =>
            typeof part === 'string' ? (
              <span key={partIndex}>{part}</span>
            ) : (
              <strong key={partIndex} className="tax-breakdown-harvest__em">
                {part.em}
              </strong>
            ),
          )}
        </Fragment>
      ))}
    </p>
  )
}
