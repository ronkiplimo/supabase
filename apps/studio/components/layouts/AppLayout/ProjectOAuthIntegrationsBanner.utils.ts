import type { AuthorizedApp, AuthorizedAppsData } from 'data/oauth/authorized-apps-query'

const PROJECT_ROUTE_PREFIX = '/project/'
const PROJECT_ROUTE_TEMPLATE = '/project/[ref]'
const MAX_APPS_IN_TITLE = 2
const MOCK_DISABLED_VALUES = new Set(['0', 'false', 'none', 'off'])
const MOCK_NAME_ICON_DELIMITER = '|'

const sanitizeAppName = (name: string) => name.trim().replace(/\s+/g, ' ')

const getStringValue = (value?: string | string[] | null) => {
  if (!value) return ''
  return Array.isArray(value) ? value.join(',') : value
}

export const isProjectRoute = ({ pathname, asPath }: { pathname?: string; asPath?: string }) =>
  Boolean(pathname?.startsWith(PROJECT_ROUTE_TEMPLATE) || asPath?.startsWith(PROJECT_ROUTE_PREFIX))

export const getAuthorizedAppNames = (authorizedApps: AuthorizedAppsData = []) => {
  return getAuthorizedAppDisplayData(authorizedApps).map((app) => app.name)
}

export const getAuthorizedAppDisplayData = (authorizedApps: AuthorizedAppsData = []) => {
  const uniqueApps = new Map<string, { name: string; icon: string | null }>()

  authorizedApps.forEach((app) => {
    const safeName = sanitizeAppName(app.name)
    if (!safeName) return

    const normalizedName = safeName.toLowerCase()
    if (!uniqueApps.has(normalizedName)) {
      uniqueApps.set(normalizedName, { name: safeName, icon: app.icon })
      return
    }

    // Backfill an icon if a duplicate app entry has one and the first did not.
    const existingApp = uniqueApps.get(normalizedName)
    if (!existingApp?.icon && app.icon) {
      uniqueApps.set(normalizedName, { ...existingApp, icon: app.icon })
    }
  })

  return Array.from(uniqueApps.values())
}

export const getConnectedAppsTitle = (appNames: string[]) => {
  return `Connected to ${getConnectedAppsLabel(appNames)}`
}

export const getConnectedAppsLabel = (appNames: string[]) => {
  if (appNames.length === 0) return 'external apps'
  if (appNames.length === 1) return appNames[0]
  if (appNames.length === 2) return `${appNames[0]} and ${appNames[1]}`

  const [firstName, secondName] = appNames
  const additionalApps = appNames.length - MAX_APPS_IN_TITLE
  const suffix = additionalApps === 1 ? 'other app' : 'other apps'

  return `${firstName}, ${secondName}, and ${additionalApps} ${suffix}`
}

export const getConnectedAppsSentence = (appNames: string[]) => {
  const connectedAppsLabel = getConnectedAppsLabel(appNames)
  return `This project is connected to ${connectedAppsLabel}`
}

export const getConnectedAppsDescription = (appNames: string[]) => {
  const connectedAppsLabel = getConnectedAppsLabel(appNames)
  return `Changes made here may affect how your project works in ${connectedAppsLabel}.`
}

export const shouldDisableMockAuthorizedApps = (value?: string | string[] | null) => {
  const normalizedValue = getStringValue(value).trim().toLowerCase()
  return MOCK_DISABLED_VALUES.has(normalizedValue)
}

const createMockAuthorizedApp = ({
  appName,
  icon,
  index,
}: {
  appName: string
  icon: string | null
  index: number
}): AuthorizedApp => {
  const safeName = sanitizeAppName(appName)
  const slug = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return {
    id: `mock-authorized-app-${index}-${slug || 'unknown'}`,
    app_id: `mock-${slug || `app-${index}`}`,
    icon,
    name: safeName || `Mock App ${index + 1}`,
    website: icon ?? 'https://example.com',
    created_by: 'mock-oauth',
    authorized_at: new Date().toISOString(),
  }
}

export const getMockAuthorizedApps = (
  value?: string | string[] | null
): {
  apps: AuthorizedAppsData
  isMocked: boolean
} => {
  if (shouldDisableMockAuthorizedApps(value)) {
    return { apps: [], isMocked: false }
  }

  const mockValue = getStringValue(value).trim()
  if (!mockValue) return { apps: [], isMocked: false }

  const seenNames = new Set<string>()
  const apps = mockValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [namePart, ...iconParts] = entry.split(MOCK_NAME_ICON_DELIMITER)
      const appName = sanitizeAppName(namePart)
      if (!appName) return null

      const normalizedName = appName.toLowerCase()
      if (seenNames.has(normalizedName)) return null
      seenNames.add(normalizedName)

      const icon = sanitizeAppName(iconParts.join(MOCK_NAME_ICON_DELIMITER))
      return createMockAuthorizedApp({
        appName,
        icon: icon.length > 0 ? icon : null,
        index,
      })
    })
    .filter((app): app is AuthorizedApp => app !== null)

  return { apps, isMocked: apps.length > 0 }
}
