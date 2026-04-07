import type { Project } from 'data/projects/project-detail-query'
import {
  Auth as AuthIcon,
  EdgeFunctions as EdgeFunctionsIcon,
  Logs as LogsIcon,
  Realtime as RealtimeIcon,
  SqlEditor as SqlEditorIcon,
  Storage as StorageIcon,
  TableEditor as TableEditorIcon,
} from 'icons'
import { IS_PLATFORM, PROJECT_STATUS } from 'lib/constants'
import {
  ArrowRightLeft,
  Blocks,
  Copy,
  DatabaseBackup,
  FileText,
  Lightbulb,
  Network,
  Settings,
  Telescope,
} from 'lucide-react'

import { generateAuthMenu, type GenerateAuthMenuOptions } from '../AuthLayout/AuthLayout.utils'
import type { NavGroupItem } from './NavGroup'
import type { ProductMenuGroup } from '@/components/ui/ProductMenu/ProductMenu.types'

interface DatabaseNavFlags {
  pgNetExtensionExists?: boolean
  pitrEnabled?: boolean
  columnLevelPrivileges?: boolean
  showPgReplicate?: boolean
  enablePgReplicate?: boolean
  showRoles?: boolean
  showWrappers?: boolean
  pathname?: string
}

interface PlatformNavFlags {
  authEnabled?: boolean
  edgeFunctionsEnabled?: boolean
  storageEnabled?: boolean
  realtimeEnabled?: boolean
  authOverviewPageEnabled?: boolean
  /** Mirrors AuthLayout / ProductMenu; defaults to all enabled when omitted. */
  authMenuFeatures?: GenerateAuthMenuOptions['features']
  pathname?: string
}

const defaultAuthMenuFeatures: GenerateAuthMenuOptions['features'] = {
  signInProviders: true,
  rateLimits: true,
  emails: true,
  multiFactor: true,
  attackProtection: true,
  performance: true,
}

/** Flatten auth product menu for V2 sidebar; active segment matches ProductMenu (`pathname.split('/')[4]`). */
export function mapAuthMenuGroupsToNavSubItems(
  pathname: string,
  menu: ProductMenuGroup[]
): NonNullable<NavGroupItem['items']> {
  const page = pathname.split('/')[4] ?? ''
  const out: NonNullable<NavGroupItem['items']> = []

  for (const group of menu) {
    for (const item of group.items) {
      const isActive = item.pages?.length ? item.pages.includes(page) : page === item.key
      out.push({
        title: item.name,
        url: item.url,
        isActive,
        ...(item.label ? { label: item.label } : {}),
      })
    }
  }

  return out
}

interface OtherNavFlags {
  showReports?: boolean
  unifiedLogs?: boolean
  apiDocsSidePanel?: boolean
  pathname?: string
}

