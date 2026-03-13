import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'

export type RuleDeleteVariables = {
  projectRef: string
  id: string
}

export async function deleteRule({ projectRef, id }: RuleDeleteVariables) {
  return requestAgentApi<{ success: boolean }>(`/api/platform/project-meta/${projectRef}/rules/${id}`, {
    method: 'DELETE',
  })
}

export const useRuleDeleteMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRule,
    async onSuccess(_data, variables) {
      await queryClient.invalidateQueries({ queryKey: projectMetaKeys.rules(variables.projectRef) })
      toast.success('Rule deleted')
    },
    onError(err: Error) {
      toast.error(`Failed to delete rule: ${err.message}`)
    },
  })
}
