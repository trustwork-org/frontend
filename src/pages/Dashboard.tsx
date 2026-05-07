import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, type JobStatus, type MilestoneStatus } from '../contracts'
import { useAuth } from '../context/AuthContext'
import { useJobs } from '../hooks/useJobs'
import { useProfile } from '../hooks/useProfile'
import { formatUSDC } from '../hooks/useUSDC'
import { shortAddress, formatDeadline } from '../utils/format'
import type { Job } from '../types/job'

const ZERO = '0x0000000000000000000000000000000000000000'

const STATUS_TONE: Record<JobStatus, string> = {
  NONE: 'bg-gray-100 text-gray-400',
  OPEN: 'bg-[#e6f4e1] text-[#0d7a00]',
  ACTIVE: 'bg-[#e6f0fa] text-[#0066c0]',
  DISPUTED: 'bg-[#fff2e0] text-[#b25600]',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const M_TONE: Record<MilestoneStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-amber-100 text-amber-700',
  RELEASED: 'bg-[#e6f4e1] text-[#0d7a00]',
  DISPUTED: 'bg-red-100 text-red-700',
  CLIENT_WON: 'bg-gray-100 text-gray-600',
  FREELANCER_WON: 'bg-gray-100 text-gray-600',
}

const TIERS = [
  { jobs: 5, name: 'Rising Talent' },
  { jobs: 20, name: 'Established Pro' },
  { jobs: 50, name: 'Expert' },
  { jobs: 100, name: 'Elite' },
  { jobs: 250, name: 'Legend' },
]