export function generateDatabaseNavItems(
  ref: string,
  project?: Project,
  flags?: DatabaseNavFlags
): NavGroupItem[] {
  const isProjectBuilding = project?.status === PROJECT_STATUS.COMING_UP
  const isProjectActive = project?.status === PROJECT_STATUS.ACTIVE_HEALTHY
  const buildingUrl = `/project/${ref}`

  const {
    pitrEnabled,
    columnLevelPrivileges,
    showPgReplicate,
    enablePgReplicate,
    showRoles,
    pathname = '',
  } = flags || {}

  const isSchemaActive =
    pathname.includes('/database/schemas') ||
    pathname.includes('/database/tables') ||
    pathname.includes('/database/functions') ||
    pathname.includes('/database/triggers') ||
    pathname.includes('/database/types') ||
    pathname.includes('/database/extensions') ||
    pathname.includes('/database/indexes') ||
    pathname.includes('/database/publications') ||
    pathname.includes('/database/roles') ||
    pathname.includes('/database/column-privileges')

  return [
    {
      title: 'Table Editor',
      url: isProjectBuilding ? buildingUrl : `/project/${ref}/editor`,
      icon: TableEditorIcon,
      isActive: pathname.includes('/editor'),
    },
    {
      title: 'SQL Editor',
      url: isProjectBuilding ? buildingUrl : `/project/${ref}/sql`,
      icon: SqlEditorIcon,
      isActive: pathname.includes('/sql'),
    },
    {
      title: 'Schema',
      url: isProjectBuilding
        ? buildingUrl
        : isProjectActive
          ? `/project/${ref}/database/schemas`
          : `/project/${ref}/database/backups/scheduled`,
      icon: Network,
      isActive: isSchemaActive,
      items: [
        {
          title: 'Visualizer',
          url: `/project/${ref}/database/schemas`,
          isActive: pathname.includes('/database/schemas'),
        },
        {
          title: 'Tables',
          url: `/project/${ref}/database/tables`,
          isActive: pathname.includes('/database/tables'),
        },
        {
          title: 'Functions',
          url: `/project/${ref}/database/functions`,
          isActive: pathname.includes('/database/functions'),
        },
        {
          title: 'Triggers',
          url: `/project/${ref}/database/triggers/data`,
          isActive: pathname.includes('/database/triggers'),
        },
        {
          title: 'Enumerated Types',
          url: `/project/${ref}/database/types`,
          isActive: pathname.includes('/database/types'),
        },
        {
          title: 'Extensions',
          url: `/project/${ref}/database/extensions`,
          isActive: pathname.includes('/database/extensions'),
        },
        {
          title: 'Indexes',
          url: `/project/${ref}/database/indexes`,
          isActive: pathname.includes('/database/indexes'),
        },
        {
          title: 'Publications',
          url: `/project/${ref}/database/publications`,
          isActive: pathname.includes('/database/publications'),
        },
        ...(showRoles
          ? [
              {
                title: 'Roles',
                url: `/project/${ref}/database/roles`,
                isActive: pathname.includes('/database/roles'),
              },
            ]
          : []),
        ...(columnLevelPrivileges
          ? [
              {
                title: 'Column Privileges',
                url: `/project/${ref}/database/column-privileges`,
                isActive: pathname.includes('/database/column-privileges'),
              },
            ]
          : []),
      ],
    },
    ...(IS_PLATFORM && showPgReplicate
      ? [
          {
            title: 'Replication',
            url: `/project/${ref}/database/replication`,
            icon: Copy,
            label: enablePgReplicate ? 'New' : undefined,
            isActive: pathname.includes('/database/replication'),
          },
        ]
      : []),
    ...(IS_PLATFORM
      ? [
          {
            title: 'Backups',
            url: pitrEnabled
              ? `/project/${ref}/database/backups/pitr`
              : `/project/${ref}/database/backups/scheduled`,
            icon: DatabaseBackup,
            isActive: pathname.includes('/database/backups'),
          },
        ]
      : []),
    {
      title: 'Migrations',
      url: `/project/${ref}/database/migrations`,
      icon: ArrowRightLeft,
      isActive: pathname.includes('/database/migrations'),
    },
    {
      title: 'Database Settings',
      url: `/project/${ref}/database/settings`,
      icon: Settings,
      isActive: pathname.includes('/database/settings'),
    },
  ]
}

