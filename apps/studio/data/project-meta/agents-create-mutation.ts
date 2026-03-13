import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchPost } from 'data/fetchers'
import { projectMetaKeys } from './keys'
import type { Agent } from './types'

export type AgentCreateVariables = {
  projectRef: string
  name: string
  summary?: string
  system_prompt?: string
  tools?: string[]
}

export async function createAgent({
  projectRef,
  ...body
}: AgentCreateVariables): Promise<Agent> {
  const response = await fetchPost(`/api/platform/project-meta/${projectRef}/agents`, body)
  if (response.error) throw new Error(response.error.message)
  return response as Agent
}

export const useAgentCreateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAgent,
    async onSuccess(_data, variables) {
      await queryClient.invalidateQueries({ queryKey: projectMetaKeys.list(variables.projectRef) })
      toast.success('Agent created')
    },
    onError(err: Error) {
      toast.error(`Failed to create agent: ${err.message}`)
    },
  })
}
