import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'
import type { Agent } from './types'

export type AgentUpdateVariables = {
  projectRef: string
  id: string
  name: string
  summary?: string
  system_prompt?: string
  tools?: string[]
}

export async function updateAgent({
  projectRef,
  id,
  ...body
}: AgentUpdateVariables): Promise<Agent> {
  return requestAgentApi(`/api/platform/project-meta/${projectRef}/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export const useAgentUpdateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAgent,
    async onSuccess(_data, variables) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.list(variables.projectRef) }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agent(variables.projectRef, variables.id),
        }),
      ])
      toast.success('Agent updated')
    },
    onError(err: Error) {
      toast.error(`Failed to update agent: ${err.message}`)
    },
  })
}
