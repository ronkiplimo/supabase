'use client'

import { useQuery } from '@tanstack/react-query'
import { useUsersCountQuery } from 'data/auth/users-count-query'
import { useDatabaseExtensionsQuery } from 'data/database-extensions/database-extensions-query'
import { useDatabaseFunctionsQuery } from 'data/database-functions/database-functions-query'
import { useDatabasePublicationsQuery } from 'data/database-publications/database-publications-query'
import { useDatabaseRolesQuery } from 'data/database-roles/database-roles-query'
import { useIndexesQuery } from 'data/database-indexes/indexes-query'
import { useEdgeFunctionsQuery } from 'data/edge-functions/edge-functions-query'
import { useEnumeratedTypesQuery } from 'data/enumerated-types/enumerated-types-query'
import { useOAuthServerAppsQuery } from 'data/oauth-server-apps/oauth-server-apps-query'
import { useProjectDetailQuery } from 'data/projects/project-detail-query'
import { useTablesQuery } from 'data/tables/tables-query'
import { usePaginatedBucketsQuery } from 'data/storage/buckets-query'
import { thirdPartyAuthIntegrationsQueryOptions } from 'data/third-party-auth/integrations-query'

export function useV2DataCounts(projectRef: string | undefined) {
  const { data: project } = useProjectDetailQuery(
    { ref: projectRef },
    { enabled: Boolean(projectRef) }
  )
  const conn = project?.connectionString

  const { data: tables } = useTablesQuery(
    { projectRef, connectionString: conn, schema: 'public' },
    { enabled: Boolean(projectRef) }
  )
  const { data: usersCount } = useUsersCountQuery({ projectRef }, { enabled: Boolean(projectRef) })
  const { data: bucketsPages } = usePaginatedBucketsQuery(
    { projectRef },
    { enabled: Boolean(projectRef) }
  )
  const bucketsList = bucketsPages?.pages?.flatMap((p) => p) ?? []
  const { data: edgeFunctions } = useEdgeFunctionsQuery(
    { projectRef },
    { enabled: Boolean(projectRef) }
  )
  const { data: extensions } = useDatabaseExtensionsQuery(
    { projectRef, connectionString: conn },
    { enabled: Boolean(projectRef) }
  )
  const { data: roles } = useDatabaseRolesQuery(
    { projectRef, connectionString: conn },
    { enabled: Boolean(projectRef) }
  )
  const { data: publications } = useDatabasePublicationsQuery(
    { projectRef, connectionString: conn },
    { enabled: Boolean(projectRef) }
  )
  const { data: types } = useEnumeratedTypesQuery(
    { projectRef, connectionString: conn },
    { enabled: Boolean(projectRef) }
  )
  const { data: dbFunctions } = useDatabaseFunctionsQuery(
    { projectRef, connectionString: conn },
    { enabled: Boolean(projectRef) }
  )

  const { data: indexes } = useIndexesQuery(
    { projectRef, connectionString: conn, schema: 'public' },
    { enabled: Boolean(projectRef) && Boolean(conn) }
  )

  const { data: thirdPartyAuth } = useQuery(
    thirdPartyAuthIntegrationsQueryOptions({ projectRef })
  )

  const { data: oauthAppsData } = useOAuthServerAppsQuery({ projectRef })

  return {
    tables: Array.isArray(tables) ? tables.length : 0,
    users: usersCount?.count ?? 0,
    buckets: bucketsList.length,
    edgeFunctions: edgeFunctions?.length ?? 0,
    extensions: extensions?.length ?? 0,
    roles: roles?.length ?? 0,
    publications: publications?.length ?? 0,
    types: types?.length ?? 0,
    functions: dbFunctions?.length ?? 0,
    indexes: Array.isArray(indexes) ? indexes.length : 0,
    providers: Array.isArray(thirdPartyAuth) ? thirdPartyAuth.length : 0,
    oauthApps: oauthAppsData?.clients?.length ?? 0,
    /** Realtime channels — v2 data UI is not wired to an API yet */
    channels: 0,
  }
}
