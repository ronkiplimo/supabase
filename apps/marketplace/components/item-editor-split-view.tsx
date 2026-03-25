'use client'

import { useEffect, useMemo, useState } from 'react'
import { MarketplaceItem, type MarketplaceItemFile } from 'ui-patterns/MarketplaceItem'

import {
  ListingForm,
  type ListingFile,
  type ListingFormValues,
  type ListingInfo,
  type PartnerInfo,
} from '@/components/item-form'

type ListingEditorSplitViewProps =
  | {
      mode: 'create'
      partner: PartnerInfo & { title: string }
      initialPreviewFiles?: MarketplaceItemFile[]
      initialFormValues?: Partial<ListingFormValues>
    }
  | {
      mode: 'edit'
      partner: PartnerInfo & { title: string }
      listing: ListingInfo & { updated_at?: string | null }
      initialFiles: ListingFile[]
      initialPreviewFiles?: MarketplaceItemFile[]
    }

const EMPTY_PREVIEW_FILES: MarketplaceItemFile[] = []

function toPreviewFiles(initialFiles: ListingFile[]): MarketplaceItemFile[] {
  return initialFiles.map((file) => {
    const fileName = file.split('/').pop() ?? file
    return {
      id: file,
      name: fileName,
      href: file,
      description: file,
    }
  })
}

function maybeRenderLink(value: string) {
  if (!value.trim()) return 'No URL provided'

  try {
    // Guard against invalid values while the user is typing.
    const url = new URL(value)
    return (
      <a
        href={url.toString()}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        {value}
      </a>
    )
  } catch {
    return value
  }
}

export function ListingEditorSplitView(props: ListingEditorSplitViewProps) {
  const baseValues: ListingFormValues =
    props.mode === 'edit'
      ? {
          title: props.listing.title,
          slug: props.listing.slug,
          summary: props.listing.summary ?? '',
          content: props.listing.content ?? '',
          published: props.listing.published ?? false,
          type: props.listing.type === 'oauth' ? 'oauth' : 'template',
          url: props.listing.url ?? '',
          documentation_url: props.listing.documentation_url ?? '',
          initiation_action_url: props.listing.initiation_action_url ?? '',
          initiation_action_method: (props.listing.initiation_action_method as 'POST' | 'GET') ?? null,
          files: [],
          template_files: [],
        }
      : {
          title: props.initialFormValues?.title ?? '',
          slug: props.initialFormValues?.slug ?? '',
          summary: props.initialFormValues?.summary ?? '',
          content: props.initialFormValues?.content ?? '',
          published: props.initialFormValues?.published ?? false,
          type: props.initialFormValues?.type === 'oauth' ? 'oauth' : 'template',
          url: props.initialFormValues?.url ?? '',
          documentation_url: props.initialFormValues?.documentation_url ?? '',
          initiation_action_url: props.initialFormValues?.initiation_action_url ?? '',
          initiation_action_method: props.initialFormValues?.initiation_action_method ?? null,
          files: [],
          template_files: [],
        }

  const [previewValues, setPreviewValues] = useState<ListingFormValues>(baseValues)
  const editInitialFiles = props.mode === 'edit' ? props.initialFiles : null
  const initialPreviewFiles = useMemo(() => {
    if (props.initialPreviewFiles) return props.initialPreviewFiles
    if (editInitialFiles) return toPreviewFiles(editInitialFiles)
    return EMPTY_PREVIEW_FILES
  }, [editInitialFiles, props.initialPreviewFiles])
  const [previewFiles, setPreviewFiles] = useState<MarketplaceItemFile[]>(initialPreviewFiles)

  useEffect(() => {
    setPreviewFiles(initialPreviewFiles)
  }, [initialPreviewFiles])

  return (
    <div className="flex h-full min-h-full min-w-0">
      <section className="max-w-xl w-full min-w-lg min-h-0 border-r flex flex-col">
        <div className="min-h-0 flex-1">
          {props.mode === 'edit' ? (
            <ListingForm
              mode="edit"
              partner={{ id: props.partner.id, slug: props.partner.slug }}
              listing={props.listing}
              initialFiles={props.initialFiles}
              onValuesChange={setPreviewValues}
              onPreviewFilesChange={setPreviewFiles}
            />
          ) : (
            <ListingForm
              mode="create"
              partner={{ id: props.partner.id, slug: props.partner.slug }}
              onValuesChange={setPreviewValues}
              onPreviewFilesChange={setPreviewFiles}
            />
          )}
        </div>
      </section>

      <section className="min-w-0 flex-1 h-full p-6 overflow-hidden bg-muted/50">
        <div className="rounded-lg border bg-background shadow-sm h-full flex flex-col">
          <div className="flex items-center h-10 border-b px-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-red-400" />
              <span className="inline-block size-2 rounded-full bg-yellow-400" />
              <span className="inline-block size-2 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 flex justify-center">
              <span className="text-xs text-muted-foreground bg-muted w-3xl truncate px-3 py-0.5 rounded border font-mono">
                {previewValues.slug
                  ? `https://supabase.com/marketplace/${previewValues.slug}`
                  : 'https://example.com/listing'}
              </span>
            </div>
            {/* Filler to push center on left/right */}
            <div className="w-14" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <MarketplaceItem
              title={previewValues.title || 'Untitled listing'}
              summary={previewValues.summary}
              content={previewValues.content}
              primaryActionUrl={
                previewValues.type === 'oauth'
                  ? previewValues.url
                  : props.mode === 'edit'
                    ? props.listing.registry_listing_url
                    : null
              }
              files={previewFiles}
              partnerName={props.partner.title}
              lastUpdatedAt={props.mode === 'edit' ? props.listing.updated_at : null}
              type={previewValues.type}
              metaFields={[
                ...(previewValues.type === 'oauth'
                  ? [
                      {
                        label: 'Listing URL',
                        value: maybeRenderLink(previewValues.url ?? ''),
                      },
                    ]
                  : []),
                {
                  label: 'Documentation URL',
                  value: maybeRenderLink(previewValues.documentation_url ?? ''),
                },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
