'use client'

import JSZip from 'jszip'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import {
  Button,
  flattenTree,
  Form_Shadcn_ as Form,
  FormControl_Shadcn_ as FormControl,
  FormField_Shadcn_ as FormField,
  Input_Shadcn_ as Input,
  RadioGroupStacked,
  RadioGroupStackedItem,
  Select_Shadcn_ as Select,
  SelectContent_Shadcn_ as SelectContent,
  SelectItem_Shadcn_ as SelectItem,
  SelectTrigger_Shadcn_ as SelectTrigger,
  SelectValue_Shadcn_ as SelectValue,
  Switch,
  TextArea_Shadcn_ as TextArea,
  TreeView,
  TreeViewItem,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import { z } from 'zod'

import { createListingDraftAction, updateListingDraftAction } from '@/app/protected/actions'
import { ListingFilesUploader, type ListingPreviewFile } from '@/components/item-files-uploader'
import {
  getListingTemplateStoragePath,
  MARKETPLACE_STORAGE_BUCKET,
} from '@/lib/marketplace/item-storage'
import { normalizeTemplatePath, shouldIgnoreTemplatePath } from '@/lib/marketplace/template-package'
import { createClient } from '@/lib/supabase/client'

export type ListingFile = string

export type PartnerInfo = {
  id: number
  slug: string
}

export type ListingInfo = {
  id: number
  slug: string
  title: string
  summary: string | null
  content: string | null
  published: boolean
  type: string
  url: string | null
  registry_listing_url: string | null
  documentation_url: string | null
  initiation_action_url: string | null
  initiation_action_method: string | null
}

type BaseProps = {
  partner: PartnerInfo
  onValuesChange?: (values: ListingFormValues) => void
  onPreviewFilesChange?: (files: ListingPreviewFile[]) => void
}

type CreateModeProps = BaseProps & {
  mode: 'create'
}

type EditModeProps = BaseProps & {
  mode: 'edit'
  listing: ListingInfo
  initialFiles: ListingFile[]
}

type ListingFormProps = CreateModeProps | EditModeProps

type SubmitResult = {
  listingId: number
  listingSlug: string
  partnerSlug: string
}

const EMPTY_LISTING_FILES: ListingFile[] = []

const listingTypeEnum = z.enum(['template', 'oauth'])

function areStringArraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

type TemplateTreeNode = {
  name: string
  children: TemplateTreeNode[]
  metadata?: {
    sourcePath: string
    isFile: boolean
  }
}

function getTemplatePathSegments(pathOrUrl: string) {
  const trimmed = pathOrUrl.trim()
  if (!trimmed) return []
  return trimmed.split('/').filter(Boolean)
}

function buildTemplateTree(paths: string[]) {
  const root: TemplateTreeNode[] = []

  paths.forEach((path) => {
    const segments = getTemplatePathSegments(path)
    if (segments.length === 0) return

    let cursor = root
    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1
      const existing = cursor.find((node) => node.name === segment)
      if (existing) {
        if (isLeaf) {
          existing.metadata = { sourcePath: path, isFile: true }
        }
        cursor = existing.children
        return
      }

      const nextNode: TemplateTreeNode = {
        name: segment,
        children: [],
        metadata: isLeaf ? { sourcePath: path, isFile: true } : { sourcePath: path, isFile: false },
      }
      cursor.push(nextNode)
      cursor = nextNode.children
    })
  })

  return root
}

const listingFormSchema = z.object({
  title: z.string().min(1, 'Listing name is required'),
  slug: z.string().optional(),
  summary: z.string().optional(),
  content: z.string().optional(),
  published: z.boolean(),
  type: listingTypeEnum,
  url: z
    .string()
    .optional()
    .refine((value) => !value || Boolean(z.string().url().safeParse(value).success), {
      message: 'Enter a valid URL',
    }),
  documentation_url: z
    .string()
    .optional()
    .refine((value) => !value || Boolean(z.string().url().safeParse(value).success), {
      message: 'Enter a valid URL',
    }),
  initiation_action_url: z
    .string()
    .optional()
    .refine((value) => !value || Boolean(z.string().url().safeParse(value).success), {
      message: 'Enter a valid URL',
    }),
  initiation_action_method: z.enum(['POST', 'GET']).nullable().optional(),
  files: z.array(z.string()),
  template_files: z.array(z.string()),
})

