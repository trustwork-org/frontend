import { USDC_DECIMALS } from '../contracts'

/**
 * Pure, dependency-free USDC helpers. Kept separate from hooks/useUSDC so
 * public marketing pages (FindWork, etc.) can import these without dragging
 * the React hook — and its Privy dependency — into their bundle. Privy is
 * ~915 KB gzipped, so this split has real first-paint impact.
 */

export function parseUSDC(human: string | number): bigint {
  const s = typeof human === 'number' ? human.toString() : human
  if (!s) return 0n
  const [whole, frac = ''] = s.split('.')
  const fracPadded = (frac + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS)
  return BigInt(whole || '0') * 10n ** BigInt(USDC_DECIMALS) + BigInt(fracPadded || '0')
}

export function formatUSDC(amount: bigint, fractionDigits = 2): string {
  const negative = amount < 0n
  const abs = negative ? -amount : amount
  const base = 10n ** BigInt(USDC_DECIMALS)
  const whole = abs / base
  const frac = abs % base
  const fracStr = frac.toString().padStart(USDC_DECIMALS, '0').slice(0, fractionDigits)
  const wholeStr = whole.toString()
  const formatted = fractionDigits > 0 ? `${wholeStr}.${fracStr}` : wholeStr
  return negative ? `-${formatted}` : formatted
}
