import { useCallback, useEffect, useState } from 'react'
import {
  ADDRESSES,
  EscrowPlatformAbi,
  ProfileRegistryAbi,
  ReputationNFTAbi,
} from '../contracts'
import { publicClient } from '../lib/viem'
import { fetchJSON } from '../lib/pinata'

export interface ProfileMetadata {
  name?: string
  headline?: string
  bio?: string
  skills?: string[]
  portfolioURL?: string
}

export interface ProfileData {
  // ProfileRegistry
  cid: string
  isRegistered: boolean
  registeredAt: bigint
  updatedAt: bigint
  metadata: ProfileMetadata | null

  // ReputationNFT
  tier: number              // 0 = no NFT, 1..5
  jobsCompleted: bigint     // tracked by ReputationNFT (last seen at mint)
  tokenId: bigint
  tierName: string

  // EscrowPlatform
  escrowJobsCompleted: bigint
  totalEarnedWei: bigint
  flags: bigint
  banned: boolean
}

const TIER_NAMES = ['', 'Rising Talent', 'Established Pro', 'Expert', 'Elite', 'Legend']

export function useProfile(address: `0x${string}` | null | undefined) {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!address) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const contracts = [
        {
          address: ADDRESSES.profileRegistry,
          abi: ProfileRegistryAbi,
          functionName: 'getProfile' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.reputationNFT,
          abi: ReputationNFTAbi,
          functionName: 'currentTier' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.reputationNFT,
          abi: ReputationNFTAbi,
          functionName: 'jobsCompleted' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.reputationNFT,
          abi: ReputationNFTAbi,
          functionName: 'freelancerTokenId' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'freelancerCompletedJobs' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'freelancerTotalEarned' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'freelancerFlags' as const,
          args: [address] as const,
        },
        {
          address: ADDRESSES.escrowPlatform,
          abi: EscrowPlatformAbi,
          functionName: 'bannedFreelancers' as const,
          args: [address] as const,
        },
      ]

      const results = await publicClient.multicall({ contracts, allowFailure: true })

      const getProfileR = results[0]
      const tierR = results[1]
      const jobsCompletedR = results[2]
      const tokenIdR = results[3]
      const escrowJobsR = results[4]
      const totalEarnedR = results[5]
      const flagsR = results[6]
      const bannedR = results[7]

      const profileTuple =
        getProfileR.status === 'success'
          ? (getProfileR.result as readonly [string, bigint, bigint, boolean])
          : (['', 0n, 0n, false] as const)

      const cid = profileTuple[0] as string
      const registeredAt = profileTuple[1] as bigint
      const updatedAt = profileTuple[2] as bigint
      const isRegistered = profileTuple[3] as boolean

      let metadata: ProfileMetadata | null = null
      if (cid) {
        const cleanCID = cid.startsWith('ipfs://') ? cid.slice('ipfs://'.length) : cid
        try {
          metadata = await fetchJSON<ProfileMetadata>(cleanCID)
        } catch (err) {
          console.warn('Could not fetch profile metadata from IPFS:', err)
        }
      }

      const tier = (tierR.status === 'success' ? Number(tierR.result) : 0) as number
      const tokenId = (tokenIdR.status === 'success' ? (tokenIdR.result as bigint) : 0n)

      setData({
        cid,
        isRegistered,
        registeredAt,
        updatedAt,
        metadata,
        tier,
        jobsCompleted: jobsCompletedR.status === 'success' ? (jobsCompletedR.result as bigint) : 0n,
        tokenId,
        tierName: TIER_NAMES[tier] || '',
        escrowJobsCompleted: escrowJobsR.status === 'success' ? (escrowJobsR.result as bigint) : 0n,
        totalEarnedWei: totalEarnedR.status === 'success' ? (totalEarnedR.result as bigint) : 0n,
        flags: flagsR.status === 'success' ? (flagsR.result as bigint) : 0n,
        banned: bannedR.status === 'success' ? (bannedR.result as boolean) : false,
      })
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh }
}
