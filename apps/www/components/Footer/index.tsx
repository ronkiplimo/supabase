'use client'

import { REALTIME_CHANNEL_STATES } from '@supabase/supabase-js'
import supabase from '~/lib/supabase'
import supabaseLogoWordmarkDark from 'common/assets/images/supabase-logo-wordmark--dark.svg'
import supabaseLogoWordmarkLight from 'common/assets/images/supabase-logo-wordmark--light.svg'
import footerData from 'data/Footer'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Badge, cn, IconDiscord, IconGitHubSolid, IconTwitterX, IconYoutubeSolid } from 'ui'
import { ThemeToggle } from 'ui-patterns/ThemeToggle'

import useDarkLaunchWeeks from '../../hooks/useDarkLaunchWeeks'
import SectionContainer from '../Layouts/SectionContainer'

function Soc2Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" />
      <text
        x="50"
        y="34"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        fontWeight="500"
        fontFamily="system-ui, sans-serif"
        letterSpacing="3"
      >
        AICPA
      </text>
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fill="currentColor"
        fontSize="24"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        SOC2
      </text>
      <text
        x="50"
        y="72"
        textAnchor="middle"
        fill="currentColor"
        fontSize="10"
        fontWeight="500"
        fontFamily="system-ui, sans-serif"
        letterSpacing="3"
      >
        TYPE 2
      </text>
    </svg>
  )
}

function HipaaSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1" />

      <text
        x="50"
        y="50"
        textAnchor="middle"
        fill="currentColor"
        fontSize="16"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        HIPAA
      </text>
      <text
        x="50"
        y="64"
        textAnchor="middle"
        fill="currentColor"
        fontSize="7.5"
        fontWeight="500"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        COMPLIANT
      </text>
    </svg>
  )
}

interface Props {
  className?: string
  hideFooter?: boolean
}

const Footer = (props: Props) => {
  const pathname = usePathname()

  const isDarkLaunchWeek = useDarkLaunchWeeks()
  const isGAWeek = pathname?.includes('/ga-week')
  const forceDark = isDarkLaunchWeek

  useEffect(() => {
    const channel = supabase.channel('footer')
    if (channel.state === REALTIME_CHANNEL_STATES.closed) {
      channel.subscribe()
    }
    return () => {
      channel.unsubscribe()
    }
  }, [])

  if (props.hideFooter) {
    return null
  }

  return (
    <footer
      className={cn(
        'bg-alternative',
        isDarkLaunchWeek && 'bg-[#060809]',
        isGAWeek && 'dark:bg-alternative',
        props.className
      )}
    >
      <h2 id="footerHeading" className="sr-only">
        Footer
      </h2>
      <SectionContainer className="py-8">
        <div className="xl:grid xl:grid-cols-7 xl:gap-4">
          <div className="space-y-8 xl:col-span-2">
            <Link href="#" as="/" className="w-40">
              <Image
                src={supabaseLogoWordmarkLight}
                width={160}
                height={30}
                alt="Supabase Logo"
                className="dark:hidden"
                priority
              />
              <Image
                src={supabaseLogoWordmarkDark}
                width={160}
                height={30}
                alt="Supabase Logo"
                className="hidden dark:block"
                priority
              />
            </Link>
            <div className="flex space-x-5">
              <a
                href="https://twitter.com/supabase"
                className="text-foreground-lighter hover:text-foreground transition"
              >
                <span className="sr-only">Twitter</span>
                <IconTwitterX size={22} />
              </a>

              <a
                href="https://github.com/supabase"
                className="text-foreground-lighter hover:text-foreground transition"
              >
                <span className="sr-only">GitHub</span>
                <IconGitHubSolid size={22} />
              </a>

              <a
                href="https://discord.supabase.com/"
                className="text-foreground-lighter hover:text-foreground transition"
              >
                <span className="sr-only">Discord</span>
                <IconDiscord size={22} />
              </a>

              <a
                href="https://youtube.com/c/supabase"
                className="text-foreground-lighter hover:text-foreground transition"
              >
                <span className="sr-only">Youtube</span>
                <IconYoutubeSolid size={22} />
              </a>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 xl:col-span-5 xl:mt-0">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {footerData.map((segment) => {
                return (
                  <div key={`footer_${segment.title}`}>
                    <h6 className="text-foreground overwrite text-base">{segment.title}</h6>
                    <ul className="mt-4 space-y-2">
                      {segment.links.map(({ component: Component, ...link }, idx) => {
                        const children = (
                          <div
                            className={`text-sm transition-colors ${
                              link.url || Component
                                ? 'text-foreground-lighter hover:text-foreground'
                                : 'text-muted hover:text-foreground-lighter'
                            } `}
                          >
                            {link.text}
                            {!link.url && !Component && (
                              <div className="ml-2 inline text-xs xl:ml-0 xl:block 2xl:ml-2 2xl:inline">
                                <Badge>Coming soon</Badge>
                              </div>
                            )}
                          </div>
                        )

                        return (
                          <li key={`${segment.title}_link_${idx}`}>
                            {link.url ? (
                              link.url.startsWith('https') ? (
                                <a href={link.url}>{children}</a>
                              ) : (
                                <Link href={link.url}>{children}</Link>
                              )
                            ) : (
                              Component && <Component>{children}</Component>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="border-muted mt-32 flex flex-wrap items-center justify-between gap-4 border-t pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <small className="small">&copy; Supabase Inc</small>
            <span className="text-foreground-muted text-xs">·</span>
            <span className="flex items-center gap-1.5 text-foreground-muted text-xs">
              <Soc2Seal className="w-5 h-5 shrink-0" />
              SOC2 Type 2
            </span>
            <span className="text-foreground-muted text-xs">·</span>
            <span className="flex items-center gap-1.5 text-foreground-muted text-xs">
              <HipaaSeal className="w-5 h-5 shrink-0" />
              HIPAA Compliant
            </span>
          </div>
          <div className={cn(forceDark && 'hidden')}>
            <ThemeToggle forceDark={forceDark} />
          </div>
        </div>
      </SectionContainer>
    </footer>
  )
}

export default Footer
