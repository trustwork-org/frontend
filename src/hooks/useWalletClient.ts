import { useEffect, useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, type WalletClient } from 'viem'
import { sepolia } from 'viem/chains'

/**
 * Builds a viem WalletClient from the user's Privy-managed wallet (embedded
 * smart wallet for social-login users, or external wallet like MetaMask).
 * Returns null until a wallet is connected.
 */
export function useWalletClient() {
  const { wallets } = useWallets()
  const [client, setClient] = useState<WalletClient | null>(null)
  const [address, setAddress] = useState<`0x${string}` | null>(null)

  const wallet = wallets[0]

  useEffect(() => {
    if (!wallet) {
      setClient(null)
      setAddress(null)
      return
    }
    let cancelled = false

    ;(async () => {
      try {
        await wallet.switchChain(sepolia.id)
        const provider = await wallet.getEthereumProvider()
        if (cancelled) return
        const wc = createWalletClient({
          account: wallet.address as `0x${string}`,
          chain: sepolia,
          transport: custom(provider),
        })
        setClient(wc)
        setAddress(wallet.address as `0x${string}`)
      } catch (err) {
        console.error('Failed to build wallet client:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [wallet])

  return { walletClient: client, address }
}
