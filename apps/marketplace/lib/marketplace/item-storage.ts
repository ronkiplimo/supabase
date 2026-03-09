export const MARKETPLACE_STORAGE_BUCKET = 'item_files'

export function getItemFilesStoragePath(partnerId: number | string, itemId: number | string) {
  return `${partnerId}/items/${itemId}/files`
}

export function getItemTemplateStoragePath(partnerId: number | string, itemId: number | string) {
  return `${partnerId}/items/${itemId}/template`
}

export function getItemTemplateRegistryFilePath(partnerId: number | string, itemId: number | string) {
  return `${getItemTemplateStoragePath(partnerId, itemId)}/template.json`
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
