'use client'

import { usePathname } from 'next/navigation'
import { cn } from 'ui'

import { useV2Params } from '@/app/v2/V2ParamsContext'

import { TabBar } from './TabBar'
import { StaticTitle } from './StaticTitle'
import { V2EditorFooter } from './V2EditorFooter'

export function EditorFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { projectRef } = useV2Params()

  const isDataCategory =
    pathname?.includes('/data/tables') ||
    pathname?.includes('/data/functions') ||
    pathname?.includes('/data/types') ||
    pathname?.includes('/data/roles') ||
    pathname?.includes('/data/extensions') ||
    pathname?.includes('/data/indexes') ||
    pathname?.includes('/data/publications') ||
    pathname?.includes('/data/users') ||
    pathname?.includes('/data/providers') ||
    pathname?.includes('/data/oauth-apps') ||
    pathname?.includes('/data/buckets') ||
    pathname?.includes('/data/edge-functions') ||
    pathname?.includes('/data/channels')

  const isHome =
    Boolean(projectRef) &&
    pathname?.endsWith(`/${projectRef}`) &&
    !pathname?.includes('/data/') &&
    !pathname?.includes('/obs/') &&
    !pathname?.includes('/settings/')

  return (
    <div className="flex flex-col flex-1 min-w-0 bg-background">
      {isDataCategory ? null : isHome ? null : <StaticTitle />}
      {isDataCategory && <TabBar />}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        {children}
      </div>
      <V2EditorFooter />
    </div>
  )
}
