import { useDebounce } from '@uidotdev/usehooks'
import { useBreakpoint } from 'common'
import { BucketsTable } from 'components/interfaces/Storage/FilesBuckets/BucketsTable'
import AlertError from 'components/ui/AlertError'
import { InlineLink } from 'components/ui/InlineLink'
import { useProjectStorageConfigQuery } from 'data/config/project-storage-config-query'
import type { Bucket } from 'data/storage/buckets-query'
import { usePaginatedBucketsQuery } from 'data/storage/buckets-query'
import { IS_PLATFORM } from 'lib/constants'
import { formatBytes } from 'lib/helpers'
import { ChevronLeft, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from 'ui'
import { Admonition } from 'ui-patterns'
import { Input } from 'ui-patterns/DataInputs/Input'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { STORAGE_VIEWS } from '../Storage.constants'
import { StorageExplorer } from './StorageExplorer'
import type { StoragePickerReturnValue } from './StorageExplorerPickerContext'
import {
  StorageExplorerEmbeddedStateProvider,
  useStorageExplorerStateSnapshot,
} from '@/state/storage-explorer'

export type StorageFilePickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectRef: string
  returnValue?: StoragePickerReturnValue
  onSelect: (value: string) => void
  title?: string
}

/** Keeps list view when the picker is in mobile layout (sheet). */
function StoragePickerListViewSync({ enforceList }: { enforceList: boolean }) {
  const { setView } = useStorageExplorerStateSnapshot()

  useEffect(() => {
    if (enforceList) {
      setView(STORAGE_VIEWS.LIST)
    }
  }, [enforceList, setView])

  return null
}

function StorageFilePickerExplorer({
  projectRef,
  bucketId,
  returnValue,
  onSelect,
  forceListView,
}: {
  projectRef: string
  bucketId: string
  returnValue: StoragePickerReturnValue
  onSelect: (value: string) => void
  forceListView: boolean
}) {
  return (
    <StorageExplorerEmbeddedStateProvider
      projectRef={projectRef}
      bucketId={bucketId}
      persistExplorerPreferences={false}
      initialView={forceListView ? STORAGE_VIEWS.LIST : undefined}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <StoragePickerListViewSync enforceList={forceListView} />
        <StorageExplorer
          variant="picker"
          pickerReturnValue={returnValue}
          onPickerPick={onSelect}
          forceListView={forceListView}
          expectedBucketId={bucketId}
          className="h-full min-h-0 flex-1"
        />
      </div>
    </StorageExplorerEmbeddedStateProvider>
  )
}

