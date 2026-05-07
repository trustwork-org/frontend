import { useEffect, useMemo, useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, type WalletClient } from 'viem'
import { sepolia } from 'viem/chains'
import { selectActiveWallet } from '../lib/wallet'

/**
 * Builds a viem WalletClient from the user's Privy-managed wallet (embedded
 * smart wallet for social-login users, or external wallet like MetaMask).
 * Returns null until a wallet is connected.
 *
 * IMPORTANT: Privy's useWallets() returns a fresh array and fresh wallet
 * objects on every render, so we cannot put `wallet` in a useEffect deps
 * array — that would trigger an infinite re-render loop. We key the
 * effect off stable string values (address + connectorType) instead.
 */
export function useWalletClient() {
  const { wallets } = useWallets()
  const [client, setClient] = useState<WalletClient | null>(null)
  const [address, setAddress] = useState<`0x${string}` | null>(null)

  const wallet = useMemo(() => selectActiveWallet(wallets), [wallets])
  const walletKey = wallet ? `${wallet.connectorType}:${wallet.address}` : null

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletKey])

  return { walletClient: client, address }
}
