import { LOCAL_STORAGE_KEYS } from 'common'
import { DevToolbarTrigger } from 'dev-tools'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useMemo, type ReactNode } from 'react'
import { Badge, cn } from 'ui'
import { CommandMenuTriggerInput } from 'ui-patterns'

import { HomeIcon } from '../Navigation/LayoutHeader/HomeIcon'
import type { AppSidebarScope } from './app-sidebar.types'
import { useIsFloatingMobileToolbarEnabled } from '@/components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { ConnectSheet } from '@/components/interfaces/ConnectSheet/ConnectSheet'
import { LocalDropdown } from '@/components/interfaces/LocalDropdown'
import { UserDropdown } from '@/components/interfaces/UserDropdown'
import { BreadcrumbsView } from '@/components/layouts/Navigation/LayoutHeader/BreadcrumbsView'
import { FeedbackDropdown } from '@/components/layouts/Navigation/LayoutHeader/FeedbackDropdown/FeedbackDropdown'
import { LayoutHeaderDivider } from '@/components/layouts/Navigation/LayoutHeader/LayoutHeader'
import { LocalVersionPopover } from '@/components/layouts/Navigation/LayoutHeader/LocalVersionPopover'
import { getResourcesExceededLimitsOrg } from '@/components/ui/OveragesBanner/OveragesBanner.utils'
import { useOrgUsageQuery } from '@/data/usage/org-usage-query'
import { useHideSidebar } from '@/hooks/misc/useHideSidebar'
import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'
import { useSelectedOrganizationQuery } from '@/hooks/misc/useSelectedOrganization'
import { IS_PLATFORM } from '@/lib/constants'

interface LayoutHeaderProps {
  customHeaderComponents?: ReactNode
  breadcrumbs?: unknown[]
  headerTitle?: string
  backToDashboardURL?: string
  scope?: AppSidebarScope
}

export const LayoutHeader = ({
  customHeaderComponents,
  breadcrumbs = [],
  headerTitle,
  backToDashboardURL,
  scope,
}: LayoutHeaderProps) => {
  const router = useRouter()
  const hideSidebar = useHideSidebar()
  const { data: selectedOrganization } = useSelectedOrganizationQuery()

  const showFloatingMobileToolbar = useIsFloatingMobileToolbarEnabled()
  const [commandMenuEnabled] = useLocalStorageQuery(LOCAL_STORAGE_KEYS.HOTKEY_COMMAND_MENU, true)

  const isAccountPage = router.pathname.startsWith('/account')

  // We only want to query the org usage and check for possible over-ages for plans without usage billing enabled (free or pro with spend cap)
  const { data: orgUsage } = useOrgUsageQuery(
    { orgSlug: selectedOrganization?.slug },
    { enabled: selectedOrganization?.usage_billing_enabled === false }
  )

  const exceedingLimits = useMemo(() => {
    if (orgUsage) {
      return getResourcesExceededLimitsOrg(orgUsage?.usages || []).length > 0
    } else {
      return false
    }
  }, [orgUsage])

  return (
    <>
      <header
        className={cn(
          'flex h-11 md:h-12 items-center flex-shrink-0 border-b',
          showFloatingMobileToolbar && 'hidden md:flex'
        )}
      >
        {backToDashboardURL && isAccountPage && (
          <div className="flex items-center justify-center border-r flex-0 md:hidden h-full aspect-square">
            <Link
              href={backToDashboardURL}
              className="flex items-center justify-center border-none !bg-transparent rounded-md min-w-[30px] w-[30px] h-[30px] text-foreground-lighter hover:text-foreground transition-colors"
            >
              <ChevronLeft strokeWidth={1.5} size={16} />
            </Link>
          </div>
        )}
        <div
          className={cn(
            'flex items-center justify-between h-full px-1 pl-3 flex-1 overflow-x-auto gap-x-4'
          )}
        >
          <div className="hidden md:flex items-center justify-start text-sm gap-x-2">
            {hideSidebar && <HomeIcon />}
            <AnimatePresence>
              {headerTitle && (
                <motion.div
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.15,
                    ease: 'easeOut',
                  }}
                >
                  <LayoutHeaderDivider />
                  <span className="text-foreground">{headerTitle}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <BreadcrumbsView defaultValue={breadcrumbs} />

            {exceedingLimits && (
              <div className="ml-2">
                <Link href={`/org/${selectedOrganization?.slug}/usage`}>
                  <Badge variant="destructive">Exceeding usage limits</Badge>
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-x-2">
            {customHeaderComponents && customHeaderComponents}
            {IS_PLATFORM ? (
              <>
                <DevToolbarTrigger />
                <FeedbackDropdown />
                <CommandMenuTriggerInput
                  showShortcut={commandMenuEnabled}
                  placeholder="Search..."
                  className={cn(
                    'flex max-w-32 xl:max-w-12 w-auto rounded-full bg-transparent border-strong',
                    '[&_.command-shortcut>div]:border-none',
                    '[&_.command-shortcut>div]:pr-2',
                    '[&_.command-shortcut>div]:bg-transparent',
                    '[&_.command-shortcut>div]:text-foreground-lighter'
                  )}
                />
                <UserDropdown triggerClassName="hidden md:flex" />
              </>
            ) : (
              <>
                <LocalVersionPopover />
                <CommandMenuTriggerInput
                  showShortcut={commandMenuEnabled}
                  placeholder="Search..."
                  className={cn(
                    'flex max-w-32 xl:max-w-32 rounded-full bg-transparent border-strong',
                    '[&_.command-shortcut>div]:border-none',
                    '[&_.command-shortcut>div]:pr-2',
                    '[&_.command-shortcut>div]:bg-transparent',
                    '[&_.command-shortcut>div]:text-foreground-lighter'
                  )}
                />
                <LocalDropdown triggerClassName="hidden md:flex" />
              </>
            )}
          </div>
        </div>
      </header>

      <ConnectSheet />
    </>
  )
}
