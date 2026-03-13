import { type NextRequest } from 'next/server'

import { PROJECT_META_API_URL } from 'lib/constants'

export const config = { runtime: 'edge' }

/**
 * Streaming SSE proxy for the project-meta-api chat endpoint.
 *
 * Uses the Edge Runtime (same as pages/api/ai/docs.ts) so that the SSE stream
 * from project-meta-api can be piped directly to the browser without buffering.
 *
 * Auth strategy:
 * - Extracts the user's Bearer token from the request (the studio's session JWT)
 * - Decodes the sub claim to get the user ID (without re-verifying the signature —
 *   the studio's GoTrueClient already authenticated the session, and project-meta-api's own
 *   JWT_SECRET verification runs for direct API calls)
 * - Calls project-meta-api with the service role key + X-Agent-User-Id so project-meta-api has
 *   user context regardless of whether the JWT was issued by the project GoTrue or
 *   the platform GoTrue (both cases are handled transparently)
 */
export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
    })
  }

  // Extract and decode the user's session token
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Decode the JWT payload to get the user's sub claim.
  // We trust the token is valid — the session was established by GoTrueClient.
  let userId: string | undefined
  try {
    const payloadB64 = token.split('.')[1]
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    userId = payload.sub ?? undefined
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { ref } = req.nextUrl.pathname.match(
    /\/api\/platform\/project-meta\/(?<ref>[^/]+)\/chat/
  )?.groups ?? {}

  const body = await req.text()

  const upstream = await fetch(`${PROJECT_META_API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
      ...(userId ? { 'X-Agent-User-Id': userId } : {}),
      ...(ref ? { 'X-Project-Ref': ref } : {}),
      // Forward user's platform JWT for MCP server auth (mcp.supabase.com)
      'X-User-Token': token,
    },
    body,
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Pipe the SSE stream directly to the browser
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
