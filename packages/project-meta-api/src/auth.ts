import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY

export type AuthContext =
  | { mode: 'service_role'; userId: string | undefined }
  | { mode: 'user'; userId: string }

export type AuthResult =
  | { ok: true; context: AuthContext }
  | { ok: false; status: number; error: string }

function extractBearer(header: string | null): string | null {
  return header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null
}

/**
 * Verify the incoming request is authenticated.
 *
 * Two modes are supported so that agent-api works in both self-hosted and cloud environments:
 *
 * 1. **Project JWT** (HS256, verified with JWT_SECRET)
 *    Works in both environments when the caller has a Supabase project JWT (e.g. a user
 *    authenticated via the project's GoTrue, or a service-role JWT).
 *
 * 2. **Service role key** (raw token match against SUPABASE_SERVICE_ROLE_KEY
 *    or SUPABASE_SERVICE_KEY)
 *    Used by the studio's server-side proxy, which has already verified the user via
 *    apiWrapper/apiAuthenticate (cloud) or trusts the local network (self-hosted).
 *    The studio passes the verified user's ID in the X-Agent-User-Id header so that
 *    agent-api still has user context for service-role calls.
 *
 * Anonymous tokens are always rejected.
 */
export async function verifyAuth(
  authHeader: string | null,
  userIdHeader: string | null,
): Promise<AuthResult> {
  const token = extractBearer(authHeader)
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' }

  // --- Service role key (trusted server-side proxy path) ---
  // The studio proxy sets X-Agent-User-Id after verifying the user itself.
  if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) {
    const userId = userIdHeader?.trim() || undefined
    return { ok: true, context: { mode: 'service_role', userId } }
  }

  // --- Project JWT (direct API access) ---
  if (!JWT_SECRET) return { ok: false, status: 500, error: 'Missing JWT_SECRET' }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    const role = payload['role'] as string | undefined
    const sub = payload.sub

    if (role === 'anon') {
      return { ok: false, status: 401, error: 'Anonymous access is not permitted' }
    }

    if (role === 'service_role') {
      // service_role JWT — prefer explicit forwarded user context when present
      const userId =
        (typeof userIdHeader === 'string' && userIdHeader.trim().length > 0
          ? userIdHeader.trim()
          : undefined) ?? sub
      return { ok: true, context: { mode: 'service_role', userId } }
    }

    if (!sub) {
      return { ok: false, status: 401, error: 'Token is missing a subject claim' }
    }

    return { ok: true, context: { mode: 'user', userId: sub } }
  } catch {
    return { ok: false, status: 401, error: 'Invalid token' }
  }
}
