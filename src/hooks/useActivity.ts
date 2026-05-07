import { useEffect, useState } from 'react'
import { parseAbiItem, type Hex } from 'viem'
import { ADDRESSES } from '../contracts'
import { publicClient } from '../lib/viem'
import { formatUSDC } from './useUSDC'

export type ActivityKind =
  | 'JobCreated'
  | 'AppliedToJob'
  | 'ApplicantApproved'
  | 'JobCompleted'
  | 'PoorWorkReported'
  | 'FreelancerFlagged'
  | 'FreelancerBanned'
  | 'DisputeRaised'
  | 'EvidenceSubmitted'
  | 'VoteSubmitted'
  | 'ArbitratorJoined'
  | 'ArbitratorLeft'
  | 'ArbitratorSlashed'
  | 'ProfileRegistered'
  | 'ProfileUpdated'
  | 'TierMinted'
  | 'TierUpgraded'

export interface ActivityEntry {
  id: string
  txHash: Hex
  blockNumber: bigint
  kind: ActivityKind
  title: string
  detail?: string
  href?: string
}

const E = {
  JobCreated: parseAbiItem('event JobCreated(uint256 indexed jobId, address indexed client, uint8 category, uint256 depositAmount, uint256 clientFee, uint256 availableForWork, uint256 deadline)'),
  AppliedToJob: parseAbiItem('event AppliedToJob(uint256 indexed jobId, address indexed freelancer)'),
  ApplicantApproved: parseAbiItem('event ApplicantApproved(uint256 indexed jobId, address indexed freelancer)'),
  JobCompleted: parseAbiItem('event JobCompleted(uint256 indexed jobId, address indexed freelancer)'),
  PoorWorkReported: parseAbiItem('event PoorWorkReported(uint256 indexed jobId, address indexed freelancer)'),
  FreelancerFlagged: parseAbiItem('event FreelancerFlagged(address indexed freelancer, uint256 totalFlags)'),
  FreelancerBanned: parseAbiItem('event FreelancerBanned(address indexed freelancer)'),
  DisputeRaised: parseAbiItem('event DisputeRaised(uint256 indexed jobId, uint256 indexed milestoneIndex, address indexed raisedBy, uint256 disputeId, uint256 arbitratorFee, uint256 platformFee)'),
  EvidenceSubmitted: parseAbiItem('event EvidenceSubmitted(uint256 indexed disputeId, address indexed party, string evidenceCID)'),
  VoteSubmitted: parseAbiItem('event VoteSubmitted(uint256 indexed disputeId, address indexed arbitrator, uint8 vote)'),
  ArbitratorJoined: parseAbiItem('event ArbitratorJoined(address indexed arbitrator, uint256 stake)'),
  ArbitratorLeft: parseAbiItem('event ArbitratorLeft(address indexed arbitrator, uint256 stakeReturned)'),
  ArbitratorSlashed: parseAbiItem('event ArbitratorSlashed(address indexed arbitrator, uint256 amount, string reason)'),
  ProfileRegistered: parseAbiItem('event ProfileRegistered(address indexed user, string profileCID, uint256 timestamp)'),
  ProfileUpdated: parseAbiItem('event ProfileUpdated(address indexed user, string profileCID, uint256 timestamp)'),
  TierMinted: parseAbiItem('event TierMinted(address indexed freelancer, uint256 indexed tokenId, uint8 tier, uint256 jobsCompleted, uint256 averageRating, uint256 totalEarned)'),
  TierUpgraded: parseAbiItem('event TierUpgraded(address indexed freelancer, uint256 indexed burnedTokenId, uint256 indexed newTokenId, uint8 fromTier, uint8 toTier)'),
} as const

