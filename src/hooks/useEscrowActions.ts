import { useCallback, useState } from 'react'
import { ADDRESSES, EscrowPlatformAbi } from '../contracts'
import { publicClient } from '../lib/viem'
import { useWalletClient } from './useWalletClient'

export type EscrowActionName =
  | 'applyToJob'
  | 'approveApplicant'
  | 'submitMilestone'
  | 'approveMilestone'
  | 'rejectMilestone'
  | 'raiseDispute'
  | 'selfReportPoorWork'
  | 'cancelJob'
  | 'rescueClientRefund'

export interface EscrowActionState {
  action: EscrowActionName | null
  txHash: `0x${string}` | null
  error: string | null
}

export function useEscrowActions() {
  const { walletClient, address } = useWalletClient()
  const [state, setState] = useState<EscrowActionState>({ action: null, txHash: null, error: null })

  const reset = useCallback(() => setState({ action: null, txHash: null, error: null }), [])

  const send = useCallback(
    async (
      action: EscrowActionName,
      functionName: string,
      args: readonly unknown[],
    ) => {
      if (!walletClient || !address) throw new Error('Wallet not connected')
      try {
        setState({ action, txHash: null, error: null })
        const hash = await walletClient.writeContract({
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          // viem types want the literal name, but we accept a string at runtime
          functionName: functionName as never,
          args: args as never,
          account: address,
          chain: walletClient.chain,
        })
        setState({ action, txHash: hash, error: null })
        await publicClient.waitForTransactionReceipt({ hash })
        setState({ action: null, txHash: hash, error: null })
        return hash
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transaction failed'
        setState({ action: null, txHash: null, error: message })
        throw err
      }
    },
    [walletClient, address],
  )

  const applyToJob = (jobId: bigint) => send('applyToJob', 'applyToJob', [jobId])
  const approveApplicant = (jobId: bigint, freelancer: `0x${string}`) =>
    send('approveApplicant', 'approveApplicant', [jobId, freelancer])
  const submitMilestone = (jobId: bigint, milestoneIndex: number, submissionNote: string) =>
    send('submitMilestone', 'submitMilestone', [jobId, BigInt(milestoneIndex), submissionNote])
  const approveMilestone = (jobId: bigint, milestoneIndex: number) =>
    send('approveMilestone', 'approveMilestone', [jobId, BigInt(milestoneIndex)])
  const rejectMilestone = (jobId: bigint, milestoneIndex: number) =>
    send('rejectMilestone', 'rejectMilestone', [jobId, BigInt(milestoneIndex)])
  const raiseDispute = (jobId: bigint, milestoneIndex: number, evidenceCID: string) =>
    send('raiseDispute', 'raiseDispute', [jobId, BigInt(milestoneIndex), evidenceCID])
  const selfReportPoorWork = (jobId: bigint) => send('selfReportPoorWork', 'selfReportPoorWork', [jobId])
  const cancelJob = (jobId: bigint) => send('cancelJob', 'cancelJob', [jobId])
  const rescueClientRefund = (jobId: bigint) => send('rescueClientRefund', 'rescueClientRefund', [jobId])

  const isPending = (name?: EscrowActionName) =>
    state.action !== null && (name ? state.action === name : true)

  return {
    state,
    isPending,
    reset,
    address,
    applyToJob,
    approveApplicant,
    submitMilestone,
    approveMilestone,
    rejectMilestone,
    raiseDispute,
    selfReportPoorWork,
    cancelJob,
    rescueClientRefund,
  }
}
