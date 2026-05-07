import { createPublicClient, fallback, http } from 'viem'
import { sepolia } from 'viem/chains'

// Build an ordered list of RPC endpoints. The fallback transport tries them
// in order; if one returns an error or times out, the next one takes over
// until the failed endpoint recovers. Free-tier rate limits on Infura/Alchemy
// stop being a single point of failure.
const PUBLIC_FALLBACK = 'https://ethereum-sepolia-rpc.publicnode.com'

const primary = import.meta.env.VITE_SEPOLIA_RPC_URL
const secondary = import.meta.env.VITE_SEPOLIA_RPC_URL_FALLBACK

const urls = [primary, secondary, PUBLIC_FALLBACK].filter((u): u is string => !!u)
// Always end with a public RPC as last-ditch fallback (deduped).
const dedupedUrls = Array.from(new Set(urls))

const transports = dedupedUrls.map(url =>
  http(url, { batch: { batchSize: 100, wait: 16 } }),
)

export const publicClient = createPublicClient({
  chain: sepolia,
  // batch: coalesces multiple eth_calls fired in the same tick into a single
  // JSON-RPC batch request. Cuts request count ~5–10x.
  // fallback: rotates to the next transport when one errors, with automatic
  // recovery once the failing endpoint comes back.
  transport: transports.length > 1 ? fallback(transports) : transports[0],
})

export { sepolia }
