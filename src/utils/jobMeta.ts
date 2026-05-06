/**
 * The on-chain Job has no separate title/description fields — only milestone
 * descriptions. We encode the job-level title and description as a JSON header
 * inside milestones[0].description, separated from the actual milestone text
 * by a newline-delimited fence:
 *
 *     {"t":"Audit smart contract","d":"Full review of EscrowPlatform"}
 *     ---
 *     Build test harness and review architecture
 *
 * Decoding falls back gracefully — if the first line isn't valid JSON, the
 * entire description is treated as the milestone text and title/description
 * are left empty.
 */

const FENCE = '\n---\n'

export interface JobMeta {
  title: string
  description: string
}

export function encodeFirstMilestone(meta: JobMeta, milestoneText: string): string {
  const header = JSON.stringify({ t: meta.title, d: meta.description })
  return `${header}${FENCE}${milestoneText}`
}

export function decodeFirstMilestone(raw: string): { meta: JobMeta; milestoneText: string } {
  const idx = raw.indexOf(FENCE)
  if (idx === -1) return { meta: { title: '', description: '' }, milestoneText: raw }
  const header = raw.slice(0, idx)
  const milestoneText = raw.slice(idx + FENCE.length)
  try {
    const parsed = JSON.parse(header) as { t?: string; d?: string }
    return {
      meta: { title: parsed.t || '', description: parsed.d || '' },
      milestoneText,
    }
  } catch {
    return { meta: { title: '', description: '' }, milestoneText: raw }
  }
}
