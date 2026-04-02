import { LOCAL_STORAGE_KEYS, useParams } from 'common'
import dayjs from 'dayjs'
import { DevToolbarTrigger } from 'dev-tools'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ReactNode } from 'react'
import { cn } from 'ui'
import { CommandMenuTriggerInput } from 'ui-patterns'

import { BreadcrumbsView } from './BreadcrumbsView'
import { FeedbackDropdown } from './FeedbackDropdown/FeedbackDropdown'
import { HomeIcon } from './HomeIcon'
import { LocalVersionPopover } from './LocalVersionPopover'
import { MergeRequestButton } from './MergeRequestButton'
import OrgProjectBranchNav from './OrgProjectBranchNav'
import {
  useIsBranching2Enabled,
  useIsFloatingMobileToolbarEnabled,
} from '@/components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { ConnectButton } from '@/components/interfaces/ConnectButton/ConnectButton'
import { ConnectSheet } from '@/components/interfaces/ConnectSheet/ConnectSheet'
import { LocalDropdown } from '@/components/interfaces/LocalDropdown'
import { UserDropdown } from '@/components/interfaces/UserDropdown'
import { AdvisorButton } from '@/components/layouts/AppLayout/AdvisorButton'
import { AssistantButton } from '@/components/layouts/AppLayout/AssistantButton'
import { InlineEditorButton } from '@/components/layouts/AppLayout/InlineEditorButton'
import { HelpButton } from '@/components/ui/HelpPanel/HelpButton'
import { useLocalStorageQuery } from '@/hooks/misc/useLocalStorage'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { IS_PLATFORM } from '@/lib/constants'

export const LayoutHeaderDivider = ({ className, ...props }: React.HTMLProps<HTMLSpanElement>) => (
  <span className={cn('text-border-stronger pr-2', className)} {...props}>
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      shapeRendering="geometricPrecision"
      aria-hidden={true}
    >
      <path d="M16 3.549L7.12 20.600" />
    </svg>
  </span>
)

interface LayoutHeaderProps {
  customHeaderComponents?: ReactNode
  breadcrumbs?: unknown[]
  headerTitle?: string
  backToDashboardURL?: string
}

export const LayoutHeader = ({
  customHeaderComponents,
  breadcrumbs = [],
  headerTitle,
  backToDashboardURL,
}: LayoutHeaderProps) => {
  const router = useRouter()
  const { ref: projectRef } = useParams()
  const { data: selectedProject } = useSelectedProjectQuery()
  const gitlessBranching = useIsBranching2Enabled()

  const showFloatingMobileToolbar = useIsFloatingMobileToolbarEnabled()
  const [commandMenuEnabled] = useLocalStorageQuery(LOCAL_STORAGE_KEYS.HOTKEY_COMMAND_MENU, true)

  const isAccountPage = router.pathname.startsWith('/account')

  const isNewProject =
    selectedProject?.inserted_at !== undefined &&
    dayjs(selectedProject.inserted_at).isAfter(dayjs().subtract(5, 'day'))

  const connectButtonType = isNewProject ? 'primary' : 'default'

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
            'flex items-center justify-between h-full pr-3 flex-1 overflow-x-auto gap-x-8 pl-4'
          )}
        >
          <div className="flex md:hidden items-center text-sm not-sr-only">
            <AnimatePresence>
              {headerTitle && (
                <motion.div
                  className="flex items-center -ml-1"
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
          </div>
          <div className="hidden md:flex items-center text-sm">
            <HomeIcon />
            <OrgProjectBranchNav className="ml-2" />
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

            <AnimatePresence>
              {projectRef && (
                <motion.div
                  className="ml-3 items-center gap-x-2 flex"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{
                    duration: 0.15,
                    ease: 'easeOut',
                  }}
                >
                  {IS_PLATFORM && gitlessBranching && <MergeRequestButton />}
                  <ConnectButton buttonType={connectButtonType} />
                </motion.div>
              )}
            </AnimatePresence>
            <BreadcrumbsView defaultValue={breadcrumbs} />
          </div>
          <div className="flex items-center gap-x-2">
            {customHeaderComponents && customHeaderComponents}
            {IS_PLATFORM ? (
              <>
                <DevToolbarTrigger />
                <FeedbackDropdown />

                <div className="flex items-center gap-1 md:gap-2">
                  <CommandMenuTriggerInput
                    showShortcut={commandMenuEnabled}
                    placeholder="Search..."
                    className={cn(
                      'hidden md:flex md:min-w-32 xl:min-w-32 rounded-full bg-transparent',
                      '[&_.command-shortcut>div]:border-none',
                      '[&_.command-shortcut>div]:pr-2',
                      '[&_.command-shortcut>div]:bg-transparent',
                      '[&_.command-shortcut>div]:text-foreground-lighter'
                    )}
                  />
                  <HelpButton />
                  <AdvisorButton projectRef={projectRef} />
                  <AnimatePresence initial={false}>
                    {!!projectRef && (
                      <>
                        <InlineEditorButton />
                        <AssistantButton />
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <UserDropdown triggerClassName="hidden md:flex" />
              </>
            ) : (
              <>
                <LocalVersionPopover />
                <div className="flex items-center gap-1 md:gap-2">
                  <CommandMenuTriggerInput
                    placeholder="Search..."
                    className="hidden md:flex md:min-w-32 xl:min-w-32 rounded-full bg-transparent
                        [&_.command-shortcut>div]:border-none
                        [&_.command-shortcut>div]:pr-2
                        [&_.command-shortcut>div]:bg-transparent
                        [&_.command-shortcut>div]:text-foreground-lighter
                      "
                  />
                  <HelpButton />
                  <AdvisorButton projectRef={projectRef} />
                  <AnimatePresence initial={false}>
                    {!!projectRef && (
                      <>
                        <InlineEditorButton />
                        <AssistantButton />
                      </>
                    )}
                  </AnimatePresence>
                </div>
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