export default function Dashboard() {
  const { address } = useAuth()
  const { jobs, loading } = useJobs()
  const { data: profile } = useProfile(address as `0x${string}` | null)

  const me = address?.toLowerCase()

  const myJobs = useMemo(() => {
    if (!jobs || !me) return [] as Job[]
    return jobs.filter(j => j.client.toLowerCase() === me || j.freelancer.toLowerCase() === me)
  }, [jobs, me])

  const asClient = useMemo(() => myJobs.filter(j => j.client.toLowerCase() === me), [myJobs, me])
  const asFreelancer = useMemo(() => myJobs.filter(j => j.freelancer.toLowerCase() === me), [myJobs, me])

  const activeAsFreelancer = asFreelancer.filter(j => j.status === 'ACTIVE')
  const activeAsClient = asClient.filter(j => j.status === 'ACTIVE')

  // Active milestones requiring or showing my action
  const activeMilestones = useMemo(() => {
    const rows: {
      jobId: bigint
      jobTitle: string
      milestoneIndex: number
      milestoneText: string
      amount: bigint
      status: MilestoneStatus
      hint: string
    }[] = []
    for (const job of myJobs) {
      if (job.status !== 'ACTIVE' && job.status !== 'DISPUTED') continue
      const isClient = job.client.toLowerCase() === me
      const isFreelancer = job.freelancer.toLowerCase() === me
      for (const m of job.milestones) {
        const text = m.index === 0 ? job.firstMilestoneText : m.description
        let hint = ''
        if (isFreelancer) {
          if (m.statusLabel === 'PENDING') hint = 'You: submit work'
          else if (m.statusLabel === 'SUBMITTED') hint = 'Awaiting client review'
          else if (m.statusLabel === 'DISPUTED') hint = 'Dispute open'
          else continue
        } else if (isClient) {
          if (m.statusLabel === 'SUBMITTED') hint = 'You: review & approve'
          else if (m.statusLabel === 'PENDING') hint = 'Awaiting freelancer'
          else if (m.statusLabel === 'DISPUTED') hint = 'Dispute open'
          else continue
        }
        rows.push({
          jobId: job.jobId,
          jobTitle: job.title,
          milestoneIndex: m.index,
          milestoneText: text,
          amount: m.amount,
          status: m.statusLabel,
          hint,
        })
      }
    }
    return rows.sort((a, b) => {
      const order: Record<MilestoneStatus, number> = {
        DISPUTED: 0,
        SUBMITTED: 1,
        PENDING: 2,
        RELEASED: 3,
        CLIENT_WON: 4,
        FREELANCER_WON: 5,
      }
      return order[a.status] - order[b.status]
    })
  }, [myJobs, me])

  // Escrow balance: as a client, sum (availableForWork - amountReleased) across ACTIVE jobs
  const lockedAsClient = useMemo(
    () => activeAsClient.reduce((s, j) => s + (j.availableForWork - j.amountReleased), 0n),
    [activeAsClient],
  )
  // As freelancer, sum the still-pending (not yet released) milestone amounts in ACTIVE jobs
  const pendingPayout = useMemo(() => {
    let total = 0n
    for (const j of activeAsFreelancer) {
      for (const m of j.milestones) {
        if (m.statusLabel === 'PENDING' || m.statusLabel === 'SUBMITTED') total += m.amount
      }
    }
    return total
  }, [activeAsFreelancer])

  const recentJobs = myJobs.slice(0, 6)
  const totalCompleted = profile ? Number(profile.escrowJobsCompleted) : 0
  const tierIndex = profile?.tier ?? 0
  const nextTier = TIERS[tierIndex]
  const tierName = profile?.tierName || (tierIndex === 0 ? 'No tier yet' : '')

  if (!me) {
    return (
      <div className="max-w-[1200px] mx-auto p-6 text-center">
        <div className="text-[15px] font-semibold mb-1">Sign in to see your dashboard</div>
        <div className="text-[13px] text-[#6b6b6b]">Track your active jobs, milestones, earnings and reputation.</div>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold text-[#14a800]">
            {profile ? formatUSDC(profile.totalEarnedWei, 0) : '—'}
          </div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Total earned (USDC)</div>
          <div className="text-[12px] mt-1.5 text-[#6b6b6b]">across {totalCompleted} job{totalCompleted === 1 ? '' : 's'}</div>
        </div>
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold">{activeAsFreelancer.length}</div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Active as freelancer</div>
          <div className="text-[12px] mt-1.5 text-[#6b6b6b]">{formatUSDC(pendingPayout, 0)} USDC pending</div>
        </div>
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold">{activeAsClient.length}</div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Active as client</div>
          <div className="text-[12px] mt-1.5 text-[#6b6b6b]">{formatUSDC(lockedAsClient, 0)} USDC locked</div>
        </div>
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold">{tierIndex || '—'}</div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Reputation tier</div>
          <div className="text-[12px] mt-1.5 text-[#6b6b6b]">{tierName || 'Complete jobs to earn'}</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[17px] font-semibold">Active milestones</div>
            <Link to="/app" className="text-[12px] text-[#14a800] hover:underline">Browse jobs</Link>
          </div>
          <div className="flex flex-col gap-2.5 mb-6">
            {loading ? (
              <div className="text-center text-[#a0a0a0] text-[13px] py-6">Loading…</div>
            ) : activeMilestones.length === 0 ? (
              <div className="bg-white border border-[#e0e0dc] rounded-lg p-6 text-center">
                <div className="text-[14px] font-semibold mb-1">No active milestones</div>
                <div className="text-[12px] text-[#6b6b6b]">
                  When you have an active job with milestones in flight, they'll show here.
                </div>
              </div>
            ) : (
              activeMilestones.map(row => (
                <Link
                  key={`${row.jobId}-${row.milestoneIndex}`}
                  to={`/app/jobs/${row.jobId.toString()}`}
                  className="bg-white border border-[#e0e0dc] rounded-lg px-4 py-3.5 flex items-center gap-3 hover:border-[#14a800] transition"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#14a800]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] md:text-[14px] font-medium truncate">{row.milestoneText || `Milestone ${row.milestoneIndex + 1}`}</div>
                    <div className="text-[11px] md:text-[12px] text-[#a0a0a0] mt-0.5">
                      {row.jobTitle} · M{row.milestoneIndex + 1} · {row.hint}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-medium whitespace-nowrap ${M_TONE[row.status]}`}>
                    {row.status}
                  </span>
                  <div className="text-[13px] md:text-[14px] font-semibold text-[#14a800] shrink-0">{formatUSDC(row.amount)}</div>
                </Link>
              ))
            )}
          </div>

          <div className="text-[17px] font-semibold mb-4">Recent jobs</div>
          {recentJobs.length === 0 ? (
            <div className="bg-white border border-[#e0e0dc] rounded-xl p-6 text-center">
              <div className="text-[14px] font-medium mb-1">You haven't created or applied to any jobs yet</div>
              <div className="text-[12px] text-[#6b6b6b] mb-3">Get started by browsing the job board or posting a job.</div>
              <div className="flex justify-center gap-2">
                <Link to="/app" className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium">Browse jobs</Link>
                <Link to="/app/post" className="px-4 py-2 border border-[#e0e0dc] text-[#6b6b6b] rounded-md text-[13px] hover:border-[#1c1c1c] hover:text-[#1c1c1c]">Post a job</Link>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#e0e0dc] rounded-xl overflow-x-auto">
              <table className="w-full border-collapse text-[13px] min-w-[520px]">
                <thead>
                  <tr className="bg-[#f7f7f5] border-b border-[#e0e0dc]">
                    {['Job', 'Counterparty', 'Budget', 'Status', 'Deadline'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium text-[#6b6b6b]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((j, i) => {
                    const isClient = j.client.toLowerCase() === me
                    const counterpartyAddr = isClient ? j.freelancer : j.client
                    return (
                      <tr key={j.jobId.toString()} className={i < recentJobs.length - 1 ? 'border-b border-[#e0e0dc]' : ''}>
                        <td className="px-4 py-3">
                          <Link to={`/app/jobs/${j.jobId.toString()}`} className="hover:text-[#14a800]">
                            <div className="font-medium truncate max-w-[260px]">{j.title}</div>
                            <div className="text-[11px] text-[#a0a0a0]">
                              {CATEGORY_LABEL[j.category]} · {isClient ? 'as client' : 'as freelancer'}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#6b6b6b] font-mono text-[12px]">
                          {counterpartyAddr === ZERO ? <span className="italic text-[#a0a0a0]">unassigned</span> : shortAddress(counterpartyAddr)}
                        </td>
                        <td className="px-4 py-3 font-medium">{formatUSDC(j.milestoneSum)} USDC</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${STATUS_TONE[j.status]}`}>{j.status}</span>
                        </td>
                        <td className="px-4 py-3 text-[#6b6b6b] text-[12px]">{formatDeadline(j.deadline)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 mb-3">
            <div className="text-[13px] font-semibold mb-3">Reputation progress</div>
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-11 h-11 rounded-full bg-[#1e1e2d] flex items-center justify-center text-xl shrink-0">🏅</div>
              <div>
                <div className="font-semibold text-[14px]">{tierName || 'Not yet a freelancer'}</div>
                <div className="text-[11px] text-[#a0a0a0]">{tierIndex > 0 ? `Tier ${tierIndex} · Soulbound NFT` : 'Complete 5 jobs for Tier 1'}</div>
              </div>
            </div>
            {nextTier && (
              <>
                <div className="flex justify-between text-[12px] text-[#6b6b6b] mb-1.5">
                  <span>{totalCompleted} / {nextTier.jobs} jobs → {nextTier.name}</span>
                  <span>{Math.min(100, Math.round((totalCompleted / nextTier.jobs) * 100))}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#e4e4e0] overflow-hidden">
                  <div className="h-full bg-[#14a800] rounded-full" style={{ width: `${Math.min(100, (totalCompleted / nextTier.jobs) * 100)}%` }} />
                </div>
                <div className="text-[11px] text-[#a0a0a0] mt-1.5">
                  {Math.max(0, nextTier.jobs - totalCompleted)} more job{nextTier.jobs - totalCompleted === 1 ? '' : 's'} to reach {nextTier.name}
                </div>
              </>
            )}
            {!nextTier && (
              <div className="text-[11px] text-[#a0a0a0]">You've reached the top tier.</div>
            )}
          </div>

          <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 mb-3">
            <div className="text-[13px] font-semibold mb-3">Escrow balance</div>
            <div className="text-[26px] md:text-[28px] font-bold text-[#14a800] mb-1">{formatUSDC(lockedAsClient + pendingPayout, 0)} USDC</div>
            <div className="text-[12px] text-[#a0a0a0] mb-3">Combined locked + pending</div>
            <div className="border-t border-[#e0e0dc] pt-3 space-y-1">
              <div className="flex justify-between text-[12px] text-[#6b6b6b]">
                <span>Locked (as client)</span><span>{formatUSDC(lockedAsClient, 0)}</span>
              </div>
              <div className="flex justify-between text-[12px] text-[#6b6b6b]">
                <span>Pending payout (as freelancer)</span><span>{formatUSDC(pendingPayout, 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-3">Account standing</div>
            {profile?.banned ? (
              <div className="flex items-center gap-2 text-[14px]">
                <span className="text-red-500 text-[18px]">⚠</span>
                <span className="font-medium text-red-600">Banned</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[14px]">
                <span className="text-[#14a800] text-[18px]">✓</span>
                <span className="font-medium">Good standing</span>
              </div>
            )}
            <div className="text-[12px] text-[#a0a0a0] mt-1.5">
              {profile?.flags?.toString() || 0} flag{profile?.flags === 1n ? '' : 's'} · {profile?.banned ? 'Cannot apply to jobs' : 'Eligible to apply'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
