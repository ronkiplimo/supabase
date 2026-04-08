import { LOCAL_STORAGE_KEYS, useConstant } from 'common'
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
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

// --- localStorage helpers ---

type PersistedRoleImpersonationState = {
  role: 'anon' | 'authenticated'
  userId?: string
}

function getStorageKey(projectRef: string) {
  return LOCAL_STORAGE_KEYS.ROLE_IMPERSONATION(projectRef)
}

function saveToLocalStorage(
  projectRef: string,
  state: PersistedRoleImpersonationState | undefined
) {
  const key = getStorageKey(projectRef)
  if (!state) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(state))
  }
}

function loadFromLocalStorage(projectRef: string): PersistedRoleImpersonationState | undefined {
  const key = getStorageKey(projectRef)
  const json = localStorage.getItem(key)
  if (!json) return undefined
  try {
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

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
      roleImpersonationState.claims = claims

      // Persist to localStorage
      if (!role || role.type !== 'postgrest') {
        saveToLocalStorage(projectRef, undefined)
      } else if (role.role === 'anon') {
        saveToLocalStorage(projectRef, { role: 'anon' })
      } else if (role.role === 'authenticated' && role.userType === 'native' && role.user?.id) {
        saveToLocalStorage(projectRef, { role: 'authenticated', userId: role.user.id })
      } else {
        saveToLocalStorage(projectRef, undefined)
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

/**
 * Reads localStorage on mount and initializes the valtio role impersonation state.
 * Called in SQLEditor and TableGridEditor.
 */
export function useSyncRoleImpersonationState() {
  const state = useRoleImpersonationStateSnapshot()
  const { data: project } = useSelectedProjectQuery()
  const { connectionString } = useConnectionStringForReadOps()
  const customAccessTokenHookDetails = useCustomAccessTokenHookDetails(project?.ref)

  const [isInitialized, setIsInitialized] = useState(false)

  const stored = project?.ref ? loadFromLocalStorage(project.ref) : undefined
  const storedRoleName = stored?.role
  const storedUserId = stored?.role === 'authenticated' ? stored.userId : undefined

  const { data: user } = useUserQuery(
    { projectRef: project?.ref, connectionString, userId: storedUserId },
    { enabled: !!storedUserId }
  )

  useEffect(() => {
    if (isInitialized) return
    if (!project?.ref) return

    if (storedRoleName === 'anon') {
      state.setRole({ type: 'postgrest', role: 'anon' }, customAccessTokenHookDetails)
      setIsInitialized(true)
      return
    }

    if (storedRoleName === 'authenticated' && storedUserId) {
      if (!user) return
      state.setRole(
        { type: 'postgrest', role: 'authenticated', userType: 'native', user },
        customAccessTokenHookDetails
      )
      setIsInitialized(true)
      return
    }

    setIsInitialized(true)
  }, [
    isInitialized,
    project?.ref,
    storedRoleName,
    storedUserId,
    user,
    state,
    customAccessTokenHookDetails,
  ])
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
  saveToLocalStorage(projectRef, { role: 'authenticated', userId })

  return path === 'editor' ? `/project/${projectRef}/editor` : `/project/${projectRef}/sql/new`
}
