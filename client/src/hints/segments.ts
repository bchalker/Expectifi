import type { HintLinkAction, HintSegment } from './types'

export function hintText(value: string): HintSegment {
  return { type: 'text', value }
}

/** Normalized monetary amount for bold display in bucket hints. */
export function hintValue(raw: string): HintSegment {
  let value = raw.trim()
  value = value.replace(/\$\$+/g, '$')
  value = value.replace(/(\/mo)\/mo\b/gi, '$1')
  value = value.replace(/(\/yr)\/yr\b/gi, '$1')
  return { type: 'value', value }
}

export function hintLink(label: string, action: HintLinkAction): HintSegment {
  return { type: 'link', label, action }
}

export function hintJoin(segments: HintSegment[]): HintSegment[] {
  return segments
}
