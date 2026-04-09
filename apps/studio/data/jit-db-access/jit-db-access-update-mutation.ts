import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { jitDbAccessKeys } from './keys'
import { JIT_DB_ACCESS_PRODUCT_NAME_LOWER } from '@/components/interfaces/Settings/Database/JitDatabaseAccess/JitDbAccess.constants'
import { handleError, put } from '@/data/fetchers'
import type { ResponseError, UseCustomMutationOptions } from '@/types'

type JitDbAccessUpdateVariables = {
  projectRef: string
  requestedConfig: { state: 'enabled' | 'disabled' | 'unavailable' }
}

async function updateJitDbAccess({ projectRef, requestedConfig }: JitDbAccessUpdateVariables) {
  if (!projectRef) throw new Error('projectRef is required')

  const { data, error } = await put(`/v1/projects/{ref}/jit-access`, {
    params: { path: { ref: projectRef } },
    body: requestedConfig,
  })

  if (error) handleError(error)
  return data
}

type JitDbAccessUpdateData = Awaited<ReturnType<typeof updateJitDbAccess>>

export const useJitDbAccessUpdateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseCustomMutationOptions<JitDbAccessUpdateData, ResponseError, JitDbAccessUpdateVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()

  return useMutation<JitDbAccessUpdateData, ResponseError, JitDbAccessUpdateVariables>({
    mutationFn: (vars) => updateJitDbAccess(vars),

    async onSuccess(data, variables, context) {
      const { projectRef } = variables
      await queryClient.invalidateQueries({ queryKey: jitDbAccessKeys.list(projectRef) })
      await onSuccess?.(data, variables, context)
    },
    async onError(data, variables, context) {
      if (onError === undefined) {
        toast.error(`Failed to update ${JIT_DB_ACCESS_PRODUCT_NAME_LOWER}: ${data.message}`)
      } else {
        onError(data, variables, context)
      }
    },
    ...options,
  })
}
