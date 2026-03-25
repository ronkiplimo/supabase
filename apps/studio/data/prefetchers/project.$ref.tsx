import { useQueryClient } from '@tanstack/react-query'
import { useRouter as useAppRouter } from 'next/navigation'
import { useRouter as useCompatRouter } from 'next/compat/router'
import { useCallback, type PropsWithChildren } from 'react'

import { prefetchProjectDetail } from 'data/projects/project-detail-query'
import PrefetchableLink, { type PrefetchableLinkProps } from './PrefetchableLink'

export function usePrefetchProjectIndexPage() {
  const compatRouter = useCompatRouter()
  const appRouter = useAppRouter()
  const queryClient = useQueryClient()

  return useCallback(
    ({ projectRef, path }: { projectRef?: string; path: string }) => {
      // App Router routes (e.g. `/v2/project/...`) must use `next/navigation` prefetch.
      if (path.startsWith('/v2/')) {
        void appRouter.prefetch(path)
      } else if (compatRouter) {
        void compatRouter.prefetch(path)
      } else {
        void appRouter.prefetch(path)
      }

      if (projectRef) {
        prefetchProjectDetail(queryClient, { ref: projectRef }).catch(() => {
          // eat prefetching errors as they are not critical
        })
      }
    },
    [queryClient, compatRouter, appRouter]
  )
}

interface ProjectIndexPageLinkProps extends Omit<PrefetchableLinkProps, 'href' | 'prefetcher'> {
  projectRef?: string
  href?: PrefetchableLinkProps['href']
}

export function ProjectIndexPageLink({
  href,
  projectRef,
  children,
  ...props
}: PropsWithChildren<ProjectIndexPageLinkProps>) {
  const prefetch = usePrefetchProjectIndexPage()
  const resolvedHref = href ?? `/project/${projectRef}`

  return (
    <PrefetchableLink
      href={resolvedHref}
      prefetcher={() => prefetch({ projectRef, path: resolvedHref })}
      {...props}
    >
      {children}
    </PrefetchableLink>
  )
}
