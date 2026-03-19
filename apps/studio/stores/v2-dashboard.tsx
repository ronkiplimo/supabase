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

export interface DetailTab {
  id: string
  label: string
  path: string
}

export interface RecentItem {
  id: string
  label: string
  path: string
  type: string
  timestamp: number
}

const RECENT_ITEMS_STORAGE_KEY = 'v2-recent-items'

const defaultExpandedGroups: Record<string, boolean> = {
  'data-database': true,
  'data-auth': true,
  'data-storage': true,
  'data-edge-functions': true,
  'data-realtime': true,
  'obs-logs': true,
  'obs-metrics': true,
  'obs-alerts': true,
  'settings-project': true,
  'settings-branches': true,
  'settings-modules': true,
  'settings-org': true,
}

interface V2DashboardState {
  detailTabs: DetailTab[]
  expandedGroups: Record<string, boolean>
  rightPanel: RightPanelType
  recentItems: RecentItem[]

  addDetailTab: (tab: DetailTab) => void
  addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
  removeDetailTab: (id: string) => void
  setDetailTabs: (tabs: DetailTab[]) => void
  toggleGroup: (groupId: string) => void
  setExpandedGroup: (groupId: string, expanded: boolean) => void
  toggleRightPanel: (panel: 'chat' | 'sql' | 'adv') => void
  closeRightPanel: () => void
}

const V2DashboardContext = createContext<V2DashboardState | null>(null)

const inferRecentTypeFromPath = (path: string): string => {
  if (path.includes('/data/tables/')) return 'Table'
  if (path.includes('/data/functions/')) return 'Function'
  if (path.includes('/data/types/')) return 'Type'
  if (path.includes('/data/roles/')) return 'Role'
  if (path.includes('/data/users/')) return 'User'
  if (path.includes('/data/buckets/')) return 'Bucket'
  if (path.includes('/data/extensions/')) return 'Extension'
  if (path.includes('/data/indexes/')) return 'Index'
  if (path.includes('/data/providers/')) return 'Provider'
  if (path.includes('/data/oauth-apps/')) return 'OAuth App'
  if (path.includes('/data/publications/')) return 'Publication'
  if (path.includes('/data/edge-functions/')) return 'Edge Function'
  if (path.includes('/data/channels/')) return 'Channel'
  return 'Item'
}

export function V2DashboardProvider({ children }: { children: ReactNode }) {
  const [detailTabs, setDetailTabsState] = useState<DetailTab[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(defaultExpandedGroups)
  const [rightPanel, setRightPanel] = useState<RightPanelType>(null)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

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
        .filter((x) => typeof x.id === 'string' && typeof x.label === 'string' && typeof x.path === 'string')
        .map((x) => ({
          id: x.id as string,
          label: x.label as string,
          path: x.path as string,
          type: typeof x.type === 'string' ? x.type : 'Item',
          timestamp: typeof x.timestamp === 'number' ? x.timestamp : 0,
        }))

      setRecentItems(normalized.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20))
    } catch {
      // Ignore corrupted localStorage.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(RECENT_ITEMS_STORAGE_KEY, JSON.stringify(recentItems))
    } catch {
      // Ignore write failures (e.g. quota).
    }
  }, [recentItems])

  const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    const now = Date.now()
    setRecentItems((prev) => {
      const withoutDup = prev.filter((x) => x.id !== item.id)
      const next: RecentItem = { ...item, timestamp: now }
      return [next, ...withoutDup].slice(0, 20)
    })
  }, [])

  const addDetailTab = useCallback((tab: DetailTab) => {
    addRecentItem({
      id: tab.id,
      label: tab.label,
      path: tab.path,
      type: inferRecentTypeFromPath(tab.path),
    })

    setDetailTabsState((state) =>
      state.some((t) => t.id === tab.id) ? state : [...state, tab]
    )
  }, [addRecentItem])

  const removeDetailTab = useCallback((id: string) => {
    setDetailTabsState((state) => state.filter((t) => t.id !== id))
  }, [])

  const setDetailTabs = useCallback((tabs: DetailTab[]) => {
    setDetailTabsState(tabs)
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((state) => ({
      ...state,
      [groupId]: !state[groupId],
    }))
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
      detailTabs,
      expandedGroups,
      rightPanel,
      recentItems,
      addDetailTab,
      addRecentItem,
      removeDetailTab,
      setDetailTabs,
      toggleGroup,
      setExpandedGroup,
      toggleRightPanel,
      closeRightPanel,
    }),
    [
      detailTabs,
      expandedGroups,
      rightPanel,
      recentItems,
      addDetailTab,
      addRecentItem,
      removeDetailTab,
      setDetailTabs,
      toggleGroup,
      setExpandedGroup,
      toggleRightPanel,
      closeRightPanel,
    ]
  )

  return (
    <V2DashboardContext.Provider value={value}>{children}</V2DashboardContext.Provider>
  )
}

export function useV2DashboardStore(): V2DashboardState
export function useV2DashboardStore<T>(selector: (s: V2DashboardState) => T): T
export function useV2DashboardStore<T>(selector?: (s: V2DashboardState) => T) {
  const ctx = useContext(V2DashboardContext)
  if (!ctx) {
    throw new Error('useV2DashboardStore must be used within V2DashboardProvider')
  }
  if (selector) return selector(ctx)
  return ctx
}
