import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'

export type AgentTaskDeleteVariables = {
  projectRef: string
  id: string
  agent_id: string
}

export async function deleteAgentTask({ projectRef, id }: AgentTaskDeleteVariables) {
  return requestAgentApi<{ success: boolean }>(
    `/api/platform/project-meta/${projectRef}/agent-tasks/${id}`,
    {
      method: 'DELETE',
    }
  )
}

export const useAgentTaskDeleteMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAgentTask,
    async onSuccess(_data, variables) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.tasks(variables.projectRef) }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agentTasks(variables.projectRef, variables.agent_id),
        }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agent(variables.projectRef, variables.agent_id),
        }),
        queryClient.invalidateQueries({
          queryKey: projectMetaKeys.agentLogs(variables.projectRef, variables.agent_id),
        }),
      ])
      toast.success('Task deleted')
    },
    onError(err: Error) {
      toast.error(`Failed to delete task: ${err.message}`)
    },
  })
}
