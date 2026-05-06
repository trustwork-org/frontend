import { useCallback, useEffect, useState } from 'react'
import { ADDRESSES, DisputeDAOAbi } from '../contracts'
import { publicClient } from '../lib/viem'

const ZERO = '0x0000000000000000000000000000000000000000'

export type DisputeStatus = 'NONE' | 'VOTING' | 'RESOLVED'
const DISPUTE_STATUS: DisputeStatus[] = ['NONE', 'VOTING', 'RESOLVED']

export interface DisputeData {
  disputeId: bigint
  jobId: bigint
  milestoneIndex: bigint
  client: `0x${string}`
  freelancer: `0x${string}`
  raisedBy: `0x${string}`
  status: DisputeStatus
  deadline: bigint
  partyAEvidenceCID: string
  partyBEvidenceCID: string
  arbitratorFee: bigint
  platformFee: bigint
  votesForClient: number
  votesForFreelancer: number
  arbitrators: readonly [`0x${string}`, `0x${string}`, `0x${string}`]
  hasVoted: readonly [boolean, boolean, boolean]
  votes: readonly [number, number, number]
}

export async function fetchDispute(disputeId: bigint): Promise<DisputeData | null> {
  const baseContracts = [
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'getDisputeCore' as const,
      args: [disputeId] as const,
    },
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'getDisputeEvidence' as const,
      args: [disputeId] as const,
    },
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'getDisputeFees' as const,
      args: [disputeId] as const,
    },
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'getDisputeTally' as const,
      args: [disputeId] as const,
    },
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'getDisputeArbitrators' as const,
      args: [disputeId] as const,
    },
  ]

  const r = await publicClient.multicall({ contracts: baseContracts, allowFailure: true })
  if (r[0].status !== 'success') return null
  const core = r[0].result as readonly [bigint, bigint, `0x${string}`, `0x${string}`, `0x${string}`, number, bigint]
  const evidence = (r[1].status === 'success'
    ? (r[1].result as readonly [string, string])
    : (['', ''] as const))
  const fees = (r[2].status === 'success'
    ? (r[2].result as readonly [bigint, bigint])
    : ([0n, 0n] as const))
  const tally = (r[3].status === 'success'
    ? (r[3].result as readonly [number, number])
    : ([0, 0] as const))
  const arbitrators = (r[4].status === 'success'
    ? (r[4].result as readonly [`0x${string}`, `0x${string}`, `0x${string}`])
    : ([ZERO, ZERO, ZERO] as readonly [`0x${string}`, `0x${string}`, `0x${string}`]))

  // Per-arbitrator vote state
  const voteContracts = arbitrators.flatMap(arb => [
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'hasArbitratorVoted' as const,
      args: [disputeId, arb] as const,
    },
    {
      address: ADDRESSES.disputeDAO,
      abi: DisputeDAOAbi,
      functionName: 'arbitratorVote' as const,
      args: [disputeId, arb] as const,
    },
  ])
  const v = await publicClient.multicall({ contracts: voteContracts, allowFailure: true })
  const hasVoted = [
    v[0]?.status === 'success' ? (v[0].result as boolean) : false,
    v[2]?.status === 'success' ? (v[2].result as boolean) : false,
    v[4]?.status === 'success' ? (v[4].result as boolean) : false,
  ] as const
  const votes = [
    v[1]?.status === 'success' ? Number(v[1].result) : 0,
    v[3]?.status === 'success' ? Number(v[3].result) : 0,
    v[5]?.status === 'success' ? Number(v[5].result) : 0,
  ] as const

  return {
    disputeId,
    jobId: core[0],
    milestoneIndex: core[1],
    client: core[2],
    freelancer: core[3],
    raisedBy: core[4],
    status: DISPUTE_STATUS[core[5]] ?? 'NONE',
    deadline: core[6],
    partyAEvidenceCID: evidence[0],
    partyBEvidenceCID: evidence[1],
    arbitratorFee: fees[0],
    platformFee: fees[1],
    votesForClient: tally[0],
    votesForFreelancer: tally[1],
    arbitrators,
    hasVoted,
    votes,
  }
}

export function useDispute(disputeId: bigint | null) {
  const [data, setData] = useState<DisputeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (disputeId === null) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const d = await fetchDispute(disputeId)
      setData(d)
      setError(d ? null : 'Dispute not found')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispute')
    } finally {
      setLoading(false)
    }
  }, [disputeId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}

export function useDisputes() {
  const [disputes, setDisputes] = useState<DisputeData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const counter = (await publicClient.readContract({
        address: ADDRESSES.disputeDAO,
        abi: DisputeDAOAbi,
        functionName: 'disputeCounter',
      })) as bigint
      const n = Number(counter)
      if (n === 0) {
        setDisputes([])
        return
      }
      const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1))
      const results = await Promise.all(ids.map(id => fetchDispute(id)))
      setDisputes(results.filter((d): d is DisputeData => d !== null))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disputes')
      setDisputes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { disputes, loading, error, refresh }
}
