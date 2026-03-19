'use client'

import { useEffect } from 'react'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { CATEGORY_DOMAIN, useV2DashboardStore, type DataTabDomain } from '@/stores/v2-dashboard'

interface V2PlaceholderViewProps {
  title: string
  /** If provided, registers this view as a list tab on mount */
  tabCategory?: string
  tabLabel?: string
  tabDomain?: DataTabDomain
}

export function V2PlaceholderView({
  title,
  tabCategory,
  tabLabel,
  tabDomain,
}: V2PlaceholderViewProps) {
  const { projectRef } = useV2Params()
  const openDataTab = useV2DashboardStore((s) => s.openDataTab)

  useEffect(() => {
    if (!tabCategory || !projectRef) return
    const domain = tabDomain ?? CATEGORY_DOMAIN[tabCategory] ?? 'db'
    openDataTab({
      id: tabCategory,
      label: tabLabel ?? title,
      type: 'list',
      category: tabCategory,
      domain,
      path: `/dashboard/v2/project/${projectRef}/data/${tabCategory}`,
    })
  }, [projectRef, tabCategory, tabLabel, tabDomain, title, openDataTab])

  return (
    <div className="p-6 text-foreground-lighter text-sm">
      <h2 className="text-foreground font-medium mb-2">{title}</h2>
      <p>This view will show real data from the API. Placeholder for the v2 prototype.</p>
    </div>
  )
}
