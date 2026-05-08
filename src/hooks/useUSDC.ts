import { useCallback, useEffect, useState } from 'react'
import { erc20Abi, ADDRESSES } from '../contracts'
import { publicClient } from '../lib/viem'
import { useWalletClient } from './useWalletClient'

// Re-export the pure helpers from utils/usdc so existing call-sites that
// import { formatUSDC } from '../hooks/useUSDC' don't break. Public-page
// callers should prefer importing directly from '../utils/usdc' to avoid
// dragging the React hook (and therefore Privy) into their bundle.
export { formatUSDC, parseUSDC } from '../utils/usdc'

export function useUSDC() {
  const { walletClient, address } = useWalletClient()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [escrowAllowance, setEscrowAllowance] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(null)
      setEscrowAllowance(null)
      return
    }
    setLoading(true)
    try {
      const [bal, allow] = await Promise.all([
        publicClient.readContract({
          address: ADDRESSES.usdc,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        }),
        publicClient.readContract({
          address: ADDRESSES.usdc,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, ADDRESSES.escrowPlatform],
        }),
      ])
      setBalance(bal as bigint)
      setEscrowAllowance(allow as bigint)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  const approve = useCallback(
    async (spender: `0x${string}`, amount: bigint) => {
      if (!walletClient || !address) throw new Error('Wallet not connected')
      const hash = await walletClient.writeContract({
        address: ADDRESSES.usdc,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
        account: address,
        chain: walletClient.chain,
      })
      await publicClient.waitForTransactionReceipt({ hash })
      await refresh()
      return hash
    },
    [walletClient, address, refresh],
  )

  return { balance, escrowAllowance, loading, refresh, approve }
}
