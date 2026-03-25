import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addPartnerMemberAction,
  createListingAction,
  createListingDraftAction,
  createPartnerAction,
  requestListingReviewAction,
  saveListingFilesAction,
  saveListingReviewAction,
  updateListingAction,
  updateListingDraftAction,
  updateListingReviewAction,
  updatePartnerAction,
} from './actions'

const redirectMock = vi.fn()
const revalidatePathMock = vi.fn()
const createClientMock = vi.fn()
const jsZipLoadAsyncMock = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}))

vi.mock('jszip', () => ({
  default: {
    loadAsync: (...args: unknown[]) => jsZipLoadAsyncMock(...args),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

type Result<T = unknown> = { data: T; error: null | { message: string; code?: string } }

function success<T>(data: T): Result<T> {
  return { data, error: null }
}

function failure(message: string, code?: string): Result<null> {
  return { data: null, error: { message, code } }
}

function createSupabaseMock({
  user,
  fromHandler,
  storage,
  rpc,
}: {
  user: null | { id: string }
  fromHandler: (table: string, state: Record<string, unknown>) => Result
  storage?: {
    list?: (bucket: string, path: string) => Promise<Result<unknown[]>>
    remove?: (bucket: string, paths: string[]) => Promise<{ error: null | { message: string } }>
    upload?: (
      bucket: string,
      path: string,
      file?: Blob
    ) => Promise<{ error: null | { message: string } }>
    download?: (
      bucket: string,
      path: string
    ) => Promise<{ data: Blob | null; error: null | { message: string } }>
    getPublicUrl?: (bucket: string, path: string) => { data: { publicUrl: string } }
  }
  rpc?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ error: null | { message: string } }>
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    rpc: vi
      .fn()
      .mockImplementation((name, args) => rpc?.(name, args) ?? Promise.resolve({ error: null })),
    storage: {
      from: vi.fn().mockImplementation((bucket: string) => ({
        list: vi
          .fn()
          .mockImplementation(
            (path: string) => storage?.list?.(bucket, path) ?? Promise.resolve(success([]))
          ),
        remove: vi
          .fn()
          .mockImplementation(
            (paths: string[]) => storage?.remove?.(bucket, paths) ?? Promise.resolve({ error: null })
          ),
        upload: vi
          .fn()
          .mockImplementation(
            (path: string, file?: Blob) =>
              storage?.upload?.(bucket, path, file) ?? Promise.resolve({ error: null })
          ),
        download: vi
          .fn()
          .mockImplementation(
            (path: string) =>
              storage?.download?.(bucket, path) ??
              Promise.resolve({ data: new Blob(['{}']), error: null })
          ),
        getPublicUrl: vi
          .fn()
          .mockImplementation(
            (path: string) => storage?.getPublicUrl?.(bucket, path) ?? { data: { publicUrl: path } }
          ),
      })),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const state: Record<string, unknown> = { table }
      const builder: Record<string, any> = {
        data: null,
        error: null,
        select: (value: string) => {
          state.select = value
          const result = fromHandler(table, { ...state, op: state.op ?? 'select' })
          builder.data = result.data
          builder.error = result.error
          return builder
        },
        insert: (value: unknown) => {
          state.op = 'insert'
          state.insert = value
          const result = fromHandler(table, state)
          builder.data = result.data
          builder.error = result.error
          return builder
        },
        update: (value: unknown) => {
          state.op = 'update'
          state.update = value
          const result = fromHandler(table, state)
          builder.data = result.data
          builder.error = result.error
          return builder
        },
        upsert: (value: unknown) => {
          state.op = 'upsert'
          state.upsert = value
          const result = fromHandler(table, state)
          builder.data = result.data
          builder.error = result.error
          return Promise.resolve(result)
        },
        delete: () => {
          state.op = 'delete'
          const result = fromHandler(table, state)
          builder.data = result.data
          builder.error = result.error
          return builder
        },
        eq: (key: string, value: unknown) => {
          state[`eq:${key}`] = value
          return builder
        },
        in: (key: string, value: unknown) => {
          state[`in:${key}`] = value
          return builder
        },
        order: () => builder,
        single: () => Promise.resolve({ data: builder.data, error: builder.error }),
        maybeSingle: () => Promise.resolve({ data: builder.data, error: builder.error }),
      }
      return builder
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  redirectMock.mockReset()
})

describe('protected actions', () => {
  it('redirects unauthenticated create listing requests', async () => {
    redirectMock.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })

    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: null,
        fromHandler: () => success(null),
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'Listing')
    formData.set('type', 'oauth')
    formData.set('url', 'https://example.com')

    await expect(createListingDraftAction(formData)).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith('/auth/login')
  })

  it('creates partner and redirects to partner route', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'partners' && state.op === 'insert') {
            return success({ id: 3, slug: 'acme' })
          }
          if (table === 'partner_members' && state.op === 'insert') {
            return failure('duplicate', '23505')
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('title', 'Acme Corp')

    await createPartnerAction(formData)
    expect(revalidatePathMock).toHaveBeenCalledWith('/protected')
    expect(redirectMock).toHaveBeenCalledWith('/protected/acme')
  })

  it('updates partner settings and redirects to settings page', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'partners' && state.op === 'update') {
            return success(null)
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '3')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'Acme Updated')
    formData.set('description', 'Desc')

    await updatePartnerAction(formData)
    expect(redirectMock).toHaveBeenCalledWith('/protected/acme/settings')
  })

  it('adds partner member and normalizes non-admin role to member', async () => {
    const rpcSpy = vi.fn().mockResolvedValue({ error: null })
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        rpc: rpcSpy,
        fromHandler: () => success(null),
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '3')
    formData.set('partnerSlug', 'acme')
    formData.set('email', 'new@example.com')
    formData.set('role', 'viewer')

    await addPartnerMemberAction(formData)
    expect(rpcSpy).toHaveBeenCalledWith('add_partner_member', {
      target_partner_id: 3,
      target_email: 'new@example.com',
      target_role: 'member',
    })
  })

  it('creates oauth listing and review row when requesting review', async () => {
    const upsertSpy = vi.fn()
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'insert') {
            return success({ id: 10, slug: 'oauth-listing' })
          }
          if (table === 'listing_reviews' && state.op === 'upsert') {
            upsertSpy(state.upsert)
            return success(null)
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'OAuth Listing')
    formData.set('type', 'oauth')
    formData.set('url', 'https://example.com/listing')
    formData.set('intent', 'request_review')

    const result = await createListingDraftAction(formData)
    expect(result).toEqual({ listingId: 10, listingSlug: 'oauth-listing', partnerSlug: 'acme' })
    expect(upsertSpy).toHaveBeenCalled()
  })

  it('creates template listing and updates registry URL from uploaded package', async () => {
    jsZipLoadAsyncMock.mockResolvedValue({
      files: {
        'pkg/template.json': {
          dir: false,
          name: 'pkg/template.json',
          async: vi.fn().mockResolvedValue(new Blob(['{}'], { type: 'application/json' })),
        },
        'pkg/functions/main.ts': {
          dir: false,
          name: 'pkg/functions/main.ts',
          async: vi.fn().mockResolvedValue(new Blob(['export {}'], { type: 'text/plain' })),
        },
        'pkg/migrations/001.sql': {
          dir: false,
          name: 'pkg/migrations/001.sql',
          async: vi.fn().mockResolvedValue(new Blob(['select 1;'], { type: 'text/plain' })),
        },
      },
    })

    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        storage: {
          list: vi.fn().mockResolvedValue(success([])),
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.example/template.json' } }),
        },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'insert') {
            return success({ id: 20, slug: 'template-listing' })
          }
          if (table === 'listings' && state.op === 'update') {
            return success(null)
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    const templateZip = new File(['zip'], 'template.zip', { type: 'application/zip' })
    ;(templateZip as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = vi
      .fn()
      .mockResolvedValue(new ArrayBuffer(8))
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'Template Listing')
    formData.set('type', 'template')
    formData.set('templateZip', templateZip)

    const result = await createListingDraftAction(formData)
    expect(result).toEqual({ listingId: 20, listingSlug: 'template-listing', partnerSlug: 'acme' })
  })

  it('creates template drafts without a template package', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'insert') {
            return success({ id: 21, slug: 'draft-template' })
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'Draft Template')
    formData.set('type', 'template')

    const result = await createListingDraftAction(formData)
    expect(result).toEqual({ listingId: 21, listingSlug: 'draft-template', partnerSlug: 'acme' })
  })

  it('throws when template listing review upsert fails', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'insert') {
            return success({ id: 10, slug: 'oauth-listing' })
          }
          if (table === 'listing_reviews' && state.op === 'upsert') {
            return failure('review upsert failed')
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'OAuth Listing')
    formData.set('type', 'oauth')
    formData.set('url', 'https://example.com/listing')
    formData.set('intent', 'request_review')

    await expect(createListingDraftAction(formData)).rejects.toThrow('review upsert failed')
  })

  it('redirects after create listing action wrapper', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'insert') {
            return success({ id: 10, slug: 'oauth-listing' })
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('title', 'OAuth Listing')
    formData.set('type', 'oauth')
    formData.set('url', 'https://example.com/listing')

    await createListingAction(formData)
    expect(redirectMock).toHaveBeenCalledWith('/protected/acme/items/oauth-listing')
  })

  it('does not upsert review when current status is draft', async () => {
    const upsertSpy = vi.fn()
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({ type: 'oauth', registry_listing_url: null, url: 'https://example.com' })
          }
          if (table === 'listing_reviews' && state.op === 'select') {
            return success({ status: 'draft' })
          }
          if (table === 'listing_reviews' && state.op === 'upsert') {
            upsertSpy()
            return success(null)
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '7')
    formData.set('listingSlug', 'my-listing')
    formData.set('partnerSlug', 'acme')

    await requestListingReviewAction(formData)
    expect(upsertSpy).not.toHaveBeenCalled()
    expect(redirectMock).toHaveBeenCalledWith('/protected/acme/items/my-listing')
  })

  it('rejects invalid review statuses', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: () => success(null),
      })
    )

    const formData = new FormData()
    formData.set('listingId', '9')
    formData.set('partnerSlug', 'acme')
    formData.set('status', 'invalid_status')

    await expect(saveListingReviewAction(formData)).rejects.toThrow('Invalid review status')
  })

  it('deletes removed files when saving listing file URLs', async () => {
    const storageRemoveSpy = vi.fn().mockResolvedValue({ error: null })
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({
              slug: 'updated-listing',
              files: ['https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/a.png'],
            })
          }
          if (table === 'listings' && state.op === 'update') {
            return success(null)
          }
          return success(null)
        },
        storage: {
          remove: storageRemoveSpy,
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '2')
    formData.set('partnerSlug', 'acme')
    formData.append(
      'files[]',
      'https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/b.png'
    )

    const result = await saveListingFilesAction(formData)
    expect(result).toEqual({
      listingId: 2,
      listingSlug: 'updated-listing',
      files: ['https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/b.png'],
    })
    expect(storageRemoveSpy).toHaveBeenCalledWith('listing_files', ['1/listings/2/files/a.png'])
  })

  it('throws when storage file deletion fails while saving listing file URLs', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({
              slug: 'updated-listing',
              files: ['https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/a.png'],
            })
          }
          return success(null)
        },
        storage: {
          remove: vi.fn().mockResolvedValue({ error: { message: 'storage delete failed' } }),
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '2')
    formData.set('partnerSlug', 'acme')
    formData.append(
      'files[]',
      'https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/b.png'
    )

    await expect(saveListingFilesAction(formData)).rejects.toThrow('storage delete failed')
  })

  it('throws when updating listing file URLs fails', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({
              slug: 'updated-listing',
              files: ['https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/a.png'],
            })
          }
          if (table === 'listings' && state.op === 'update') {
            return failure('listing update failed')
          }
          return success(null)
        },
        storage: {
          remove: vi.fn().mockResolvedValue({ error: null }),
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '2')
    formData.set('partnerSlug', 'acme')
    formData.append(
      'files[]',
      'https://project.supabase.co/storage/v1/object/public/listing_files/1/listings/2/files/b.png'
    )

    await expect(saveListingFilesAction(formData)).rejects.toThrow('listing update failed')
  })

  it('redirects after update listing action wrapper', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'update') {
            return success({ slug: 'updated-listing' })
          }
          if (table === 'listings' && state.op === 'select') {
            return success({
              id: 2,
              partner_id: 1,
              published: false,
              type: 'oauth',
              registry_listing_url: null,
            })
          }
          if (table === 'listing_reviews' && state.op === 'select') {
            return success(null)
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '2')
    formData.set('partnerId', '1')
    formData.set('partnerSlug', 'acme')
    formData.set('name', 'Updated Listing')
    formData.set('type', 'oauth')
    formData.set('url', 'https://example.com')

    await updateListingAction(formData)
    expect(redirectMock).toHaveBeenCalledWith('/protected/acme/items/updated-listing')
  })

  it('throws when fetching existing review fails', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({ type: 'oauth', registry_listing_url: null, url: 'https://example.com' })
          }
          if (table === 'listing_reviews' && state.op === 'select') {
            return failure('existing review query failed')
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '7')
    formData.set('listingSlug', 'my-listing')
    formData.set('partnerSlug', 'acme')

    await expect(requestListingReviewAction(formData)).rejects.toThrow('existing review query failed')
  })

  it('rejects template review requests when no template package has been uploaded', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({ type: 'template', registry_listing_url: null, url: null })
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '7')
    formData.set('listingSlug', 'my-listing')
    formData.set('partnerSlug', 'acme')

    await expect(requestListingReviewAction(formData)).rejects.toThrow(
      'Template listings require a template ZIP package before publishing or requesting review'
    )
  })

  it('throws when request-review upsert fails', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({ type: 'oauth', registry_listing_url: null, url: 'https://example.com' })
          }
          if (table === 'listing_reviews' && state.op === 'select') {
            return success({ status: 'rejected' })
          }
          if (table === 'listing_reviews' && state.op === 'upsert') {
            return failure('upsert failed')
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '7')
    formData.set('listingSlug', 'my-listing')
    formData.set('partnerSlug', 'acme')

    await expect(requestListingReviewAction(formData)).rejects.toThrow('upsert failed')
  })

  it('throws when save review upsert fails', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: (table, state) => {
          if (table === 'listing_reviews' && state.op === 'upsert') {
            return failure('save review failed')
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '9')
    formData.set('partnerSlug', 'acme')
    formData.set('status', 'approved')
    formData.set('reviewNotes', 'ok')

    await expect(saveListingReviewAction(formData)).rejects.toThrow('save review failed')
  })

  it('redirects after update listing review action wrapper', async () => {
    createClientMock.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'reviewer' },
        fromHandler: (table, state) => {
          if (table === 'listings' && state.op === 'select') {
            return success({
              id: 9,
              partner_id: 1,
              published: false,
              type: 'oauth',
              registry_listing_url: null,
            })
          }
          if (table === 'listing_reviews' && state.op === 'select') {
            return success({ status: 'approved' })
          }
          return success(null)
        },
      })
    )

    const formData = new FormData()
    formData.set('listingId', '9')
    formData.set('partnerSlug', 'acme')
    formData.set('status', 'approved')
    formData.set('reviewNotes', 'ok')

    await updateListingReviewAction(formData)
    expect(redirectMock).toHaveBeenCalledWith('/protected/acme/reviews/9')
  })
})
