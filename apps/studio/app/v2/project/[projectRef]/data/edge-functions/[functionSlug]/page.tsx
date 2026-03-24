'use client'

import { useParams } from 'next/navigation'

import { useV2Params } from '@/app/v2/V2ParamsContext'
import { EdgeFunctionOverviewPageContent } from '@/components/interfaces/Functions/EdgeFunctionDetails/EdgeFunctionOverviewPageContent'
import EdgeFunctionDetailsLayout from '@/components/layouts/EdgeFunctionsLayout/EdgeFunctionDetailsLayout'
import { RouteParamsOverrideProvider } from 'common'

export default function V2EdgeFunctionDetailPage() {
  const params = useParams()
  const { projectRef } = useV2Params()
  const slug = params?.functionSlug as string

  if (!projectRef || !slug) return null

  return (
    <RouteParamsOverrideProvider value={{ ref: projectRef, functionSlug: slug }}>
      <EdgeFunctionDetailsLayout title="Overview">
        <EdgeFunctionOverviewPageContent />
      </EdgeFunctionDetailsLayout>
    </RouteParamsOverrideProvider>
  )
}
