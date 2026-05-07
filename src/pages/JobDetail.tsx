import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CATEGORY_LABEL, EXPLORER, type JobStatus, type MilestoneStatus } from '../contracts'
import { useAuth } from '../context/AuthContext'
import { useJob } from '../hooks/useJob'
import { useEscrowActions } from '../hooks/useEscrowActions'
import { useUSDC, formatUSDC } from '../hooks/useUSDC'
import { formatDeadline, shortAddress, timeAgo } from '../utils/format'
import type { Milestone } from '../types/job'

const STATUS_LABEL: Record<JobStatus, string> = {
  NONE: '—',
  OPEN: 'Open',
  ACTIVE: 'In progress',
  DISPUTED: 'Disputed',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}
const STATUS_TONE: Record<JobStatus, string> = {
  NONE: 'text-[#a0a0a0] bg-[#f0f0ed]',
  OPEN: 'text-[#0d7a00] bg-[#e6f4e1]',
  ACTIVE: 'text-[#0066c0] bg-[#e6f0fa]',
  DISPUTED: 'text-[#b25600] bg-[#fff2e0]',
  COMPLETED: 'text-[#6b6b6b] bg-[#f0f0ed]',
  CLOSED: 'text-[#6b6b6b] bg-[#f0f0ed]',
  CANCELLED: 'text-[#6b6b6b] bg-[#f0f0ed]',
}
const M_STATUS_LABEL: Record<MilestoneStatus, string> = {
  PENDING: 'Pending',
  SUBMITTED: 'Submitted — awaiting client',
  RELEASED: 'Released',
  DISPUTED: 'Disputed',
  CLIENT_WON: 'Resolved — client won',
  FREELANCER_WON: 'Resolved — freelancer won',
}
const M_STATUS_TONE: Record<MilestoneStatus, string> = {
  PENDING: 'text-[#6b6b6b] bg-[#f0f0ed]',
  SUBMITTED: 'text-[#b25600] bg-[#fff2e0]',
  RELEASED: 'text-[#0d7a00] bg-[#e6f4e1]',
  DISPUTED: 'text-[#b25600] bg-[#fff2e0]',
  CLIENT_WON: 'text-[#6b6b6b] bg-[#f0f0ed]',
  FREELANCER_WON: 'text-[#6b6b6b] bg-[#f0f0ed]',
}

const ZERO = '0x0000000000000000000000000000000000000000'
const RESCUE_GRACE_SECONDS = 30 * 24 * 60 * 60 // matches contract RESCUE_GRACE_PERIOD

