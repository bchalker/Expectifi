import './SyncStatus.scss'

/** Relative sync label: "Synced 2 hours ago" or "Synced today at 9:14 AM." */
export function formatSyncStatusLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Sync time unavailable'

  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Synced just now'
  if (diffMin < 60) {
    return `Synced ${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  }

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) {
    return `Synced ${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  }

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (sameDay) {
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    return `Synced today at ${time}.`
  }

  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `Synced ${datePart} at ${timePart}.`
}

type Props = {
  syncedAt: string
  className?: string
}

/** Last-sync timestamp for Plaid-linked accounts. */
export function SyncStatus({ syncedAt, className }: Props) {
  const label = formatSyncStatusLabel(syncedAt)
  return (
    <span className={['sync-status', className].filter(Boolean).join(' ')} title={label}>
      {label}
    </span>
  )
}