export function useActivity(address: `0x${string}` | null | undefined) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [latestBlock, setLatestBlock] = useState<bigint>(0n)

  useEffect(() => {
    if (!address) {
      setEntries([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const me = address
        const safe = async <T>(fn: () => Promise<T[]>): Promise<T[]> => {
          try { return await fn() } catch (err) { console.warn(err); return [] }
        }
        const escrow = ADDRESSES.escrowPlatform
        const dao = ADDRESSES.disputeDAO
        const profile = ADDRESSES.profileRegistry
        const repNFT = ADDRESSES.reputationNFT
        const fromBlock = 'earliest' as const

        const [
          jobCreated, appliedToJob, applicantApproved, jobCompleted,
          poorWorkReported, freelancerFlagged, freelancerBanned, disputeRaised,
          evidenceSubmitted, voteSubmitted, joined, left, slashed,
          profileRegistered, profileUpdated, tierMinted, tierUpgraded,
          latest,
        ] = await Promise.all([
          safe(() => publicClient.getLogs({ address: escrow, event: E.JobCreated, args: { client: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.AppliedToJob, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.ApplicantApproved, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.JobCompleted, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.PoorWorkReported, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.FreelancerFlagged, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.FreelancerBanned, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: escrow, event: E.DisputeRaised, args: { raisedBy: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: dao, event: E.EvidenceSubmitted, args: { party: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: dao, event: E.VoteSubmitted, args: { arbitrator: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: dao, event: E.ArbitratorJoined, args: { arbitrator: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: dao, event: E.ArbitratorLeft, args: { arbitrator: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: dao, event: E.ArbitratorSlashed, args: { arbitrator: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: profile, event: E.ProfileRegistered, args: { user: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: profile, event: E.ProfileUpdated, args: { user: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: repNFT, event: E.TierMinted, args: { freelancer: me }, fromBlock })),
          safe(() => publicClient.getLogs({ address: repNFT, event: E.TierUpgraded, args: { freelancer: me }, fromBlock })),
          publicClient.getBlockNumber().catch(() => 0n),
        ])

        const all: ActivityEntry[] = []
        const push = (kind: ActivityKind, log: { transactionHash: Hex; blockNumber: bigint; logIndex: number }, title: string, detail?: string, href?: string) => {
          all.push({ id: `${kind}-${log.transactionHash}-${log.logIndex}`, kind, txHash: log.transactionHash, blockNumber: log.blockNumber, title, detail, href })
        }

        for (const l of jobCreated) push('JobCreated', l, `Created job #${l.args.jobId}`, `Deposited ${formatUSDC(l.args.depositAmount ?? 0n)} USDC`, `/app/jobs/${l.args.jobId}`)
        for (const l of appliedToJob) push('AppliedToJob', l, `Applied to job #${l.args.jobId}`, undefined, `/app/jobs/${l.args.jobId}`)
        for (const l of applicantApproved) push('ApplicantApproved', l, `Approved as freelancer on job #${l.args.jobId}`, undefined, `/app/jobs/${l.args.jobId}`)
        for (const l of jobCompleted) push('JobCompleted', l, `Job #${l.args.jobId} completed`, undefined, `/app/jobs/${l.args.jobId}`)
        for (const l of poorWorkReported) push('PoorWorkReported', l, `Self-reported poor work on job #${l.args.jobId}`, undefined, `/app/jobs/${l.args.jobId}`)
        for (const l of freelancerFlagged) push('FreelancerFlagged', l, `Flagged by DAO outcome`, `Total flags: ${l.args.totalFlags}`)
        for (const l of freelancerBanned) push('FreelancerBanned', l, `Banned from applying to jobs`)
        for (const l of disputeRaised) push('DisputeRaised', l, `Raised dispute on job #${l.args.jobId}`, `Milestone ${Number(l.args.milestoneIndex ?? 0n) + 1} · Dispute #${l.args.disputeId}`, `/app/dispute?dispute=${l.args.disputeId}`)
        for (const l of evidenceSubmitted) push('EvidenceSubmitted', l, `Submitted evidence to dispute #${l.args.disputeId}`, undefined, `/app/dispute?dispute=${l.args.disputeId}`)
        for (const l of voteSubmitted) push('VoteSubmitted', l, `Voted on dispute #${l.args.disputeId}`, l.args.vote === 1 ? 'Voted: client' : 'Voted: freelancer', `/app/dispute?dispute=${l.args.disputeId}`)
        for (const l of joined) push('ArbitratorJoined', l, `Joined arbitrator pool`, `Staked ${formatUSDC(l.args.stake ?? 0n)} USDC`, '/app/arbitrate')
        for (const l of left) push('ArbitratorLeft', l, `Left arbitrator pool`, `Withdrew ${formatUSDC(l.args.stakeReturned ?? 0n)} USDC`, '/app/arbitrate')
        for (const l of slashed) push('ArbitratorSlashed', l, `Stake slashed`, `${formatUSDC(l.args.amount ?? 0n)} USDC · ${l.args.reason ?? ''}`, '/app/arbitrate')
        for (const l of profileRegistered) push('ProfileRegistered', l, `Registered profile`, undefined, '/app/profile')
        for (const l of profileUpdated) push('ProfileUpdated', l, `Updated profile`, undefined, '/app/profile')
        for (const l of tierMinted) push('TierMinted', l, `Earned reputation NFT`, `Tier ${l.args.tier} · ${l.args.jobsCompleted} jobs`, '/app/profile')
        for (const l of tierUpgraded) push('TierUpgraded', l, `Reputation tier upgraded`, `Tier ${l.args.fromTier} → ${l.args.toTier}`, '/app/profile')

        all.sort((a, b) => Number(b.blockNumber - a.blockNumber))

        if (!cancelled) {
          setEntries(all)
          setLatestBlock(latest)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load activity')
          setLoading(false)
        }
      }
    })()

    return () => { cancelled = true }
  }, [address])

  return { entries, loading, error, latestBlock }
}
