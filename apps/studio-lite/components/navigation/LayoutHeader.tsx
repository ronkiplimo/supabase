'use client'

import Link from 'next/link'
import { Button } from 'ui'

import { LayoutHeaderDivider } from './LayoutHeaderDivider'
import { UserMenu } from './UserMenu'

export function LayoutHeader() {
  return (
    <header className="flex h-12 items-center flex-shrink-0 border-b px-4 justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center flex-shrink-0">
          <img alt="Supabase" src="/img/supabase-logo.svg" className="h-[18px]" />
        </Link>
        <LayoutHeaderDivider />
        <span className="text-sm text-foreground-light">Supalite</span>
        <Button type="outline" size="tiny" className="ml-2">
          Connect
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  )
}
