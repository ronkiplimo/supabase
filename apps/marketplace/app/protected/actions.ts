'use server'

import JSZip from 'jszip'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import {
  ensureListingDraftConstraints,
  parseInitiationMethod,
  parseListingType,
  parseNumberList,
  parseOptionalString,
  parseRequiredString,
  parseStringList,
  parseTemplateZip,
  slugify,
} from '@/lib/marketplace/item-draft'
import {
  getListingTemplateRegistryFilePath,
  getListingTemplateStoragePath,
  getStorageObjectPathFromPublicUrl,
  MARKETPLACE_STORAGE_BUCKET,
} from '@/lib/marketplace/item-storage'
import { isReviewStatus, shouldRequestReview } from '@/lib/marketplace/review-state'
import {
  hasRequiredTemplateEntries,
  inferTemplateRootPrefix,
  normalizeTemplatePath,
  shouldIgnoreTemplatePath,
} from '@/lib/marketplace/template-package'
import { createClient } from '@/lib/supabase/server'

type MarketplaceSupabaseClient = Awaited<ReturnType<typeof createClient>>

async function listStorageFilesRecursively(
  supabase: MarketplaceSupabaseClient,
  basePath: string,
  prefix = ''
): Promise<string[]> {
  const targetPath = prefix ? `${basePath}/${prefix}` : basePath
  const { data, error } = await supabase.storage.from(MARKETPLACE_STORAGE_BUCKET).list(targetPath, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error || !data) return []

  const nested = await Promise.all(
    data.map(async (entry) => {
      const isDirectory = entry.metadata == null
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name
      if (isDirectory) {
        return listStorageFilesRecursively(supabase, basePath, nextPrefix)
      }

      return [`${basePath}/${nextPrefix}`]
    })
  )

  return nested.flat()
}

async function removeStorageObjects(supabase: MarketplaceSupabaseClient, objectPaths: string[]) {
  if (objectPaths.length === 0) return

  const { error } = await supabase.storage.from(MARKETPLACE_STORAGE_BUCKET).remove(objectPaths)
  if (error) {
    throw new Error(error.message)
  }
}

async function removeStoragePrefix(supabase: MarketplaceSupabaseClient, basePath: string) {
  const existingPaths = await listStorageFilesRecursively(supabase, basePath)
  await removeStorageObjects(supabase, existingPaths)
}

function getTemplateRegistryPublicUrl(
  supabase: MarketplaceSupabaseClient,
  partnerId: number,
  listingId: number
) {
  const {
    data: { publicUrl },
  } = supabase.storage
    .from(MARKETPLACE_STORAGE_BUCKET)
    .getPublicUrl(getListingTemplateRegistryFilePath(partnerId, listingId))

  return publicUrl
}

async function uploadTemplatePackage({
  zipFile,
  supabase,
  partnerId,
  listingId,
}: {
  zipFile: File
  supabase: MarketplaceSupabaseClient
  partnerId: number
  listingId: number
}) {
  const arrayBuffer = await zipFile.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const entries = Object.values(zip.files).filter(
    (entry) => !entry.dir && !shouldIgnoreTemplatePath(entry.name)
  )

  if (entries.length === 0) {
    throw new Error('Template package must contain files')
  }

  const entryPaths = entries.map((entry) => entry.name)
  const rootPrefix = inferTemplateRootPrefix(entryPaths)

  const normalizedEntries = entries
    .map((entry) => ({
      entry,
      relativePath: normalizeTemplatePath(entry.name, rootPrefix),
    }))
    .filter((entry) => entry.relativePath.length > 0)

  if (!hasRequiredTemplateEntries(entryPaths)) {
    throw new Error(
      'Template package must include template.json and functions/, plus at least one of migrations/, schemas/, or config.toml'
    )
  }

  const basePath = getListingTemplateStoragePath(partnerId, listingId)

  await removeStoragePrefix(supabase, basePath)

  for (const normalizedEntry of normalizedEntries) {
    const blob = await normalizedEntry.entry.async('blob')
    const objectPath = `${basePath}/${normalizedEntry.relativePath}`
    const { error } = await supabase.storage
      .from(MARKETPLACE_STORAGE_BUCKET)
      .upload(objectPath, blob, {
        upsert: true,
        contentType: blob.type || undefined,
      })

    if (error) {
      throw new Error(error.message)
    }
  }

  return getTemplateRegistryPublicUrl(supabase, partnerId, listingId)
}

