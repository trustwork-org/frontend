import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiBell } from 'react-icons/fi'
import { EXPLORER } from '../contracts'
import { useNotifications } from '../hooks/useNotifications'
import type { ActivityKind } from '../hooks/useActivity'

const ICON: Record<ActivityKind, string> = {
  JobCreated: '✚',
  AppliedToJob: '➜',
  ApplicantApproved: '✓',
  JobCompleted: '★',
  PoorWorkReported: '!',
  FreelancerFlagged: '⚠',
  FreelancerBanned: '⛔',
  DisputeRaised: '⚖',
  EvidenceSubmitted: '📎',
  VoteSubmitted: '🗳',
  ArbitratorJoined: '🛡',
  ArbitratorLeft: '↩',
  ArbitratorSlashed: '🔻',
  ProfileRegistered: '👤',
  ProfileUpdated: '✎',
  TierMinted: '🏅',
  TierUpgraded: '⬆',
}

export default function NotificationBell() {
  const { unread, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close when clicking outside the dropdown.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => setOpen(o => !o)
  const close = () => setOpen(false)

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f7f7f5] transition-colors"
        aria-label="Notifications"
      >
        <FiBell className="text-[#1c1c1c] text-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full pt-2 w-[340px] z-50">
          <div className="bg-white border border-[#e0e0dc] rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e0e0dc]">
              <span className="text-[13px] font-semibold text-[#1c1c1c]">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-[#14a800] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {unreadCount === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-[24px] mb-2">🎉</div>
                <div className="text-[13px] font-medium text-[#1c1c1c]">You're all caught up</div>
                <div className="text-[11px] text-[#a0a0a0] mt-1">
                  We'll show new on-chain activity here.
                </div>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {unread.slice(0, 10).map(entry => (
                  <div
                    key={entry.id}
                    className="flex gap-2.5 px-4 py-2.5 border-b border-[#f0f0ed] last:border-b-0 hover:bg-[#f7f7f5]"
                  >
                    <div className="shrink-0 w-7 h-7 rounded-full bg-[#e6f4e1] text-[#0d7a00] flex items-center justify-center text-[12px]">
                      {ICON[entry.kind]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-[#1c1c1c] truncate">{entry.title}</div>
                      {entry.detail && (
                        <div className="text-[11px] text-[#6b6b6b] truncate">{entry.detail}</div>
                      )}
                      <div className="flex gap-2 mt-1 text-[10px]">
                        <a href={EXPLORER.tx(entry.txHash)} target="_blank" rel="noopener" className="text-[#14a800] hover:underline">tx ↗</a>
                        {entry.href && (
                          <Link to={entry.href} onClick={close} className="text-[#14a800] hover:underline">open →</Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {unread.length > 10 && (
                  <div className="px-4 py-2 text-[11px] text-[#a0a0a0] text-center">
                    +{unread.length - 10} more
                  </div>
                )}
              </div>
            )}

            <Link
              to="/app/activity"
              onClick={close}
              className="block px-4 py-2.5 text-[12px] text-center text-[#14a800] font-medium border-t border-[#e0e0dc] hover:bg-[#f7f7f5]"
            >
              View all activity →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
