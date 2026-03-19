import { NextRequest, NextResponse } from 'next/server'

import { getMockBookingConfirmation, shouldUseMock } from '../mock'

const HUBSPOT_BASE = 'https://api.hubspot.com/scheduler/v3/meetings/meeting-links/book'

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (shouldUseMock()) {
    return NextResponse.json(getMockBookingConfirmation(body))
  }

  const token = process.env.HUBSPOT_MEETINGS_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'HubSpot token not configured' }, { status: 500 })
  }

  const timezone = body.timezone || 'America/New_York'
  const url = `${HUBSPOT_BASE}?timezone=${encodeURIComponent(timezone)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json(
      { error: 'HubSpot booking failed', detail: text },
      { status: res.status }
    )
  }

  const data = await res.json()
  return NextResponse.json(data)
}
