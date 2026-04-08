import { useConstant } from 'common'
import { parseAsString, useQueryState } from 'nuqs'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef } from 'react'
import { proxy, snapshot, subscribe, useSnapshot } from 'valtio'

import {
  CustomAccessTokenHookDetails,
  useCustomAccessTokenHookDetails,
} from '../hooks/misc/useCustomAccessTokenHookDetails'
import { useUserQuery } from '@/data/auth/user-query'
import { useConnectionStringForReadOps } from '@/data/read-replicas/replicas-query'
import { executeSql } from '@/data/sql/execute-sql-query'
import useLatest from '@/hooks/misc/useLatest'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { getPostgrestClaims, ImpersonationRole } from '@/lib/role-impersonation'

export function createRoleImpersonationState(
  projectRef: string,
  customizeAccessTokenRef: {
    current: (args: {
      schema: string
      functionName: string
      claims: ReturnType<typeof getPostgrestClaims>
    }) => Promise<any>
  }
) {
  const roleImpersonationState = proxy({
    projectRef,
    role: undefined as ImpersonationRole | undefined,
    claims: undefined as ReturnType<typeof getPostgrestClaims> | undefined,

    setRole: async (
      role: ImpersonationRole | undefined,
      customAccessTokenHookDetails?: CustomAccessTokenHookDetails
    ) => {
      let claims = role?.type === 'postgrest' ? getPostgrestClaims(projectRef, role) : undefined

      if (customAccessTokenHookDetails?.type === 'postgres' && claims !== undefined) {
        const { schema, functionName } = customAccessTokenHookDetails
        const updatedClaims = await customizeAccessTokenRef.current({
          schema,
          functionName,
          claims,
        })
        if (updatedClaims) {
          claims = updatedClaims
        }
      }

      roleImpersonationState.role = role
      if (claims) {
        roleImpersonationState.claims = claims
      }
    },
  })

  return roleImpersonationState
}

export type RoleImpersonationState = ReturnType<typeof createRoleImpersonationState>

export const RoleImpersonationStateContext = createContext<RoleImpersonationState>(
  createRoleImpersonationState('', { current: async () => {} })
)

export const RoleImpersonationStateContextProvider = ({ children }: PropsWithChildren) => {
  const { data: project } = useSelectedProjectQuery()
  async function customizeAccessToken({
    schema,
    functionName,
    claims,
  }: {
    schema: string
    functionName: string
    claims: ReturnType<typeof getPostgrestClaims>
  }) {
    const event = { user_id: claims.sub, claims, authentication_method: 'password' }

    const result = await executeSql({
      projectRef: project?.ref,
      connectionString: project?.connectionString,
      sql: `select ${schema}.${functionName}('${JSON.stringify(event)}'::jsonb) as event;`,
      queryKey: ['customize-access-token', project?.ref],
    })

    return result?.result?.[0]?.event?.claims
  }

  const customizeAccessTokenRef = useLatest(customizeAccessToken)

  const state = useConstant(() =>
    createRoleImpersonationState(project?.ref ?? '', customizeAccessTokenRef)
  )

  return (
    <RoleImpersonationStateContext.Provider value={state}>
      {children}
    </RoleImpersonationStateContext.Provider>
  )
}

export function useRoleImpersonationStateSnapshot(options?: Parameters<typeof useSnapshot>[1]) {
  const roleImpersonationState = useContext(RoleImpersonationStateContext)

  return useSnapshot(roleImpersonationState, options)
}

export function useGetImpersonatedRoleState() {
  const roleImpersonationState = useContext(RoleImpersonationStateContext)

  return useCallback(
    // [Alaister]: typeof roleImpersonationState is needed to avoid readonly type errors everywhere
    () => snapshot(roleImpersonationState) as typeof roleImpersonationState,
    [roleImpersonationState]
  )
}

export function useSubscribeToImpersonatedRole(
  onChange: (role: ImpersonationRole | undefined) => void
) {
  const roleImpersonationState = useContext(RoleImpersonationStateContext)
  const onChangeRef = useLatest(onChange)

  useEffect(() => {
    return subscribe(roleImpersonationState, () => {
      onChangeRef.current(snapshot(roleImpersonationState).role)
    })
  }, [roleImpersonationState])
}

export function useSyncRoleImpersonationWithUrl() {
  const state = useRoleImpersonationStateSnapshot()
  const { data: project } = useSelectedProjectQuery()
  const { connectionString } = useConnectionStringForReadOps()
  const customAccessTokenHookDetails = useCustomAccessTokenHookDetails(project?.ref)

  const [urlRole, setUrlRole] = useQueryState('role', parseAsString)
  const [urlUserId, setUrlUserId] = useQueryState('userId', parseAsString)

  const hasInitializedFromUrl = useRef(false)

  const role = state.role

  const { data: user } = useUserQuery(
    { projectRef: project?.ref, connectionString, userId: urlUserId },
    { enabled: urlRole === 'authenticated' && !!urlUserId && !hasInitializedFromUrl.current }
  )

  // URL → State: one-time initialization from URL params
  useEffect(() => {
    if (hasInitializedFromUrl.current || !urlRole) return
    if (urlRole === 'authenticated' && urlUserId && !user) return

    hasInitializedFromUrl.current = true

    if (urlRole === 'anon') {
      state.setRole({ type: 'postgrest', role: 'anon' }, customAccessTokenHookDetails)
    } else if (urlRole === 'authenticated' && user) {
      state.setRole(
        { type: 'postgrest', role: 'authenticated', userType: 'native', user },
        customAccessTokenHookDetails
      )
    }
  }, [urlRole, urlUserId, user, state, customAccessTokenHookDetails])

  // State → URL: keep URL params in sync with role state.
  useEffect(() => {
    if (!role || role.type !== 'postgrest' || role.role === 'service_role') {
      setUrlRole(null)
      setUrlUserId(null)
    } else if (role.role === 'anon') {
      setUrlRole('anon')
      setUrlUserId(null)
    } else if (role.role === 'authenticated' && role.userType === 'native' && role.user?.id) {
      setUrlRole('authenticated')
      setUrlUserId(role.user.id)
    }
  }, [role, setUrlRole, setUrlUserId])
}

export function isRoleImpersonationEnabled(impersonationRole?: ImpersonationRole) {
  return impersonationRole?.type === 'postgrest'
}

export function buildRoleImpersonationUrl({
  projectRef,
  userId,
  path,
}: {
  projectRef: string
  userId: string
  path: 'editor' | 'sql'
}) {
  const basePath =
    path === 'editor' ? `/project/${projectRef}/editor` : `/project/${projectRef}/sql/new`
  return `${basePath}?role=authenticated&userId=${userId}`
}
