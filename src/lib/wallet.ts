import type { ConnectedWallet } from '@privy-io/react-auth'

/**
 * Single source of truth for "which Privy wallet should we use?"
 *
 * Selection rule: match the wallet to the login method.
 *
 *   1. Smart wallet (ERC-4337) — if a smart wallet is provisioned, prefer it
 *   2. Embedded wallet — exists iff the user signed in via Google / email.
 *      That wallet is conceptually "the wallet for their social account",
 *      so it wins even if an external wallet is also connected.
 *   3. External wallet — for users who chose "Connect wallet" instead of
 *      social login.
 *   4. Whatever is first in the array.
 *
 * Both AuthContext (display + backend register) and useWalletClient (signing)
 * call this so the displayed address and the signing address always match.
 */
export function selectActiveWallet(
  wallets: readonly ConnectedWallet[],
): ConnectedWallet | undefined {
  return (
    wallets.find(w => w.connectorType === 'smart_wallet') ??
    wallets.find(w => w.connectorType === 'embedded') ??
    wallets.find(
      w =>
        w.connectorType === 'injected' ||
        w.connectorType === 'wallet_connect' ||
        w.connectorType === 'coinbase_wallet',
    ) ??
    wallets[0]
  )
}
