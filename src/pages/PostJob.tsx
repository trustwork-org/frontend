import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORY_LABEL, EXPLORER, JOB_CATEGORY, type JobCategory } from '../contracts'
import { useCreateJob, computeDepositAmount } from '../hooks/useCreateJob'
import { formatUSDC, parseUSDC, useUSDC } from '../hooks/useUSDC'
import { useAuth } from '../context/AuthContext'

interface MilestoneRow {
  id: number
  desc: string
  amount: string
}

const inp = 'w-full px-3 py-2 border border-[#e0e0dc] rounded-md text-[13px] outline-none bg-white focus:border-[#14a800] transition-colors'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[13px] font-medium mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-[#a0a0a0] mt-1">{hint}</div>}
    </div>
  )
}

function FeeRow({ label, value, valueClass = 'text-[#6b6b6b]', total = false }: {
  label: string; value: string; valueClass?: string; total?: boolean
}) {
  return (
    <div className={`flex justify-between text-[13px] py-0.5 ${total ? 'border-t border-[#e0e0dc] mt-2 pt-2 font-semibold text-[#1c1c1c]' : 'text-[#6b6b6b]'}`}>
      <span>{label}</span><span className={valueClass}>{value}</span>
    </div>
  )
}

export default function PostJob() {
  const navigate = useNavigate()
  const { isAuthed } = useAuth()
  const { balance } = useUSDC()
  const { create, step, error, jobId, txHash, reset } = useCreateJob()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<JobCategory>('SMART_CONTRACT_DEVELOPMENT')
  const [deadline, setDeadline] = useState('')
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { id: 1, desc: '', amount: '500' },
    { id: 2, desc: '', amount: '800' },
  ])
  const [nextId, setNextId] = useState(3)

  const milestoneSumWei = useMemo(
    () => milestones.reduce((s, m) => s + parseUSDC(m.amount || '0'), 0n),
    [milestones],
  )
  const depositAmountWei = useMemo(() => computeDepositAmount(milestoneSumWei), [milestoneSumWei])
  const clientFeeWei = depositAmountWei - milestoneSumWei

  const add = () => {
    setMilestones(p => [...p, { id: nextId, desc: '', amount: '0' }])
    setNextId(n => n + 1)
  }
  const remove = (id: number) => setMilestones(p => p.filter(m => m.id !== id))
  const update = (id: number, field: keyof Omit<MilestoneRow, 'id'>, value: string) =>
    setMilestones(p => p.map(m => (m.id === id ? { ...m, [field]: value } : m)))

  const insufficient = balance !== null && balance < depositAmountWei
  const formInvalid =
    !title.trim() ||
    !deadline ||
    milestones.length === 0 ||
    milestones.some(m => !m.desc.trim() || parseUSDC(m.amount || '0') <= 0n)

  const submitting = step === 'approving' || step === 'creating'
  const submit = async () => {
    if (!isAuthed) {
      navigate('/signin')
      return
    }
    try {
      const id = await create({
        title: title.trim(),
        description: description.trim(),
        category,
        deadline: new Date(deadline),
        milestones: milestones.map(m => ({ description: m.desc.trim(), amountUsdc: m.amount })),
      })
      if (id !== null && id !== undefined) {
        // route to dashboard for now — job detail page lands in milestone 5
        setTimeout(() => navigate('/app/dashboard'), 1500)
      }
    } catch {
      // surfaced via `error` state
    }
  }

  return (
    <div className="max-w-[720px] mx-auto p-4 md:p-6">
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-7 mb-4">
        <div className="text-[18px] md:text-[20px] font-bold mb-1.5">Post a job</div>
        <div className="text-[13px] text-[#6b6b6b] mb-5">
          Funds are locked in a smart contract. Full refund if cancelled before a freelancer is approved.
        </div>

        <Field label="Job title">
          <input
            className={inp}
            placeholder="e.g. Solidity Developer for DeFi Escrow Contract"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Category">
          <select className={inp} value={category} onChange={e => setCategory(e.target.value as JobCategory)}>
            {JOB_CATEGORY.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea
            className={`${inp} min-h-[100px] resize-y`}
            placeholder="Describe the work, deliverables, and technical requirements..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Deadline" hint="If deadline passes with no submitted milestones, you can call rescueClientRefund after 30 days.">
          <input className={inp} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
        </Field>

        <div className="mb-4">
          <label className="block text-[13px] font-medium mb-2">Milestones</label>
          {milestones.map((m, i) => (
            <div key={m.id} className="mb-3 p-3 border border-[#e0e0dc] rounded-lg bg-[#f7f7f5]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-medium text-[#6b6b6b]">Milestone {i + 1}</span>
                {milestones.length > 1 && (
                  <button onClick={() => remove(m.id)} className="text-[#a0a0a0] hover:text-red-500 text-[13px] transition-colors">✕ Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                <input className={inp} placeholder="Description" value={m.desc} onChange={e => update(m.id, 'desc', e.target.value)} />
                <input className={inp} type="number" min="0" step="0.01" placeholder="Amount (USDC)" value={m.amount} onChange={e => update(m.id, 'amount', e.target.value)} />
              </div>
            </div>
          ))}
          <button onClick={add} className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#e0e0dc] rounded-md text-[13px] text-[#6b6b6b] w-full hover:border-[#14a800] hover:text-[#14a800] transition-all">
            + Add milestone
          </button>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="bg-white border border-[#e0e0dc] rounded-xl p-5 md:p-7">
        <div className="text-[16px] font-bold mb-4">Fee breakdown</div>
        <div className="bg-[#f7f7f5] border border-[#e0e0dc] rounded-lg px-4 py-3.5">
          <FeeRow label="Milestone budget" value={`${formatUSDC(milestoneSumWei)} USDC`} />
          <FeeRow label="Client fee (2%)" value={`+${formatUSDC(clientFeeWei)} USDC`} valueClass="text-[#6b6b6b]" />
          <FeeRow label="You deposit now" value={`${formatUSDC(depositAmountWei)} USDC`} total />
        </div>
        <div className="text-[11px] text-[#a0a0a0] mt-2.5 leading-relaxed">
          Freelancer fee (8%) deducted per milestone on approval. Full deposit refunded if you cancel before approving a freelancer.
        </div>

        {balance !== null && (
          <div className="text-[11px] text-[#6b6b6b] mt-2.5">
            Your USDC balance: <span className="font-medium">{formatUSDC(balance)} USDC</span>
          </div>
        )}
        {insufficient && (
          <div className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            Insufficient USDC. Mint testnet USDC at <a href="https://faucet.circle.com" target="_blank" rel="noopener" className="underline">faucet.circle.com</a> (Ethereum Sepolia).
          </div>
        )}

        {step === 'approving' && (
          <div className="mt-3 text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md px-3 py-2">
            Approving USDC spend… confirm in your wallet.
          </div>
        )}
        {step === 'creating' && (
          <div className="mt-3 text-[12px] text-[#6b6b6b] bg-[#f7f7f5] border border-[#e0e0dc] rounded-md px-3 py-2">
            Creating job on-chain… {txHash && <a href={EXPLORER.tx(txHash)} target="_blank" rel="noopener" className="underline">view tx</a>}
          </div>
        )}
        {step === 'success' && jobId !== null && (
          <div className="mt-3 text-[12px] text-[#0d7a00] bg-[#e6f4e1] border border-[#c4e3b8] rounded-md px-3 py-2">
            Job #{jobId.toString()} created. {txHash && <a href={EXPLORER.tx(txHash)} target="_blank" rel="noopener" className="underline">view tx</a>} · Redirecting…
          </div>
        )}
        {step === 'error' && error && (
          <div className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error} <button onClick={reset} className="underline ml-1">dismiss</button>
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || formInvalid || insufficient}
          className="w-full mt-4 py-3 bg-[#14a800] text-white rounded-lg text-[14px] font-medium hover:bg-[#0d7a00] transition-all disabled:bg-[#a0a0a0] disabled:cursor-not-allowed"
        >
          {step === 'approving' ? 'Approving USDC…'
            : step === 'creating' ? 'Posting job…'
            : 'Deposit & Post Job →'}
        </button>
      </div>
    </div>
  )
}
