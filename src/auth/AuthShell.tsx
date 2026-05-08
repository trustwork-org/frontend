import { Outlet } from 'react-router-dom'
import { PrivyProvider } from '@privy-io/react-auth'
import { defineChain } from 'viem'
import { sepolia as viemSepolia } from 'viem/chains'
import { AuthProvider } from '../context/AuthContext'

/**
 * Mounts Privy + our AuthProvider only when one of the routes wrapped by this
 * layout is active. Public marketing pages render WITHOUT this layout and so
 * do not download the ~915 KB Privy bundle on first paint.
 */

const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

const sepolia = defineChain({
  ...viemSepolia,
  rpcUrls: { default: { http: [rpcUrl] } },
})

export default function AuthShell() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#14a800',
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </PrivyProvider>
  )
}
