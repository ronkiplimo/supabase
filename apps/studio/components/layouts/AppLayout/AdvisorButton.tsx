import { useReducedMotion, useViewport } from 'common'
import { SIDEBAR_KEYS } from 'components/layouts/ProjectLayout/LayoutSidebar/LayoutSidebarProvider'
import { useProjectLintsQuery } from 'data/lint/lint-query'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSidebarManagerSnapshot } from 'state/sidebar-manager-state'
import { Tooltip, TooltipContent, TooltipTrigger, buttonVariants, cn } from 'ui'

import { useNotificationsV2Query } from '@/data/notifications/notifications-v2-query'
import { ADVISOR_URGENT_PROTOTYPE } from './advisor-urgent-prototype.constants'

const COLLAPSED_BUTTON_SIZE = 32
const MOBILE_BREAKPOINT = 768
const MARQUEE_CHARACTER_THRESHOLD = 20

const AdvisorUrgentLabel = ({
  label,
  isMarquee,
  reducedMotion,
}: {
  label: string
  isMarquee: boolean
  reducedMotion: boolean
}) => {
  return (
    <div
      className="relative w-full overflow-hidden"
      data-marquee={isMarquee ? 'true' : 'false'}
      data-testid="advisor-urgent-label-track"
    >
      {isMarquee ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-3 bg-gradient-to-r from-destructive-300 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-3 bg-gradient-to-l from-destructive-300 to-transparent" />
          <motion.div
            className="flex w-max min-w-full items-center gap-6 whitespace-nowrap text-[11px] font-medium"
            animate={reducedMotion ? { x: 0 } : { x: ['0%', '-50%'] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : {
                    duration: 6.5,
                    ease: 'linear',
                    repeat: Infinity,
                    repeatType: 'loop',
                  }
            }
          >
            <span className="shrink-0">{label}</span>
            <span aria-hidden className="shrink-0">
              {label}
            </span>
          </motion.div>
        </>
      ) : (
        <span className="block truncate text-[11px] font-medium">{label}</span>
      )}
    </div>
  )
}

