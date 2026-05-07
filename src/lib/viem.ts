import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

const rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

export const publicClient = createPublicClient({
  chain: sepolia,
  // batch: combines multiple eth_calls fired in the same tick into one HTTP
  // request via the JSON-RPC batch protocol. Cuts request count ~5–10x and
  // keeps us well under free-tier rate limits on Infura/Alchemy.
  transport: http(rpcUrl, {
    batch: { batchSize: 100, wait: 16 },
  }),
})

export { sepolia }
