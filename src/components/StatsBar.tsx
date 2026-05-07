import { useLandingStats, formatUsdcShort } from '../hooks/useLandingStats'

/**
 * Sticky on-chain stats bar shown beneath the navbar on every app page.
 * Pulls live values from the deployed contracts via useLandingStats; falls
 * back to em-dashes during the initial multicall load. Fees are constants
 * baked into the contract code, so they're shown directly.
 */
export default function StatsBar() {
  const { stats } = useLandingStats()

  const rows = [
    { num: stats ? formatUsdcShort(stats.totalEscrowedUsdc) : '—', label: 'Escrowed' },
    { num: stats ? stats.jobsPosted.toString() : '—', label: 'Jobs posted' },
    { num: stats ? stats.arbitrators.toString() : '—', label: 'Arbitrators' },
    { num: '2%', label: 'Client Fee' },
    { num: '8%', label: 'Freelancer Fee' },
  ]

  return (
    <div className="bg-[#1e1e2d] text-white px-4 md:px-6 py-2.5 flex flex-wrap gap-x-6 gap-y-1 items-center text-[13px]">
      <span className="hidden md:block flex-1 text-[#aaa] text-[12px]">
        Smart contract escrow · Ethereum Sepolia · Live on-chain stats
      </span>
      {rows.map(({ num, label }) => (
        <div key={label} className="flex flex-col items-center shrink-0">
          <span className="text-[16px] md:text-[18px] font-semibold text-[#14a800]">{num}</span>
          <span className="text-[9px] md:text-[10px] text-[#999] uppercase tracking-wide">{label}</span>
        </div>
      ))}
    </div>
  )
}
