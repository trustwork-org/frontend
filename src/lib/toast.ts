import { toast, type ToastOptions } from 'react-toastify'

const baseOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'light',
}

/**
 * Translate raw wallet/contract/network errors into friendly one-liners.
 * The full original message is logged to the console for debugging — only
 * the friendly version is shown to the user.
 */
export function friendlyError(err: unknown): string {
  const msg =
    err instanceof Error ? err.message
    : typeof err === 'string' ? err
    : 'Something went wrong.'

  const lower = msg.toLowerCase()

  // Wallet rejections (most common — happens when user clicks "Reject")
  if (
    lower.includes('user rejected') ||
    lower.includes('user denied') ||
    lower.includes('rejected the request') ||
    lower.includes('userrejectedrequest') ||
    lower.includes('action_rejected')
  ) {
    return 'Transaction cancelled.'
  }

  // Insufficient gas
  if (
    lower.includes('insufficient funds') ||
    lower.includes('exceeds the balance of the account')
  ) {
    return 'Not enough Sepolia ETH for gas. Get some from a faucet and try again.'
  }

  // USDC-specific
  if (lower.includes('erc20: transfer amount exceeds allowance') || lower.includes('insufficient allowance')) {
    return 'USDC spend not approved for this contract yet.'
  }
  if (lower.includes('erc20: transfer amount exceeds balance')) {
    return 'Not enough USDC. Mint testnet USDC at faucet.circle.com.'
  }

  // Contract reverts with a message — surface that
  const revertMatch = msg.match(/reverted with the following reason:\s*([^\n]+)/i)
  if (revertMatch) return `Reverted: ${revertMatch[1].trim()}`

  // Specific named errors from EscrowPlatform / DisputeDAO
  const namedRevert = msg.match(/reverted with the following signature:[^()]+\(([A-Z][A-Za-z]+)\)/)
  if (namedRevert) {
    const name = namedRevert[1]
    const known: Record<string, string> = {
      AlreadyApplied: "You've already applied to this job.",
      WrongJobStatus: 'This action is not allowed for the job\'s current status.',
      WrongMilestoneStatus: 'This action is not allowed for the milestone\'s current status.',
      NotClient: 'Only the client can do that.',
      NotFreelancer: 'Only the assigned freelancer can do that.',
      ApplicantNotFound: 'That applicant is not on this job.',
      FreelancerIsBanned: 'This freelancer has been banned from the platform.',
      EmptyMilestones: 'You must add at least one milestone.',
      ZeroAmount: 'Amount must be greater than zero.',
      InvalidDeadline: 'Deadline must be in the future.',
      MilestoneSumExceedsBudget: 'Milestone amounts exceed the deposit budget.',
      RescueConditionsUnmet: 'Conditions for rescue refund are not met yet.',
      AlreadyVoted: "You've already voted on this dispute.",
      InvalidVote: 'Vote must be 1 (client) or 2 (freelancer).',
      NotAssignedArbitrator: 'You are not assigned to this dispute.',
      VotingClosed: 'The voting period has ended.',
      VotingStillOpen: 'Wait until the voting period ends to resolve.',
      DisputeNotFound: 'That dispute does not exist.',
    }
    if (known[name]) return known[name]
    return `Reverted: ${name}.`
  }

  // Network / RPC issues
  if (lower.includes('failed to fetch') || lower.includes('network request failed')) {
    return 'Network error. Check your connection and try again.'
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'Request timed out. The network may be slow — try again.'
  }
  if (lower.includes('429') || lower.includes('too many requests')) {
    return 'Rate limit hit. Wait a few seconds and try again.'
  }

  // Pinata / IPFS
  if (lower.includes('pinata')) return 'IPFS upload failed. Check your Pinata key and try again.'

  // API errors from our own backend (api.ts throws "API NNN: ...")
  const apiMatch = msg.match(/^API (\d{3}):\s*(.*)$/)
  if (apiMatch) {
    const status = apiMatch[1]
    if (status === '500') return 'Backend hiccup. Try again — it usually clears up.'
    if (status === '400') return apiMatch[2] || 'Invalid request.'
    return apiMatch[2] || 'Backend error.'
  }

  // Last-ditch: keep it short
  const firstLine = msg.split('\n')[0].trim()
  if (firstLine.length > 140) return firstLine.slice(0, 140) + '…'
  return firstLine || 'Something went wrong.'
}

export function toastError(err: unknown, fallback?: string): void {
  // Always log the raw error so we can debug — only show friendly text.
  console.error(err)
  const message = err ? friendlyError(err) : fallback || 'Something went wrong.'
  toast.error(message, baseOptions)
}

export function toastSuccess(message: string): void {
  toast.success(message, baseOptions)
}

export function toastInfo(message: string): void {
  toast.info(message, baseOptions)
}
