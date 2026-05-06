const JWT = import.meta.env.VITE_PINATA_JWT
const GATEWAY = import.meta.env.VITE_PINATA_GATEWAY

function assertConfigured() {
  if (!JWT) throw new Error('VITE_PINATA_JWT is not set')
}

export interface PinResult {
  cid: string
  url: string
}

export function ipfsUrl(cid: string): string {
  if (!cid) return ''
  if (cid.startsWith('ipfs://')) cid = cid.slice('ipfs://'.length)
  const host = GATEWAY || 'gateway.pinata.cloud'
  return `https://${host}/ipfs/${cid}`
}

export async function pinFile(file: File, name?: string): Promise<PinResult> {
  assertConfigured()
  const form = new FormData()
  form.append('file', file)
  if (name) form.append('pinataMetadata', JSON.stringify({ name }))

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Pinata file upload failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { IpfsHash: string }
  return { cid: data.IpfsHash, url: ipfsUrl(data.IpfsHash) }
}

export async function pinJSON(json: unknown, name?: string): Promise<PinResult> {
  assertConfigured()
  const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: json,
      ...(name ? { pinataMetadata: { name } } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Pinata JSON upload failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { IpfsHash: string }
  return { cid: data.IpfsHash, url: ipfsUrl(data.IpfsHash) }
}

export async function fetchJSON<T = unknown>(cid: string): Promise<T> {
  const res = await fetch(ipfsUrl(cid))
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`)
  return res.json() as Promise<T>
}
