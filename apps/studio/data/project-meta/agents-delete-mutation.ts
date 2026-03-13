import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'

export type AgentDeleteVariables = {
  projectRef: string
  id: string
}

export async function deleteAgent({ projectRef, id }: AgentDeleteVariables) {
  return requestAgentApi<{ success: boolean }>(
    `/api/platform/project-meta/${projectRef}/agents/${id}`,
    {
      method: 'DELETE',
    }
  )
}

export const useAgentDeleteMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAgent,
    async onSuccess(_data, variables) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.list(variables.projectRef) }),
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.tasks(variables.projectRef) }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agent(variables.projectRef, variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agentTasks(variables.projectRef, variables.id),
        }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agentLogs(variables.projectRef, variables.id),
        }),
      ])
      toast.success('Agent deleted')
    },
    onError(err: Error) {
      toast.error(`Failed to delete agent: ${err.message}`)
    },
  })
}
