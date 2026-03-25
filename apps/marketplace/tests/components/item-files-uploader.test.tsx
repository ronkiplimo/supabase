import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const saveListingFilesActionMock = vi.fn()

vi.mock('@/app/protected/actions', () => ({
  saveListingFilesAction: (...args: unknown[]) => saveListingFilesActionMock(...args),
}))

vi.mock('@/hooks/use-supabase-upload', () => ({
  useSupabaseUpload: () => ({
    files: [],
    setFiles: vi.fn(),
    onUpload: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('@/components/dropzone', () => ({
  Dropzone: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropzoneEmptyState: () => <div data-testid="dropzone-empty" />,
  DropzoneContent: () => <div data-testid="dropzone-content" />,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example/new-file.png' } }),
      }),
    },
  }),
}))

import { ListingFilesUploader } from '@/components/item-files-uploader'

describe('ListingFilesUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    saveListingFilesActionMock.mockResolvedValue({ listingId: 2, listingSlug: 'item', files: [] })
  })

  it('persists the remaining file URLs after removing a file and auto-uploading', async () => {
    const user = userEvent.setup()
    const initialFiles = ['https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/readme.txt']
    const { rerender } = render(
      <ListingFilesUploader partnerId={1} partnerSlug="acme" listingId={2} initialFiles={initialFiles} />
    )

    await user.click(screen.getByRole('button', { name: 'Remove readme.txt' }))

    rerender(
      <ListingFilesUploader
        partnerId={1}
        partnerSlug="acme"
        listingId={2}
        initialFiles={initialFiles}
        autoUploadSignal={1}
      />
    )

    await waitFor(() => expect(saveListingFilesActionMock).toHaveBeenCalledTimes(1))

    const formData = saveListingFilesActionMock.mock.calls[0]?.[0]
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('listingId')).toBe('2')
    expect((formData as FormData).get('partnerSlug')).toBe('acme')
    expect((formData as FormData).getAll('files[]')).toEqual([])
  })
})
