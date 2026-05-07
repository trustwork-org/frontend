import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EXPLORER } from '../contracts'
import { useAuth } from '../context/AuthContext'
import { useDispute, useDisputes, type DisputeData } from '../hooks/useDispute'
import { useDisputeActions } from '../hooks/useDisputeActions'
import { useJob } from '../hooks/useJob'
import { formatUSDC } from '../hooks/useUSDC'
import { ipfsUrl } from '../lib/pinata'
import { formatDeadline, shortAddress } from '../utils/format'

function timeRemaining(deadlineSec: bigint): string {
  const remaining = Number(deadlineSec) - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'voting closed'
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h remaining`
  if (h > 0) return `${h}h ${m}m remaining`
  return `${m}m remaining`
}

function EvidenceForm({
  initialDescription = '',
  busy,
  onSubmit,
  buttonLabel,
}: {
  initialDescription?: string
  busy: boolean
  onSubmit: (description: string, file: File | null) => Promise<void>
  buttonLabel: string
}) {
  const [description, setDescription] = useState(initialDescription)
  const [file, setFile] = useState<File | null>(null)

  return (
    <div className="bg-[#f7f7f5] border border-[#e0e0dc] rounded-lg p-3">
      <label className="block text-[12px] font-medium mb-1.5">Your evidence (description)</label>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Explain why the work is/isn't acceptable. Reference deliverables, agreed scope, and any chat history."
        className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800] resize-y min-h-[80px]"
      />
      <label className="block text-[12px] font-medium mb-1.5 mt-3">Attachment (optional)</label>
      <input
        type="file"
        onChange={e => setFile(e.target.files?.[0] ?? null)}
        className="block text-[12px] text-[#6b6b6b]"
      />
      {file && <div className="text-[11px] text-[#a0a0a0] mt-1">📎 {file.name} ({Math.round(file.size / 1024)} KB)</div>}
      <button
        disabled={busy || description.trim().length === 0}
        onClick={() => onSubmit(description.trim(), file)}
        className="mt-3 px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] transition disabled:bg-[#a0a0a0] disabled:cursor-not-allowed"
      >
        {busy ? 'Submitting…' : buttonLabel}
      </button>
    </div>
  )
}

function RaiseDisputeView() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const jobId = useMemo(() => {
    const v = params.get('job')
    try { return v ? BigInt(v) : null } catch { return null }
  }, [params])
  const milestoneIndex = useMemo(() => {
    const v = params.get('milestone')
    return v ? parseInt(v, 10) : NaN
  }, [params])
  const { job, loading } = useJob(jobId)
  const actions = useDisputeActions()

  if (!jobId || isNaN(milestoneIndex)) {
    return <div className="text-[13px] text-red-600">Invalid raise-dispute URL.</div>
  }
  if (loading) return <div className="text-[13px] text-[#a0a0a0]">Loading job…</div>
  if (!job) return <div className="text-[13px] text-red-600">Job not found.</div>

  const milestone = job.milestones[milestoneIndex]
  if (!milestone) return <div className="text-[13px] text-red-600">Milestone not found.</div>
  if (milestone.statusLabel !== 'SUBMITTED') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-[13px] text-[#7c5c00]">
        A dispute can only be raised on a milestone with status <strong>SUBMITTED</strong>. Current status: {milestone.statusLabel}.
      </div>
    )
  }

  const handleSubmit = async (description: string, file: File | null) => {
    try {
      const cid = await actions.uploadEvidence({ description, file })
      await actions.raiseDispute(jobId, milestoneIndex, cid)
      navigate(`/app/jobs/${jobId.toString()}`)
    } catch { /* surfaced */ }
  }

  const busy = actions.state.action !== null

  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-5">
      <Link to={`/app/jobs/${jobId.toString()}`} className="text-[12px] text-[#6b6b6b] hover:text-[#14a800] inline-block mb-3">← Back to job</Link>
      <div className="text-[18px] font-bold mb-1">Raise a dispute</div>
      <div className="text-[13px] text-[#6b6b6b] mb-4">
        Job <span className="font-medium text-[#1c1c1c]">#{jobId.toString()}</span> · Milestone <span className="font-medium text-[#1c1c1c]">{milestoneIndex + 1}</span> · {formatUSDC(milestone.amount)} USDC at stake
      </div>

      <div className="bg-[#fff8e0] border border-[#f0d0a0] rounded-lg p-3 mb-4 text-[12px] text-[#7c5c00]">
        Raising a dispute transfers <strong>8% of the milestone amount</strong> ({formatUSDC((milestone.amount * 800n) / 10000n)} USDC) to DisputeDAO — 6% goes to majority arbitrators, 2% to the platform. The remaining 92% awaits the resolution. This action cannot be undone.
      </div>

      <EvidenceForm
        busy={busy}
        onSubmit={handleSubmit}
        buttonLabel="Upload evidence & raise dispute"
      />

      {actions.state.action && (
        <div className="text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md p-2 mt-3">
          {actions.state.action === 'uploadEvidence' && 'Uploading evidence to IPFS via Pinata…'}
          {actions.state.action === 'raiseDispute' && 'Submitting raiseDispute on-chain — confirm in your wallet.'}
          {actions.state.txHash && <> · <a href={EXPLORER.tx(actions.state.txHash)} target="_blank" rel="noopener" className="underline">view tx</a></>}
        </div>
      )}
    </div>
  )
}

function DisputeDetail({ disputeId }: { disputeId: bigint }) {
  const { address, isAuthed } = useAuth()
  const { data, loading, refresh } = useDispute(disputeId)
  const actions = useDisputeActions()

  if (loading) return <div className="text-[13px] text-[#a0a0a0]">Loading dispute…</div>
  if (!data) return <div className="text-[13px] text-red-600">Dispute not found.</div>

  const isClient = !!address && data.client.toLowerCase() === address.toLowerCase()
  const isFreelancer = !!address && data.freelancer.toLowerCase() === address.toLowerCase()
  const isParty = isClient || isFreelancer
  const isRaiser = !!address && data.raisedBy.toLowerCase() === address.toLowerCase()
  const isArbitratorAssigned = !!address && data.arbitrators.some(a => a.toLowerCase() === address.toLowerCase())
  const myArbIndex = isArbitratorAssigned
    ? data.arbitrators.findIndex(a => address && a.toLowerCase() === address.toLowerCase())
    : -1
  const myHasVoted = myArbIndex >= 0 ? data.hasVoted[myArbIndex] : false

  const totalMilestoneAmt = data.arbitratorFee + data.platformFee + ((data.arbitratorFee + data.platformFee) * 92n) / 8n
  const milestoneApprox = (data.arbitratorFee * 10000n) / 600n // arbFee is 6% of milestone
  const beforeDeadline = Date.now() / 1000 < Number(data.deadline)

  const myEvidenceIsPartyA = isRaiser
  const myEvidenceCID = myEvidenceIsPartyA ? data.partyAEvidenceCID : data.partyBEvidenceCID
  const otherEvidenceCID = myEvidenceIsPartyA ? data.partyBEvidenceCID : data.partyAEvidenceCID

  const handleEvidenceUpload = async (description: string, file: File | null) => {
    try {
      const cid = await actions.uploadEvidence({ description, file })
      await actions.submitEvidence(disputeId, cid)
      await refresh()
    } catch { /* surfaced */ }
  }

  const handleVote = async (vote: 1 | 2) => {
    try {
      await actions.submitVote(disputeId, vote)
      await refresh()
    } catch { /* surfaced */ }
  }

  const handleResolve = async () => {
    try {
      await actions.resolveDispute(disputeId)
      await refresh()
    } catch { /* surfaced */ }
  }

  const busy = actions.state.action !== null
  void totalMilestoneAmt // keep unused calc out of warnings

  return (
    <div>
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 mb-3">
        <div className="flex justify-between items-start gap-3 flex-wrap mb-2">
          <div>
            <div className="text-[12px] text-[#a0a0a0]">
              Dispute #{disputeId.toString()} · Job #{data.jobId.toString()} · Milestone {Number(data.milestoneIndex) + 1}
            </div>
            <div className="text-[16px] font-semibold mt-1">{formatUSDC(milestoneApprox)} USDC milestone in dispute</div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${data.status === 'VOTING' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            {data.status === 'VOTING' ? `Voting · ${timeRemaining(data.deadline)}` : 'Resolved'}
          </span>
        </div>
        <div className="text-[12px] text-[#6b6b6b] mt-2">
          Voting deadline: <strong className="text-[#1c1c1c]">{formatDeadline(data.deadline)}</strong>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-[12px]">
          <div className="bg-[#f7f7f5] rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-[#a0a0a0] mb-1">Client</div>
            <Link to={`/app/profile/${data.client}`} className="font-mono text-[#1c1c1c] hover:underline">{shortAddress(data.client)}</Link>
            {data.partyAEvidenceCID && data.raisedBy.toLowerCase() === data.client.toLowerCase() ? (
              <a href={ipfsUrl(data.partyAEvidenceCID)} target="_blank" rel="noopener" className="block text-[11px] text-[#14a800] hover:underline mt-1 break-all">📎 Evidence: {data.partyAEvidenceCID.slice(0, 14)}…</a>
            ) : data.partyBEvidenceCID && data.raisedBy.toLowerCase() !== data.client.toLowerCase() ? (
              <a href={ipfsUrl(data.partyBEvidenceCID)} target="_blank" rel="noopener" className="block text-[11px] text-[#14a800] hover:underline mt-1 break-all">📎 Evidence: {data.partyBEvidenceCID.slice(0, 14)}…</a>
            ) : (
              <div className="text-[11px] text-[#a0a0a0] mt-1">No evidence submitted yet</div>
            )}
          </div>
          <div className="bg-[#f7f7f5] rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wide text-[#a0a0a0] mb-1">Freelancer</div>
            <Link to={`/app/profile/${data.freelancer}`} className="font-mono text-[#1c1c1c] hover:underline">{shortAddress(data.freelancer)}</Link>
            {data.partyAEvidenceCID && data.raisedBy.toLowerCase() === data.freelancer.toLowerCase() ? (
              <a href={ipfsUrl(data.partyAEvidenceCID)} target="_blank" rel="noopener" className="block text-[11px] text-[#14a800] hover:underline mt-1 break-all">📎 Evidence: {data.partyAEvidenceCID.slice(0, 14)}…</a>
            ) : data.partyBEvidenceCID && data.raisedBy.toLowerCase() !== data.freelancer.toLowerCase() ? (
              <a href={ipfsUrl(data.partyBEvidenceCID)} target="_blank" rel="noopener" className="block text-[11px] text-[#14a800] hover:underline mt-1 break-all">📎 Evidence: {data.partyBEvidenceCID.slice(0, 14)}…</a>
            ) : (
              <div className="text-[11px] text-[#a0a0a0] mt-1">No evidence submitted yet</div>
            )}
          </div>
        </div>

        {/* Vote tally */}
        <div className="mt-4">
          <div className="text-[12px] font-medium mb-1.5">Arbitrator votes ({data.votesForClient + data.votesForFreelancer} of 3 submitted)</div>
          <div className="h-2 rounded-full bg-[#e4e4e0] overflow-hidden flex">
            <div className="bg-[#14a800]" style={{ width: `${(data.votesForClient / 3) * 100}%` }} />
            <div className="bg-blue-500" style={{ width: `${(data.votesForFreelancer / 3) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] mt-1">
            <span className="text-[#14a800]">{data.votesForClient} client</span>
            <span className="text-blue-500">{data.votesForFreelancer} freelancer</span>
          </div>
        </div>

        {/* Arbitrators */}
        <div className="mt-4">
          <div className="text-[12px] font-medium mb-1.5">Assigned arbitrators</div>
          {data.arbitrators.map((arb, i) => (
            <div key={`${arb}-${i}`} className="flex items-center gap-2.5 px-3 py-2 border border-[#e0e0dc] rounded-lg bg-[#f7f7f5] mb-1.5">
              <Link to={`/app/profile/${arb}`} className="font-mono text-[12px] text-[#1c1c1c] hover:underline">{shortAddress(arb)}</Link>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                {data.hasVoted[i] ? (
                  <span className="bg-[#e6f4e1] text-[#0d7a00]">
                    Voted {data.votes[i] === 1 ? 'client' : 'freelancer'}
                  </span>
                ) : (
                  <span className="bg-yellow-50 text-yellow-700">Not voted</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Party submit/update evidence */}
      {isParty && data.status === 'VOTING' && beforeDeadline && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 mb-3">
          <div className="text-[14px] font-semibold mb-2">Your evidence</div>
          {myEvidenceCID ? (
            <div className="text-[12px] text-[#6b6b6b] mb-3">
              Current CID: <a href={ipfsUrl(myEvidenceCID)} target="_blank" rel="noopener" className="text-[#14a800] hover:underline break-all">{myEvidenceCID}</a>
            </div>
          ) : (
            <div className="text-[12px] text-[#a0a0a0] mb-3">No evidence submitted yet — upload now.</div>
          )}
          {!otherEvidenceCID && <div className="text-[11px] text-[#a0a0a0] mb-2">The opposing party hasn't submitted their evidence yet.</div>}
          <EvidenceForm
            busy={busy}
            onSubmit={handleEvidenceUpload}
            buttonLabel={myEvidenceCID ? 'Update my evidence' : 'Submit my evidence'}
          />
        </div>
      )}

      {/* Arbitrator vote */}
      {isAuthed && isArbitratorAssigned && data.status === 'VOTING' && beforeDeadline && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 mb-3">
          <div className="text-[14px] font-semibold mb-2">You are an assigned arbitrator</div>
          {myHasVoted ? (
            <div className="text-[13px] text-[#0d7a00] bg-[#e6f4e1] border border-[#c4e3b8] rounded-lg p-3">
              ✓ You have voted: {data.votes[myArbIndex] === 1 ? 'Client wins' : 'Freelancer wins'}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                disabled={busy}
                onClick={() => handleVote(1)}
                className="flex-1 py-2.5 border border-[#0d7a00] text-[#0d7a00] rounded-lg text-[14px] font-medium hover:bg-[#e6f4e1] transition disabled:opacity-50"
              >
                Vote: Client wins
              </button>
              <button
                disabled={busy}
                onClick={() => handleVote(2)}
                className="flex-1 py-2.5 border border-blue-700 text-blue-700 rounded-lg text-[14px] font-medium hover:bg-blue-50 transition disabled:opacity-50"
              >
                Vote: Freelancer wins
              </button>
            </div>
          )}
          <div className="text-[11px] text-[#a0a0a0] mt-2">
            Majority share of {formatUSDC(data.arbitratorFee)} USDC. Minority/non-voters lose 10% of staked USDC.
          </div>
        </div>
      )}

      {/* Resolve (anyone can call after deadline) */}
      {data.status === 'VOTING' && !beforeDeadline && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 mb-3">
          <div className="text-[14px] font-semibold mb-1">Voting period ended</div>
          <div className="text-[12px] text-[#6b6b6b] mb-3">
            Anyone can finalise the outcome. Tally: {data.votesForClient} client / {data.votesForFreelancer} freelancer.
          </div>
          <button
            disabled={busy || !isAuthed}
            onClick={handleResolve}
            className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] transition disabled:bg-[#a0a0a0]"
          >
            {actions.state.action === 'resolveDispute' ? 'Resolving…' : 'Resolve dispute'}
          </button>
        </div>
      )}

      {actions.state.action && (
        <div className="text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md p-2 mb-3">
          Action in flight: {actions.state.action}
          {actions.state.txHash && <> · <a href={EXPLORER.tx(actions.state.txHash)} target="_blank" rel="noopener" className="underline">view tx</a></>}
        </div>
      )}
    </div>
  )
}

function DisputeListItem({ dispute }: { dispute: DisputeData }) {
  return (
    <Link
      to={`/app/dispute?dispute=${dispute.disputeId.toString()}`}
      className="block bg-white border border-[#e0e0dc] rounded-xl p-4 hover:border-[#14a800] transition mb-2"
    >
      <div className="flex justify-between items-start gap-3 mb-1.5">
        <div className="text-[13px] font-semibold">Dispute #{dispute.disputeId.toString()} · Job #{dispute.jobId.toString()}</div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${dispute.status === 'VOTING' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
          {dispute.status === 'VOTING' ? timeRemaining(dispute.deadline) : 'Resolved'}
        </span>
      </div>
      <div className="text-[11px] text-[#6b6b6b]">Milestone {Number(dispute.milestoneIndex) + 1} · raised by {shortAddress(dispute.raisedBy)}</div>
    </Link>
  )
}

export default function Dispute() {
  const [params] = useSearchParams()
  const { address } = useAuth()
  const isRaiseMode = params.has('job') && params.has('milestone')
  const disputeIdStr = params.get('dispute')
  const disputeId = useMemo(() => {
    try { return disputeIdStr ? BigInt(disputeIdStr) : null } catch { return null }
  }, [disputeIdStr])
  const { disputes, loading } = useDisputes()

  // Default mode: show user's disputes (parties or arbitrator)
  useEffect(() => { /* keep effect-free */ }, [])

  if (isRaiseMode) {
    return (
      <div className="max-w-[760px] mx-auto p-4 md:p-6">
        <RaiseDisputeView />
      </div>
    )
  }
  if (disputeId !== null) {
    return (
      <div className="max-w-[860px] mx-auto p-4 md:p-6">
        <Link to="/app/dispute" className="text-[12px] text-[#6b6b6b] hover:text-[#14a800] inline-block mb-3">← All disputes</Link>
        <DisputeDetail disputeId={disputeId} />
      </div>
    )
  }

  const myDisputes = (disputes ?? []).filter(d =>
    !!address && (
      d.client.toLowerCase() === address.toLowerCase() ||
      d.freelancer.toLowerCase() === address.toLowerCase() ||
      d.arbitrators.some(a => a.toLowerCase() === address.toLowerCase())
    ),
  )
  const otherActive = (disputes ?? []).filter(d => !myDisputes.includes(d) && d.status === 'VOTING')

  return (
    <div className="max-w-[860px] mx-auto p-4 md:p-6">
      <div className="text-[17px] font-semibold mb-4">Disputes</div>

      {loading && <div className="text-[#a0a0a0] text-[13px] py-6 text-center">Loading disputes from chain…</div>}

      {!loading && (disputes?.length ?? 0) === 0 && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-8 text-center">
          <div className="text-[15px] font-semibold mb-1">No disputes yet</div>
          <div className="text-[13px] text-[#6b6b6b]">When a milestone is disputed, it'll show up here.</div>
        </div>
      )}

      {myDisputes.length > 0 && (
        <>
          <div className="text-[13px] font-semibold text-[#6b6b6b] mb-2 mt-4">Your disputes</div>
          {myDisputes.map(d => <DisputeListItem key={d.disputeId.toString()} dispute={d} />)}
        </>
      )}
      {otherActive.length > 0 && (
        <>
          <div className="text-[13px] font-semibold text-[#6b6b6b] mb-2 mt-6">Other active disputes</div>
          {otherActive.map(d => <DisputeListItem key={d.disputeId.toString()} dispute={d} />)}
        </>
      )}
    </div>
  )
}