function MilestoneCard({
  milestone,
  job,
  isClient,
  isFreelancer,
  onSubmit,
  onApprove,
  onReject,
  onRaiseDispute,
  pending,
}: {
  milestone: Milestone
  job: { jobId: bigint; status: JobStatus; firstMilestoneText: string }
  isClient: boolean
  isFreelancer: boolean
  onSubmit: (idx: number, note: string) => Promise<void>
  onApprove: (idx: number) => Promise<void>
  onReject: (idx: number) => Promise<void>
  onRaiseDispute: (idx: number) => void
  pending: boolean
}) {
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')

  // Milestone 0 description is the job-meta-fenced text; show only the milestone text.
  const description = milestone.index === 0 ? job.firstMilestoneText : milestone.description

  const canSubmit =
    isFreelancer &&
    job.status === 'ACTIVE' &&
    milestone.statusLabel === 'PENDING'
  const canApprove =
    isClient &&
    job.status === 'ACTIVE' &&
    milestone.statusLabel === 'SUBMITTED'
  const canReject = canApprove
  const canDispute =
    (isClient || isFreelancer) &&
    job.status === 'ACTIVE' &&
    milestone.statusLabel === 'SUBMITTED'

  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-semibold text-[#6b6b6b]">Milestone {milestone.index + 1}</span>
            <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${M_STATUS_TONE[milestone.statusLabel]}`}>
              {M_STATUS_LABEL[milestone.statusLabel]}
            </span>
          </div>
          <div className="text-[14px] leading-snug text-[#1c1c1c]">{description || <span className="text-[#a0a0a0] italic">No description</span>}</div>
        </div>
        <div className="text-[14px] font-semibold text-[#14a800] shrink-0">{formatUSDC(milestone.amount)} USDC</div>
      </div>

      {milestone.submissionNote && (
        <div className="bg-[#f7f7f5] border border-[#e0e0dc] rounded-lg p-3 mb-2 text-[12px] text-[#6b6b6b] break-words">
          <span className="font-medium text-[#1c1c1c]">Submission: </span>
          {milestone.submissionNote}
        </div>
      )}

      {canSubmit && (
        <div className="bg-[#f7f7f5] border border-[#e0e0dc] rounded-lg p-3 mt-2">
          <label className="block text-[11px] font-medium text-[#6b6b6b] mb-1.5">Submission link or note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. github.com/your-repo/pull/12 — initial implementation"
            className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800] resize-y min-h-[60px]"
          />
          <button
            disabled={pending || submitting || note.trim().length === 0}
            onClick={async () => {
              setSubmitting(true)
              try {
                await onSubmit(milestone.index, note.trim())
                setNote('')
              } catch { /* surfaced upstream */ }
              setSubmitting(false)
            }}
            className="mt-2 px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] transition disabled:bg-[#a0a0a0] disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit milestone for review'}
          </button>
        </div>
      )}

      {(canApprove || canReject || canDispute) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {canApprove && (
            <button
              disabled={pending}
              onClick={() => onApprove(milestone.index)}
              className="px-3 py-1.5 bg-[#14a800] text-white rounded-md text-[12px] font-medium hover:bg-[#0d7a00] transition disabled:bg-[#a0a0a0]"
            >
              Approve & release {formatUSDC((milestone.amount * 9200n) / 10000n)} USDC
            </button>
          )}
          {canReject && (
            <button
              disabled={pending}
              onClick={() => onReject(milestone.index)}
              className="px-3 py-1.5 border border-[#e0e0dc] text-[#6b6b6b] rounded-md text-[12px] font-medium hover:border-[#1c1c1c] hover:text-[#1c1c1c] transition disabled:opacity-50"
            >
              Reject (let freelancer revise)
            </button>
          )}
          {canDispute && (
            <button
              disabled={pending}
              onClick={() => onRaiseDispute(milestone.index)}
              className="px-3 py-1.5 border border-[#b25600] text-[#b25600] rounded-md text-[12px] font-medium hover:bg-[#fff2e0] transition disabled:opacity-50"
            >
              Raise dispute
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function JobDetail() {
  const { jobId: jobIdParam } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { isAuthed, address } = useAuth()
  const jobId = useMemo(() => {
    try {
      return jobIdParam ? BigInt(jobIdParam) : null
    } catch {
      return null
    }
  }, [jobIdParam])

  const { job, applicants, loading, error, refresh } = useJob(jobId)
  const actions = useEscrowActions()
  const { balance: usdcBalance } = useUSDC()

  const isClient = !!address && !!job && job.client.toLowerCase() === address.toLowerCase()
  const isFreelancer = !!address && !!job && job.freelancer.toLowerCase() === address.toLowerCase()
  const hasApplied = !!address && applicants.some(a => a.toLowerCase() === address.toLowerCase())
  const canApply =
    !!isAuthed && !!address && !!job && job.status === 'OPEN' && !isClient && !hasApplied

  const refreshAll = async () => {
    await refresh()
  }

  const handleApply = async () => {
    if (!jobId) return
    try {
      await actions.applyToJob(jobId)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }

  const handleApproveApplicant = async (applicant: `0x${string}`) => {
    if (!jobId) return
    try {
      await actions.approveApplicant(jobId, applicant)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }

  const handleSubmitMilestone = async (idx: number, note: string) => {
    if (!jobId) return
    await actions.submitMilestone(jobId, idx, note)
    await refreshAll()
  }
  const handleApproveMilestone = async (idx: number) => {
    if (!jobId) return
    try {
      await actions.approveMilestone(jobId, idx)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }
  const handleRejectMilestone = async (idx: number) => {
    if (!jobId) return
    try {
      await actions.rejectMilestone(jobId, idx)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }
  const handleRaiseDispute = (idx: number) => {
    if (!jobId) return
    navigate(`/app/dispute?job=${jobId.toString()}&milestone=${idx}`)
  }
  const handleSelfReport = async () => {
    if (!jobId) return
    try {
      await actions.selfReportPoorWork(jobId)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }
  const handleCancel = async () => {
    if (!jobId) return
    try {
      await actions.cancelJob(jobId)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }
  const handleRescue = async () => {
    if (!jobId) return
    try {
      await actions.rescueClientRefund(jobId)
      await refreshAll()
    } catch { /* surfaced via state */ }
  }

  if (loading) {
    return <div className="max-w-[900px] mx-auto p-6 text-center text-[#a0a0a0] text-[13px]">Loading job…</div>
  }
  if (error || !job || !jobId) {
    return (
      <div className="max-w-[900px] mx-auto p-6">
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-4 text-[13px]">
          {error || 'Job not found.'}
        </div>
        <Link to="/app" className="inline-block mt-3 text-[13px] text-[#14a800] hover:underline">← Back to job board</Link>
      </div>
    )
  }

  const noMilestoneEverSubmitted = job.milestones.every(m => m.statusLabel === 'PENDING')
  const nowSec = Math.floor(Date.now() / 1000)
  const canRescue =
    isClient &&
    job.status === 'ACTIVE' &&
    nowSec > Number(job.deadline) + RESCUE_GRACE_SECONDS &&
    noMilestoneEverSubmitted
  const canCancel =
    isClient &&
    (job.status === 'OPEN' || (job.status === 'ACTIVE' && job.poorWorkReported))
  const canSelfReport = isFreelancer && job.status === 'ACTIVE' && !job.poorWorkReported

  const pending = actions.state.action !== null
  const lastTx = actions.state.txHash

  return (
    <div className="max-w-[900px] mx-auto p-4 md:p-6">
      <Link to="/app" className="text-[12px] text-[#6b6b6b] hover:text-[#14a800] inline-block mb-3">← Back to job board</Link>

      {/* Header */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-6 mb-4">
        <div className="flex justify-between items-start gap-3 mb-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_TONE[job.status]}`}>
              {STATUS_LABEL[job.status]}
            </span>
            <span className="text-[11px] text-[#a0a0a0]">Job #{job.jobId.toString()}</span>
            <span className="text-[11px] text-[#a0a0a0]">· Posted {timeAgo(job.createdAt)}</span>
          </div>
          <button onClick={refreshAll} className="text-[12px] text-[#14a800] hover:underline">Refresh ↻</button>
        </div>
        <h1 className="text-[20px] md:text-[24px] font-bold leading-tight text-[#1c1c1c] mb-2">{job.title}</h1>
        {job.description && <p className="text-[14px] text-[#6b6b6b] leading-relaxed mb-3 whitespace-pre-wrap">{job.description}</p>}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[#6b6b6b]">
          <span>📋 {CATEGORY_LABEL[job.category]}</span>
          <span>⏳ Due {formatDeadline(job.deadline)}</span>
          <span>🏗 {job.milestones.length} milestone{job.milestones.length === 1 ? '' : 's'}</span>
          <span>💰 {formatUSDC(job.milestoneSum)} USDC budget</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-[12px]">
          <div className="bg-[#f7f7f5] rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-[#a0a0a0] mb-1">Client</div>
            <a href={EXPLORER.address(job.client)} target="_blank" rel="noopener" className="font-mono text-[#1c1c1c] hover:underline">{shortAddress(job.client)}</a>
            {isClient && <span className="ml-2 text-[10px] font-semibold text-[#14a800]">(you)</span>}
          </div>
          <div className="bg-[#f7f7f5] rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-[#a0a0a0] mb-1">Freelancer</div>
            {job.freelancer === ZERO ? (
              <span className="text-[#a0a0a0] italic">Not assigned yet</span>
            ) : (
              <>
                <a href={EXPLORER.address(job.freelancer)} target="_blank" rel="noopener" className="font-mono text-[#1c1c1c] hover:underline">{shortAddress(job.freelancer)}</a>
                {isFreelancer && <span className="ml-2 text-[10px] font-semibold text-[#14a800]">(you)</span>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tx status banner */}
      {pending && actions.state.action && (
        <div className="bg-[#fff8e0] border border-[#f0e0a0] text-[#7c5c00] rounded-md p-3 mb-3 text-[12px]">
          Transaction in flight ({actions.state.action})… {lastTx && <a href={EXPLORER.tx(lastTx)} target="_blank" rel="noopener" className="underline">view tx</a>}
        </div>
      )}
      {actions.state.error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-md p-3 mb-3 text-[12px]">
          {actions.state.error}
          <button onClick={actions.reset} className="underline ml-2">dismiss</button>
        </div>
      )}

      {/* Apply CTA — only when OPEN and viewer is not client */}
      {job.status === 'OPEN' && !isClient && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[14px] font-semibold mb-0.5">Want this job?</div>
              <div className="text-[12px] text-[#6b6b6b]">
                {hasApplied ? 'You have already applied. The client will review and approve one applicant.' : `${applicants.length} applicant${applicants.length === 1 ? '' : 's'} so far.`}
              </div>
            </div>
            {!isAuthed ? (
              <Link to="/signin" className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium">Sign in to apply</Link>
            ) : canApply ? (
              <button onClick={handleApply} disabled={pending} className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] disabled:bg-[#a0a0a0]">
                {actions.isPending('applyToJob') ? 'Applying…' : 'Apply to job'}
              </button>
            ) : hasApplied ? (
              <span className="text-[12px] text-[#0d7a00] bg-[#e6f4e1] px-2 py-1 rounded-full font-medium">✓ Applied</span>
            ) : null}
          </div>
        </div>
      )}

      {/* Applicants — only client sees, only when OPEN */}
      {isClient && job.status === 'OPEN' && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-4">
          <div className="text-[14px] font-semibold mb-3">Applicants ({applicants.length})</div>
          {applicants.length === 0 ? (
            <div className="text-[12px] text-[#a0a0a0]">No applications yet.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {applicants.map(a => (
                <div key={a} className="flex items-center justify-between gap-3 bg-[#f7f7f5] border border-[#e0e0dc] rounded-lg p-3">
                  <a href={EXPLORER.address(a)} target="_blank" rel="noopener" className="font-mono text-[12px] text-[#1c1c1c] hover:underline">{shortAddress(a)}</a>
                  <button
                    disabled={pending}
                    onClick={() => handleApproveApplicant(a)}
                    className="px-3 py-1.5 bg-[#14a800] text-white rounded-md text-[12px] font-medium hover:bg-[#0d7a00] disabled:bg-[#a0a0a0]"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Milestones */}
      <div className="text-[14px] font-semibold mb-2 mt-4">Milestones</div>
      {job.milestones.map(m => (
        <MilestoneCard
          key={m.index}
          milestone={m}
          job={{ jobId: job.jobId, status: job.status, firstMilestoneText: job.firstMilestoneText }}
          isClient={isClient}
          isFreelancer={isFreelancer}
          onSubmit={handleSubmitMilestone}
          onApprove={handleApproveMilestone}
          onReject={handleRejectMilestone}
          onRaiseDispute={handleRaiseDispute}
          pending={pending}
        />
      ))}

      {/* Side actions */}
      {(canCancel || canSelfReport || canRescue) && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mt-4">
          <div className="text-[13px] font-semibold mb-2">Actions</div>
          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <button
                disabled={pending}
                onClick={handleCancel}
                className="px-3 py-1.5 border border-[#e0e0dc] text-[#6b6b6b] rounded-md text-[12px] font-medium hover:border-red-500 hover:text-red-500 transition disabled:opacity-50"
              >
                {job.status === 'OPEN' ? 'Cancel job (full refund)' : 'Cancel job (refund remaining)'}
              </button>
            )}
            {canSelfReport && (
              <button
                disabled={pending}
                onClick={handleSelfReport}
                className="px-3 py-1.5 border border-[#e0e0dc] text-[#6b6b6b] rounded-md text-[12px] font-medium hover:border-[#b25600] hover:text-[#b25600] transition disabled:opacity-50"
              >
                Self-report poor work
              </button>
            )}
            {canRescue && (
              <button
                disabled={pending}
                onClick={handleRescue}
                className="px-3 py-1.5 border border-red-500 text-red-500 rounded-md text-[12px] font-medium hover:bg-red-50 transition disabled:opacity-50"
              >
                Rescue refund (deadline + 30d passed)
              </button>
            )}
          </div>
          {isFreelancer && job.poorWorkReported && (
            <div className="text-[11px] text-[#b25600] mt-2">You self-reported poor work. The client may now cancel and you will not be flagged.</div>
          )}
        </div>
      )}

      {/* Footer balance hint */}
      {usdcBalance !== null && address && (
        <div className="text-[11px] text-[#a0a0a0] mt-4 text-right">
          Connected: <span className="font-mono">{shortAddress(address)}</span> · USDC balance: {formatUSDC(usdcBalance)}
        </div>
      )}
    </div>
  )
}
