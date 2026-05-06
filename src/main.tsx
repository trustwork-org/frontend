import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { defineChain } from 'viem'
import { sepolia as viemSepolia } from 'viem/chains'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

export const sepolia = defineChain({
  ...viemSepolia,
  rpcUrls: { default: { http: [rpcUrl] } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
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
        <App />
      </PrivyProvider>
    </QueryClientProvider>
  </StrictMode>,
)
