import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'
import type { AgentTask } from './types'

export type AgentTaskCreateVariables = {
  projectRef: string
  agent_id: string
  name: string
  description: string
  schedule: string
  is_unique?: boolean
  enabled?: boolean
}

export async function createAgentTask({
  projectRef,
  ...body
}: AgentTaskCreateVariables): Promise<AgentTask> {
  return requestAgentApi(`/api/platform/project-meta/${projectRef}/agent-tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const useAgentTaskCreateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAgentTask,
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
      toast.success('Task created')
    },
    onError(err: Error) {
      toast.error(`Failed to create task: ${err.message}`)
    },
  })
}
