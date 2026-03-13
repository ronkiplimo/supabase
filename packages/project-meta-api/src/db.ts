import { createCipheriv, createHash, randomBytes } from 'crypto'
import postgres from 'postgres'
import { getToolContext } from './tools/context.js'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('Missing DATABASE_URL environment variable')

export const sql = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  connect_timeout: 10,
  ssl: false,
})

// ---------------------------------------------------------------------------
// Project database queries
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:8000'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''
const PG_META_CRYPTO_KEY = process.env.PG_META_CRYPTO_KEY ?? 'SAMPLE_KEY'

// IS_PLATFORM: project ref + PAT. The platform injects these per-instance.
// Leave unset for self-hosted.
export const PROJECT_REF = process.env.PROJECT_REF ?? null
const SUPABASE_API_URL = process.env.SUPABASE_API_URL ?? 'https://api.supabase.com'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? null

// ---------------------------------------------------------------------------
// Self-hosted: build x-connection-encrypted from DATABASE_URL.
// Replicates CryptoJS.AES.encrypt(connString, PG_META_CRYPTO_KEY).toString()
// ---------------------------------------------------------------------------

function cryptoJsAesEncrypt(text: string, passphrase: string): string {
  const salt = randomBytes(8)
  let derived = Buffer.alloc(0)
  let prev = Buffer.alloc(0)
  while (derived.length < 48) {
    prev = createHash('md5').update(Buffer.concat([prev, Buffer.from(passphrase), salt])).digest()
    derived = Buffer.concat([derived, prev])
  }
  const cipher = createCipheriv('aes-256-cbc', derived.subarray(0, 32), derived.subarray(32, 48))
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  return Buffer.concat([Buffer.from('Salted__'), salt, encrypted]).toString('base64')
}

const SELF_HOSTED_CONNECTION_ENCRYPTED = cryptoJsAesEncrypt(
  DATABASE_URL.replace(/\/project_meta(\?|$)/, '/postgres$1'),
  PG_META_CRYPTO_KEY
)

// ---------------------------------------------------------------------------

export async function executeProjectQuery<T = Record<string, unknown>>(
  query: string
): Promise<T[]> {
  // IS_PLATFORM: call the Management API database query endpoint.
  // Mirrors the pattern used by monitoring.ts tools:
  //   - userToken (user's platform JWT) for chat requests
  //   - SUPABASE_ACCESS_TOKEN (PAT) as fallback for background runners (rules/tasks)
  if (PROJECT_REF) {
    const { userToken } = getToolContext()
    const authToken = userToken ?? SUPABASE_ACCESS_TOKEN
    if (!authToken) throw new Error('No auth token available for project query (set SUPABASE_ACCESS_TOKEN for background runners)')

    const response = await fetch(`${SUPABASE_API_URL}/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`pg-meta query failed (${response.status}): ${text}`)
    }

    return response.json() as Promise<T[]>
  }

  // Self-hosted: call pg-meta directly via local Kong.
  const response = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'x-connection-encrypted': SELF_HOSTED_CONNECTION_ENCRYPTED,
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`pg-meta query failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<T[]>
}
