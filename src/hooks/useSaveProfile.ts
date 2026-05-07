import { useCallback, useState } from 'react'
import { ADDRESSES, ProfileRegistryAbi } from '../contracts'
import { publicClient } from '../lib/viem'
import { pinJSON } from '../lib/pinata'
import { toastError, toastSuccess } from '../lib/toast'
import { useWalletClient } from './useWalletClient'
import type { ProfileMetadata } from './useProfile'

export type SaveProfileStep = 'idle' | 'uploading' | 'sending' | 'success' | 'error'

export function useSaveProfile() {
  const { walletClient, address } = useWalletClient()
  const [step, setStep] = useState<SaveProfileStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)

  const reset = useCallback(() => {
    setStep('idle')
    setError(null)
    setTxHash(null)
  }, [])

  const save = useCallback(
    async (meta: ProfileMetadata, alreadyRegistered: boolean) => {
      if (!walletClient || !address) throw new Error('Wallet not connected')
      try {
        setError(null)
        setTxHash(null)
        setStep('uploading')
        const { cid } = await pinJSON(meta, `trustwork-profile-${address}`)

        setStep('sending')
        const hash = await walletClient.writeContract({
          address: ADDRESSES.profileRegistry,
          abi: ProfileRegistryAbi,
          functionName: alreadyRegistered ? 'updateProfile' : 'registerProfile',
          args: [cid],
          account: address,
          chain: walletClient.chain,
        })
        setTxHash(hash)
        await publicClient.waitForTransactionReceipt({ hash })
        setStep('success')
        toastSuccess(alreadyRegistered ? 'Profile updated.' : 'Profile created.')
        return { cid, hash }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save profile'
        setError(message)
        setStep('error')
        toastError(err, 'Failed to save profile')
        throw err
      }
    },
    [walletClient, address],
  )

  return { save, step, error, txHash, reset }
}
