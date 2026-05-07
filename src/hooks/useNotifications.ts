import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useActivity, type ActivityEntry } from './useActivity'

const POLL_MS = 60_000
const seenKey = (addr: string) => `tw:lastSeenBlock:${addr.toLowerCase()}`

/**
 * Wraps useActivity with a localStorage-backed "last seen" cursor so we can
 * compute unread events. Polls every minute so the bell updates without the
 * user navigating away. The seen cursor advances when the user clicks
 * "Mark all read" or opens the dropdown.
 */
export function useNotifications() {
  const { address } = useAuth()
  const { entries, latestBlock, loading, refresh } = useActivity(
    address as `0x${string}` | null,
    { pollIntervalMs: POLL_MS },
  )
  const [seenBlock, setSeenBlock] = useState<bigint>(0n)

  // Load the seen cursor whenever the address changes.
  useEffect(() => {
    if (!address) {
      setSeenBlock(0n)
      return
    }
    const stored = localStorage.getItem(seenKey(address))
    setSeenBlock(stored ? BigInt(stored) : 0n)
  }, [address])

  const unread: ActivityEntry[] = entries.filter(e => e.blockNumber > seenBlock)

  const markAllRead = useCallback(() => {
    if (!address) return
    const target = latestBlock > 0n ? latestBlock : seenBlock
    localStorage.setItem(seenKey(address), target.toString())
    setSeenBlock(target)
  }, [address, latestBlock, seenBlock])

  return {
    unread,
    unreadCount: unread.length,
    total: entries.length,
    loading,
    refresh,
    markAllRead,
  }
}