export async function createPartnerAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('user', user)

  if (!user) {
    redirect('/auth/login')
  }

  const title = parseRequiredString(formData, 'title')
  const slugInput = formData.get('slug')
  const description = formData.get('description')
  const slugSource = typeof slugInput === 'string' && slugInput.trim() ? slugInput : title
  const slug = slugify(slugSource)

  if (!slug) {
    throw new Error('Partner slug cannot be empty')
  }

  const { data: partner, error } = await supabase
    .from('partners')
    .insert({
      title,
      slug,
      description: typeof description === 'string' ? description : null,
      created_by: user.id,
    })
    .select('id, slug')
    .single()

  if (error || !partner) {
    console.error(error)
    throw new Error(error?.message ?? 'Unable to create partner')
  }

  // Best effort while policies are being finalized. Ignore duplicate membership rows.
  const { error: membershipError } = await supabase.from('partner_members').insert({
    partner_id: partner.id,
    user_id: user.id,
    role: 'admin',
  })

  if (membershipError && membershipError.code !== '23505') {
    throw new Error(membershipError.message)
  }

  revalidatePath('/protected')
  redirect(`/protected/${partner.slug}`)
}

export async function updatePartnerAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const partnerId = Number(parseRequiredString(formData, 'partnerId'))
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const title = parseRequiredString(formData, 'title')
  const description = formData.get('description')
  const website = formData.get('website')
  const logoUrl = formData.get('logoUrl')

  const { error } = await supabase
    .from('partners')
    .update({
      title,
      description: typeof description === 'string' ? description : null,
      website: typeof website === 'string' ? website : null,
      logo_url: typeof logoUrl === 'string' ? logoUrl : null,
    })
    .eq('id', partnerId)
    .eq('slug', partnerSlug)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/protected/${partnerSlug}`)
  revalidatePath(`/protected/${partnerSlug}/settings`)
  redirect(`/protected/${partnerSlug}/settings`)
}

export async function addPartnerMemberAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const partnerId = Number(parseRequiredString(formData, 'partnerId'))
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const email = parseRequiredString(formData, 'email')
  const roleInput = parseRequiredString(formData, 'role').toLowerCase()
  const role = roleInput === 'admin' ? 'admin' : 'member'

  const { error } = await supabase.rpc('add_partner_member', {
    target_partner_id: partnerId,
    target_email: email,
    target_role: role,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/protected/${partnerSlug}/settings`)
  redirect(`/protected/${partnerSlug}/settings`)
}

export async function createCategoryAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const title = parseRequiredString(formData, 'title')
  const description = parseOptionalString(formData, 'description')
  const slug = slugify(title)

  if (!slug) {
    throw new Error('Category slug cannot be empty')
  }

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id')
    .eq('slug', partnerSlug)
    .eq('role', 'admin')
    .maybeSingle()

  if (partnerError || !partner) {
    throw new Error('Only admin partners can manage categories')
  }

  const { error } = await supabase.from('categories').insert({
    slug,
    title,
    description,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/protected/${partnerSlug}/categories`)
  revalidatePath(`/protected/${partnerSlug}/reviews`)
}

export async function updateCategoryAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const categoryId = Number(parseRequiredString(formData, 'categoryId'))
  const title = parseRequiredString(formData, 'title')
  const description = parseOptionalString(formData, 'description')
  const slug = slugify(title)

  if (!slug) {
    throw new Error('Category slug cannot be empty')
  }

  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id')
    .eq('slug', partnerSlug)
    .eq('role', 'admin')
    .maybeSingle()

  if (partnerError || !partner) {
    throw new Error('Only admin partners can manage categories')
  }

  const { error } = await supabase
    .from('categories')
    .update({
      slug,
      title,
      description,
    })
    .eq('id', categoryId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/protected/${partnerSlug}/categories`)
  revalidatePath(`/protected/${partnerSlug}/reviews`)
}

