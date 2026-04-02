import { useQuery } from '@tanstack/react-query'
import { executeSql } from 'data/sql/execute-sql-query'
import { useSelectedProjectQuery } from 'hooks/misc/useSelectedProject'
import { PROJECT_STATUS } from 'lib/constants'
import type { ResponseError, UseCustomQueryOptions } from 'types'

import { storageKeys } from './keys'

export type PublicBucketsWithSelectPoliciesVariables = {
  projectRef?: string
  connectionString?: string | null
}

type PublicBucketWithSelectPolicy = {
  bucket_id: string
  bucket_name: string
  policyname: string
}

/**
 * Finds public buckets that have a SELECT policy on storage.objects referencing the bucket ID
 * in the policy's qual expression. This combination means any authenticated or anonymous user
 * can enumerate all objects in the bucket, which is usually unintentional — public buckets
 * don't require SELECT policies for object access by URL.
 */
async function getPublicBucketsWithSelectPolicies({
  projectRef,
  connectionString,
}: PublicBucketsWithSelectPoliciesVariables) {
  const { result } = await executeSql<PublicBucketWithSelectPolicy[]>({
    projectRef,
    connectionString,
    sql: `
      SELECT DISTINCT b.id AS bucket_id, b.name AS bucket_name, p.policyname
      FROM storage.buckets b
      JOIN pg_policies p
        ON p.schemaname = 'storage'
        AND p.tablename = 'objects'
        AND p.cmd = 'SELECT'
      WHERE b.public = true
        AND p.qual ~ ('bucket_id\s*=\s*' || quote_literal(b.id))
    `,
  })

  return result
}

export type PublicBucketsWithSelectPoliciesData = Awaited<
  ReturnType<typeof getPublicBucketsWithSelectPolicies>
>
export type PublicBucketsWithSelectPoliciesError = ResponseError

export const usePublicBucketsWithSelectPoliciesQuery = <
  TData = PublicBucketsWithSelectPoliciesData,
>(
  { projectRef, connectionString }: PublicBucketsWithSelectPoliciesVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<
    PublicBucketsWithSelectPoliciesData,
    PublicBucketsWithSelectPoliciesError,
    TData
  > = {}
) => {
  const { data: project } = useSelectedProjectQuery()
  const isActive = project?.status === PROJECT_STATUS.ACTIVE_HEALTHY

  const query = useQuery<
    PublicBucketsWithSelectPoliciesData,
    PublicBucketsWithSelectPoliciesError,
    TData
  >({
    queryKey: storageKeys.publicBucketsWithSelectPolicies(projectRef),
    queryFn: () => getPublicBucketsWithSelectPolicies({ projectRef, connectionString }),
    enabled: enabled && typeof projectRef !== 'undefined' && isActive,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })

  const isPublicBucketListable = (bucketId: string): boolean => {
    const data = query.data as PublicBucketsWithSelectPoliciesData | undefined
    return data?.some((row) => row.bucket_id === bucketId) ?? false
  }

  return { ...query, isPublicBucketListable }
}
