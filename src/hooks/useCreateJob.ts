import { useCallback, useState } from 'react'
import { decodeEventLog } from 'viem'
import { ADDRESSES, EscrowPlatformAbi, JOB_CATEGORY, type JobCategory } from '../contracts'
import { publicClient } from '../lib/viem'
import { useWalletClient } from './useWalletClient'
import { useUSDC, parseUSDC } from './useUSDC'
import { encodeFirstMilestone, type JobMeta } from '../utils/jobMeta'

export interface MilestoneInput {
  description: string
  amountUsdc: string
}

export interface CreateJobInput {
  title: string
  description: string
  category: JobCategory
  deadline: Date
  milestones: MilestoneInput[]
}

export type CreateJobStep = 'idle' | 'approving' | 'creating' | 'success' | 'error'

const BPS_DENOMINATOR = 10000n
const CLIENT_FEE_BPS = 200n

/** depositAmount = ceil(milestoneSum * 10000 / 9800) so that 98% covers milestones. */
export function computeDepositAmount(milestoneSum: bigint): bigint {
  const num = milestoneSum * BPS_DENOMINATOR
  const den = BPS_DENOMINATOR - CLIENT_FEE_BPS
  return (num + den - 1n) / den
}

export function useCreateJob() {
  const { walletClient, address } = useWalletClient()
  const { escrowAllowance, refresh: refreshUSDC, approve } = useUSDC()
  const [step, setStep] = useState<CreateJobStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<bigint | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setJobId(null)
    setTxHash(null)
  }, [])

  const create = useCallback(
    async (input: CreateJobInput) => {
      if (!walletClient || !address) {
        setError('Wallet not connected')
        setStep('error')
        return
      }
      if (input.milestones.length === 0) {
        setError('Add at least one milestone')
        setStep('error')
        return
      }
      const deadlineSec = BigInt(Math.floor(input.deadline.getTime() / 1000))
      if (deadlineSec <= BigInt(Math.floor(Date.now() / 1000))) {
        setError('Deadline must be in the future')
        setStep('error')
        return
      }

      try {
        setError(null)
        setJobId(null)
        setTxHash(null)

        const amounts = input.milestones.map(m => parseUSDC(m.amountUsdc))
        for (const a of amounts) {
          if (a <= 0n) throw new Error('Each milestone amount must be > 0')
        }
        const milestoneSum = amounts.reduce((s, a) => s + a, 0n)
        const depositAmount = computeDepositAmount(milestoneSum)

        const meta: JobMeta = { title: input.title, description: input.description }
        const descriptions = input.milestones.map((m, i) =>
          i === 0 ? encodeFirstMilestone(meta, m.description) : m.description,
        )

        if ((escrowAllowance ?? 0n) < depositAmount) {
          setStep('approving')
          await approve(ADDRESSES.escrowPlatform, depositAmount)
        }

        setStep('creating')
        const categoryIndex = JOB_CATEGORY.indexOf(input.category)
        const hash = await walletClient.writeContract({
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'createJob',
          args: [descriptions, amounts, deadlineSec, categoryIndex, depositAmount],
          account: address,
          chain: walletClient.chain,
        })
        setTxHash(hash)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        let createdId: bigint | null = null
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== ADDRESSES.escrowPlatform.toLowerCase()) continue
          try {
            const decoded = decodeEventLog({
              abi: EscrowPlatformAbi,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName === 'JobCreated') {
              createdId = (decoded.args as { jobId: bigint }).jobId
              break
            }
          } catch {
            // not the JobCreated event, ignore
          }
        }

        await refreshUSDC()
        setJobId(createdId)
        setStep('success')
        return createdId
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create job'
        setError(message)
        setStep('error')
        throw err
      }
    },
    [walletClient, address, escrowAllowance, approve, refreshUSDC],
  )

  return { create, step, error, jobId, txHash, reset }
}