export type ListingFormValues = z.infer<typeof listingFormSchema>

export function ListingForm(props: ListingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [autoUploadSignal, setAutoUploadSignal] = useState(0)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)
  const [isWaitingForAutoUpload, setIsWaitingForAutoUpload] = useState(false)
  const [templateZipFile, setTemplateZipFile] = useState<File | null>(null)
  const [existingTemplateFiles, setExistingTemplateFiles] = useState<string[]>([])
  const [selectedTemplateFiles, setSelectedTemplateFiles] = useState<string[]>([])
  const [initialTemplateFilesFieldValue, setInitialTemplateFilesFieldValue] = useState<string[]>([])
  const templateZipInputRef = useRef<HTMLInputElement>(null)
  const submitIntentRef = useRef<'save' | 'request_review'>('save')
  const supabase = useMemo(() => createClient(), [])

  const isCreateMode = props.mode === 'create'
  const listing = props.mode === 'edit' ? props.listing : null
  const listingId = isCreateMode ? submitResult?.listingId : listing?.id
  const initialFiles = props.mode === 'edit' ? props.initialFiles : EMPTY_LISTING_FILES
  const fieldsDisabled = isPending || isWaitingForAutoUpload
  const initialFilesFieldValue = useMemo(() => initialFiles.slice(), [initialFiles])
  const defaultValues = useMemo<ListingFormValues>(
    () => ({
      title: listing?.title ?? '',
      slug: listing?.slug ?? '',
      summary: listing?.summary ?? '',
      content: listing?.content ?? '',
      published: listing?.published ?? false,
      type: listing?.type === 'oauth' ? 'oauth' : 'template',
      url: listing?.url ?? '',
      documentation_url: listing?.documentation_url ?? '',
      initiation_action_url: listing?.initiation_action_url ?? '',
      initiation_action_method: (listing?.initiation_action_method as 'POST' | 'GET') ?? null,
      files: initialFilesFieldValue,
      template_files: [],
    }),
    [
      initialFilesFieldValue,
      listing?.content,
      listing?.documentation_url,
      listing?.initiation_action_url,
      listing?.initiation_action_method,
      listing?.slug,
      listing?.summary,
      listing?.title,
      listing?.type,
      listing?.url,
    ]
  )

  const form = useForm<ListingFormValues>({
    defaultValues,
    values: defaultValues,
  })
  const onValuesChange = props.onValuesChange
  const onPreviewFilesChange = props.onPreviewFilesChange
  const handlePreviewFilesChange = useCallback(
    (files: ListingPreviewFile[]) => {
      const normalizedFiles = files
        .map((file) => file.description ?? file.name)
        .slice()
        .sort((a, b) => a.localeCompare(b))
      const normalizedInitialFiles = initialFilesFieldValue
        .slice()
        .sort((a, b) => a.localeCompare(b))

      form.setValue('files', normalizedFiles, {
        shouldDirty: !areStringArraysEqual(normalizedFiles, normalizedInitialFiles),
        shouldTouch: true,
      })
      onPreviewFilesChange?.(files)
    },
    [form, initialFilesFieldValue, onPreviewFilesChange]
  )

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  useEffect(() => {
    if (isCreateMode || listing?.type !== 'template' || !listingId) {
      setExistingTemplateFiles([])
      setSelectedTemplateFiles([])
      setInitialTemplateFilesFieldValue([])
      form.setValue('template_files', [], {
        shouldDirty: false,
        shouldTouch: false,
      })
      return
    }

    let isCancelled = false
    const basePath = getListingTemplateStoragePath(props.partner.id, listingId)

    const loadTemplateFiles = async () => {
      const listRecursive = async (prefix = ''): Promise<string[]> => {
        const targetPath = prefix ? `${basePath}/${prefix}` : basePath
        const { data, error } = await supabase.storage
          .from(MARKETPLACE_STORAGE_BUCKET)
          .list(targetPath, {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' },
          })

        if (error || !data) return []

        const nested = await Promise.all(
          data.map(async (entry) => {
            const isDirectory = entry.metadata == null
            const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name
            if (isDirectory) {
              return listRecursive(nextPrefix)
            }
            return [nextPrefix]
          })
        )

        return nested.flat()
      }

      const files = await listRecursive()
      if (isCancelled) return

      setExistingTemplateFiles(files)
      setInitialTemplateFilesFieldValue(files)
      form.setValue('template_files', files, {
        shouldDirty: false,
        shouldTouch: false,
      })
    }

    void loadTemplateFiles()

    return () => {
      isCancelled = true
    }
  }, [form, isCreateMode, listing?.type, listingId, props.partner.id, supabase])

  useEffect(() => {
    if (!templateZipFile) {
      setSelectedTemplateFiles([])
      return
    }

    let isCancelled = false
    const parseZip = async () => {
      const arrayBuffer = await templateZipFile.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)
      const entries = Object.values(zip.files).filter(
        (entry) => !entry.dir && !shouldIgnoreTemplatePath(entry.name)
      )
      const topLevelDirs = new Set(entries.map((entry) => entry.name.split('/')[0]).filter(Boolean))
      const rootPrefix = topLevelDirs.size === 1 ? Array.from(topLevelDirs)[0] ?? null : null
      const normalized = entries
        .map((entry) => normalizeTemplatePath(entry.name, rootPrefix))
        .filter((entry) => entry.length > 0)
        .sort((a, b) => a.localeCompare(b))

      if (isCancelled) return
      setSelectedTemplateFiles(normalized)
      form.setValue('template_files', normalized, {
        shouldDirty: true,
        shouldTouch: true,
      })
    }

    void parseZip().catch(() => {
      if (isCancelled) return
      setSelectedTemplateFiles([])
      form.setValue('template_files', [], {
        shouldDirty: true,
        shouldTouch: true,
      })
    })

    return () => {
      isCancelled = true
    }
  }, [form, templateZipFile])

  useEffect(() => {
    if (!onValuesChange) return

    onValuesChange(form.getValues())
    const subscription = form.watch((value) => {
      onValuesChange({
        title: value.title ?? '',
        slug: value.slug ?? '',
        summary: value.summary ?? '',
        content: value.content ?? '',
        published: value.published ?? false,
        type: value.type === 'oauth' ? 'oauth' : 'template',
        url: value.url ?? '',
        documentation_url: value.documentation_url ?? '',
        initiation_action_url: value.initiation_action_url ?? '',
        initiation_action_method: value.initiation_action_method ?? null,
        files: (value.files ?? []).filter((entry): entry is string => typeof entry === 'string'),
        template_files: (value.template_files ?? []).filter(
          (entry): entry is string => typeof entry === 'string'
        ),
      })
    })

    return () => subscription.unsubscribe()
  }, [form, onValuesChange])

  const onSubmit = (values: ListingFormValues) => {
    const parsed = listingFormSchema.safeParse(values)
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const fieldName = issue.path[0]
        if (typeof fieldName === 'string') {
          form.setError(fieldName as keyof ListingFormValues, {
            type: 'manual',
            message: issue.message,
          })
        }
      })
      return
    }

    setError(null)
    setSuccess(null)

    const intent = submitIntentRef.current
    if (parsed.data.type === 'template') {
      const hasExistingRegistryFile = Boolean(listing?.registry_listing_url)
      const requiresTemplatePackage = parsed.data.published || intent === 'request_review'
      if (requiresTemplatePackage && !templateZipFile && !hasExistingRegistryFile) {
        setError(
          'Upload a template ZIP package that includes template.json before publishing or requesting review.'
        )
        return
      }
    }
    if (parsed.data.type === 'oauth' && !parsed.data.url?.trim()) {
      setError('OAuth listings require a listing URL.')
      return
    }

    const formData = new FormData()
    const trimmedSlug = parsed.data.slug?.trim()

    formData.set('partnerId', String(props.partner.id))
    formData.set('partnerSlug', props.partner.slug)
    formData.set('slug', trimmedSlug ?? '')
    formData.set('summary', parsed.data.summary ?? '')
    formData.set('type', parsed.data.type)
    formData.set('published', parsed.data.published ? 'true' : 'false')
    formData.set('url', parsed.data.type === 'oauth' ? parsed.data.url ?? '' : '')
    formData.set('documentationUrl', parsed.data.documentation_url ?? '')
    formData.set('initiationActionUrl', parsed.data.initiation_action_url ?? '')
    formData.set('initiationActionMethod', parsed.data.initiation_action_method ?? '')
    formData.set('content', parsed.data.content ?? '')
    formData.set('intent', intent)
    formData.set('existingRegistryListingUrl', listing?.registry_listing_url ?? '')
    if (templateZipFile && parsed.data.type === 'template') {
      formData.set('templateZip', templateZipFile)
    }

    if (isCreateMode) {
      formData.set('title', parsed.data.title)
    } else if (listing) {
      formData.set('listingId', String(listing.id))
      formData.set('name', parsed.data.title)
    }

    startTransition(async () => {
      try {
        const result = isCreateMode
          ? await createListingDraftAction(formData)
          : await updateListingDraftAction(formData)

        if (isCreateMode) {
          setSubmitResult(result)
          setIsWaitingForAutoUpload(true)
          setAutoUploadSignal((value) => value + 1)
          setSuccess('Listing created. Finalizing file uploads...')
          return
        } else {
          setSubmitResult(result)
          setAutoUploadSignal((value) => value + 1)
          setSuccess('Listing saved.')
        }
      } catch (submitError) {
        const message = submitError instanceof Error ? submitError.message : 'Unable to save listing'
        setError(message)
      }
    })
  }

  const handleCancel = () => {
    form.reset(defaultValues)
    setTemplateZipFile(null)
    setSelectedTemplateFiles([])
    if (templateZipInputRef.current) {
      templateZipInputRef.current.value = ''
    }
    form.setValue('template_files', initialTemplateFilesFieldValue, {
      shouldDirty: false,
      shouldTouch: false,
    })
    setError(null)
    setSuccess(null)
  }

  const goToListingPage = () => {
    if (!submitResult) return
    router.push(`/protected/${submitResult.partnerSlug}/items/${submitResult.listingSlug}`)
  }

  const handleAutoUploadComplete = ({ success: uploadSuccess }: { success: boolean }) => {
    if (!isCreateMode || !submitResult || !isWaitingForAutoUpload) return

    setIsWaitingForAutoUpload(false)
    if (!uploadSuccess) {
      setError('Listing created, but file upload failed. Please open the listing and try again.')
      return
    }

    router.push(`/protected/${submitResult.partnerSlug}/items/${submitResult.listingSlug}`)
  }

  const titleLabel = isCreateMode ? 'Listing name' : 'Listing name'
  const slugLabel = isCreateMode ? 'Slug (optional)' : 'Slug'
  const isDirty = form.formState.isDirty
  const listingType = form.watch('type')
  const hasExistingTemplateFiles = existingTemplateFiles.length > 0
  const templateFilesForTree =
    selectedTemplateFiles.length > 0 || templateZipFile
      ? selectedTemplateFiles
      : existingTemplateFiles
  const hasTemplateFilesForTree = templateFilesForTree.length > 0
  const templateTreeData = useMemo(
    () => flattenTree({ name: '', children: buildTemplateTree(templateFilesForTree) }),
    [templateFilesForTree]
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full w-full">
        <div className="flex h-full w-full flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label={titleLabel}
                    description="This name is shown to buyers in the marketplace."
                  >
                    <FormControl>
                      <Input
                        id="listing-title"
                        placeholder="Authentication starter"
                        required
                        disabled={fieldsDisabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label={slugLabel}
                    description={
                      isCreateMode
                        ? 'Leave empty to auto-generate from the listing name.'
                        : 'Slug is used in the listing URL and should remain unique per partner.'
                    }
                  >
                    <FormControl>
                      <Input
                        id="listing-slug"
                        placeholder="authentication-starter"
                        disabled={fieldsDisabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label="Summary"
                    description="Short summary for compact marketplace placements."
                  >
                    <FormControl>
                      <TextArea
                        id="listing-summary"
                        rows={3}
                        placeholder="One-sentence summary shown in cards and listings."
                        disabled={fieldsDisabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label="Content (Markdown)"
                    description={
                      isCreateMode
                        ? 'Detailed markdown shown on the listing page.'
                        : 'Write the full markdown content for this listing.'
                    }
                  >
                    <FormControl>
                      <TextArea
                        id="listing-content"
                        rows={8}
                        placeholder="## Overview"
                        disabled={fieldsDisabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <FormItemLayout
                    layout="flex-row-reverse"
                    label="Published"
                    description="Published listings are visible to readers once the latest review is approved."
                  >
                    <FormControl className="col-span-8">
                      <Switch
                        id="listing-published"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={fieldsDisabled}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label="Type"
                    description={
                      isCreateMode
                        ? 'Pick the primary listing type.'
                        : 'Controls where this listing appears in discovery.'
                    }
                  >
                    <FormControl>
                      <RadioGroupStacked value={field.value} onValueChange={field.onChange}>
                        <RadioGroupStackedItem
                          value="template"
                          label="Template"
                          description="Best for starter projects and reusable boilerplates."
                          disabled={fieldsDisabled}
                        />
                        <RadioGroupStackedItem
                          value="oauth"
                          label="OAuth"
                          description="Best for identity or authorization integrations."
                          disabled={fieldsDisabled}
                        />
                      </RadioGroupStacked>
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            {listingType === 'oauth' ? (
              <div className="p-6 pt-0">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItemLayout
                      layout="vertical"
                      label="Listing URL"
                      description="External URL for installation docs or listing destination."
                    >
                      <FormControl>
                        <Input
                          id="listing-url"
                          type="url"
                          placeholder="https://example.com"
                          required
                          disabled={fieldsDisabled}
                          {...field}
                        />
                      </FormControl>
                    </FormItemLayout>
                  )}
                />
              </div>
            ) : (
              <div className="p-6 pt-0">
                <FormItemLayout
                  layout="vertical"
                  label={
                    hasExistingTemplateFiles ? (
                      <span className="inline-flex w-full items-center justify-between gap-3">
                        <span>Template package (.zip)</span>
                        <Button
                          htmlType="button"
                          type="outline"
                          disabled={fieldsDisabled}
                          className="h-6 px-2 text-xs"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            templateZipInputRef.current?.click()
                          }}
                        >
                          Replace
                        </Button>
                      </span>
                    ) : (
                      'Template package (.zip)'
                    )
                  }
                  description="Upload a zip containing template.json and functions/, plus migrations/, schemas/, config.toml, or any combination of those."
                >
                  <Input
                    id="listing-template-zip"
                    type="file"
                    accept=".zip,application/zip"
                    disabled={fieldsDisabled}
                    ref={templateZipInputRef}
                    className={hasExistingTemplateFiles ? 'sr-only' : undefined}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0]
                      setTemplateZipFile(nextFile ?? null)
                      const nextTemplateFiles = nextFile ? [] : initialTemplateFilesFieldValue
                      form.setValue('template_files', nextTemplateFiles, {
                        shouldDirty: Boolean(nextFile),
                        shouldTouch: true,
                      })
                    }}
                  />
                  {hasTemplateFilesForTree ? (
                    <div className="mt-2 rounded-md border">
                      <TreeView
                        data={templateTreeData}
                        aria-label="Template files"
                        className="w-full py-1"
                        nodeRenderer={({
                          element,
                          isBranch,
                          isExpanded,
                          getNodeProps,
                          level,
                          isSelected,
                        }) => (
                          <TreeViewItem
                            {...getNodeProps()}
                            isExpanded={isExpanded}
                            isBranch={isBranch}
                            isSelected={isSelected}
                            level={level}
                            name={element.name}
                          />
                        )}
                      />
                    </div>
                  ) : null}
                  {templateZipFile ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Selected package: {templateZipFile.name}
                    </p>
                  ) : null}
                  {!hasTemplateFilesForTree ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Optional while drafting. Required before publishing or requesting review.
                    </p>
                  ) : null}
                </FormItemLayout>
              </div>
            )}

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="documentation_url"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label="Documentation URL (optional)"
                    description="Direct link to setup or API documentation for this listing."
                  >
                    <FormControl>
                      <Input
                        id="listing-documentation-url"
                        type="url"
                        placeholder="https://example.com/docs"
                        disabled={fieldsDisabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="initiation_action_url"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label="Initiation action URL (optional)"
                    description="The URL that will be called when a user initiates this listing."
                  >
                    <FormControl>
                      <Input
                        id="listing-initiation-action-url"
                        type="url"
                        placeholder="https://example.com/api/initiate"
                        disabled={fieldsDisabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormField
                control={form.control}
                name="initiation_action_method"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label="Initiation action method"
                    description="HTTP method used when calling the initiation action URL."
                  >
                    <FormControl>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value || null)}
                        disabled={fieldsDisabled}
                      >
                        <SelectTrigger id="listing-initiation-action-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </div>

            <div className="p-6 pt-0">
              <FormItemLayout
                layout="vertical"
                label="Files"
                description="Upload listing assets and artifacts."
              >
                <div>
                  <ListingFilesUploader
                    partnerId={props.partner.id}
                    partnerSlug={props.partner.slug}
                    listingId={listingId}
                    initialFiles={initialFiles}
                    autoUploadSignal={autoUploadSignal}
                    showUploadAction={false}
                    disabled={fieldsDisabled}
                    onAutoUploadComplete={handleAutoUploadComplete}
                    onPreviewFilesChange={handlePreviewFilesChange}
                  />
                </div>
              </FormItemLayout>
            </div>

            {error ? (
              <div className="p-6 pt-0">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : null}
            {success ? (
              <div className="p-6 pt-0">
                <p className="text-sm text-muted-foreground">{success}</p>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t py-4 px-6">
            <div className="flex justify-end gap-3">
              {isDirty && (
                <Button
                  htmlType="button"
                  type="outline"
                  onClick={handleCancel}
                  disabled={fieldsDisabled}
                >
                  Cancel
                </Button>
              )}
              {isCreateMode ? (
                <>
                  <Button
                    htmlType="submit"
                    onClick={() => {
                      submitIntentRef.current = 'save'
                    }}
                    disabled={!isDirty || isPending || isWaitingForAutoUpload}
                  >
                    {isPending || isWaitingForAutoUpload ? 'Creating...' : 'Create listing'}
                  </Button>
                </>
              ) : (
                <>
                  <Button htmlType="submit" disabled={!isDirty || isPending}>
                    {isPending ? 'Saving...' : 'Save changes'}
                  </Button>
                  {submitResult && submitResult.listingSlug !== listing?.slug ? (
                    <Button htmlType="button" type="secondary" onClick={goToListingPage}>
                      Open updated URL
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}
