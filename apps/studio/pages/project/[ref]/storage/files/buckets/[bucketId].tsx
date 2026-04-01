import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'common'
import { DeleteBucketModal } from 'components/interfaces/Storage/DeleteBucketModal'
import { EditBucketModal } from 'components/interfaces/Storage/EditBucketModal'
import { EmptyBucketModal } from 'components/interfaces/Storage/EmptyBucketModal'
import { useSelectedBucket } from 'components/interfaces/Storage/FilesBuckets/useSelectedBucket'
import { PUBLIC_BUCKET_TOOLTIP } from 'components/interfaces/Storage/Storage.constants'
import StorageBucketsError from 'components/interfaces/Storage/StorageBucketsError'
import { StorageExplorer } from 'components/interfaces/Storage/StorageExplorer/StorageExplorer'
import { useBucketPolicyCount } from 'components/interfaces/Storage/useBucketPolicyCount'
import DefaultLayout from 'components/layouts/DefaultLayout'
import { PageLayout } from 'components/layouts/PageLayout/PageLayout'
import StorageLayout from 'components/layouts/StorageLayout/StorageLayout'
import { executeSql } from 'data/sql/execute-sql-query'
import { ChevronDown, FolderOpen, Settings, Shield, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { parseAsBoolean, useQueryState } from 'nuqs'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { NextPageWithLayout } from 'types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'ui'
import { Admonition } from 'ui-patterns'

import { storageKeys } from '@/data/storage/keys'
import { usePublicBucketsWithSelectPoliciesQuery } from '@/data/storage/public-buckets-with-select-policies-query'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { StorageExplorerStateContextProvider } from '@/state/storage-explorer'

const BucketPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { bucketId, ref } = useParams()
  const { data: bucket, error, isSuccess, isError } = useSelectedBucket()

  const [showEditModal, setShowEditModal] = useQueryState(
    'edit',
    parseAsBoolean.withDefault(false).withOptions({ history: 'push', clearOnDefault: true })
  )
  const [showEmptyModal, setShowEmptyModal] = useQueryState(
    'empty',
    parseAsBoolean.withDefault(false).withOptions({ history: 'push', clearOnDefault: true })
  )
  const [showDeleteModal, setShowDeleteModal] = useQueryState(
    'delete',
    parseAsBoolean.withDefault(false).withOptions({ history: 'push', clearOnDefault: true })
  )

  const { getPolicyCount } = useBucketPolicyCount()
  const policyCount = bucket ? getPolicyCount(bucket.id) : 0

  const { data: project } = useSelectedProjectQuery()
  const queryClient = useQueryClient()
  const [showRemovePolicyModal, setShowRemovePolicyModal] = useState(false)

  const { data: listablePoliciesData } = usePublicBucketsWithSelectPoliciesQuery({
    projectRef: ref,
    connectionString: project?.connectionString,
  })
  const matchingPolicies = listablePoliciesData?.filter((row) => row.bucket_id === bucket?.id) ?? []
  const policyToRemove = matchingPolicies[0]

  const { mutate: removeSelectPolicy, isPending: isRemovingPolicy } = useMutation({
    mutationFn: async (policyname: string) => {
      await executeSql({
        projectRef: ref!,
        connectionString: project?.connectionString,
        sql: `DROP POLICY IF EXISTS "${policyname}" ON storage.objects;`,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: storageKeys.publicBucketsWithSelectPolicies(ref),
      })
      setShowRemovePolicyModal(false)
      toast.success('Policy removed successfully')
    },
  })

  useEffect(() => {
    if (isSuccess && !bucket) {
      toast.info(`Bucket "${bucketId}" does not exist in your project`)
      router.push(`/project/${ref}/storage/files`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  if (isError) {
    return <StorageBucketsError error={error} />
  }

  return (
    <StorageExplorerStateContextProvider key={`storage-explorer-state-${ref}`}>
      <PageLayout
        size="full"
        isCompact
        className="[&>div:first-child]:!border-b-0" // Override the border-b from ScaffoldContainer
        title={
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="truncate">{bucketId}</span>
            {bucket?.public && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="warning" className="flex flex-shrink-0">
                    Public
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom">{PUBLIC_BUCKET_TOOLTIP}</TooltipContent>
              </Tooltip>
            )}
          </div>
        }
        breadcrumbs={[
          {
            label: 'Files',
            href: `/project/${ref}/storage/files`,
          },
          {
            label: 'Buckets',
            href: `/project/${ref}/storage/files`,
          },
        ]}
        primaryActions={
          <>
            <Button
              asChild
              type="default"
              icon={<Shield size={14} />}
              iconRight={
                policyCount > 0 ? (
                  <span className="w-4 h-4 bg-surface-200 text-foreground-light text-xs rounded-full flex items-center justify-center font-medium">
                    {policyCount}
                  </span>
                ) : undefined
              }
            >
              <Link
                href={`/project/${ref}/storage/files/policies?search=${encodeURIComponent(bucket?.name ?? '')}`}
              >
                Policies
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="default" iconRight={<ChevronDown size={14} />}>
                  Edit bucket
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  onClick={() => setShowEditModal(true)}
                >
                  <Settings size={12} />
                  <p>Bucket settings</p>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  onClick={() => setShowEmptyModal(true)}
                >
                  <FolderOpen size={12} />
                  <p>Empty bucket</p>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center space-x-2"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 size={12} />
                  <p>Delete bucket</p>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <div className="flex-1 min-h-0 px-6 pb-6 flex flex-col gap-4">
          {policyToRemove && (
            <Admonition
              type="warning"
              layout="horizontal"
              title="Object listing is enabled on this bucket"
              description="A SELECT policy on storage.objects makes all objects in this bucket enumerable. Public buckets don't require SELECT policies. This may have been added unintentionally."
              actions={
                <Button type="warning" size="tiny" onClick={() => setShowRemovePolicyModal(true)}>
                  Remove policy
                </Button>
              }
            />
          )}
          <div className="flex-1 min-h-0">
            <StorageExplorer />
          </div>
        </div>
      </PageLayout>

      {policyToRemove && (
        <AlertDialog open={showRemovePolicyModal} onOpenChange={setShowRemovePolicyModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove SELECT policy</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-3">
                  <p>
                    The following policy will be dropped from{' '}
                    <span className="text-foreground font-mono">storage.objects</span>:
                  </p>
                  <p className="font-mono text-foreground">{policyToRemove.policyname}</p>
                  <p>This will run:</p>
                  <pre className="bg-surface-200 rounded px-3 py-2 text-xs text-foreground font-mono whitespace-pre-wrap">
                    {`DROP POLICY IF EXISTS "${policyToRemove.policyname}" ON storage.objects;`}
                  </pre>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isRemovingPolicy}
                onClick={() => removeSelectPolicy(policyToRemove.policyname)}
              >
                Remove policy
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {bucket && (
        <>
          <EditBucketModal
            visible={showEditModal}
            bucket={bucket}
            onClose={() => setShowEditModal(false)}
          />
          <EmptyBucketModal
            visible={showEmptyModal}
            bucket={bucket}
            onClose={() => setShowEmptyModal(false)}
          />
          <DeleteBucketModal
            visible={showDeleteModal}
            bucket={bucket}
            onClose={() => setShowDeleteModal(false)}
          />
        </>
      )}
    </StorageExplorerStateContextProvider>
  )
}

BucketPage.getLayout = (page) => (
  <DefaultLayout>
    <StorageLayout title="Buckets">{page}</StorageLayout>
  </DefaultLayout>
)

export default BucketPage
