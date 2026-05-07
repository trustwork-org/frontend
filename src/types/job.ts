import type { JobCategory, JobStatus, MilestoneStatus } from '../contracts'

export interface RawMilestone {
  description: string
  amount: bigint
  deadline: bigint
  submissionNote: string
  status: number
}

export interface Milestone extends RawMilestone {
  index: number
  statusLabel: MilestoneStatus
}

export interface Job {
  jobId: bigint
  client: `0x${string}`
  freelancer: `0x${string}`
  depositAmount: bigint
  clientFee: bigint
  availableForWork: bigint
  amountReleased: bigint
  poorWorkReported: boolean
  category: JobCategory
  status: JobStatus
  createdAt: bigint
  deadline: bigint
  title: string
  description: string
  milestones: Milestone[]
  milestoneSum: bigint
  firstMilestoneText: string
}
