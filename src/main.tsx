import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { defineChain } from 'viem'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

export const liskSepolia = defineChain({
  id: 4202,
  name: 'Lisk Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia-api.lisk.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://sepolia-blockscout.lisk.com' } },
  testnet: true,
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
          defaultChain: liskSepolia,
          supportedChains: [liskSepolia],
        }}
      >
        <App />
      </PrivyProvider>
    </QueryClientProvider>
  </StrictMode>,
)
