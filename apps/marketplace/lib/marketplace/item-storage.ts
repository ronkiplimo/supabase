export const MARKETPLACE_STORAGE_BUCKET = 'listing_files'

export function getListingFilesStoragePath(partnerId: number | string, listingId: number | string) {
  return `${partnerId}/listings/${listingId}/files`
}

export function getListingTemplateStoragePath(partnerId: number | string, listingId: number | string) {
  return `${partnerId}/listings/${listingId}/template`
}

export function getListingTemplateRegistryFilePath(partnerId: number | string, listingId: number | string) {
  return `${getListingTemplateStoragePath(partnerId, listingId)}/template.json`
}

export function getStorageObjectPathFromPublicUrl(publicUrl: string, bucketName: string) {
  try {
    const url = new URL(publicUrl)
    const publicPrefix = `/storage/v1/object/public/${bucketName}/`

    if (!url.pathname.startsWith(publicPrefix)) {
      return null
    }

    const encodedPath = url.pathname.slice(publicPrefix.length)
    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}
