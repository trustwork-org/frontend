import { useCallback, useEffect, useState } from 'react'
import { ADDRESSES, DisputeDAOAbi, erc20Abi } from '../contracts'
import { publicClient } from '../lib/viem'
import { useWalletClient } from './useWalletClient'

export interface ArbitratorState {
  isArbitrator: boolean
  stake: bigint
  busy: boolean
  poolSize: bigint
  minStake: bigint
  votingPeriod: bigint
  usdcAllowance: bigint
  usdcBalance: bigint
}

export function useArbitratorState() {
  const { address } = useWalletClient()
  const [state, setState] = useState<ArbitratorState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const baseContracts = [
        {
          address: ADDRESSES.disputeDAO,
          abi: DisputeDAOAbi,
          functionName: 'arbitratorPoolSize' as const,
          args: [] as const,
        },
        {
          address: ADDRESSES.disputeDAO,
          abi: DisputeDAOAbi,
          functionName: 'minStake' as const,
          args: [] as const,
        },
        {
          address: ADDRESSES.disputeDAO,
          abi: DisputeDAOAbi,
          functionName: 'votingPeriod' as const,
          args: [] as const,
        },
      ]
      const userContracts = address
        ? [
            {
              address: ADDRESSES.disputeDAO,
              abi: DisputeDAOAbi,
              functionName: 'isArbitrator' as const,
              args: [address] as const,
            },
            {
              address: ADDRESSES.disputeDAO,
              abi: DisputeDAOAbi,
              functionName: 'arbitratorStake' as const,
              args: [address] as const,
            },
            {
              address: ADDRESSES.disputeDAO,
              abi: DisputeDAOAbi,
              functionName: 'arbitratorBusy' as const,
              args: [address] as const,
            },
            {
              address: ADDRESSES.usdc,
              abi: erc20Abi,
              functionName: 'allowance' as const,
              args: [address, ADDRESSES.disputeDAO] as const,
            },
            {
              address: ADDRESSES.usdc,
              abi: erc20Abi,
              functionName: 'balanceOf' as const,
              args: [address] as const,
            },
          ]
        : []

      const r = await publicClient.multicall({
        contracts: [...baseContracts, ...userContracts],
        allowFailure: true,
      })

      const poolSize = r[0].status === 'success' ? (r[0].result as bigint) : 0n
      const minStake = r[1].status === 'success' ? (r[1].result as bigint) : 0n
      const votingPeriod = r[2].status === 'success' ? (r[2].result as bigint) : 0n
      const isArbitrator = r[3]?.status === 'success' ? (r[3].result as boolean) : false
      const stake = r[4]?.status === 'success' ? (r[4].result as bigint) : 0n
      const busy = r[5]?.status === 'success' ? (r[5].result as boolean) : false
      const usdcAllowance = r[6]?.status === 'success' ? (r[6].result as bigint) : 0n
      const usdcBalance = r[7]?.status === 'success' ? (r[7].result as bigint) : 0n

      setState({
        isArbitrator,
        stake,
        busy,
        poolSize,
        minStake,
        votingPeriod,
        usdcAllowance,
        usdcBalance,
      })
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { state, loading, refresh, address }
}
