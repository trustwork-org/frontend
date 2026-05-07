export function timeAgo(unix: bigint | number): string {
  const ts = typeof unix === 'bigint' ? Number(unix) : unix
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatDeadline(unix: bigint | number): string {
  const ts = typeof unix === 'bigint' ? Number(unix) : unix
  const date = new Date(ts * 1000)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function shortAddress(addr: string | null | undefined): string {
  if (!addr) return ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
