'use client'

import { InstanceConfiguration } from 'components/interfaces/Settings/Infrastructure/InfrastructureConfiguration/InstanceConfiguration'
import { ReactFlowProvider } from '@xyflow/react'

export function HomeViewInfrastructureDiagram() {
  return (
    <ReactFlowProvider>
      <InstanceConfiguration diagramOnly />
    </ReactFlowProvider>
  )
}
