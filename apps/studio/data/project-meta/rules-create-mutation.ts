import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'
import type { Rule } from './types'

export type RuleCreateVariables = {
  projectRef: string
  title: string
  description?: string
  default_message?: string
  sql_query?: string | null
  edge_function_name?: string | null
  schedule: string
  enabled?: boolean
}

export async function createRule({ projectRef, ...body }: RuleCreateVariables): Promise<Rule> {
  return requestAgentApi(`/api/platform/project-meta/${projectRef}/rules`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export const useRuleCreateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRule,
    async onSuccess(_data, variables) {
      await queryClient.invalidateQueries({ queryKey: projectMetaKeys.rules(variables.projectRef) })
      toast.success('Rule created')
    },
    onError(err: Error) {
      toast.error(`Failed to create rule: ${err.message}`)
    },
  })
}
