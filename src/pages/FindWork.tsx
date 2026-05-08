import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CATEGORY_LABEL, type JobCategory } from '../contracts'
import { useJobs } from '../hooks/useJobs'
import { formatUSDC } from '../utils/usdc'
import { timeAgo, formatDeadline } from '../utils/format'

const TOP_CATS: (JobCategory | 'All')[] = [
  'All',
  'SMART_CONTRACT_DEVELOPMENT',
  'WEB_DEVELOPMENT',
  'MOBILE_DEVELOPMENT',
  'UI_UX_DESIGN',
  'CONTENT_WRITING',
  'DATA_SCIENCE',
]

export default function FindWork() {
  const navigate = useNavigate()
  const { jobs, loading } = useJobs()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<JobCategory | 'All'>('All')

  const openJobs = useMemo(() => {
    if (!jobs) return []
    return jobs
      .filter(j => j.status === 'OPEN')
      .filter(j => cat === 'All' || j.category === cat)
      .filter(j => {
        if (!search) return true
        const q = search.toLowerCase()
        return j.title.toLowerCase().includes(q) || j.description.toLowerCase().includes(q)
      })
  }, [jobs, search, cat])

  // Always navigate to /app — ProtectedRoute redirects to /signin if not
  // authed, then back to /app after login. Public page is Privy-free.
  const handleApply = () => navigate('/app')

  return (
    <div className="bg-[#f7f7f5] min-h-screen">
      <div className="bg-white border-b border-[#e0e0dc] py-10 px-4 md:px-8 text-center">
        <h1 className="text-[28px] md:text-[36px] font-bold text-[#1c1c1c] mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Find Work
        </h1>
        <p className="text-[15px] text-[#6b6b6b] max-w-[500px] mx-auto mb-6">
          Browse open jobs from verified clients. Funds are already locked in escrow — you get paid the moment your milestone is approved.
        </p>
        <div className="max-w-[520px] mx-auto relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-[#e0e0dc] rounded-full text-[14px] outline-none bg-white focus:border-[#14a800] shadow-sm"
            placeholder="Search by title or description..."
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a0a0a0]">🔍</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-6">
        <div className="flex gap-2 flex-wrap mb-5">
          {TOP_CATS.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${cat === c ? 'bg-[#14a800] text-white' : 'bg-white border border-[#e0e0dc] text-[#6b6b6b] hover:border-[#14a800] hover:text-[#14a800]'}`}
            >
              {c === 'All' ? 'All' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <span className="text-[14px] text-[#6b6b6b]">
            {loading ? 'Loading…' : `${openJobs.length} open job${openJobs.length === 1 ? '' : 's'}`}
          </span>
          <Link to="/signin" className="text-[13px] text-[#14a800] font-medium hover:underline">
            Sign in to apply →
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-[#a0a0a0] text-[13px] py-12">Loading jobs from chain…</div>
        ) : openJobs.length === 0 ? (
          <div className="bg-white border border-[#e0e0dc] rounded-2xl p-8 text-center">
            <div className="text-[16px] font-semibold mb-1">No open jobs right now</div>
            <div className="text-[13px] text-[#6b6b6b]">
              Check back soon, or <Link to="/app/post" className="text-[#14a800] hover:underline">post your own job</Link>.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {openJobs.map(job => (
              <div key={job.jobId.toString()} className="bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 hover:border-[#14a800] hover:shadow-[0_4px_16px_rgba(20,168,0,0.07)] transition-all">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d7a00] bg-[#e6f4e1] px-1.5 py-0.5 rounded-full">
                      ✓ Funded escrow
                    </span>
                    <div className="text-[15px] md:text-[16px] font-semibold leading-snug mt-1">{job.title}</div>
                  </div>
                  <div className="text-[15px] font-semibold text-[#14a800] shrink-0">{formatUSDC(job.milestoneSum)} USDC</div>
                </div>

                <div className="flex gap-2 flex-wrap mb-2.5 text-[11px] md:text-[12px] text-[#a0a0a0]">
                  <span>🕐 {timeAgo(job.createdAt)}</span>
                  <span>📋 {CATEGORY_LABEL[job.category]}</span>
                  <span>🏗 {job.milestones.length} milestone{job.milestones.length === 1 ? '' : 's'}</span>
                  <span>⏳ Due {formatDeadline(job.deadline)}</span>
                </div>

                {job.description && (
                  <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3 line-clamp-2">{job.description}</p>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-3 border-t border-[#e0e0dc]">
                  <span className="text-[11px] text-[#a0a0a0]">Job #{job.jobId.toString()}</span>
                  <button
                    onClick={handleApply}
                    className="px-5 py-2 bg-[#14a800] text-white rounded-full text-[13px] font-medium hover:bg-[#0d7a00] transition-all self-start sm:self-auto"
                  >
                    View &amp; apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-white border border-[#e0e0dc] rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[20px] font-bold mb-2">Ready to apply?</div>
          <p className="text-[14px] text-[#6b6b6b] mb-5">Create your account in seconds. Sign in with Google or connect your wallet — no setup required.</p>
          <Link to="/signin" className="inline-block px-8 py-3 bg-[#14a800] text-white rounded-full text-[14px] font-semibold hover:bg-[#0d7a00] transition-all">
            Sign in to apply →
          </Link>
        </div>
      </div>
    </div>
  )
}
