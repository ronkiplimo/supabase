'use client'

import { File as FileIcon, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { saveItemFilesAction } from '@/app/protected/actions'
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import {
  getItemFilesStoragePath,
  MARKETPLACE_STORAGE_BUCKET,
} from '@/lib/marketplace/item-storage'
import { createClient } from '@/lib/supabase/client'

export type ItemPreviewFile = {
  id?: string | number
  name: string
  href?: string
  description?: string
}

type ItemFilesUploaderProps = {
  partnerId: number
  partnerSlug: string
  itemId?: number
  initialFiles?: string[]
  autoUploadSignal?: number
  showUploadAction?: boolean
  disabled?: boolean
  onAutoUploadComplete?: (result: { success: boolean }) => void
  onPreviewFilesChange?: (files: ItemPreviewFile[]) => void
}

function getFileName(fileUrlOrPath: string) {
  try {
    const url = new URL(fileUrlOrPath)
    const pathName = url.pathname.split('/').filter(Boolean).pop()
    return pathName ? decodeURIComponent(pathName) : fileUrlOrPath
  } catch {
    const parts = fileUrlOrPath.split('/')
    return parts[parts.length - 1] ?? fileUrlOrPath
  }
}

function isImagePath(path: string) {
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(path)
}

export function ItemFilesUploader({
  partnerId,
  partnerSlug,
  itemId,
  initialFiles = [],
  autoUploadSignal = 0,
  showUploadAction = true,
  disabled = false,
  onAutoUploadComplete,
  onPreviewFilesChange,
}: ItemFilesUploaderProps) {
  const [itemFiles, setItemFiles] = useState<string[]>(initialFiles)
  const [isSavingFiles, setIsSavingFiles] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const handleUploadRef = useRef<() => Promise<{ name: string; message?: string }[]>>(async () => [])
  const autoUploadCompleteRef = useRef(onAutoUploadComplete)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setItemFiles(initialFiles)
  }, [initialFiles])

  const storagePath = useMemo(() => {
    if (!itemId) return undefined
    return getItemFilesStoragePath(partnerId, itemId)
  }, [itemId, partnerId])

  const upload = useSupabaseUpload({
    bucketName: MARKETPLACE_STORAGE_BUCKET,
    path: storagePath,
    maxFiles: 10,
    maxFileSize: 25_000_000,
    upsert: true,
  })

  const persistFiles = useCallback(
    async (nextFiles: string[]) => {
      if (!itemId) {
        throw new Error('Create the item first, then upload files.')
      }

      const formData = new FormData()
      formData.set('itemId', String(itemId))
      formData.set('partnerSlug', partnerSlug)
      nextFiles.forEach((fileUrl) => {
        formData.append('files[]', fileUrl)
      })
      await saveItemFilesAction(formData)
    },
    [itemId, partnerSlug]
  )

  const handleUpload = useCallback(async () => {
    if (!itemId || !storagePath) {
      const message = 'Create the item first, then upload files.'
      setSaveError(message)
      return [{ name: 'files', message }]
    }

    setSaveError(null)
    setIsSavingFiles(true)

    const responses = upload.files.length > 0 ? await upload.onUpload() : []
    const uploadedNames = responses
      .filter((result) => result.message === undefined)
      .map((result) => result.name)
    const uploadedUrls = uploadedNames.map((fileName) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from(MARKETPLACE_STORAGE_BUCKET).getPublicUrl(`${storagePath}/${fileName}`)

      return publicUrl
    })
    const nextFiles = Array.from(new Set([...itemFiles, ...uploadedUrls]))

    try {
      await persistFiles(nextFiles)
      setItemFiles(nextFiles)
      if (uploadedNames.length > 0) {
        upload.setFiles((currentFiles: typeof upload.files) =>
          currentFiles.filter((file) => !uploadedNames.includes(file.name))
        )
      }
      return responses
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save item files'
      setSaveError(message)
      return [...responses, { name: 'files', message }]
    } finally {
      setIsSavingFiles(false)
    }
  }, [itemFiles, itemId, persistFiles, storagePath, supabase, upload])

  useEffect(() => {
    handleUploadRef.current = handleUpload
  }, [handleUpload])

  useEffect(() => {
    autoUploadCompleteRef.current = onAutoUploadComplete
  }, [onAutoUploadComplete])

  const handleRemovePersistedFile = (fileUrl: string) => {
    setItemFiles((currentFiles) => currentFiles.filter((currentFile) => currentFile !== fileUrl))
  }

  useEffect(() => {
    if (!onPreviewFilesChange) return

    const persistedPreviews = itemFiles.map((fileUrl) => ({
      id: fileUrl,
      name: getFileName(fileUrl),
      href: isImagePath(fileUrl) ? fileUrl : undefined,
      description: fileUrl,
    }))

    const persistedNames = new Set(persistedPreviews.map((file) => file.name))
    const pendingPreviews = upload.files
      .filter((file) => !persistedNames.has(file.name))
      .map((file, index) => ({
        id: `pending-${file.name}-${index}`,
        name: file.name,
        href: file.type.startsWith('image/') ? file.preview : undefined,
        description: 'Pending upload',
      }))

    onPreviewFilesChange([...persistedPreviews, ...pendingPreviews])
  }, [itemFiles, onPreviewFilesChange, upload.files])

  useEffect(() => {
    if (!itemId || autoUploadSignal === 0) return

    let isCancelled = false

    const run = async () => {
      const responses = await handleUploadRef.current()
      if (isCancelled) return

      autoUploadCompleteRef.current?.({
        success: responses.every((response) => response.message === undefined),
      })
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [autoUploadSignal, itemId])

  return (
    <div>
      <Dropzone {...upload} onUpload={handleUpload}>
        <DropzoneEmptyState />
        <DropzoneContent className="mt-4" showUploadAction={showUploadAction} disabled={disabled} />
      </Dropzone>
      {isSavingFiles ? <p className="text-xs text-muted-foreground">Saving files...</p> : null}
      {saveError ? <p className="text-xs text-destructive">{saveError}</p> : null}
      {itemFiles.length > 0 ? (
        <ul className="space-y-2 mt-2">
          {itemFiles.map((fileUrl) => (
            <li
              key={fileUrl}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm text-muted-foreground"
            >
              {isImagePath(fileUrl) ? (
                <div className="h-10 w-10 overflow-hidden rounded border bg-muted">
                  <img src={fileUrl} alt={getFileName(fileUrl)} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                  <FileIcon size={18} />
                </div>
              )}
              <span className="min-w-0 grow truncate" title={getFileName(fileUrl)}>
                {getFileName(fileUrl)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${getFileName(fileUrl)}`}
                disabled={disabled}
                onClick={() => handleRemovePersistedFile(fileUrl)}
                className="inline-flex size-8 items-center justify-center rounded text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
