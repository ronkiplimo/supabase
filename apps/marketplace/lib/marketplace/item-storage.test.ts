import { describe, expect, it } from 'vitest'

import {
  getListingFilesStoragePath,
  getStorageObjectPathFromPublicUrl,
  getListingTemplateRegistryFilePath,
  getListingTemplateStoragePath,
  MARKETPLACE_STORAGE_BUCKET,
} from './item-storage'

describe('listing storage helpers', () => {
  it('uses a single public bucket', () => {
    expect(MARKETPLACE_STORAGE_BUCKET).toBe('listing_files')
  })

  it('builds stable storage paths for listing files and template packages', () => {
    expect(getListingFilesStoragePath(1, 2)).toBe('1/listings/2/files')
    expect(getListingTemplateStoragePath(1, 2)).toBe('1/listings/2/template')
    expect(getListingTemplateRegistryFilePath(1, 2)).toBe('1/listings/2/template/template.json')
  })

  it('extracts storage object paths from public URLs', () => {
    expect(
      getStorageObjectPathFromPublicUrl(
        'https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/readme.txt',
        'listing_files'
      )
    ).toBe('1/listings/2/files/readme.txt')
  })
})
