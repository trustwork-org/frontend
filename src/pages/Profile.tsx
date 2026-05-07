import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePrivy, useWallets, useExportWallet } from '@privy-io/react-auth'
import { EXPLORER } from '../contracts'
import { useAuth } from '../context/AuthContext'
import { useProfile, type ProfileMetadata } from '../hooks/useProfile'
import { useSaveProfile } from '../hooks/useSaveProfile'
import { formatUSDC } from '../hooks/useUSDC'
import { shortAddress } from '../utils/format'
import { toastError } from '../lib/toast'

const TIERS = [
  { jobs: 5, name: 'Rising Talent' },
  { jobs: 20, name: 'Established Pro' },
  { jobs: 50, name: 'Expert' },
  { jobs: 100, name: 'Elite' },
  { jobs: 250, name: 'Legend' },
]

function initials(name: string | undefined, addr: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map(p => p[0]?.toUpperCase() || '').join('') || addr.slice(2, 4).toUpperCase()
  }
  return addr.slice(2, 4).toUpperCase()
}

/**
 * For social/email sign-ins, Privy generates a fresh embedded wallet keypair
 * for the user. Without exporting the private key, that wallet is locked into
 * Privy's hosted environment — the user cannot move funds via MetaMask or any
 * other client. This section gives them a "Export private key" button that
 * opens Privy's secure modal (rendered in an iframe on a separate domain so
 * our app never sees the key). Hidden for users who signed in with their own
 * external wallet, since they already control their keys.
 */
function WalletExportSection() {
  const { wallets } = useWallets()
  const { exportWallet } = useExportWallet()
  const hasEmbedded = wallets.some(w => w.connectorType === 'embedded')

  if (!hasEmbedded) return null

  const handleExport = async () => {
    try { await exportWallet() } catch (err) { toastError(err, 'Could not open export modal') }
  }

  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
      <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">
        Wallet recovery
      </div>
      <div className="text-[13px] text-[#6b6b6b] mb-3 leading-relaxed">
        Your wallet was created automatically when you signed in with email or Google. Export your private key any time to import it into MetaMask, Rabby, or any other wallet — that gives you full control of your funds even if TrustWork goes away.
      </div>
      <button
        onClick={handleExport}
        className="px-4 py-2 border border-[#1c1c1c] text-[#1c1c1c] rounded-md text-[13px] font-medium hover:bg-[#f7f7f5] transition"
      >
        🔑 Export private key
      </button>
      <div className="text-[11px] text-[#a0a0a0] mt-3 leading-relaxed bg-[#fff8e0] border border-[#f0d0a0] text-[#7c5c00] rounded-md p-2.5">
        <strong>⚠ Treat this like a password.</strong> Anyone with the private key can spend everything in this wallet. Privy shows it in a separate iframe — TrustWork itself never sees the key.
      </div>
    </div>
  )
}

/**
 * For wallet-only sign-ins, the user has no email and so receives no
 * notifications. This section lets them link an email to their Privy account
 * after the fact. Once Privy returns with `user.email.address` populated, the
 * existing AuthContext effect auto-registers them with the backend — no extra
 * plumbing needed.
 */
