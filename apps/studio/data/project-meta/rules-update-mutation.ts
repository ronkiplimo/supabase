import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'
import type { Rule } from './types'

export type RuleUpdateVariables = {
  projectRef: string
  id: string
  title: string
  description?: string
  default_message?: string
  sql_query?: string | null
  edge_function_name?: string | null
  schedule: string
  enabled: boolean
}

export async function updateRule({
  projectRef,
  id,
  ...body
}: RuleUpdateVariables): Promise<Rule> {
  return requestAgentApi(`/api/platform/project-meta/${projectRef}/rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export const useRuleUpdateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRule,
    async onSuccess(_data, variables) {
      await queryClient.invalidateQueries({ queryKey: projectMetaKeys.rules(variables.projectRef) })
      toast.success('Rule updated')
    },
    onError(err: Error) {
      toast.error(`Failed to update rule: ${err.message}`)
    },
  })
}
