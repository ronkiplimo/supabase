'use client'

import { useAuth } from 'common'
import { SessionTimeoutModal } from 'components/interfaces/SignIn/SessionTimeoutModal'
import { usePermissionsQuery } from 'data/permissions/permissions-query'
import { useAuthenticatorAssuranceLevelQuery } from 'data/profile/mfa-authenticator-assurance-level-query'
import { useSignOut } from 'lib/auth'
import { BASE_PATH, IS_PLATFORM } from 'lib/constants'
import { useRouter, useParams } from 'next/navigation'
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

const MAX_TIMEOUT = 10000 // 10 seconds

export function V2AuthGuard({ children }: PropsWithChildren) {
  // Ignore auth in self-hosted just like withAuth
  if (!IS_PLATFORM) {
    return children
  }

  const router = useRouter()
  const signOut = useSignOut()
  const { isLoading, session } = useAuth()
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const [isSessionTimeoutModalOpen, setIsSessionTimeoutModalOpen] = useState(false)

  const {
    isPending: isAALLoading,
    data: aalData,
    isError: isErrorAAL,
    error: errorAAL,
  } = useAuthenticatorAssuranceLevelQuery()

  useEffect(() => {
    if (isErrorAAL) {
      toast.error(
        `Failed to fetch authenticator assurance level: ${errorAAL?.message}. Try refreshing your browser, or reach out to us via a support ticket if the issue persists`
      )
    }
  }, [isErrorAAL, errorAAL])

  const { isError: isErrorPermissions, error: errorPermissions } = usePermissionsQuery()

  useEffect(() => {
    if (isErrorPermissions) {
      toast.error(
        `Failed to fetch permissions: ${errorPermissions?.message}. Try refreshing your browser, or reach out to us via a support ticket if the issue persists`
      )
    }
  }, [isErrorPermissions, errorPermissions])

  const isLoggedIn = Boolean(session)
  const isFinishedLoading = !isLoading && !isAALLoading

  const redirectToSignIn = useCallback(() => {
    let pathname = location.pathname
    if (BASE_PATH) {
      pathname = pathname.replace(BASE_PATH, '')
    }

    if (pathname === '/sign-in') {
      return
    }

    const searchParams = new URLSearchParams(location.search)
    searchParams.set('returnTo', pathname)

    signOut().finally(() => {
      const signInUrl = `/sign-in?${searchParams.toString()}`
      if (router) {
        router.push(signInUrl)
      } else if (typeof window !== 'undefined') {
        window.location.assign(signInUrl)
      }
    })
  }, [router, signOut])

  useEffect(() => {
    if (!isFinishedLoading) {
      timeoutIdRef.current = setTimeout(() => {
        setIsSessionTimeoutModalOpen(true)
      }, MAX_TIMEOUT)
    } else if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [isFinishedLoading])

  const isCorrectLevel = aalData?.currentLevel === aalData?.nextLevel
  const shouldRedirect = isFinishedLoading && (!isLoggedIn || !isCorrectLevel)

  useEffect(() => {
    if (!shouldRedirect) return
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
    redirectToSignIn()
  }, [redirectToSignIn, shouldRedirect])

  const params = useParams()
  const projectRef =
    typeof params?.projectRef === 'string' ? (params.projectRef as string) : undefined

  const supportContext = projectRef ? { projectRef } : undefined

  return (
    <>
      <SessionTimeoutModal
        visible={isSessionTimeoutModalOpen}
        onClose={() => setIsSessionTimeoutModalOpen(false)}
        redirectToSignIn={redirectToSignIn}
        supportContext={supportContext}
      />
      {children}
    </>
  )
}

