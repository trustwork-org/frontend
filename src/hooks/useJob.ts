import { useCallback, useEffect, useState } from 'react'
import { ADDRESSES, EscrowPlatformAbi } from '../contracts'
import { publicClient } from '../lib/viem'
import { shapeJob } from './useJobs'
import type { Job, RawMilestone } from '../types/job'

interface RawJob {
  jobId: bigint
  client: `0x${string}`
  freelancer: `0x${string}`
  depositAmount: bigint
  clientFee: bigint
  availableForWork: bigint
  amountReleased: bigint
  poorWorkReported: boolean
  category: number
  status: number
  createdAt: bigint
  deadline: bigint
}

export function useJob(jobId: bigint | null) {
  const [job, setJob] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<`0x${string}`[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (jobId === null) {
      setJob(null)
      setApplicants([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [rawJob, rawMs, applicantsRaw] = await Promise.all([
        publicClient.readContract({
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'getJob',
          args: [jobId],
        }) as Promise<RawJob>,
        publicClient.readContract({
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'getMilestones',
          args: [jobId],
        }) as Promise<readonly RawMilestone[]>,
        publicClient.readContract({
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'getApplicants',
          args: [jobId],
        }) as Promise<readonly `0x${string}`[]>,
      ])
      setJob(shapeJob(rawJob, rawMs))
      setApplicants([...applicantsRaw])
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load job')
      setJob(null)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { job, applicants, loading, error, refresh }
}
