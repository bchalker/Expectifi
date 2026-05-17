import { useState } from 'react'
import type { DestinationCatalogEntry } from '../../data/destinations'
import { usStateFlagUrl } from '../../lib/whereToRetire/usStateFlagUrl'
import './DestinationMark.scss'

type Props = {
  entry: Pick<DestinationCatalogEntry, 'flagEmoji' | 'stateAbbr' | 'code' | 'name'>
  className?: string
}

export function DestinationMark({ entry, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const markClass = ['wtr-dest-mark', className].filter(Boolean).join(' ')

  if (entry.flagEmoji) {
    return (
      <span className={`${markClass} wtr-dest-mark--emoji`} aria-hidden>
        {entry.flagEmoji}
      </span>
    )
  }

  const abbr = entry.stateAbbr ?? entry.code
  if (!imgFailed) {
    return (
      <img
        className={`${markClass} wtr-dest-mark--state`}
        src={usStateFlagUrl(abbr)}
        alt=""
        width={32}
        height={22}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <span className={`${markClass} wtr-dest-mark--badge`} aria-hidden>
      {abbr}
    </span>
  )
}
