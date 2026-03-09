import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const saveItemFilesActionMock = vi.fn()

vi.mock('@/app/protected/actions', () => ({
  saveItemFilesAction: (...args: unknown[]) => saveItemFilesActionMock(...args),
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

import { ItemFilesUploader } from '@/components/item-files-uploader'

describe('ItemFilesUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    saveItemFilesActionMock.mockResolvedValue({ itemId: 2, itemSlug: 'item', files: [] })
  })

  it('persists the remaining file URLs after removing a file and auto-uploading', async () => {
    const user = userEvent.setup()
    const initialFiles = ['https://project.supabase.co/storage/v1/object/public/item_files/1/items/2/files/readme.txt']
    const { rerender } = render(
      <ItemFilesUploader partnerId={1} partnerSlug="acme" itemId={2} initialFiles={initialFiles} />
    )

    await user.click(screen.getByRole('button', { name: 'Remove readme.txt' }))

    rerender(
      <ItemFilesUploader
        partnerId={1}
        partnerSlug="acme"
        itemId={2}
        initialFiles={initialFiles}
        autoUploadSignal={1}
      />
    )

    await waitFor(() => expect(saveItemFilesActionMock).toHaveBeenCalledTimes(1))

    const formData = saveItemFilesActionMock.mock.calls[0]?.[0]
    expect(formData).toBeInstanceOf(FormData)
    expect((formData as FormData).get('itemId')).toBe('2')
    expect((formData as FormData).get('partnerSlug')).toBe('acme')
    expect((formData as FormData).getAll('files[]')).toEqual([])
  })
})
