import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ADDRESSES, EXPLORER } from '../contracts'
import { useAuth } from '../context/AuthContext'
import { useArbitratorState } from '../hooks/useArbitratorState'
import { useDisputeActions } from '../hooks/useDisputeActions'
import { useDisputes, type DisputeData } from '../hooks/useDispute'
import { formatUSDC } from '../hooks/useUSDC'
import { shortAddress } from '../utils/format'

function timeRemaining(deadlineSec: bigint): string {
  const remaining = Number(deadlineSec) - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'voting closed'
  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function AssignedDisputeRow({ dispute, myAddress }: { dispute: DisputeData; myAddress: `0x${string}` }) {
  const myIdx = dispute.arbitrators.findIndex(a => a.toLowerCase() === myAddress.toLowerCase())
  const hasVoted = myIdx >= 0 ? dispute.hasVoted[myIdx] : false
  const beforeDeadline = Date.now() / 1000 < Number(dispute.deadline)
  return (
    <Link
      to={`/app/dispute?dispute=${dispute.disputeId.toString()}`}
      className="block bg-white border border-[#e0e0dc] rounded-xl p-4 hover:border-[#14a800] transition mb-2"
    >
      <div className="flex justify-between items-start gap-3 mb-1.5">
        <div className="text-[13px] font-semibold">Dispute #{dispute.disputeId.toString()} · Job #{dispute.jobId.toString()}</div>
        {!beforeDeadline ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">Voting closed</span>
        ) : hasVoted ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[#e6f4e1] text-[#0d7a00]">Voted · {timeRemaining(dispute.deadline)}</span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700">Vote required · {timeRemaining(dispute.deadline)}</span>
        )}
      </div>
      <div className="text-[11px] text-[#6b6b6b]">
        Milestone {Number(dispute.milestoneIndex) + 1} · Reward share of {formatUSDC(dispute.arbitratorFee)} USDC
      </div>
    </Link>
  )
}

