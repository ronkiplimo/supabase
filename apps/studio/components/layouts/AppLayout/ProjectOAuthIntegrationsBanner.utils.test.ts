import { describe, expect, it } from 'vitest'

import type { AuthorizedApp } from 'data/oauth/authorized-apps-query'
import {
  getAuthorizedAppDisplayData,
  getConnectedAppsDescription,
  getConnectedAppsTitle,
  isProjectRoute,
} from './ProjectOAuthIntegrationsBanner.utils'

const createAuthorizedApp = (overrides: Partial<AuthorizedApp>): AuthorizedApp => ({
  id: 'auth-app-id',
  app_id: 'oauth-app-id',
  icon: null,
  name: 'Lovable',
  website: 'https://example.com',
  created_by: 'user-1',
  authorized_at: new Date().toISOString(),
  ...overrides,
})

describe('ProjectOAuthIntegrationsBanner utils', () => {
  describe('isProjectRoute', () => {
    it('returns true for project route template pathnames', () => {
      expect(isProjectRoute({ pathname: '/project/[ref]/database/tables' })).toBe(true)
    })

    it('returns true for project URLs from asPath', () => {
      expect(isProjectRoute({ pathname: '/unknown', asPath: '/project/default/functions' })).toBe(
        true
      )
    })

    it('returns false for non-project routes', () => {
      expect(isProjectRoute({ pathname: '/org/[slug]/apps', asPath: '/org/default/apps' })).toBe(
        false
      )
    })
  })

  describe('getAuthorizedAppDisplayData', () => {
    it('returns unique display-safe app names', () => {
      const displayApps = getAuthorizedAppDisplayData([
        createAuthorizedApp({ name: '  Lovable  ' }),
        createAuthorizedApp({ name: 'lovable' }),
        createAuthorizedApp({ name: 'Bolt.new' }),
        createAuthorizedApp({ name: ' ' }),
      ])

      expect(displayApps).toEqual([
        { name: 'Lovable', icon: null },
        { name: 'Bolt.new', icon: null },
      ])
    })

    it('backfills icon from duplicate entries', () => {
      const displayApps = getAuthorizedAppDisplayData([
        createAuthorizedApp({ name: 'Figma', icon: null }),
        createAuthorizedApp({ name: 'figma', icon: 'https://cdn.example.com/figma.png' }),
      ])

      expect(displayApps).toEqual([
        { name: 'Figma', icon: 'https://cdn.example.com/figma.png' },
      ])
    })
  })

  describe('copy helpers', () => {
    it('renders title for a single app', () => {
      expect(getConnectedAppsTitle(['Lovable'])).toBe('This project is connected to Lovable')
    })

    it('renders condensed title for multiple apps', () => {
      expect(getConnectedAppsTitle(['Lovable', 'Bolt', 'Replit'])).toBe(
        'This project is connected to Lovable, Bolt, and 1 other app'
      )
    })

    it('renders a matching description', () => {
      expect(getConnectedAppsDescription(['Lovable'])).toBe(
        'Changes made here may affect how your project works in Lovable.'
      )
    })
  })
})
