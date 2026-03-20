'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react'

export type RightPanelType = 'chat' | 'sql' | 'adv' | null
export type DataTabDomain = 'db' | 'auth' | 'st' | 'fn' | 'rt'
export type DataTabType = 'list' | 'detail'

export interface DataTab {
  id: string
  label: string
  type: DataTabType
  category: string
  domain: DataTabDomain
  path: string
}

export interface RecentItem {
  id: string
  label: string
  path: string
  category: string
  domain: DataTabDomain
  timestamp: number
}

// Exported so components can reference canonical mappings
export const CATEGORY_DOMAIN: Record<string, DataTabDomain> = {
  tables: 'db',
  functions: 'db',
  types: 'db',
  roles: 'db',
  extensions: 'db',
  indexes: 'db',
  publications: 'db',
  users: 'auth',
  providers: 'auth',
  'oauth-apps': 'auth',
  buckets: 'st',
  'edge-functions': 'fn',
  channels: 'rt',
}

export const CATEGORY_LABELS: Record<string, string> = {
  tables: 'Tables',
  functions: 'Functions',
  types: 'Enumerated types',
  roles: 'Roles',
  extensions: 'Extensions',
  indexes: 'Indexes',
  publications: 'Publications',
  users: 'Users',
  providers: 'Providers',
  'oauth-apps': 'OAuth apps',
  buckets: 'Buckets',
  'edge-functions': 'Edge functions',
  channels: 'Channels',
}

const RECENT_ITEMS_STORAGE_KEY = 'v2-recent-items'

const defaultExpandedGroups: Record<string, boolean> = {
  'obs-logs': true,
  'obs-metrics': true,
  'obs-alerts': true,
  'settings-project': true,
  'settings-branches': true,
  'settings-modules': true,
  'settings-org': true,
}

interface V2DashboardState {
  // Flat data tabs (Figma model)
  dataTabs: DataTab[]
  expandedGroups: Record<string, boolean>
  rightPanel: RightPanelType
  recentItems: RecentItem[]

  openDataTab: (tab: DataTab) => void
  closeDataTab: (id: string) => void
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
  toggleGroup: (groupId: string) => void
  setExpandedGroup: (groupId: string, expanded: boolean) => void
  toggleRightPanel: (panel: 'chat' | 'sql' | 'adv') => void
  closeRightPanel: () => void
}

const V2DashboardContext = createContext<V2DashboardState | null>(null)

export function V2DashboardProvider({ children }: { children: ReactNode }) {
  const [dataTabs, setDataTabs] = useState<DataTab[]>([])
  const [expandedGroups, setExpandedGroups] =
    useState<Record<string, boolean>>(defaultExpandedGroups)
  const [rightPanel, setRightPanel] = useState<RightPanelType>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  // Load persisted recents from localStorage once
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(RECENT_ITEMS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as unknown
      if (!Array.isArray(parsed)) return
      const normalized = parsed
        .filter((x) => x && typeof x === 'object')
        .map((x) => x as Partial<RecentItem>)
        .filter(
          (x) =>
            typeof x.id === 'string' && typeof x.label === 'string' && typeof x.path === 'string'
        )
        .map((x) => ({
          id: x.id as string,
          label: x.label as string,
          path: x.path as string,
          category: typeof x.category === 'string' ? x.category : 'tables',
          domain: (typeof x.domain === 'string' ? x.domain : 'db') as DataTabDomain,
          timestamp: typeof x.timestamp === 'number' ? x.timestamp : 0,
        }))
      setRecentItems(normalized.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20))
    } catch {
      // Ignore corrupted localStorage
    }
  }, [])

  // Persist recents to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(RECENT_ITEMS_STORAGE_KEY, JSON.stringify(recentItems))
    } catch {
      // Ignore write failures
    }
  }, [recentItems])

  const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setRecentItems((prev) => {
      const without = prev.filter((x) => x.id !== item.id)
      return [{ ...item, timestamp: Date.now() }, ...without].slice(0, 20)
    })
  }, [])

  const openDataTab = useCallback(
    (tab: DataTab) => {
      setDataTabs((prev) => {
        if (prev.some((t) => t.id === tab.id)) return prev
        return [...prev, tab]
      })
      // Add to recents for detail tabs only
      if (tab.type === 'detail') {
        addRecentItem({
          id: tab.id,
          label: tab.label,
          path: tab.path,
          category: tab.category,
          domain: tab.domain,
        })
      }
    },
    [addRecentItem]
  )

  const closeDataTab = useCallback((id: string) => {
    setDataTabs((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((state) => ({ ...state, [groupId]: !state[groupId] }))
  }, [])

  const setExpandedGroup = useCallback((groupId: string, expanded: boolean) => {
    setExpandedGroups((state) => ({ ...state, [groupId]: expanded }))
  }, [])

  const toggleRightPanel = useCallback((panel: 'chat' | 'sql' | 'adv') => {
    setRightPanel((current) => (current === panel ? null : panel))
  }, [])

  const closeRightPanel = useCallback(() => setRightPanel(null), [])

  const value = useMemo<V2DashboardState>(
    () => ({
      dataTabs,
      expandedGroups,
      rightPanel,
      recentItems,
      openDataTab,
      closeDataTab,
      addRecentItem,
      toggleGroup,
      setExpandedGroup,
      toggleRightPanel,
      closeRightPanel,
    }),
    [
      dataTabs,
      expandedGroups,
      rightPanel,
      recentItems,
      openDataTab,
      closeDataTab,
      addRecentItem,
      toggleGroup,
      setExpandedGroup,
      toggleRightPanel,
      closeRightPanel,
    ]
  )

  return <V2DashboardContext.Provider value={value}>{children}</V2DashboardContext.Provider>
}

export function useV2DashboardStore(): V2DashboardState
export function useV2DashboardStore<T>(selector: (s: V2DashboardState) => T): T
export function useV2DashboardStore<T>(selector?: (s: V2DashboardState) => T) {
  const ctx = useContext(V2DashboardContext)
  if (!ctx) throw new Error('useV2DashboardStore must be used within V2DashboardProvider')
  if (selector) return selector(ctx)
  return ctx
}
