'use client'

import { useEffect, useRef } from 'react'

import type { GoHubSpotMeetingSection } from '../schemas'

const MEETINGS_EMBED_SCRIPT = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js'

export default function HubSpotMeetingSection({ section }: { section: GoHubSpotMeetingSection }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load the HubSpot meetings embed script once
    if (!document.querySelector(`script[src="${MEETINGS_EMBED_SCRIPT}"]`)) {
      const script = document.createElement('script')
      script.src = MEETINGS_EMBED_SCRIPT
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  const meetingUrl = `https://meetings.hubspot.com/${section.meetingSlug}?embed=true`

  return (
    <div className="max-w-[80rem] mx-auto px-8">
      {(section.title || section.description) && (
        <div className="max-w-3xl mx-auto text-center mb-12">
          {section.title && (
            <h2 className="text-foreground text-2xl sm:text-3xl font-medium">{section.title}</h2>
          )}
          {section.description && (
            <p className="text-foreground-lighter mt-3 text-lg">{section.description}</p>
          )}
        </div>
      )}

      <div ref={containerRef} className="meetings-iframe-container" data-src={meetingUrl} />
    </div>
  )
}