export default function Arbitrate() {
  const { isAuthed } = useAuth()
  const { state, refresh, address } = useArbitratorState()
  const { disputes, loading: disputesLoading, refresh: refreshDisputes } = useDisputes()
  const actions = useDisputeActions()

  const assignedDisputes = useMemo(() => {
    if (!disputes || !address) return []
    return disputes.filter(d => d.arbitrators.some(a => a.toLowerCase() === address.toLowerCase()))
  }, [disputes, address])

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshDisputes()])
  }

  const allowanceShort = state ? state.usdcAllowance < state.minStake : false
  const balanceShort = state ? state.usdcBalance < state.minStake : false
  const busy = actions.state.action !== null

  const handleApprove = async () => {
    if (!state) return
    try {
      await actions.approveUSDC(ADDRESSES.disputeDAO, state.minStake)
      await refreshAll()
    } catch { /* surfaced */ }
  }

  const handleJoin = async () => {
    try {
      await actions.joinPool()
      await refreshAll()
    } catch { /* surfaced */ }
  }

  const handleLeave = async () => {
    try {
      await actions.leavePool()
      await refreshAll()
    } catch { /* surfaced */ }
  }

  if (!isAuthed) {
    return (
      <div className="max-w-[860px] mx-auto p-6 text-center">
        <div className="text-[15px] font-semibold mb-1">Sign in to arbitrate</div>
        <div className="text-[13px] text-[#6b6b6b]">Stake USDC to join the dispute pool, vote on cases, and earn fees.</div>
      </div>
    )
  }

  if (!state) {
    return <div className="max-w-[860px] mx-auto p-6 text-center text-[13px] text-[#a0a0a0]">Loading arbitrator state…</div>
  }

  return (
    <div className="max-w-[860px] mx-auto p-4 md:p-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold">{formatUSDC(state.stake)}</div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Your stake (USDC)</div>
          <div className={`text-[12px] mt-1.5 ${state.isArbitrator ? 'text-[#14a800]' : 'text-[#a0a0a0]'}`}>
            {state.isArbitrator ? 'Active in pool' : 'Not in pool'}
          </div>
        </div>
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold">{state.poolSize.toString()}</div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Pool size</div>
          <div className="text-[12px] mt-1.5 text-[#6b6b6b]">Min stake: {formatUSDC(state.minStake)} USDC</div>
        </div>
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
          <div className="text-[22px] md:text-[24px] font-bold">{assignedDisputes.length}</div>
          <div className="text-[12px] text-[#a0a0a0] mt-1">Assigned disputes</div>
          <div className={`text-[12px] mt-1.5 ${assignedDisputes.length > 0 ? 'text-red-500' : 'text-[#a0a0a0]'}`}>
            {assignedDisputes.length > 0 ? 'Action may be required' : 'Idle'}
          </div>
        </div>
      </div>

      {/* Pool actions */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-5">
        <div className="text-[15px] font-semibold mb-2">Pool membership</div>
        {state.isArbitrator ? (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <div className="text-[13px] text-[#6b6b6b]">You have <strong className="text-[#14a800]">{formatUSDC(state.stake)} USDC</strong> staked.</div>
              <div className="text-[11px] text-[#a0a0a0] mt-1">{state.busy ? 'You have an open dispute assigned — leaving the pool is blocked until it resolves.' : 'You can leave the pool any time you have no active disputes.'}</div>
            </div>
            <button
              disabled={busy || state.busy}
              onClick={handleLeave}
              className="self-start sm:self-auto px-4 py-2 border border-red-400 text-red-500 rounded-md text-[13px] hover:bg-red-50 transition disabled:opacity-50"
            >
              {actions.state.action === 'leavePool' ? 'Leaving…' : 'Leave pool & withdraw stake'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="text-[13px] text-[#6b6b6b]">
              Stake at least <strong className="text-[#1c1c1c]">{formatUSDC(state.minStake)} USDC</strong> to become an arbitrator. You'll be randomly assigned to disputes and can earn fees by voting in the majority.
            </div>
            <div className="text-[11px] text-[#a0a0a0]">
              Your USDC balance: {formatUSDC(state.usdcBalance)} · Allowance to DAO: {formatUSDC(state.usdcAllowance)}
            </div>
            {balanceShort && (
              <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                You don't have enough USDC. Mint testnet USDC at <a href="https://faucet.circle.com" target="_blank" rel="noopener" className="underline">faucet.circle.com</a>.
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              {allowanceShort && (
                <button
                  disabled={busy || balanceShort}
                  onClick={handleApprove}
                  className="px-4 py-2 border border-[#14a800] text-[#14a800] rounded-md text-[13px] hover:bg-[#e6f4e1] transition disabled:opacity-50"
                >
                  {actions.state.action === 'approve' ? 'Approving…' : `Approve ${formatUSDC(state.minStake)} USDC`}
                </button>
              )}
              <button
                disabled={busy || balanceShort || allowanceShort}
                onClick={handleJoin}
                className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] transition disabled:bg-[#a0a0a0] disabled:cursor-not-allowed"
              >
                {actions.state.action === 'joinPool' ? 'Joining…' : `Join pool (stake ${formatUSDC(state.minStake)} USDC)`}
              </button>
            </div>
          </div>
        )}

        {actions.state.action && (
          <div className="text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md p-2 mt-3">
            Action in flight: {actions.state.action}
            {actions.state.txHash && <> · <a href={EXPLORER.tx(actions.state.txHash)} target="_blank" rel="noopener" className="underline">view tx</a></>}
          </div>
        )}
        {actions.state.error && (
          <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md p-2 mt-3">
            {actions.state.error} <button onClick={actions.reset} className="underline ml-1">dismiss</button>
          </div>
        )}
      </div>

      {/* Assigned disputes */}
      <div className="text-[15px] font-semibold mb-2">Assigned disputes</div>
      {disputesLoading ? (
        <div className="text-[#a0a0a0] text-[13px] py-6 text-center">Loading disputes…</div>
      ) : assignedDisputes.length === 0 ? (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-6 text-center">
          <div className="text-[14px] font-medium mb-1">{state.isArbitrator ? 'No active disputes assigned to you' : 'Join the pool to start receiving disputes'}</div>
          {state.isArbitrator && <div className="text-[12px] text-[#a0a0a0]">You'll get a random assignment when the next dispute opens.</div>}
        </div>
      ) : (
        address && assignedDisputes.map(d => <AssignedDisputeRow key={d.disputeId.toString()} dispute={d} myAddress={address} />)
      )}

      <div className="text-[11px] text-[#a0a0a0] mt-4 leading-relaxed">
        Connected as <span className="font-mono">{shortAddress(address || '')}</span>. Voting reward: 6% of milestone amount split among majority voters. Minority/non-voters lose 10% of staked USDC.
      </div>
    </div>
  )
}
