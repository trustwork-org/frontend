import { useCallback, useEffect, useState } from 'react'
import { erc20Abi, ADDRESSES, USDC_DECIMALS } from '../contracts'
import { publicClient } from '../lib/viem'
import { useWalletClient } from './useWalletClient'

export function parseUSDC(human: string | number): bigint {
  const s = typeof human === 'number' ? human.toString() : human
  if (!s) return 0n
  const [whole, frac = ''] = s.split('.')
  const fracPadded = (frac + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS)
  return BigInt(whole || '0') * 10n ** BigInt(USDC_DECIMALS) + BigInt(fracPadded || '0')
}

export function formatUSDC(amount: bigint, fractionDigits = 2): string {
  const negative = amount < 0n
  const abs = negative ? -amount : amount
  const base = 10n ** BigInt(USDC_DECIMALS)
  const whole = abs / base
  const frac = abs % base
  const fracStr = frac.toString().padStart(USDC_DECIMALS, '0').slice(0, fractionDigits)
  const wholeStr = whole.toString()
  const formatted = fractionDigits > 0 ? `${wholeStr}.${fracStr}` : wholeStr
  return negative ? `-${formatted}` : formatted
}

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