function StorageFilePickerBucketsStep({
  projectRef,
  open,
  onSelectBucket,
}: {
  projectRef: string
  open: boolean
  onSelectBucket: (bucket: Bucket) => void
}) {
  const [filterString, setFilterString] = useState('')
  const debouncedFilter = useDebounce(filterString, 250)
  const normalizedSearch = debouncedFilter.trim()

  const { data: storageConfig } = useProjectStorageConfigQuery(
    { projectRef },
    { enabled: IS_PLATFORM && !!projectRef }
  )
  const formattedGlobalUploadLimit = formatBytes(storageConfig?.fileSizeLimit ?? 0)

  const {
    data: bucketsData,
    error: bucketsError,
    isError: isErrorBuckets,
    isPending: isLoadingBuckets,
    isSuccess: isSuccessBuckets,
    isFetching: isFetchingBuckets,
    fetchNextPage,
    hasNextPage,
  } = usePaginatedBucketsQuery(
    {
      projectRef,
      search: normalizedSearch.length > 0 ? normalizedSearch : undefined,
      sortColumn: 'name',
      sortOrder: 'asc',
    },
    { enabled: !!projectRef }
  )

  const buckets = useMemo(() => bucketsData?.pages.flatMap((page) => page) ?? [], [bucketsData])
  const fileBuckets = useMemo(
    () => buckets.filter((b) => !('type' in b) || b.type === 'STANDARD'),
    [buckets]
  )
  const hasNoBuckets = fileBuckets.length === 0 && normalizedSearch.length === 0

  const hasNoApiKeys =
    isErrorBuckets && bucketsError.message.includes('Project has no active API keys')

  const handleLoadMoreBuckets = useCallback(() => {
    if (hasNextPage && !isFetchingBuckets) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingBuckets, fetchNextPage])

  return (
    <div className="flex flex-1 flex-col gap-3 h-screen max-h-[600px] min-h-[300px] w-full">
      {isLoadingBuckets && <GenericSkeletonLoader />}
      {isErrorBuckets && (
        <>
          {hasNoApiKeys ? (
            <Admonition type="warning" title="Project has no active API keys enabled">
              <p className="!leading-normal text-sm">
                The Dashboard needs active API keys to list buckets.{' '}
                <InlineLink href={`/project/${projectRef}/settings/api-keys/new`}>
                  Create API keys
                </InlineLink>
                .
              </p>
            </Admonition>
          ) : (
            <AlertError error={bucketsError} subject="Failed to retrieve buckets" />
          )}
        </>
      )}
      {isSuccessBuckets && (
        <>
          {hasNoBuckets ? (
            <p className="text-sm text-foreground-light px-1">
              No file buckets yet.{' '}
              <InlineLink href={`/project/${projectRef}/storage/files`}>Open Storage</InlineLink> to
              create one.
            </p>
          ) : (
            <>
              <Input
                size="tiny"
                className="w-full max-w-sm"
                placeholder="Search buckets"
                value={filterString}
                onChange={(e) => setFilterString(e.target.value)}
                icon={<Search />}
              />
              <Card className="min-h-0 flex-1 overflow-hidden">
                <BucketsTable
                  buckets={fileBuckets}
                  projectRef={projectRef}
                  filterString={filterString}
                  formattedGlobalUploadLimit={formattedGlobalUploadLimit}
                  pagination={{
                    hasMore: hasNextPage,
                    isLoadingMore: isFetchingBuckets,
                    onLoadMore: handleLoadMoreBuckets,
                  }}
                  onSelectBucket={onSelectBucket}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

export function StorageFilePicker({
  open,
  onOpenChange,
  projectRef,
  returnValue = 'objectPath',
  onSelect,
  title = 'Choose a file',
}: StorageFilePickerProps) {
  const isMobileLayout = useBreakpoint('lg')
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null)

  useEffect(() => {
    if (!open) {
      setSelectedBucket(null)
    }
  }, [open])

  const handleSelect = (value: string) => {
    onSelect(value)
    onOpenChange(false)
  }

  const pickerTitle = selectedBucket
    ? `${title} — ${selectedBucket.id}`
    : `${title} — choose bucket`

  const headerActions = selectedBucket ? (
    <Button
      type="text"
      size="tiny"
      icon={<ChevronLeft size={16} />}
      onClick={() => setSelectedBucket(null)}
      className="shrink-0"
    >
      Buckets
    </Button>
  ) : null

  const body = selectedBucket ? (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <StorageFilePickerExplorer
        projectRef={projectRef}
        bucketId={selectedBucket.id}
        returnValue={returnValue}
        onSelect={handleSelect}
        forceListView={isMobileLayout}
      />
    </div>
  ) : (
    <StorageFilePickerBucketsStep
      projectRef={projectRef}
      open={open}
      onSelectBucket={setSelectedBucket}
    />
  )

  if (isMobileLayout) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="flex h-[85vh] flex-col gap-0 p-0">
          <SheetHeader className="flex flex-row items-center gap-2 border-b border-overlay px-4 py-3 text-left">
            {headerActions}
            <SheetTitle className="min-w-0 flex-1 text-left">{pickerTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col px-2 pb-3 pt-2">{body}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xxxlarge"
        className="flex max-h-[85vh] max-w-6xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="flex flex-row items-center gap-2 border-b border-overlay px-6 py-4">
          {headerActions}
          <DialogTitle className="min-w-0 flex-1">{pickerTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3">{body}</div>
      </DialogContent>
    </Dialog>
  )
}

export function useStorageFilePicker() {
  const [open, setOpen] = useState(false)

  return {
    open,
    setOpen,
    pickProps: {
      open,
      onOpenChange: setOpen,
    } as const,
  }
}
