import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'

interface AuthContextType {
  isAuthed: boolean
  isLoading: boolean
  /** Smart wallet address (ERC-4337) or embedded EOA */
  address: string | null
  displayAddress: string | null
  login: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()

  // Prefer smart wallet (social login users), fall back to connected EOA (wallet users)
  const smartWallet = wallets.find(w => w.connectorType === 'smart_wallet')
  const externalWallet = wallets.find(w => w.connectorType === 'injected' || w.connectorType === 'wallet_connect' || w.connectorType === 'coinbase_wallet')
  const address = smartWallet?.address ?? externalWallet?.address ?? wallets[0]?.address ?? null
  const displayAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null

  // On first login: store email + wallet address in backend so we can send emails
  useEffect(() => {
    const email = user?.email?.address
    if (!authenticated || !address || !email) return

    fetch('/api/account/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address, email }),
    }).catch(console.error)
  }, [authenticated, address])

  return (
    <AuthContext.Provider value={{ isAuthed: authenticated, isLoading: !ready, address, displayAddress, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
