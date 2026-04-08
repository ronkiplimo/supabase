import { literal } from '@supabase/pg-meta/src/pg-format'
import { useQuery } from '@tanstack/react-query'

import { storageKeys } from './keys'
import { isValidConnString } from '@/data/fetchers'
import { executeSql } from '@/data/sql/execute-sql-query'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { PROJECT_STATUS } from '@/lib/constants'
import type { ResponseError, UseCustomQueryOptions } from '@/types'

export type PublicBucketsWithSelectPoliciesVariables = {
  projectRef?: string
  connectionString?: string | null
  bucketId: string
}

export type ListablePublicBucketsVariables = {
  projectRef?: string
  connectionString?: string | null
}
export type PublicBucketSelectPolicy = {
  bucket_id: string
  bucket_name: string
  policyname: string
}

export type ListablePublicBucket = {
  bucket_id: string
  bucket_name: string
  created_at: string | null
  updated_at: string | null
  policy_count: number
  policy_names: string[]
}

const LISTABLE_BUCKET_POLICY_SQL =
  "COALESCE(p.qual, '') ~* ('bucket_id\\\\s*=\\\\s*' || quote_literal(b.id))"
/**
 * For the given public bucket, checks whether any SELECT policy on storage.objects
 * references this bucket's ID in its qual expression. This combination means anyone
 * can enumerate all objects in the bucket, which is usually unintentional — public
 * buckets don't require SELECT policies for object access by URL.
 *
 * Scoped to a single bucket so the query is a point-lookup rather than a full scan.
 */
async function getPublicBucketsWithSelectPolicies({
  projectRef,
  connectionString,
  bucketId,
}: PublicBucketsWithSelectPoliciesVariables) {
  const { result } = await executeSql<PublicBucketSelectPolicy[]>({
    projectRef,
    connectionString,
    sql: `
      SELECT b.id AS bucket_id, b.name AS bucket_name, p.policyname
      FROM storage.buckets b
      JOIN pg_policies p
        ON p.schemaname = 'storage'
        AND p.tablename = 'objects'
        AND p.cmd = 'SELECT'
      WHERE b.public = true
        AND b.id = ${literal(bucketId)}
        AND p.qual ~* ('bucket_id\\s*=\\s*' || quote_literal(b.id))
    `,
  })

  return result
}

export async function getListablePublicBuckets({
  projectRef,
  connectionString,
}: ListablePublicBucketsVariables) {
  const { result } = await executeSql<
    Array<{
      bucket_id: string
      bucket_name: string
      created_at: string | null
      updated_at: string | null
      policy_count: number | string
      policy_names: string[] | null
    }>
  >({
    projectRef,
    connectionString,
    sql: `
      SELECT
        b.id AS bucket_id,
        b.name AS bucket_name,
        b.created_at,
        b.updated_at,
        COUNT(*)::int AS policy_count,
        ARRAY_AGG(p.policyname ORDER BY p.policyname) AS policy_names
      FROM storage.buckets b
      JOIN pg_policies p
        ON p.schemaname = 'storage'
        AND p.tablename = 'objects'
        AND p.cmd = 'SELECT'
      WHERE b.public = true
        AND ${LISTABLE_BUCKET_POLICY_SQL}
      GROUP BY b.id, b.name, b.created_at, b.updated_at
      ORDER BY COALESCE(b.updated_at, b.created_at) DESC, b.name ASC
    `,
  })

  return result.map(
    (row): ListablePublicBucket => ({
      bucket_id: row.bucket_id,
      bucket_name: row.bucket_name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      policy_count: Number(row.policy_count),
      policy_names: Array.isArray(row.policy_names) ? row.policy_names : [],
    })
  )
}
export type PublicBucketsWithSelectPoliciesData = Awaited<
  ReturnType<typeof getPublicBucketsWithSelectPolicies>
>
export type PublicBucketsWithSelectPoliciesError = ResponseError

export type ListablePublicBucketsData = Awaited<ReturnType<typeof getListablePublicBuckets>>
export type ListablePublicBucketsError = ResponseError
export const usePublicBucketsWithSelectPoliciesQuery = <
  TData = PublicBucketsWithSelectPoliciesData,
>(
  { projectRef, connectionString, bucketId }: PublicBucketsWithSelectPoliciesVariables,
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
  const resolvedConnectionString = connectionString ?? project?.connectionString

  return useQuery<PublicBucketsWithSelectPoliciesData, PublicBucketsWithSelectPoliciesError, TData>(
    {
      queryKey: storageKeys.publicBucketsWithSelectPolicies(projectRef, bucketId),
      queryFn: () =>
        getPublicBucketsWithSelectPolicies({
          projectRef,
          connectionString: resolvedConnectionString,
          bucketId,
        }),
      enabled:
        enabled &&
        typeof projectRef !== 'undefined' &&
        isActive &&
        isValidConnString(resolvedConnectionString),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      ...options,
    }
  )
}

export const useListablePublicBucketsQuery = <TData = ListablePublicBucketsData>(
  { projectRef, connectionString }: ListablePublicBucketsVariables,
  {
    enabled = true,
    ...options
  }: UseCustomQueryOptions<ListablePublicBucketsData, ListablePublicBucketsError, TData> = {}
) => {
  const { data: project } = useSelectedProjectQuery()
  const isActive = project?.status === PROJECT_STATUS.ACTIVE_HEALTHY
  const resolvedConnectionString = connectionString ?? project?.connectionString

  return useQuery<ListablePublicBucketsData, ListablePublicBucketsError, TData>({
    queryKey: storageKeys.listablePublicBuckets(projectRef),
    queryFn: () =>
      getListablePublicBuckets({
        projectRef,
        connectionString: resolvedConnectionString,
      }),
    enabled:
      enabled &&
      typeof projectRef !== 'undefined' &&
      isActive &&
      isValidConnString(resolvedConnectionString),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  })
}
