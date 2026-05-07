import { useCallback, useState } from 'react'
import { ADDRESSES, DisputeDAOAbi, EscrowPlatformAbi, erc20Abi } from '../contracts'
import { publicClient } from '../lib/viem'
import { pinJSON, pinFile } from '../lib/pinata'
import { toastError, toastSuccess } from '../lib/toast'
import { useWalletClient } from './useWalletClient'

export type DisputeAction =
  | 'raiseDispute'
  | 'submitEvidence'
  | 'joinPool'
  | 'leavePool'
  | 'submitVote'
  | 'resolveDispute'
  | 'approve'
  | 'uploadEvidence'

export interface DisputeActionState {
  action: DisputeAction | null
  txHash: `0x${string}` | null
  error: string | null
}

export interface EvidencePayload {
  description: string
  file?: File | null
}

export function useDisputeActions() {
  const { walletClient, address } = useWalletClient()
  const [state, setState] = useState<DisputeActionState>({ action: null, txHash: null, error: null })

  const reset = useCallback(() => setState({ action: null, txHash: null, error: null }), [])

  const setBusy = (action: DisputeAction) =>
    setState({ action, txHash: null, error: null })
  const setSent = (action: DisputeAction, hash: `0x${string}`) =>
    setState({ action, txHash: hash, error: null })
  const setIdle = () => setState({ action: null, txHash: null, error: null })
  const succeed = (message: string) => {
    setState({ action: null, txHash: null, error: null })
    toastSuccess(message)
  }
  // Accepts an unknown error, normalises to a message for state, fires the
  // friendly toast for the user. The full error is also logged for debugging.
  const setErr = (err: unknown, fallback?: string) => {
    const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : (fallback || 'Operation failed'))
    setState({ action: null, txHash: null, error: msg })
    toastError(err ?? null, fallback)
  }

  const ensureWallet = () => {
    if (!walletClient || !address) throw new Error('Wallet not connected')
    return { walletClient, address }
  }

  /** Upload evidence (text + optional file) to IPFS, return CID. */
  const uploadEvidence = useCallback(async (payload: EvidencePayload): Promise<string> => {
    setBusy('uploadEvidence')
    try {
      let attachmentCID: string | undefined
      if (payload.file) {
        const f = await pinFile(payload.file, payload.file.name)
        attachmentCID = f.cid
      }
      const { cid } = await pinJSON(
        {
          description: payload.description,
          attachmentCID,
          submittedAt: new Date().toISOString(),
        },
        `trustwork-evidence-${Date.now()}`,
      )
      setIdle()
      return cid
    } catch (err) {
      setErr(err, 'Failed to upload evidence')
      throw err
    }
  }, [])

  const raiseDispute = useCallback(
    async (jobId: bigint, milestoneIndex: number, evidenceCID: string) => {
      const { walletClient: wc, address: addr } = ensureWallet()
      try {
        setBusy('raiseDispute')
        const hash = await wc.writeContract({
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'raiseDispute',
          args: [jobId, BigInt(milestoneIndex), evidenceCID],
          account: addr,
          chain: wc.chain,
        })
        setSent('raiseDispute', hash)
        await publicClient.waitForTransactionReceipt({ hash })
        succeed('Dispute opened.')
        return hash
      } catch (err) {
        setErr(err, 'Failed to raise dispute')
        throw err
      }
    },
    [walletClient, address],
  )

  const submitEvidence = useCallback(
    async (disputeId: bigint, evidenceCID: string) => {
      const { walletClient: wc, address: addr } = ensureWallet()
      try {
        setBusy('submitEvidence')
        const hash = await wc.writeContract({
          address: ADDRESSES.disputeDAO,
          abi: DisputeDAOAbi,
          functionName: 'submitEvidence',
          args: [disputeId, evidenceCID],
          account: addr,
          chain: wc.chain,
        })
        setSent('submitEvidence', hash)
        await publicClient.waitForTransactionReceipt({ hash })
        succeed('Evidence submitted.')
        return hash
      } catch (err) {
        setErr(err, 'Failed to submit evidence')
        throw err
      }
    },
    [walletClient, address],
  )

  const approveUSDC = useCallback(
    async (spender: `0x${string}`, amount: bigint) => {
      const { walletClient: wc, address: addr } = ensureWallet()
      try {
        setBusy('approve')
        const hash = await wc.writeContract({
          address: ADDRESSES.usdc,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amount],
          account: addr,
          chain: wc.chain,
        })
        setSent('approve', hash)
        await publicClient.waitForTransactionReceipt({ hash })
        succeed('USDC spending approved.')
        return hash
      } catch (err) {
        setErr(err, 'Failed to approve USDC')
        throw err
      }
    },
    [walletClient, address],
  )

  const joinPool = useCallback(async () => {
    const { walletClient: wc, address: addr } = ensureWallet()
    try {
      setBusy('joinPool')
      const hash = await wc.writeContract({
        address: ADDRESSES.disputeDAO,
        abi: DisputeDAOAbi,
        functionName: 'joinArbitratorPool',
        args: [],
        account: addr,
        chain: wc.chain,
      })
      setSent('joinPool', hash)
      await publicClient.waitForTransactionReceipt({ hash })
      succeed('Joined arbitrator pool.')
      return hash
    } catch (err) {
      setErr(err, 'Failed to join pool')
      throw err
    }
  }, [walletClient, address])

  const leavePool = useCallback(async () => {
    const { walletClient: wc, address: addr } = ensureWallet()
    try {
      setBusy('leavePool')
      const hash = await wc.writeContract({
        address: ADDRESSES.disputeDAO,
        abi: DisputeDAOAbi,
        functionName: 'leaveArbitratorPool',
        args: [],
        account: addr,
        chain: wc.chain,
      })
      setSent('leavePool', hash)
      await publicClient.waitForTransactionReceipt({ hash })
      succeed('Left arbitrator pool.')
      return hash
    } catch (err) {
      setErr(err, 'Failed to leave pool')
      throw err
    }
  }, [walletClient, address])

  const submitVote = useCallback(
    async (disputeId: bigint, vote: 1 | 2) => {
      const { walletClient: wc, address: addr } = ensureWallet()
      try {
        setBusy('submitVote')
        const hash = await wc.writeContract({
          address: ADDRESSES.disputeDAO,
          abi: DisputeDAOAbi,
          functionName: 'submitVote',
          args: [disputeId, vote],
          account: addr,
          chain: wc.chain,
        })
        setSent('submitVote', hash)
        await publicClient.waitForTransactionReceipt({ hash })
        succeed('Vote submitted.')
        return hash
      } catch (err) {
        setErr(err, 'Failed to submit vote')
        throw err
      }
    },
    [walletClient, address],
  )

  const resolveDispute = useCallback(
    async (disputeId: bigint) => {
      const { walletClient: wc, address: addr } = ensureWallet()
      try {
        setBusy('resolveDispute')
        const hash = await wc.writeContract({
          address: ADDRESSES.disputeDAO,
          abi: DisputeDAOAbi,
          functionName: 'resolveDispute',
          args: [disputeId],
          account: addr,
          chain: wc.chain,
        })
        setSent('resolveDispute', hash)
        await publicClient.waitForTransactionReceipt({ hash })
        succeed('Dispute resolved.')
        return hash
      } catch (err) {
        setErr(err, 'Failed to resolve dispute')
        throw err
      }
    },
    [walletClient, address],
  )

  return {
    state,
    reset,
    address,
    uploadEvidence,
    raiseDispute,
    submitEvidence,
    approveUSDC,
    joinPool,
    leavePool,
    submitVote,
    resolveDispute,
  }
}