export async function createListingAction(formData: FormData) {
  const created = await createListingDraftAction(formData)
  redirect(`/protected/${created.partnerSlug}/items/${created.listingSlug}`)
}

export async function createListingDraftAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const partnerId = Number(parseRequiredString(formData, 'partnerId'))
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const title = parseRequiredString(formData, 'title')
  const slugInput = formData.get('slug')
  const summary = formData.get('summary')
  const content = formData.get('content')
  const rawType = parseRequiredString(formData, 'type')
  const type = parseListingType(rawType)
  const publishedRaw = formData.get('published')
  const published = publishedRaw === 'true' || publishedRaw === 'on' || publishedRaw === '1'
  const url = parseOptionalString(formData, 'url')
  const templateZip = parseTemplateZip(formData)
  const documentationUrl = formData.get('documentationUrl')
  const normalizedDocumentationUrl =
    typeof documentationUrl === 'string' && documentationUrl.trim() ? documentationUrl.trim() : null
  const initiationActionUrl = parseOptionalString(formData, 'initiationActionUrl')
  const initiationActionMethod = parseInitiationMethod(
    formData.get('initiationActionMethod') as string | null
  )
  const intentRaw = formData.get('intent')
  const intent = intentRaw === 'request_review' ? 'request_review' : 'save'
  const files = parseStringList(formData, 'files[]')
  const slugSource = typeof slugInput === 'string' && slugInput.trim() ? slugInput : title
  const slug = slugify(slugSource)

  ensureListingDraftConstraints({ type, slug, url, templateZip, published, intent })

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      partner_id: partnerId,
      title,
      slug,
      summary: typeof summary === 'string' ? summary : null,
      content: typeof content === 'string' ? content : null,
      published,
      type,
      url: type === 'oauth' ? url : null,
      files,
      registry_listing_url: null,
      documentation_url: normalizedDocumentationUrl,
      initiation_action_url: initiationActionUrl,
      initiation_action_method: initiationActionMethod,
      submitted_by: user.id,
    })
    .select('id, slug')
    .single()

  if (error || !listing) {
    throw new Error(error?.message ?? 'Unable to create listing')
  }

  if (type === 'template' && templateZip) {
    const registryListingUrl = await uploadTemplatePackage({
      zipFile: templateZip,
      supabase,
      partnerId,
      listingId: listing.id,
    })
    const { error: templateUrlError } = await supabase
      .from('listings')
      .update({ registry_listing_url: registryListingUrl })
      .eq('id', listing.id)

    if (templateUrlError) {
      throw new Error(templateUrlError.message)
    }
  }

  if (intent === 'request_review') {
    const { error: reviewError } = await supabase.from('listing_reviews').upsert(
      {
        listing_id: listing.id,
        status: 'pending_review',
        featured: false,
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        published_at: null,
      },
      { onConflict: 'listing_id' }
    )

    if (reviewError) {
      throw new Error(reviewError.message)
    }
  }

  revalidatePath(`/protected/${partnerSlug}`)
  return {
    listingId: listing.id,
    listingSlug: listing.slug,
    partnerSlug,
  }
}

export async function updateListingAction(formData: FormData) {
  const updated = await updateListingDraftAction(formData)
  redirect(`/protected/${updated.partnerSlug}/items/${updated.listingSlug}`)
}

