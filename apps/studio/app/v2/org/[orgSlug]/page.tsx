'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useOrgProjectsInfiniteQuery } from 'data/projects/org-projects-infinite-query'
import { useOrganizationsQuery } from 'data/organizations/organizations-query'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

import { V2OrgParamsProvider } from '@/app/v2/V2ParamsContext'

function OrgDashboardContent() {
  const params = useParams()
  const orgSlug = params?.orgSlug as string | undefined

  const { data: org } = useOrganizationsQuery({
    select: (orgs) => orgs?.find((o) => o.slug === orgSlug),
  })
  const { data: projectsData, isPending } = useOrgProjectsInfiniteQuery(
    { slug: orgSlug, limit: 50 },
    { enabled: Boolean(orgSlug) }
  )
  const projects = projectsData?.pages?.flatMap((p) => p.projects) ?? []

  if (!orgSlug) {
    return <p className="p-6 text-muted-foreground text-sm">Select an organization.</p>
  }

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-foreground mb-2">{org?.name ?? orgSlug}</h1>
      <p className="text-sm text-muted-foreground mb-4">Projects</p>
      {isPending ? (
        <ShimmeringLoader className="h-10 w-full rounded" />
      ) : (
        <ul className="space-y-2">
          {projects.map((proj) => (
            <li key={proj.ref}>
              <Link
                href={`/v2/project/${proj.ref}`}
                className="text-sm text-foreground hover:underline"
              >
                {proj.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function V2OrgPage() {
  return (
    <V2OrgParamsProvider>
      <OrgDashboardContent />
    </V2OrgParamsProvider>
  )
}
