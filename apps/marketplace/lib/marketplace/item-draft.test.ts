import { describe, expect, it } from 'vitest'

import {
  ensureListingDraftConstraints,
  parseListingType,
  parseNumberList,
  parseOptionalString,
  parseRequiredString,
  parseStringList,
  parseTemplateZip,
  slugify,
} from './item-draft'

describe('listing-draft utils', () => {
  it('slugifies user-facing titles', () => {
    expect(slugify('  Auth Starter: OAuth  ')).toBe('auth-starter-oauth')
  })

  it('parses required and optional strings', () => {
    const formData = new FormData()
    formData.set('title', '  My Item  ')
    formData.set('maybe', '   ')

    expect(parseRequiredString(formData, 'title')).toBe('My Item')
    expect(parseOptionalString(formData, 'maybe')).toBeNull()
    expect(() => parseRequiredString(formData, 'missing')).toThrow('Missing required field: missing')
  })

  it('parses positive unique number lists', () => {
    const formData = new FormData()
    formData.append('removedFileIds[]', '3')
    formData.append('removedFileIds[]', '2')
    formData.append('removedFileIds[]', '2')
    formData.append('removedFileIds[]', '-1')
    formData.append('removedFileIds[]', 'abc')

    expect(parseNumberList(formData, 'removedFileIds[]')).toEqual([2, 3])
  })

  it('parses unique trimmed string lists', () => {
    const formData = new FormData()
    formData.append('files[]', ' https://example.com/a.png ')
    formData.append('files[]', 'https://example.com/a.png')
    formData.append('files[]', '   ')

    expect(parseStringList(formData, 'files[]')).toEqual(['https://example.com/a.png'])
  })

  it('parses listing type enum safely', () => {
    expect(parseListingType('oauth')).toBe('oauth')
    expect(parseListingType('template')).toBe('template')
    expect(parseListingType('unknown')).toBeNull()
  })

  it('requires valid constraints by listing type', () => {
    const templateFile = new File(['x'], 'template.zip', { type: 'application/zip' })

    expect(() =>
      ensureListingDraftConstraints({
        type: 'oauth',
        slug: 'oauth-listing',
        url: null,
        templateZip: null,
      })
    ).toThrow('OAuth listings require a listing URL')

    expect(() =>
      ensureListingDraftConstraints({
        type: 'template',
        slug: 'template-listing',
        url: null,
        templateZip: null,
        published: true,
      })
    ).toThrow('Template listings require a template ZIP package before publishing or requesting review')

    expect(() =>
      ensureListingDraftConstraints({
        type: 'template',
        slug: 'template-listing',
        url: null,
        templateZip: templateFile,
        published: true,
      })
    ).not.toThrow()
  })

  it('allows template drafts without a template package', () => {
    expect(() =>
      ensureListingDraftConstraints({
        type: 'template',
        slug: 'template-listing',
        url: null,
        templateZip: null,
      })
    ).not.toThrow()
  })

  it('requires a template package when requesting review', () => {
    expect(() =>
      ensureListingDraftConstraints({
        type: 'template',
        slug: 'template-listing',
        url: null,
        templateZip: null,
        intent: 'request_review',
      })
    ).toThrow('Template listings require a template ZIP package before publishing or requesting review')
  })

  it('parses template zip file only when provided', () => {
    const formData = new FormData()
    const zip = new File(['zip'], 'template.zip', { type: 'application/zip' })
    formData.set('templateZip', zip)

    expect(parseTemplateZip(formData)).toBe(zip)
    expect(parseTemplateZip(new FormData())).toBeNull()
  })

  it('accepts file-like template uploads from server actions', () => {
    const zipLike = {
      name: 'template.zip',
      type: 'application/zip',
      size: 3,
      arrayBuffer: async () => new ArrayBuffer(3),
    }
    const formData = {
      get: (key: string) => (key === 'templateZip' ? zipLike : null),
    } as unknown as FormData

    expect(parseTemplateZip(formData)).toBe(zipLike)
  })
})
