import { describe, expect, it } from 'vitest'

import {
  getItemFilesStoragePath,
  getStorageObjectPathFromPublicUrl,
  getItemTemplateRegistryFilePath,
  getItemTemplateStoragePath,
  MARKETPLACE_STORAGE_BUCKET,
} from './item-storage'

describe('item storage helpers', () => {
  it('uses a single public bucket', () => {
    expect(MARKETPLACE_STORAGE_BUCKET).toBe('item_files')
  })

  it('builds stable storage paths for item files and template packages', () => {
    expect(getItemFilesStoragePath(1, 2)).toBe('1/items/2/files')
    expect(getItemTemplateStoragePath(1, 2)).toBe('1/items/2/template')
    expect(getItemTemplateRegistryFilePath(1, 2)).toBe('1/items/2/template/template.json')
  })

  it('extracts storage object paths from public URLs', () => {
    expect(
      getStorageObjectPathFromPublicUrl(
        'https://project.supabase.co/storage/v1/object/public/item_files/1/items/2/files/readme.txt',
        'item_files'
      )
    ).toBe('1/items/2/files/readme.txt')
  })
})
