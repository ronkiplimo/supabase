import { CRMClient } from 'marketing/crm'
import type { NextApiRequest, NextApiResponse } from 'next'

type FormPayload = {
  formGuid: string
  fields: Record<string, string>
  fieldMap: Record<string, string>
  consent?: string
}

type FormResponse = {
  success: boolean
  errors: string[]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<FormResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, errors: ['Method not allowed'] })
  }

  const { formGuid, fields, fieldMap, consent } = req.body as FormPayload

  if (!formGuid || !fields) {
    return res.status(400).json({ success: false, errors: ['Missing formGuid or fields'] })
  }

  const email =
    fields['email'] ?? fields['email_address'] ?? fields['workEmail'] ?? fields['work_email'] ?? ''

  if (!email) {
    return res.status(400).json({ success: false, errors: ['An email field is required.'] })
  }

  const portalId = process.env.HUBSPOT_PORTAL_ID
  if (!portalId) {
    console.error('[hubspot-form] HUBSPOT_PORTAL_ID env var is not set')
    return res.status(500).json({ success: false, errors: ['Server configuration error.'] })
  }

  const hubspotFields: Record<string, string> = {}
  for (const [formField, value] of Object.entries(fields)) {
    const hsField = fieldMap?.[formField] ?? formField
    hubspotFields[hsField] = value
  }

  const client = new CRMClient({ hubspot: { portalId, formGuid } })

  const pageUri = req.headers.referer
  const pageName = typeof req.body.pageName === 'string' ? req.body.pageName : undefined

  const { errors } = await client.submitEvent({
    email,
    hubspotFields,
    context: { pageUri, pageName },
    consent,
  })

  if (errors.length > 0) {
    console.error(
      '[hubspot-form] CRM errors:',
      errors.map((e) => e.message)
    )
    return res.status(502).json({ success: false, errors: errors.map((e) => e.message) })
  }

  return res.status(200).json({ success: true, errors: [] })
}
