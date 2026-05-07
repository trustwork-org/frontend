import { useEffect, useState } from 'react'
import { ADDRESSES, DisputeDAOAbi, EscrowPlatformAbi, erc20Abi } from '../contracts'
import { publicClient } from '../lib/viem'

export interface LandingStats {
  totalEscrowedUsdc: bigint
  jobsPosted: bigint
  disputes: bigint
  arbitrators: bigint
}

const ZERO: LandingStats = {
  totalEscrowedUsdc: 0n,
  jobsPosted: 0n,
  disputes: 0n,
  arbitrators: 0n,
}

export function useLandingStats() {
  const [stats, setStats] = useState<LandingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await publicClient.multicall({
          contracts: [
            {
              address: ADDRESSES.usdc,
              abi: erc20Abi,
              functionName: 'balanceOf' as const,
              args: [ADDRESSES.escrowPlatform] as const,
            },
            {
              address: ADDRESSES.escrowPlatform,
              abi: EscrowPlatformAbi,
              functionName: 'jobCounter' as const,
              args: [] as const,
            },
            {
              address: ADDRESSES.disputeDAO,
              abi: DisputeDAOAbi,
              functionName: 'disputeCounter' as const,
              args: [] as const,
            },
            {
              address: ADDRESSES.disputeDAO,
              abi: DisputeDAOAbi,
              functionName: 'arbitratorPoolSize' as const,
              args: [] as const,
            },
          ],
          allowFailure: true,
        })
        if (cancelled) return
        setStats({
          totalEscrowedUsdc: r[0].status === 'success' ? (r[0].result as bigint) : 0n,
          jobsPosted: r[1].status === 'success' ? (r[1].result as bigint) : 0n,
          disputes: r[2].status === 'success' ? (r[2].result as bigint) : 0n,
          arbitrators: r[3].status === 'success' ? (r[3].result as bigint) : 0n,
        })
      } catch (err) {
        console.warn('Failed to load landing stats:', err)
        if (!cancelled) setStats(ZERO)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return { stats, loading }
}

/** Compact USDC formatter: $0, $1.23, $456, $7.8K, $1.23M */
export function formatUsdcShort(wei: bigint): string {
  if (wei === 0n) return '$0'
  const usdc = Number(wei) / 1_000_000
  if (usdc < 1) return `$${usdc.toFixed(2)}`
  if (usdc < 1000) return `$${Math.floor(usdc).toLocaleString()}`
  if (usdc < 1_000_000) return `$${(usdc / 1000).toFixed(1)}K`
  return `$${(usdc / 1_000_000).toFixed(2)}M`
}
