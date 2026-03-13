import type { JwtPayload } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

import apiWrapper from 'lib/api/apiWrapper'
import { proxyGet } from 'lib/api/projectMetaApiHelpers'

export default (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler, { withAuth: true })

async function handler(req: NextApiRequest, res: NextApiResponse, claims?: JwtPayload) {
  switch (req.method) {
    case 'GET':
      // Forwards ?resolved=true|false query param automatically
      return proxyGet(req, res, 'alerts', claims)
    default:
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }
}