function EmailNotificationsSection() {
  const { user, linkEmail } = usePrivy()
  const email = user?.email?.address ?? null

  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
      <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">
        Email notifications
      </div>
      {email ? (
        <div>
          <div className="text-[13px] text-[#6b6b6b]">
            <span className="text-[#0d7a00] font-medium">✓ Linked:</span>{' '}
            <span className="text-[#1c1c1c] font-mono">{email}</span>
          </div>
          <div className="text-[11px] text-[#a0a0a0] mt-2 leading-relaxed">
            You'll receive emails when someone applies to your jobs, when milestones are submitted or approved, and when a dispute is opened or resolved.
          </div>
        </div>
      ) : (
        <div>
          <div className="text-[13px] text-[#6b6b6b] mb-3 leading-relaxed">
            Add an email to receive notifications about applications, milestone reviews, and disputes. Without an email, you'll only see updates inside the app.
          </div>
          <button
            onClick={() => linkEmail()}
            className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] transition"
          >
            + Add email
          </button>
          <div className="text-[11px] text-[#a0a0a0] mt-2">
            Privy will send a verification code. Your email is only used for TrustWork notifications.
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileEditor({
  initial,
  alreadyRegistered,
  onSaved,
  onCancel,
}: {
  initial: ProfileMetadata
  alreadyRegistered: boolean
  onSaved: () => void
  onCancel: () => void
}) {
  const { save, step } = useSaveProfile()
  const [name, setName] = useState(initial.name || '')
  const [headline, setHeadline] = useState(initial.headline || '')
  const [bio, setBio] = useState(initial.bio || '')
  const [skillsRaw, setSkillsRaw] = useState((initial.skills || []).join(', '))
  const [portfolioURL, setPortfolioURL] = useState(initial.portfolioURL || '')

  const submitting = step === 'uploading' || step === 'sending'
  const handleSave = async () => {
    const skills = skillsRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    try {
      await save({ name, headline, bio, skills, portfolioURL }, alreadyRegistered)
      onSaved()
    } catch {
      // surfaced via `error`
    }
  }

  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 mb-4">
      <div className="text-[15px] font-semibold mb-3">{alreadyRegistered ? 'Edit profile' : 'Create your profile'}</div>

      <label className="block text-[12px] font-medium mb-1 mt-2">Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Kovacs"
        className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800]" />

      <label className="block text-[12px] font-medium mb-1 mt-3">Headline</label>
      <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Senior Solidity Developer"
        className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800]" />

      <label className="block text-[12px] font-medium mb-1 mt-3">Bio</label>
      <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A short bio about your experience and what you build."
        className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800] resize-y min-h-[100px]" />

      <label className="block text-[12px] font-medium mb-1 mt-3">Skills (comma-separated)</label>
      <input value={skillsRaw} onChange={e => setSkillsRaw(e.target.value)} placeholder="Solidity, TypeScript, IPFS, OpenZeppelin"
        className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800]" />

      <label className="block text-[12px] font-medium mb-1 mt-3">Portfolio URL</label>
      <input value={portfolioURL} onChange={e => setPortfolioURL(e.target.value)} placeholder="https://github.com/yourhandle"
        className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-white outline-none focus:border-[#14a800]" />

      {step === 'uploading' && (
        <div className="text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md px-3 py-2 mt-3">
          Uploading profile JSON to IPFS via Pinata…
        </div>
      )}
      {step === 'sending' && (
        <div className="text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md px-3 py-2 mt-3">
          Saving CID on-chain — confirm in your wallet.
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <button
          disabled={submitting}
          onClick={handleSave}
          className="px-4 py-2 bg-[#14a800] text-white rounded-md text-[13px] font-medium hover:bg-[#0d7a00] disabled:bg-[#a0a0a0]"
        >
          {step === 'uploading' ? 'Uploading…'
            : step === 'sending' ? 'Saving…'
            : alreadyRegistered ? 'Save changes' : 'Create profile'}
        </button>
        <button
          disabled={submitting}
          onClick={onCancel}
          className="px-4 py-2 border border-[#e0e0dc] text-[#6b6b6b] rounded-md text-[13px] hover:border-[#1c1c1c] hover:text-[#1c1c1c] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Profile() {
  const { address: ownAddress } = useAuth()
  const { address: paramAddress } = useParams<{ address: string }>()

  const target = useMemo<`0x${string}` | null>(() => {
    const a = (paramAddress || ownAddress) ?? null
    return a ? (a as `0x${string}`) : null
  }, [paramAddress, ownAddress])

  const { data, loading, refresh } = useProfile(target)
  const isOwn = !!ownAddress && !!target && target.toLowerCase() === ownAddress.toLowerCase()
  const [editing, setEditing] = useState(false)

  // Auto-open the editor for the user's own first-time profile.
  useEffect(() => {
    if (data && isOwn && !data.isRegistered) setEditing(true)
  }, [data, isOwn])

  if (!target) {
    return <div className="max-w-[900px] mx-auto p-6 text-center text-[#a0a0a0] text-[13px]">Sign in to view your profile.</div>
  }

  if (loading || !data) {
    return <div className="max-w-[900px] mx-auto p-6 text-center text-[#a0a0a0] text-[13px]">Loading profile…</div>
  }

  const meta = data.metadata
  const completed = Number(data.escrowJobsCompleted)
  const currentTierIndex = data.tier // 0..5
  const nextTier = TIERS[currentTierIndex] // index 0..4 of TIERS, i.e., next milestone if not at top

  return (
    <div className="max-w-[900px] mx-auto p-4 md:p-6">
      {data.banned && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-[13px]">
          ⚠️ This wallet is permanently banned from applying to jobs.
        </div>
      )}
      {data.flags > 0n && !data.banned && (
        <div className="bg-[#fff2e0] border border-[#f0d0a0] text-[#7c5c00] rounded-lg p-3 mb-3 text-[13px]">
          ⚠️ This wallet has {data.flags.toString()} dispute flag{data.flags === 1n ? '' : 's'}. 3 flags result in a permanent ban.
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-6 flex flex-col sm:flex-row gap-4 mb-4">
        <div className="w-[64px] h-[64px] md:w-[72px] md:h-[72px] rounded-full bg-[#14a800] flex items-center justify-center text-[22px] md:text-[26px] font-bold text-white shrink-0">
          {initials(meta?.name, target)}
        </div>
        <div className="flex-1">
          <div className="text-[20px] md:text-[22px] font-bold mb-1">{meta?.name || 'Anonymous wallet'}</div>
          <div className="text-[13px] md:text-[14px] text-[#6b6b6b] mb-1.5">{meta?.headline || (data.isRegistered ? '' : 'No profile registered yet')}</div>
          <div className="text-[12px] md:text-[13px] text-[#a0a0a0]">
            Wallet: <a href={EXPLORER.address(target)} target="_blank" rel="noopener" className="font-mono hover:underline">{shortAddress(target)}</a>
            {data.registeredAt > 0n && <> · Joined {new Date(Number(data.registeredAt) * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</>}
          </div>
          {currentTierIndex > 0 && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1e1e2d] text-yellow-400 rounded-full text-[11px] md:text-[12px] font-semibold">
                🏅 {data.tierName} — Tier {currentTierIndex} Soulbound NFT
              </span>
              {data.tokenId > 0n && (
                <span className="text-[11px] text-[#a0a0a0] ml-2">Token #{data.tokenId.toString()}</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            <div className="text-[12px] md:text-[13px] text-[#6b6b6b]">
              <strong className="text-[#1c1c1c]">{completed}</strong> jobs completed
            </div>
            <div className="text-[12px] md:text-[13px] text-[#6b6b6b]">
              <strong className="text-[#1c1c1c]">${formatUSDC(data.totalEarnedWei)}</strong> USDC earned
            </div>
            <div className="text-[12px] md:text-[13px] text-[#6b6b6b]">
              <strong className="text-[#1c1c1c]">{data.flags.toString()}</strong> flags
            </div>
            {isOwn && (
              <div className="text-[12px] md:text-[13px] text-[#6b6b6b]">
                <strong className="text-[#14a800]">${formatUSDC(data.usdcBalance)}</strong> USDC in wallet
              </div>
            )}
          </div>
        </div>
        {isOwn && !editing && (
          <button onClick={() => setEditing(true)} className="self-start sm:self-auto px-4 py-2 bg-[#14a800] text-white rounded-lg text-[13px] md:text-[14px] font-medium hover:bg-[#0d7a00] transition-all shrink-0">
            {data.isRegistered ? 'Edit profile' : 'Create profile'}
          </button>
        )}
      </div>

      {/* Editor */}
      {editing && isOwn && (
        <ProfileEditor
          initial={meta || { name: '', headline: '', bio: '', skills: [], portfolioURL: '' }}
          alreadyRegistered={data.isRegistered}
          onSaved={() => {
            setEditing(false)
            refresh()
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* Email notifications — only on your own profile */}
      {isOwn && <EmailNotificationsSection />}
      {isOwn && <WalletExportSection />}

      {/* About */}
      {meta?.bio && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
          <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">About</div>
          <div className="text-[13px] md:text-[14px] text-[#6b6b6b] leading-relaxed whitespace-pre-wrap">{meta.bio}</div>
        </div>
      )}

      {/* Skills */}
      {meta?.skills && meta.skills.length > 0 && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
          <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">Skills</div>
          <div>
            {meta.skills.map(s => (
              <span key={s} className="inline-block px-2.5 py-1 bg-[#f7f7f5] border border-[#e0e0dc] rounded-full text-[11px] md:text-[12px] text-[#6b6b6b] m-0.5">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio */}
      {meta?.portfolioURL && (
        <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 mb-3">
          <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">Portfolio</div>
          <a href={meta.portfolioURL} target="_blank" rel="noopener" className="text-[13px] text-[#14a800] hover:underline break-all">
            {meta.portfolioURL}
          </a>
        </div>
      )}

      {/* Reputation tiers */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5">
        <div className="text-[14px] md:text-[15px] font-semibold mb-3 pb-2.5 border-b border-[#e0e0dc]">Reputation tiers</div>
        <div className="overflow-x-auto">
          <div className="flex border border-[#e0e0dc] rounded-lg overflow-hidden mb-3 min-w-[360px]">
            {TIERS.map(({ jobs, name }, i) => {
              const tierIndex = i + 1
              const earned = currentTierIndex >= tierIndex
              const isCurrent = currentTierIndex === tierIndex
              const isNext = !earned && (currentTierIndex === i)
              return (
                <div
                  key={name}
                  className={`flex-1 text-center py-2.5 ${i < TIERS.length - 1 ? 'border-r border-[#e0e0dc]' : ''} ${isCurrent ? 'bg-[#e6f4e1]' : 'bg-white'} ${!earned && !isNext ? 'opacity-40' : ''}`}
                >
                  <div className={`text-[16px] md:text-[18px] font-bold ${isCurrent ? 'text-[#14a800]' : ''}`}>{jobs}</div>
                  <div className={`text-[10px] md:text-[11px] ${isCurrent ? 'text-[#0d7a00]' : 'text-[#a0a0a0]'}`}>
                    {name}{isCurrent ? ' ←' : ''}
                  </div>
                  <div className={`text-[10px] md:text-[11px] mt-0.5 ${earned ? 'text-[#14a800]' : 'text-[#a0a0a0]'}`}>
                    {earned ? '✓ Earned' : isNext ? `${completed}/${jobs}` : 'Locked'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="text-[11px] text-[#a0a0a0] leading-relaxed">
          {nextTier
            ? `Soulbound NFTs are non-transferable. Each tier upgrade burns the old NFT and mints a new one. ${nextTier.jobs - completed} more job${nextTier.jobs - completed === 1 ? '' : 's'} until ${nextTier.name}.`
            : 'You have reached the top tier. Soulbound NFTs are non-transferable and live on your wallet forever.'}
        </div>
      </div>
    </div>
  )
}
