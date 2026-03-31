/**
 * GET /api/integrations/marketplace/:slug/install?organization_slug=...&project_id=...
 *
 * Canonical "install" endpoint for marketplace listings.
 * Abstracts whether the partner expects a GET redirect or a POST-then-redirect
 * (JWT-signed, following the Grafana Cloud integration pattern).
 *
 * GET initiation:  302 redirect to the partner URL with metadata as query params.
 * POST initiation: sign a JWT (ES256), POST {token} to the partner API,
 *                  receive {redirectUrl}, and 302 redirect the user there.
 */
import {
  createMarketplaceClient,
  createMarketplaceServiceClient,
} from 'data/marketplace/marketplace-client'
import * as jose from 'jose'
import type { NextApiRequest, NextApiResponse } from 'next'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ListingRow = {
  id: number
  slug: string
  partner_id: number
  initiation_action_url: string | null
  initiation_action_method: 'POST' | 'GET' | null
}

type InitiationConfigRow = {
  signing_key_pem: string
  key_id: string
  audience: string
  issuer: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** GET initiation — redirect with metadata as query params */
function buildGetRedirectUrl(
  actionUrl: string,
  organizationSlug: string | undefined,
  projectId: string | undefined
): string {
  const target = new URL(actionUrl)
  if (organizationSlug) target.searchParams.set('organization_slug', organizationSlug)
  if (projectId) target.searchParams.set('project_id', projectId)
  return target.toString()
}

/** POST initiation — sign JWT, call partner API, return the redirect URL */
async function executePostInitiation(
  actionUrl: string,
  config: InitiationConfigRow,
  organizationSlug: string | undefined,
  projectId: string | undefined
): Promise<string> {
  // 1. Import the signing key (EC P-256)
  const privateKey = await jose.importPKCS8(config.signing_key_pem, 'ES256')

  // 2. Build and sign the JWT (5-minute expiry, per Grafana spec)
  const now = Math.floor(Date.now() / 1000)
  const token = await new jose.SignJWT({
    iss: config.issuer,
    aud: config.audience,
    iat: now,
    exp: now + 300,
    ...(organizationSlug && { organization_slug: organizationSlug }),
    ...(projectId && { project_id: projectId }),
  })
    .setProtectedHeader({ alg: 'ES256', kid: config.key_id })
    .sign(privateKey)

  // 3. POST the signed token to the partner API
  const upstream = await fetch(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  if (!upstream.ok) {
    throw new Error(`Partner API returned status ${upstream.status}`)
  }

  // 4. Parse the redirect URL from the partner's response
  const result = (await upstream.json()) as { redirectUrl?: string }

  if (!result.redirectUrl) {
    throw new Error('Partner response is missing redirectUrl')
  }

  return result.redirectUrl
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }

  const { slug } = req.query
  if (typeof slug !== 'string' || !slug.trim()) {
    return res.status(400).json({ error: { message: 'Missing listing slug' } })
  }

  const organizationSlug =
    typeof req.query.organization_slug === 'string' ? req.query.organization_slug : undefined
  const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : undefined

  // --- Look up the listing (anon client — respects RLS / published check) ---
  const marketplace = createMarketplaceClient()

  const { data: listing, error: listingError } = await marketplace
    .from('listings')
    .select('id, slug, partner_id, initiation_action_url, initiation_action_method')
    .eq('slug', slug.trim())
    .eq('published', true)
    .maybeSingle<ListingRow>()

  if (listingError) {
    return res.status(500).json({ error: { message: listingError.message } })
  }
  if (!listing) {
    return res.status(404).json({ error: { message: 'Listing not found' } })
  }
  if (!listing.initiation_action_url || !listing.initiation_action_method) {
    return res
      .status(400)
      .json({ error: { message: 'Listing does not have an initiation action configured' } })
  }

  console.log('listing', listing)

  const actionUrl = listing.initiation_action_url
  const actionMethod = listing.initiation_action_method

  // TODO: record a click/install event for analytics

  // --- GET initiation -------------------------------------------------------
  if (actionMethod === 'GET') {
    const redirectUrl = buildGetRedirectUrl(actionUrl, organizationSlug, projectId)
    return res.redirect(302, redirectUrl)
  }

  // --- POST initiation (JWT-signed, Grafana-style) --------------------------
  if (actionMethod === 'POST') {
    // Service-role client to read the signing secrets (no RLS policies on that table)
    const serviceClient = createMarketplaceServiceClient()

    const { data: config, error: configError } = await serviceClient
      .from('listing_initiation_configs')
      .select('signing_key_pem, key_id, audience, issuer')
      .eq('listing_id', listing.id)
      .maybeSingle<InitiationConfigRow>()

    if (configError) {
      return res.status(500).json({ error: { message: configError.message } })
    }
    if (!config) {
      return res.status(500).json({
        error: {
          message: 'POST initiation is not configured for this listing (missing signing config)',
        },
      })
    }

    try {
      const redirectUrl = await executePostInitiation(
        actionUrl,
        config,
        organizationSlug,
        projectId
      )
      return res.redirect(302, redirectUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Initiation failed'
      return res.status(502).json({ error: { message } })
    }
  }

  return res
    .status(400)
    .json({ error: { message: `Unsupported initiation method: ${actionMethod}` } })
}
