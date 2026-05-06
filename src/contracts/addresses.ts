import { sepolia } from 'viem/chains'

export const CHAIN = sepolia
export const CHAIN_ID = sepolia.id

export const ADDRESSES = {
  escrowPlatform: '0x3945065755abd82edd9a7980315e9e1575a92549',
  disputeDAO: '0xbbc61f2700f627448fe42eb24b98ed523039704f',
  profileRegistry: '0x61447acf2b39a7180ee738fc4bb961329737a153',
  reputationNFT: '0x6bdacf5421d27ae8e88405d135e8a291f7b34b31',
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
} as const satisfies Record<string, `0x${string}`>

export const USDC_DECIMALS = 6

export const EXPLORER = {
  tx: (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`,
  address: (addr: string) => `https://sepolia.etherscan.io/address/${addr}`,
}
