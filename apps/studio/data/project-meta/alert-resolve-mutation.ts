import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectMetaKeys } from './keys'
import { requestAgentApi } from './request'
import type { Alert } from './types'

export type AlertResolveVariables = {
  projectRef: string
  id: string
  resolved_at: string | null
}

export async function updateAlertResolution({
  projectRef,
  id,
  resolved_at,
}: AlertResolveVariables): Promise<Alert> {
  return requestAgentApi(`/api/platform/project-meta/${projectRef}/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved_at }),
  })
}

export const useAlertResolveMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateAlertResolution,
    async onSuccess(_data, variables) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.alerts(variables.projectRef) }),
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.alerts(variables.projectRef, false) }),
        queryClient.invalidateQueries({ queryKey: projectMetaKeys.alerts(variables.projectRef, true) }),
      ])
      toast.success(variables.resolved_at ? 'Alert resolved' : 'Alert reopened')
    },
    onError(err: Error) {
      toast.error(`Failed to update alert: ${err.message}`)
    },
  })
}
