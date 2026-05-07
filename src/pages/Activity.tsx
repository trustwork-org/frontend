import { Link } from 'react-router-dom'
import { EXPLORER } from '../contracts'
import { useAuth } from '../context/AuthContext'
import { useActivity, type ActivityKind } from '../hooks/useActivity'

const ICON: Record<ActivityKind, string> = {
  JobCreated: '✚',
  AppliedToJob: '➜',
  ApplicantApproved: '✓',
  MilestoneSubmitted: '📤',
  MilestoneApproved: '💸',
  MilestoneRejected: '↩',
  JobCompleted: '★',
  JobCancelled: '✕',
  JobRescued: '⏪',
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

const TONE: Record<ActivityKind, string> = {
  JobCreated: 'bg-[#e6f4e1] text-[#0d7a00]',
  AppliedToJob: 'bg-[#e6f0fa] text-[#0066c0]',
  ApplicantApproved: 'bg-[#e6f4e1] text-[#0d7a00]',
  MilestoneSubmitted: 'bg-[#e6f0fa] text-[#0066c0]',
  MilestoneApproved: 'bg-[#e6f4e1] text-[#0d7a00]',
  MilestoneRejected: 'bg-[#fff2e0] text-[#b25600]',
  JobCompleted: 'bg-[#e6f4e1] text-[#0d7a00]',
  JobCancelled: 'bg-[#f0f0ed] text-[#6b6b6b]',
  JobRescued: 'bg-[#fff2e0] text-[#b25600]',
  PoorWorkReported: 'bg-[#fff2e0] text-[#b25600]',
  FreelancerFlagged: 'bg-[#fff2e0] text-[#b25600]',
  FreelancerBanned: 'bg-red-100 text-red-700',
  DisputeRaised: 'bg-[#fff2e0] text-[#b25600]',
  EvidenceSubmitted: 'bg-[#f0f0ed] text-[#6b6b6b]',
  VoteSubmitted: 'bg-[#e6f0fa] text-[#0066c0]',
  ArbitratorJoined: 'bg-[#e6f4e1] text-[#0d7a00]',
  ArbitratorLeft: 'bg-[#f0f0ed] text-[#6b6b6b]',
  ArbitratorSlashed: 'bg-red-100 text-red-700',
  ProfileRegistered: 'bg-[#e6f4e1] text-[#0d7a00]',
  ProfileUpdated: 'bg-[#f0f0ed] text-[#6b6b6b]',
  TierMinted: 'bg-yellow-100 text-yellow-700',
  TierUpgraded: 'bg-yellow-100 text-yellow-700',
}

const SEPOLIA_BLOCK_TIME_S = 12

function relativeAgo(blockDelta: bigint): string {
  const seconds = Number(blockDelta) * SEPOLIA_BLOCK_TIME_S
  if (seconds < 60) return `~${seconds}s ago`
  if (seconds < 3600) return `~${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `~${Math.floor(seconds / 3600)}h ago`
  return `~${Math.floor(seconds / 86400)}d ago`
}

export default function Activity() {
  const { address } = useAuth()
  const { entries, loading, error, latestBlock } = useActivity(address as `0x${string}` | null)

  if (!address) {
    return (
      <div className="max-w-[760px] mx-auto p-6 text-center">
        <div className="text-[15px] font-semibold mb-1">Sign in to see your activity</div>
        <div className="text-[13px] text-[#6b6b6b]">
          Every on-chain action you take on TrustWork shows up here with a link to its transaction.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[760px] mx-auto p-4 md:p-6">
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="text-[18px] md:text-[20px] font-bold">Activity</div>
          <div className="text-[12px] text-[#6b6b6b]">Your on-chain history on TrustWork. Each row is a verified transaction.</div>
        </div>
      </div>

      {loading && (
        <div className="text-center text-[#a0a0a0] text-[13px] py-12">Loading on-chain events…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-3 text-[13px] mb-3">
          Failed to load: {error}
        </div>
      )}

      {!loading && entries.length === 0 && !error && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-8 text-center">
          <div className="text-[15px] font-semibold mb-1">No activity yet</div>
          <div className="text-[13px] text-[#6b6b6b]">
            Post a job, apply to one, register your profile — anything you do on-chain will appear here.
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {entries.map(entry => {
          const blockDelta = latestBlock > entry.blockNumber ? latestBlock - entry.blockNumber : 0n
          return (
            <div key={entry.id} className="bg-white border border-[#e0e0dc] rounded-xl p-4 flex items-start gap-3">
              <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[14px] ${TONE[entry.kind]}`}>
                {ICON[entry.kind]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] md:text-[14px] font-medium text-[#1c1c1c]">{entry.title}</div>
                {entry.detail && <div className="text-[11px] md:text-[12px] text-[#6b6b6b] mt-0.5">{entry.detail}</div>}
                <div className="text-[11px] text-[#a0a0a0] mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>Block #{entry.blockNumber.toString()}</span>
                  {latestBlock > 0n && <span>{relativeAgo(blockDelta)}</span>}
                  <a href={EXPLORER.tx(entry.txHash)} target="_blank" rel="noopener" className="text-[#14a800] hover:underline">view tx ↗</a>
                  {entry.href && <Link to={entry.href} className="text-[#14a800] hover:underline">open in app →</Link>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
