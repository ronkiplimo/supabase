import type { JwtPayload } from '@supabase/supabase-js'
import { proxyGet } from 'lib/api/projectMetaApiHelpers'
import apiWrapper from 'lib/api/apiWrapper'
import type { NextApiRequest, NextApiResponse } from 'next'

const apiRoute = (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler, { withAuth: true })

async function handler(req: NextApiRequest, res: NextApiResponse, claims?: JwtPayload) {
  const { id } = req.query as { id: string }

  switch (req.method) {
    case 'GET':
      return proxyGet(req, res, `agents/${id}/tasks`, claims)
    default:
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
  }
}

export default apiRoute