export async function saveListingFilesAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const listingId = Number(parseRequiredString(formData, 'listingId'))
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const nextFiles = parseStringList(formData, 'files[]')

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('slug, files')
    .eq('id', listingId)
    .single<{ slug: string; files: string[] | null }>()

  if (listingError || !listing) {
    throw new Error(listingError?.message ?? 'Unable to load listing')
  }

  const currentFiles = listing.files ?? []
  const removedPaths = currentFiles
    .filter((fileUrl) => !nextFiles.includes(fileUrl))
    .flatMap((fileUrl) => {
      const objectPath = getStorageObjectPathFromPublicUrl(fileUrl, MARKETPLACE_STORAGE_BUCKET)
      return objectPath ? [objectPath] : []
    })

  await removeStorageObjects(supabase, removedPaths)

  const { error: updateError } = await supabase
    .from('listings')
    .update({ files: nextFiles })
    .eq('id', listingId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  revalidatePath(`/protected/${partnerSlug}`)
  revalidatePath(`/protected/${partnerSlug}/items/${listing.slug}`)
  return { listingId, listingSlug: listing.slug, files: nextFiles }
}

export async function updateListingDraftAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const listingId = Number(parseRequiredString(formData, 'listingId'))
  const partnerId = Number(parseRequiredString(formData, 'partnerId'))
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const name = parseRequiredString(formData, 'name')
  const slugInput = formData.get('slug')
  const summary = formData.get('summary')
  const content = formData.get('content')
  const url = parseOptionalString(formData, 'url')
  const templateZip = parseTemplateZip(formData)
  const existingRegistryListingUrl = parseOptionalString(formData, 'existingRegistryListingUrl')
  const documentationUrl = formData.get('documentationUrl')
  const normalizedDocumentationUrl =
    typeof documentationUrl === 'string' && documentationUrl.trim() ? documentationUrl.trim() : null
  const initiationActionUrl = parseOptionalString(formData, 'initiationActionUrl')
  const initiationActionMethod = parseInitiationMethod(
    formData.get('initiationActionMethod') as string | null
  )
  const rawType = parseRequiredString(formData, 'type')
  const type = parseListingType(rawType)
  const publishedRaw = formData.get('published')
  const published = publishedRaw === 'true' || publishedRaw === 'on' || publishedRaw === '1'

  const slugSource = typeof slugInput === 'string' && slugInput.trim() ? slugInput : name
  const slug = slugify(slugSource)

  ensureListingDraftConstraints({
    type,
    slug,
    url,
    templateZip,
    existingRegistryListingUrl,
    published,
  })

  const templateRegistryUrl =
    type === 'template'
      ? templateZip
        ? await uploadTemplatePackage({
            zipFile: templateZip,
            supabase,
            partnerId,
            listingId,
          })
        : existingRegistryListingUrl
          ? getTemplateRegistryPublicUrl(supabase, partnerId, listingId)
          : null
      : null

  const { data: listing, error } = await supabase
    .from('listings')
    .update({
      title: name,
      slug,
      summary: typeof summary === 'string' ? summary : null,
      content: typeof content === 'string' ? content : null,
      published,
      url: type === 'oauth' ? url : null,
      documentation_url: normalizedDocumentationUrl,
      initiation_action_url: initiationActionUrl,
      initiation_action_method: initiationActionMethod,
      type,
      registry_listing_url: type === 'template' ? templateRegistryUrl : null,
    })
    .eq('id', listingId)
    .select('slug')
    .single()

  if (error || !listing) {
    throw new Error(error?.message ?? 'Unable to update listing')
  }

  revalidatePath(`/protected/${partnerSlug}`)
  return {
    listingId,
    listingSlug: listing.slug,
    partnerSlug,
  }
}

