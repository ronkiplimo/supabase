import { describe, expect, it } from 'vitest'

import type { AuthorizedApp } from 'data/oauth/authorized-apps-query'
import {
  getAuthorizedAppDisplayData,
  getAuthorizedAppNames,
  getConnectedAppsSentence,
  getConnectedAppsTitle,
  getMockAuthorizedApps,
  isProjectRoute,
  shouldDisableMockAuthorizedApps,
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

  describe('getAuthorizedAppNames', () => {
    it('returns unique display-safe app names', () => {
      const appNames = getAuthorizedAppNames([
        createAuthorizedApp({ name: '  Lovable  ' }),
        createAuthorizedApp({ name: 'lovable' }),
        createAuthorizedApp({ name: 'Bolt.new' }),
        createAuthorizedApp({ name: ' ' }),
      ])

      expect(appNames).toEqual(['Lovable', 'Bolt.new'])
    })
  })

  describe('getAuthorizedAppDisplayData', () => {
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

  describe('getConnectedAppsTitle', () => {
    it('renders title for a single app', () => {
      expect(getConnectedAppsTitle(['Lovable'])).toBe('Connected to Lovable')
    })

    it('renders a condensed title for multiple apps', () => {
      expect(getConnectedAppsTitle(['Lovable', 'Bolt', 'Replit'])).toBe(
        'Connected to Lovable, Bolt, and 1 other app'
      )
    })
  })

  describe('getConnectedAppsSentence', () => {
    it('renders single-line sentence copy', () => {
      expect(getConnectedAppsSentence(['Lovable'])).toBe(
        'This project is integrated with Lovable and dashboard changes may impact this project'
      )
    })
  })

  describe('mock parsing', () => {
    it('parses comma-separated app names into mock apps', () => {
      const { apps, isMocked } = getMockAuthorizedApps('Lovable,Bolt,Figma')

      expect(isMocked).toBe(true)
      expect(apps.map((app) => app.name)).toEqual(['Lovable', 'Bolt', 'Figma'])
      expect(apps.every((app) => app.created_by === 'mock-oauth')).toBe(true)
    })

    it('supports optional icon in mock entries', () => {
      const { apps, isMocked } = getMockAuthorizedApps('Figma|https://cdn.example.com/figma.png')

      expect(isMocked).toBe(true)
      expect(apps[0]).toMatchObject({
        name: 'Figma',
        icon: 'https://cdn.example.com/figma.png',
      })
    })

    it('treats off/none flags as mock disabled', () => {
      expect(shouldDisableMockAuthorizedApps('off')).toBe(true)
      expect(shouldDisableMockAuthorizedApps('none')).toBe(true)

      const parsed = getMockAuthorizedApps('off')
      expect(parsed).toEqual({ apps: [], isMocked: false })
    })
  })
})