export const AdvisorButton = ({ projectRef }: { projectRef?: string }) => {
  const { toggleSidebar, activeSidebar } = useSidebarManagerSnapshot()
  const reducedMotion = useReducedMotion()
  const viewport = useViewport()
  const [isPrototypeExpanded, setIsPrototypeExpanded] = useState(
    ADVISOR_URGENT_PROTOTYPE.enabled && Boolean(projectRef)
  )

  const { data: lints } = useProjectLintsQuery({ projectRef })

  const { data: notificationsData } = useNotificationsV2Query({
    filters: {},
    limit: 20,
  })
  const notifications = useMemo(() => {
    return notificationsData?.pages.flatMap((page) => page) ?? []
  }, [notificationsData?.pages])
  const hasUnreadNotifications = notifications.some((x) => x.status === 'new')
  const hasCriticalNotifications = notifications.some((x) => x.priority === 'Critical')

  const hasCriticalIssues =
    hasCriticalNotifications ||
    (Array.isArray(lints) && lints.some((lint) => lint.level === 'ERROR'))

  const isOpen = activeSidebar?.id === SIDEBAR_KEYS.ADVISOR_PANEL
  const showUrgentPrototype = ADVISOR_URGENT_PROTOTYPE.enabled && Boolean(projectRef)
  const expandedWidth =
    viewport.width > 0 && viewport.width < MOBILE_BREAKPOINT
      ? ADVISOR_URGENT_PROTOTYPE.mobileExpandedWidth
      : ADVISOR_URGENT_PROTOTYPE.desktopExpandedWidth
  const labelMaxWidth = Math.max(expandedWidth - 56, 0)
  const shouldUseMarquee =
    showUrgentPrototype &&
    isPrototypeExpanded &&
    !reducedMotion &&
    ADVISOR_URGENT_PROTOTYPE.label.length > MARQUEE_CHARACTER_THRESHOLD
  const statusDotClassName = showUrgentPrototype
    ? 'bg-destructive'
    : hasCriticalIssues
      ? 'bg-destructive'
      : hasUnreadNotifications
        ? 'bg-brand'
        : undefined
  const buttonState = showUrgentPrototype
    ? isPrototypeExpanded
      ? 'prototype-expanded'
      : 'prototype-collapsed'
    : 'default'

  const handleClick = () => {
    toggleSidebar(SIDEBAR_KEYS.ADVISOR_PANEL)
  }

  useEffect(() => {
    if (!showUrgentPrototype) {
      setIsPrototypeExpanded(false)
      return
    }

    setIsPrototypeExpanded(true)

    const timeoutId = window.setTimeout(() => {
      setIsPrototypeExpanded(false)
    }, ADVISOR_URGENT_PROTOTYPE.holdMs)

    return () => window.clearTimeout(timeoutId)
  }, [showUrgentPrototype])

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            id="advisor-center-trigger"
            type="button"
            aria-label={
              showUrgentPrototype
                ? `Advisor Center: ${ADVISOR_URGENT_PROTOTYPE.label}`
                : 'Advisor Center'
            }
            data-state={buttonState}
            className={cn(
              buttonVariants({
                type: showUrgentPrototype ? 'danger' : isOpen ? 'secondary' : 'outline',
                size: 'tiny',
              }),
              'group relative flex shrink-0 items-center overflow-hidden rounded-full !border !px-0 !py-0 !h-8 !min-h-8',
              showUrgentPrototype ? 'justify-start' : 'justify-center'
            )}
            onClick={handleClick}
            initial={
              showUrgentPrototype && !reducedMotion
                ? {
                    width: COLLAPSED_BUTTON_SIZE,
                    scale: 1,
                    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
                  }
                : false
            }
            animate={{
              width:
                showUrgentPrototype && isPrototypeExpanded ? expandedWidth : COLLAPSED_BUTTON_SIZE,
              scale: showUrgentPrototype && isPrototypeExpanded && !reducedMotion ? 1.02 : 1,
              boxShadow:
                showUrgentPrototype && isPrototypeExpanded && !reducedMotion
                  ? '0 10px 28px rgba(160, 32, 32, 0.22)'
                  : '0 0 0 rgba(0, 0, 0, 0)',
            }}
            transition={
              reducedMotion
                ? { duration: 0.12, ease: 'easeOut' }
                : {
                    width: { type: 'spring', stiffness: 380, damping: 30 },
                    scale: { duration: 0.24, ease: 'easeOut' },
                    boxShadow: { duration: 0.24, ease: 'easeOut' },
                  }
            }
            style={{ willChange: 'width, transform' }}
          >
            {showUrgentPrototype && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_60%)]"
                animate={{ opacity: isPrototypeExpanded && !reducedMotion ? 1 : 0.6 }}
                transition={reducedMotion ? { duration: 0.12 } : { duration: 0.24 }}
              />
            )}
            <span
              className={cn(
                'relative z-10 flex w-full items-center',
                showUrgentPrototype && isPrototypeExpanded
                  ? 'justify-start gap-2 px-3 pr-5'
                  : 'justify-center'
              )}
            >
              <motion.span
                className="flex shrink-0 items-center justify-center"
                animate={{
                  rotate:
                    showUrgentPrototype && isPrototypeExpanded && !reducedMotion
                      ? [0, -8, 6, 0]
                      : 0,
                }}
                transition={
                  showUrgentPrototype && isPrototypeExpanded && !reducedMotion
                    ? { duration: 0.42, ease: 'easeOut' }
                    : { duration: 0 }
                }
              >
                <Lightbulb
                  size={16}
                  strokeWidth={1.5}
                  className={cn(
                    showUrgentPrototype
                      ? 'text-foreground group-hover:text-hi-contrast'
                      : 'text-foreground-light group-hover:text-foreground',
                    !showUrgentPrototype &&
                      isOpen &&
                      'text-background group-hover:text-background'
                  )}
                />
              </motion.span>
              {showUrgentPrototype && (
                <motion.span
                  className="min-w-0 overflow-hidden"
                  aria-hidden={!isPrototypeExpanded}
                  animate={{
                    opacity: isPrototypeExpanded ? 1 : 0,
                    x: isPrototypeExpanded ? 0 : -8,
                    maxWidth: isPrototypeExpanded ? labelMaxWidth : 0,
                  }}
                  transition={reducedMotion ? { duration: 0.12 } : { duration: 0.2 }}
                >
                  <AdvisorUrgentLabel
                    label={ADVISOR_URGENT_PROTOTYPE.label}
                    isMarquee={shouldUseMarquee}
                    reducedMotion={reducedMotion}
                  />
                </motion.span>
              )}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent>
          {showUrgentPrototype ? (
            <div className="space-y-1">
              <div>Advisor Center</div>
              <div className="text-xs text-foreground-light">
                {ADVISOR_URGENT_PROTOTYPE.label}
              </div>
            </div>
          ) : (
            'Advisor Center'
          )}
        </TooltipContent>
      </Tooltip>
      {statusDotClassName ? (
        <span
          data-testid="advisor-status-indicator"
          className={cn(
            'pointer-events-none absolute top-1.5 right-1.5 z-20 h-1.5 w-1.5 rounded-full ring-2 ring-background',
            statusDotClassName
          )}
        />
      ) : null}
    </div>
  )
}