export function generatePlatformNavItems(
  ref: string,
  project?: Project,
  flags?: PlatformNavFlags
): NavGroupItem[] {
  const isProjectBuilding = project?.status === PROJECT_STATUS.COMING_UP
  const buildingUrl = `/project/${ref}`

  const {
    authEnabled = true,
    edgeFunctionsEnabled = true,
    storageEnabled = true,
    realtimeEnabled = true,
    authOverviewPageEnabled = false,
    authMenuFeatures,
    pathname = '',
  } = flags || {}

  const isAuthActive = pathname.includes('/auth')
  const isStorageActive = pathname.includes('/storage')
  const isFunctionsActive = pathname.includes('/functions')
  const isRealtimeActive = pathname.includes('/realtime')

  const authNavSubItems = mapAuthMenuGroupsToNavSubItems(
    pathname,
    generateAuthMenu({
      ref,
      isPlatform: IS_PLATFORM,
      showOverview: authOverviewPageEnabled,
      features: authMenuFeatures ?? defaultAuthMenuFeatures,
    })
  )

  return [
    ...(authEnabled
      ? [
          {
            title: 'Authentication',
            url: isProjectBuilding
              ? buildingUrl
              : authOverviewPageEnabled
                ? `/project/${ref}/auth/overview`
                : `/project/${ref}/auth/users`,
            icon: AuthIcon,
            isActive: isAuthActive,
            items: authNavSubItems,
          },
        ]
      : []),
    ...(storageEnabled
      ? [
          {
            title: 'Storage',
            url: isProjectBuilding ? buildingUrl : `/project/${ref}/storage/files`,
            icon: StorageIcon,
            isActive: isStorageActive,
            items: [
              {
                title: 'Files',
                url: `/project/${ref}/storage/files`,
                isActive: pathname.includes('/storage/files'),
              },
              {
                title: 'Analytics',
                url: `/project/${ref}/storage/analytics`,
                isActive: pathname.includes('/storage/analytics'),
              },
              {
                title: 'Vectors',
                url: `/project/${ref}/storage/vectors`,
                isActive: pathname.includes('/storage/vectors'),
              },
              {
                title: 'S3 Configuration',
                url: `/project/${ref}/storage/s3`,
                isActive: pathname.includes('/storage/s3'),
              },
            ],
          },
        ]
      : []),
    ...(edgeFunctionsEnabled
      ? [
          {
            title: 'Edge Functions',
            url: isProjectBuilding ? buildingUrl : `/project/${ref}/functions`,
            icon: EdgeFunctionsIcon,
            isActive: isFunctionsActive,
            items: [
              {
                title: 'Functions',
                url: `/project/${ref}/functions`,
                isActive:
                  pathname === `/project/${ref}/functions` ||
                  (pathname.includes('/functions') && !pathname.includes('/functions/secrets')),
              },
              {
                title: 'Secrets',
                url: `/project/${ref}/functions/secrets`,
                isActive: pathname.includes('/functions/secrets'),
              },
            ],
          },
        ]
      : []),
    ...(realtimeEnabled
      ? [
          {
            title: 'Realtime',
            url: isProjectBuilding ? buildingUrl : `/project/${ref}/realtime/inspector`,
            icon: RealtimeIcon,
            isActive: isRealtimeActive,
            items: [
              {
                title: 'Inspector',
                url: `/project/${ref}/realtime/inspector`,
                isActive: pathname.includes('/realtime/inspector'),
              },
              {
                title: 'Policies',
                url: `/project/${ref}/realtime/policies`,
                isActive: pathname.includes('/realtime/policies'),
              },
              ...(IS_PLATFORM
                ? [
                    {
                      title: 'Settings',
                      url: `/project/${ref}/realtime/settings`,
                      isActive: pathname.includes('/realtime/settings'),
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ]
}

export function generateObservabilityNavItems(
  ref: string,
  project?: Project,
  flags?: OtherNavFlags
): NavGroupItem[] {
  const isProjectBuilding = project?.status === PROJECT_STATUS.COMING_UP
  const buildingUrl = `/project/${ref}`

  const { showReports = true, unifiedLogs = false, pathname = '' } = flags || {}

  return [
    {
      title: 'Advisors',
      url: isProjectBuilding ? buildingUrl : `/project/${ref}/advisors/security`,
      icon: Lightbulb,
      isActive: pathname.includes('/advisors'),
    },
    ...(IS_PLATFORM && showReports
      ? [
          {
            title: 'Observability',
            url: isProjectBuilding ? buildingUrl : `/project/${ref}/observability`,
            icon: Telescope,
            isActive: pathname.includes('/observability'),
          },
        ]
      : []),
    {
      title: 'Logs',
      url: isProjectBuilding
        ? buildingUrl
        : unifiedLogs
          ? `/project/${ref}/logs`
          : `/project/${ref}/logs/explorer`,
      icon: LogsIcon,
      isActive: pathname.includes('/logs'),
    },
  ]
}

export function generateIntegrationsNavItems(
  ref: string,
  project?: Project,
  flags?: OtherNavFlags
): NavGroupItem[] {
  const isProjectBuilding = project?.status === PROJECT_STATUS.COMING_UP
  const buildingUrl = `/project/${ref}`

  const { apiDocsSidePanel = false, pathname = '' } = flags || {}

  return [
    ...(apiDocsSidePanel
      ? [
          {
            title: 'API Docs',
            url: isProjectBuilding ? buildingUrl : `/project/${ref}/integrations/data_api/docs`,
            icon: FileText,
            isActive: pathname.includes('/integrations/data_api/docs'),
          },
        ]
      : []),
    {
      title: 'Integrations',
      url: isProjectBuilding ? buildingUrl : `/project/${ref}/integrations`,
      icon: Blocks,
      isActive:
        pathname.includes('/integrations') && !pathname.includes('/integrations/data_api/docs'),
    },
  ]
}
