import { LOCAL_STORAGE_KEYS, useConstant } from 'common'
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

type PersistedRoleImpersonationState = {
  role: 'anon' | 'authenticated' | 'service_role'
  userId?: string
}

function getStorageKey(projectRef: string) {
  return LOCAL_STORAGE_KEYS.ROLE_IMPERSONATION(projectRef)
}

export function saveRoleImpersonationToLocalStorage(
  projectRef: string,
  state: PersistedRoleImpersonationState | undefined
) {
  const storageKey = getStorageKey(projectRef)
  if (!state) {
    localStorage.removeItem(storageKey)
    sessionStorage.removeItem(storageKey)
    return
  }
  const value = JSON.stringify(state)
  localStorage.setItem(storageKey, value)
  sessionStorage.setItem(storageKey, value)
}

export function loadRoleImpersonationFromLocalStorage(
  projectRef: string
): PersistedRoleImpersonationState | undefined {
  const storageKey = getStorageKey(projectRef)
  const jsonStr = sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey)
  if (!jsonStr) return undefined
  try {
    return JSON.parse(jsonStr) as PersistedRoleImpersonationState
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
      if (claims) {
        roleImpersonationState.claims = claims
      }

      saveRoleImpersonationToLocalStorage(projectRef, roleToState(role))
    },
  })

  return roleImpersonationState
}

function roleToState(role: ImpersonationRole | undefined): PersistedRoleImpersonationState | undefined {
  if (!role || role.type !== 'postgrest' || role.role === 'service_role') return undefined
  if (role.role === 'anon') return { role: 'anon' }
  if (role.role === 'authenticated' && role.userType === 'native' && role.user?.id) {
    return { role: 'authenticated', userId: role.user.id }
  }
  return undefined
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

export function useSyncRoleImpersonationState() {
  const state = useRoleImpersonationStateSnapshot()
  const { data: project } = useSelectedProjectQuery()
  const { connectionString } = useConnectionStringForReadOps()
  const customAccessTokenHookDetails = useCustomAccessTokenHookDetails(project?.ref)

  const [urlRole, setUrlRole] = useQueryState('role', parseAsString)
  const [urlUserId, setUrlUserId] = useQueryState('userId', parseAsString)

  const hasInitialized = useRef(false)

  const role = state.role

  // Determine which userId we need to fetch user data for
  // Priority: URL param (shared links) > localStorage
  const storedState = project?.ref
    ? loadRoleImpersonationFromLocalStorage(project.ref)
    : undefined
  const targetUserId =
    urlUserId ?? (storedState?.role === 'authenticated' ? storedState.userId : undefined)

  const { data: user } = useUserQuery(
    { projectRef: project?.ref, connectionString, userId: targetUserId },
    { enabled: !hasInitialized.current && !!targetUserId }
  )

  // Initialization: read from localStorage (primary) or URL params (fallback for shared links)
  useEffect(() => {
    if (hasInitialized.current) return

    const projectRef = project?.ref
    if (!projectRef) return

    const fromStorage = loadRoleImpersonationFromLocalStorage(projectRef)

    if (fromStorage) {
      if (fromStorage.role === 'anon') {
        hasInitialized.current = true
        state.setRole({ type: 'postgrest', role: 'anon' }, customAccessTokenHookDetails)
      } else if (fromStorage.role === 'authenticated' && fromStorage.userId) {
        // Need user data before we can set the role
        if (!user) return
        hasInitialized.current = true
        state.setRole(
          { type: 'postgrest', role: 'authenticated', userType: 'native', user },
          customAccessTokenHookDetails
        )
      } else {
        hasInitialized.current = true
      }
      return
    }

    // Fallback: URL params (for shared links)
    if (!urlRole) {
      hasInitialized.current = true
      return
    }

    if (urlRole === 'authenticated' && urlUserId && !user) return

    hasInitialized.current = true

    if (urlRole === 'anon') {
      state.setRole({ type: 'postgrest', role: 'anon' }, customAccessTokenHookDetails)
    } else if (urlRole === 'authenticated' && user) {
      state.setRole(
        { type: 'postgrest', role: 'authenticated', userType: 'native', user },
        customAccessTokenHookDetails
      )
    }
  }, [urlRole, urlUserId, user, state, customAccessTokenHookDetails, project?.ref])

  // State → URL params: keep URL in sync for shareability
  // localStorage is already kept in sync by valtio's setRole
  useEffect(() => {
    if (!hasInitialized.current) return

    if (!role || role.type !== 'postgrest' || role.role === 'service_role') {
      setUrlRole(null)
      setUrlUserId(null)
    } else if (role.role === 'anon') {
      setUrlRole('anon')
      setUrlUserId(null)
    } else if (role.role === 'authenticated' && role.userType === 'native' && role.user?.id) {
      setUrlRole('authenticated')
      setUrlUserId(role.user.id)
    } else {
      setUrlRole(null)
      setUrlUserId(null)
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
  saveRoleImpersonationToLocalStorage(projectRef, {
    role: 'authenticated',
    userId,
  })

  const basePath =
    path === 'editor' ? `/project/${projectRef}/editor` : `/project/${projectRef}/sql/new`
  return `${basePath}`
}