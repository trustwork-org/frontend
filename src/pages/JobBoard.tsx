import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATEGORY_LABEL, JOB_CATEGORY, type JobCategory, type JobStatus } from '../contracts'
import { useJobs } from '../hooks/useJobs'
import { formatUSDC } from '../hooks/useUSDC'
import { timeAgo, formatDeadline } from '../utils/format'
import type { Job } from '../types/job'

const STATUS_LABEL: Record<JobStatus, string> = {
  OPEN: 'Open',
  ACTIVE: 'In progress',
  DISPUTED: 'Disputed',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}

const STATUS_TONE: Record<JobStatus, string> = {
  OPEN: 'text-[#0d7a00] bg-[#e6f4e1]',
  ACTIVE: 'text-[#0066c0] bg-[#e6f0fa]',
  DISPUTED: 'text-[#b25600] bg-[#fff2e0]',
  COMPLETED: 'text-[#6b6b6b] bg-[#f0f0ed]',
  CLOSED: 'text-[#6b6b6b] bg-[#f0f0ed]',
  CANCELLED: 'text-[#6b6b6b] bg-[#f0f0ed]',
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e0e0dc] rounded-xl p-4">
      <div className="text-[11px] font-semibold text-[#6b6b6b] mb-3 uppercase tracking-wide">{title}</div>
      {children}
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link
      to={`/app/jobs/${job.jobId.toString()}`}
      className="block bg-white border border-[#e0e0dc] rounded-xl p-4 md:p-5 cursor-pointer transition-all mb-2.5 hover:border-[#14a800] hover:shadow-[0_4px_16px_rgba(20,168,0,0.08)]"
    >
      <div className="flex justify-between items-start mb-2 gap-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_TONE[job.status]}`}>
            {STATUS_LABEL[job.status]}
          </span>
          <div className="text-[15px] md:text-[16px] font-semibold leading-snug mt-1.5 truncate">{job.title}</div>
        </div>
        <div className="text-[14px] md:text-[15px] font-semibold text-[#14a800] shrink-0">
          {formatUSDC(job.milestoneSum)} USDC
        </div>
      </div>
      <div className="flex gap-2 md:gap-3.5 mb-2.5 flex-wrap">
        <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">🕐 {timeAgo(job.createdAt)}</span>
        <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">📋 {CATEGORY_LABEL[job.category]}</span>
        <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">🏗 {job.milestones.length} milestone{job.milestones.length === 1 ? '' : 's'}</span>
        <span className="text-[11px] md:text-[12px] text-[#a0a0a0]">⏳ Due {formatDeadline(job.deadline)}</span>
      </div>
      {job.description && (
        <p className="text-[13px] text-[#6b6b6b] leading-relaxed mb-3 line-clamp-2">{job.description}</p>
      )}
    </Link>
  )
}

export default function JobBoard() {
  const { jobs, loading, error, refresh } = useJobs()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'open' | 'active' | 'all'>('open')
  const [categoryFilter, setCategoryFilter] = useState<Set<JobCategory>>(new Set())

  const filtered = useMemo(() => {
    if (!jobs) return []
    return jobs.filter(j => {
      if (statusFilter === 'open' && j.status !== 'OPEN') return false
      if (statusFilter === 'active' && j.status !== 'ACTIVE') return false
      if (categoryFilter.size > 0 && !categoryFilter.has(j.category)) return false
      if (search) {
        const q = search.toLowerCase()
        if (!j.title.toLowerCase().includes(q) && !j.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [jobs, statusFilter, categoryFilter, search])

  const toggleCategory = (cat: JobCategory) => {
    setCategoryFilter(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-3 md:hidden">
        <span className="text-[14px] text-[#6b6b6b]">{filtered.length} jobs</span>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="px-3 py-1.5 border border-[#e0e0dc] rounded-lg text-[13px] text-[#6b6b6b] hover:border-[#14a800] hover:text-[#14a800] transition-all"
        >
          {filtersOpen ? 'Hide filters ✕' : 'Filters ⚙'}
        </button>
      </div>

      <div className="md:grid md:grid-cols-[260px_1fr] md:gap-5">
        <aside className={`flex flex-col gap-3.5 mb-4 md:mb-0 ${filtersOpen ? 'flex' : 'hidden md:flex'}`}>
          <FilterCard title="Search">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] bg-[#f7f7f5] outline-none focus:border-[#14a800] focus:bg-white"
              placeholder="Title, description..."
            />
          </FilterCard>
          <FilterCard title="Status">
            {([
              ['open', 'Open jobs'],
              ['active', 'In progress'],
              ['all', 'All'],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-[13px] text-[#6b6b6b] cursor-pointer py-0.5 hover:text-[#1c1c1c]">
                <input
                  type="radio"
                  name="status"
                  checked={statusFilter === value}
                  onChange={() => setStatusFilter(value)}
                  className="accent-[#14a800] w-3.5 h-3.5"
                />
                {label}
              </label>
            ))}
          </FilterCard>
          <FilterCard title="Category">
            <div className="max-h-[260px] overflow-y-auto pr-1">
              {JOB_CATEGORY.map(cat => (
                <label key={cat} className="flex items-center gap-2 text-[13px] text-[#6b6b6b] cursor-pointer py-0.5 hover:text-[#1c1c1c]">
                  <input
                    type="checkbox"
                    checked={categoryFilter.has(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="accent-[#14a800] w-3.5 h-3.5"
                  />
                  {CATEGORY_LABEL[cat]}
                </label>
              ))}
            </div>
          </FilterCard>
        </aside>

        <main>
          <div className="hidden md:flex justify-between items-center mb-3">
            <span className="text-[14px] text-[#6b6b6b]">
              {loading ? 'Loading…' : `${filtered.length} job${filtered.length === 1 ? '' : 's'}`}
            </span>
            <button
              onClick={refresh}
              className="text-[12px] text-[#14a800] hover:underline"
            >
              Refresh ↻
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-3 text-[13px] mb-3">
              Failed to load jobs: {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-[#a0a0a0] text-[13px] py-12">Loading jobs from chain…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="bg-white border border-[#e0e0dc] rounded-xl p-8 text-center">
              <div className="text-[15px] font-semibold text-[#1c1c1c] mb-1">No jobs match your filters</div>
              <div className="text-[13px] text-[#6b6b6b]">
                {jobs && jobs.length === 0
                  ? 'Be the first to post a job on TrustWork.'
                  : 'Try adjusting your search, status, or category filters.'}
              </div>
            </div>
          )}

          {filtered.map(job => <JobCard key={job.jobId.toString()} job={job} />)}
        </main>
      </div>
    </div>
  )
}
