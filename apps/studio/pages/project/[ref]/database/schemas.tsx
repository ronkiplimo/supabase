import dynamic from 'next/dynamic'
import { ReactFlowProvider } from '@xyflow/react'
import { useRouter } from 'next/router'

import { isSchemaGraphMockPreset } from '@/components/interfaces/Database/Schemas/Schemas.utils'
import DatabaseLayout from '@/components/layouts/DatabaseLayout/DatabaseLayout'
import DefaultLayout from '@/components/layouts/DefaultLayout'
import type { NextPageWithLayout } from '@/types'

const SchemaGraph = dynamic(
  () => import('@/components/interfaces/Database/Schemas/SchemaGraph').then((module) => module.SchemaGraph),
  { ssr: false }
)

const SchemaGraphTldraw = dynamic(
  () =>
    import('@/components/interfaces/Database/Schemas/SchemaGraphTldraw').then(
      (module) => module.SchemaGraphTldraw
    ),
  { ssr: false }
)

const SchemasPage: NextPageWithLayout = () => {
  const router = useRouter()
  const renderer = router.query.renderer === 'reactflow' ? 'reactflow' : 'tldraw'
  const mockPreset = isSchemaGraphMockPreset(router.query.mock) ? router.query.mock : undefined

  return (
    <div className="flex w-full h-full flex-col">
      {renderer === 'reactflow' ? (
        <ReactFlowProvider>
          <SchemaGraph mockPreset={mockPreset} />
        </ReactFlowProvider>
      ) : (
        <SchemaGraphTldraw mockPreset={mockPreset} />
      )}
    </div>
  )
}

SchemasPage.getLayout = (page) => (
  <DefaultLayout>
    <DatabaseLayout title="Schema Visualizer">{page}</DatabaseLayout>
  </DefaultLayout>
)

export default SchemasPage
