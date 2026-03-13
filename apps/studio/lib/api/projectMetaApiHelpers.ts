import type { JwtPayload } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

import { constructHeaders } from 'lib/api/apiHelpers'
import { PROJECT_META_API_URL } from 'lib/constants'

export function projectMetaApiUrl(path: string, query?: URLSearchParams): string {
  const base = `${PROJECT_META_API_URL}/api/${path}`
  const qs = query?.toString()
  return qs ? `${base}?${qs}` : base
}

export function projectMetaApiHeaders(
  req: NextApiRequest,
  claims?: JwtPayload
): Record<string, string> {
  const headers = constructHeaders(req.headers) as Record<string, string>
  headers['Content-Type'] = 'application/json'
  const existingAuthorization =
    headers['Authorization'] ??
    headers['authorization'] ??
    (typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined)
  const userId = claims?.sub ?? extractUserIdFromRequest(req)

  if (userId) {
    headers['Authorization'] = `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
    headers['X-Agent-User-Id'] = userId
  } else if (existingAuthorization) {
    headers['Authorization'] = existingAuthorization
  } else {
    headers['Authorization'] = `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
  }

  const ref = Array.isArray(req.query.ref) ? req.query.ref[0] : req.query.ref
  if (ref) headers['X-Project-Ref'] = ref
  return headers
}

function extractUserIdFromRequest(req: NextApiRequest): string | undefined {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return undefined

  return extractSubjectFromToken(token)
}

function extractSubjectFromToken(token: string): string | undefined {
  const payload = token.split('.')[1]
  if (!payload) return undefined

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as {
      sub?: unknown
    }

    return typeof decoded.sub === 'string' && decoded.sub.trim().length > 0
      ? decoded.sub
      : undefined
  } catch {
    return undefined
  }
}

async function handleUpstream(response: Response, res: NextApiResponse) {
  const text = await response.text()
  try {
    const data = JSON.parse(text)
    return res.status(response.status).json(data)
  } catch {
    return res.status(502).json({ message: 'Invalid response from project-meta-api' })
  }
}

export async function proxyGet(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  claims?: JwtPayload
) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (['ref', 'id'].includes(key)) continue
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v))
    else if (value !== undefined) qs.set(key, value)
  }

  try {
    const response = await fetch(projectMetaApiUrl(path, qs.size ? qs : undefined), {
      headers: projectMetaApiHeaders(req, claims),
    })
    return handleUpstream(response, res)
  } catch (err: any) {
    return res.status(502).json({ message: `Could not reach project-meta-api: ${err?.message}` })
  }
}

export async function proxyPost(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  claims?: JwtPayload
) {
  try {
    const response = await fetch(projectMetaApiUrl(path), {
      method: 'POST',
      headers: projectMetaApiHeaders(req, claims),
      body: JSON.stringify(req.body ?? {}),
    })
    return handleUpstream(response, res)
  } catch (err: any) {
    return res.status(502).json({ message: `Could not reach project-meta-api: ${err?.message}` })
  }
}

export async function proxyPatch(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  claims?: JwtPayload
) {
  try {
    const response = await fetch(projectMetaApiUrl(path), {
      method: 'PATCH',
      headers: projectMetaApiHeaders(req, claims),
      body: JSON.stringify(req.body ?? {}),
    })
    return handleUpstream(response, res)
  } catch (err: any) {
    return res.status(502).json({ message: `Could not reach project-meta-api: ${err?.message}` })
  }
}

export async function proxyDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  claims?: JwtPayload
) {
  try {
    const response = await fetch(projectMetaApiUrl(path), {
      method: 'DELETE',
      headers: projectMetaApiHeaders(req, claims),
    })
    return handleUpstream(response, res)
  } catch (err: any) {
    return res.status(502).json({ message: `Could not reach project-meta-api: ${err?.message}` })
  }
}