export async function requestListingReviewAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const listingId = Number(parseRequiredString(formData, 'listingId'))
  const listingSlug = parseRequiredString(formData, 'listingSlug')
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('type, registry_listing_url, url')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    throw new Error(listingError?.message ?? 'Unable to load listing')
  }

  ensureListingDraftConstraints({
    type: parseListingType(listing.type),
    slug: listingSlug,
    url: listing.url,
    templateZip: null,
    existingRegistryListingUrl: listing.registry_listing_url,
    intent: 'request_review',
  })

  const { data: existingReview, error: existingReviewError } = await supabase
    .from('listing_reviews')
    .select('status')
    .eq('listing_id', listingId)
    .maybeSingle()

  if (existingReviewError) {
    throw new Error(existingReviewError.message)
  }

  if (shouldRequestReview(existingReview?.status)) {
    const { error: upsertError } = await supabase.from('listing_reviews').upsert(
      {
        listing_id: listingId,
        status: 'pending_review',
        featured: false,
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        published_at: null,
      },
      { onConflict: 'listing_id' }
    )

    if (upsertError) {
      throw new Error(upsertError.message)
    }
  }

  revalidatePath(`/protected/${partnerSlug}`)
  revalidatePath(`/protected/${partnerSlug}/items/${listingSlug}`)
  redirect(`/protected/${partnerSlug}/items/${listingSlug}`)
}

export async function updateListingReviewAction(formData: FormData) {
  const { listingId, partnerSlug } = await saveListingReviewAction(formData)
  redirect(`/protected/${partnerSlug}/reviews/${listingId}`)
}

export async function saveListingReviewAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const listingId = Number(parseRequiredString(formData, 'listingId'))
  const partnerSlug = parseRequiredString(formData, 'partnerSlug')
  const status = parseRequiredString(formData, 'status')
  const reviewNotes = formData.get('reviewNotes')
  const featured = formData.get('featured') === 'on'
  const categoryIds = parseNumberList(formData, 'categoryIds[]')
  if (!isReviewStatus(status)) {
    throw new Error('Invalid review status')
  }

  const { error } = await supabase.from('listing_reviews').upsert(
    {
      listing_id: listingId,
      status,
      featured,
      review_notes: typeof reviewNotes === 'string' ? reviewNotes : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    },
    { onConflict: 'listing_id' }
  )

  if (error) {
    throw new Error(error.message)
  }

  const { data: existingCategoryListings, error: existingCategoryListingsError } = await supabase
    .from('category_listings')
    .select('category_id')
    .eq('listing_id', listingId)

  if (existingCategoryListingsError) {
    throw new Error(existingCategoryListingsError.message)
  }

  const existingCategoryIds = new Set(
    (existingCategoryListings ?? []).map((entry) => entry.category_id)
  )
  const nextCategoryIds = new Set(categoryIds)
  const categoryIdsToInsert = categoryIds.filter(
    (categoryId) => !existingCategoryIds.has(categoryId)
  )
  const categoryIdsToDelete = Array.from(existingCategoryIds).filter(
    (categoryId) => !nextCategoryIds.has(categoryId)
  )

  if (categoryIdsToDelete.length > 0) {
    const { error: deleteCategoryListingsError } = await supabase
      .from('category_listings')
      .delete()
      .eq('listing_id', listingId)
      .in('category_id', categoryIdsToDelete)

    if (deleteCategoryListingsError) {
      throw new Error(deleteCategoryListingsError.message)
    }
  }

  if (categoryIdsToInsert.length > 0) {
    const { error: insertCategoryListingsError } = await supabase.from('category_listings').insert(
      categoryIdsToInsert.map((categoryId) => ({
        listing_id: listingId,
        category_id: categoryId,
      }))
    )

    if (insertCategoryListingsError) {
      throw new Error(insertCategoryListingsError.message)
    }
  }

  revalidatePath(`/protected/${partnerSlug}/reviews`)
  revalidatePath(`/protected/${partnerSlug}/reviews/${listingId}`)
  return { listingId, partnerSlug }
}
