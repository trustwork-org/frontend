import { useCallback, useEffect, useState } from 'react'
import {
  ADDRESSES,
  EscrowPlatformAbi,
  JOB_CATEGORY,
  JOB_STATUS,
  MILESTONE_STATUS,
} from '../contracts'
import { publicClient } from '../lib/viem'
import { decodeFirstMilestone } from '../utils/jobMeta'
import type { Job, Milestone, RawMilestone } from '../types/job'

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

function shapeMilestones(raw: readonly RawMilestone[]): Milestone[] {
  return raw.map((m, i) => ({
    description: m.description,
    amount: m.amount,
    deadline: m.deadline,
    submissionNote: m.submissionNote,
    status: m.status,
    index: i,
    statusLabel: MILESTONE_STATUS[m.status] ?? 'PENDING',
  }))
}

export function shapeJob(raw: RawJob, rawMilestones: readonly RawMilestone[]): Job {
  const milestones = shapeMilestones(rawMilestones)
  const { meta, milestoneText } =
    milestones.length > 0
      ? decodeFirstMilestone(milestones[0].description)
      : { meta: { title: '', description: '' }, milestoneText: '' }
  const milestoneSum = milestones.reduce((s, m) => s + m.amount, 0n)
  return {
    jobId: raw.jobId,
    client: raw.client,
    freelancer: raw.freelancer,
    depositAmount: raw.depositAmount,
    clientFee: raw.clientFee,
    availableForWork: raw.availableForWork,
    amountReleased: raw.amountReleased,
    poorWorkReported: raw.poorWorkReported,
    category: JOB_CATEGORY[raw.category] ?? 'OTHERS',
    status: JOB_STATUS[raw.status] ?? 'OPEN',
    createdAt: raw.createdAt,
    deadline: raw.deadline,
    title: meta.title || `Job #${raw.jobId.toString()}`,
    description: meta.description,
    milestones,
    milestoneSum,
    firstMilestoneText: milestoneText,
  }
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const counterRaw = (await publicClient.readContract({
        address: ADDRESSES.escrowPlatform,
        abi: EscrowPlatformAbi,
        functionName: 'jobCounter',
      })) as bigint
      const counter = Number(counterRaw)
      if (counter === 0) {
        setJobs([])
        setError(null)
        return
      }

      const ids = Array.from({ length: counter }, (_, i) => BigInt(i + 1))
      const contracts = ids.flatMap(id => [
        {
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'getJob' as const,
          args: [id] as const,
        },
        {
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'getMilestones' as const,
          args: [id] as const,
        },
      ])
      const results = await publicClient.multicall({ contracts, allowFailure: true })

      const decoded: Job[] = []
      for (let i = 0; i < ids.length; i++) {
        const jobR = results[i * 2]
        const msR = results[i * 2 + 1]
        if (jobR.status !== 'success' || msR.status !== 'success') continue
        const j = shapeJob(jobR.result as unknown as RawJob, msR.result as unknown as RawMilestone[])
        if (j.status === 'NONE') continue // job slot doesn't exist
        decoded.push(j)
      }
      decoded.sort((a, b) => Number(b.createdAt - a.createdAt))
      setJobs(decoded)
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load jobs')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { jobs, loading, error, refresh }
}
