import type { JwtPayload } from '@supabase/supabase-js'
import type { NextApiRequest, NextApiResponse } from 'next'

import apiWrapper from 'lib/api/apiWrapper'
import { proxyPatch } from 'lib/api/projectMetaApiHelpers'

export default (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler, { withAuth: true })

async function handler(req: NextApiRequest, res: NextApiResponse, claims?: JwtPayload) {
  const { id } = req.query as { id: string }

  switch (req.method) {
    case 'PATCH':
      return proxyPatch(req, res, `alerts/${id}`, claims)
    default:
      res.setHeader('Allow', ['PATCH'])
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }
}
